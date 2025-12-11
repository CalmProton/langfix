/**
 * Auto-Correct Engine
 * Generate and apply corrections to text
 */

import type { ExtendedGrammarError } from '../grammar-engine/types';
import type { ActionResult, SuggestionError } from '../suggestion-ui/types';
import type { EditableSurface } from '../text-extraction/types';
import { decodeToon } from '../toon';
import type { AIProvider, AIRequest } from '../types';
import { getConfidenceScorer } from './confidence-scorer';
import { getCorrectionHistory } from './correction-history';
import {
  buildCorrectionsPrompt,
  isSimpleError,
  mapErrorTypeToCategory,
} from './prompts';
import type {
  CorrectionOption,
  CorrectionOptions,
  CorrectionType,
  ErrorContext,
} from './types';

// ============================================================================
// Types
// ============================================================================

interface ToonCorrectionsResponse {
  corrections: Array<{
    text: string;
    description: string;
    confidence: number;
    type: string;
    preservesIntent?: boolean;
  }>;
}

interface ToonError {
  code: string;
  message: string;
}

interface AutoCorrectEngineConfig {
  /** Default confidence threshold for auto-correct */
  autoCorrectThreshold: number;
  /** Maximum alternatives to generate */
  maxAlternatives: number;
  /** Timeout for correction generation (ms) */
  timeoutMs: number;
}

const DEFAULT_CONFIG: AutoCorrectEngineConfig = {
  autoCorrectThreshold: 0.85,
  maxAlternatives: 5,
  timeoutMs: 5000,
};

// ============================================================================
// System Prompt for Corrections
// ============================================================================

const CORRECTIONS_SYSTEM_PROMPT = `You are a writing assistant that suggests alternative corrections for text issues.

Your task is to provide additional correction options beyond what was already suggested.

Rules:
- Suggest corrections that preserve the original meaning
- Vary the formality level where appropriate
- Consider context when suggesting alternatives
- Provide confidence scores (0-1) for each suggestion

Respond with exactly one fenced TOON block:
\`\`\`toon
corrections[N]{text,description,confidence,type,preservesIntent}:
  corrected text,Why this works,0.8,replacement,true
  another option,Different approach,0.6,rephrase,true
\`\`\`

Type: replacement, insertion, deletion, rephrase`;

// ============================================================================
// Auto-Correct Engine Class
// ============================================================================

export class AutoCorrectEngine {
  private config: AutoCorrectEngineConfig;
  private scorer = getConfidenceScorer();
  private history = getCorrectionHistory();

  constructor(
    private provider: AIProvider,
    config?: Partial<AutoCorrectEngineConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate correction suggestions for an error
   */
  async generateCorrections(
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
    options?: Partial<CorrectionOptions>,
  ): Promise<CorrectionOption[]> {
    const maxAlternatives =
      options?.maxAlternatives ?? this.config.maxAlternatives;

    // Start with existing suggestions
    const corrections: CorrectionOption[] = [];

    // Add main suggestion
    if (error.suggestion) {
      corrections.push({
        id: `${this.getErrorId(error)}-c0`,
        text: error.suggestion,
        description: 'Primary suggestion',
        confidence: 0.8,
        type: this.mapOpToType(error.op),
      });
    }

    // Add existing alternatives
    if (error.alternatives) {
      error.alternatives.forEach((alt, index) => {
        corrections.push({
          id: `${this.getErrorId(error)}-c${index + 1}`,
          text: alt,
          description: 'Alternative suggestion',
          confidence: 0.6,
          type: 'replacement',
        });
      });
    }

    // If we have enough, return early
    if (corrections.length >= maxAlternatives) {
      return this.scoreAndRankCorrections(corrections, error, context);
    }

    // For simple errors, don't make AI call for more alternatives
    if (isSimpleError(error)) {
      return this.scoreAndRankCorrections(corrections, error, context);
    }

    // Generate additional corrections with AI
    try {
      const additional = await this.fetchAdditionalCorrections(
        error,
        context,
        corrections.map((c) => c.text),
      );

      // Add additional corrections
      additional.forEach((c, index) => {
        corrections.push({
          ...c,
          id: `${this.getErrorId(error)}-c${corrections.length + index}`,
        });
      });
    } catch {
      // Continue with existing corrections
    }

    return this.scoreAndRankCorrections(
      corrections.slice(0, maxAlternatives),
      error,
      context,
    );
  }

  /**
   * Apply a correction to an editable surface
   */
  async applyCorrection(
    correction: CorrectionOption,
    error: ExtendedGrammarError | SuggestionError,
    surface: EditableSurface,
  ): Promise<ActionResult> {
    try {
      // Calculate the replacement range
      const start = error.startIndex;
      const end = error.endIndex;

      // Determine the replacement text based on correction type
      let replacementText: string;

      switch (correction.type) {
        case 'insertion':
          // For insertion, the text is added at the position
          replacementText = correction.text;
          // For insertions, start and end should be the same (insertion point)
          surface.replace(start, start, replacementText);
          break;

        case 'deletion':
          // For deletion, replace with empty string
          surface.replace(start, end, '');
          break;

        case 'replacement':
        case 'rephrase':
        default:
          // Replace the text range with correction
          replacementText = correction.text;
          surface.replace(start, end, replacementText);
          break;
      }

      // Record in history
      const category = mapErrorTypeToCategory(error.type);
      await this.history.recordAccepted(
        error.type,
        category,
        error.original,
        correction.text,
        correction.confidence,
      );

      return {
        success: true,
        message: 'Correction applied successfully',
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to apply correction: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Apply correction using a range-based approach (for Selection API)
   */
  async applyCorrectionWithRange(
    correction: CorrectionOption,
    error: ExtendedGrammarError | SuggestionError,
    range: Range,
  ): Promise<ActionResult> {
    try {
      // Delete current content and insert correction
      range.deleteContents();

      if (correction.type !== 'deletion') {
        const textNode = document.createTextNode(correction.text);
        range.insertNode(textNode);

        // Normalize the parent to merge adjacent text nodes
        textNode.parentNode?.normalize();
      }

      // Record in history
      const category = mapErrorTypeToCategory(error.type);
      await this.history.recordAccepted(
        error.type,
        category,
        error.original,
        correction.text,
        correction.confidence,
      );

      return {
        success: true,
        message: 'Correction applied successfully',
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to apply correction: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Record a rejected correction
   */
  async recordRejection(
    correction: CorrectionOption,
    error: ExtendedGrammarError | SuggestionError,
  ): Promise<void> {
    const category = mapErrorTypeToCategory(error.type);
    await this.history.recordRejected(
      error.type,
      category,
      error.original,
      correction.text,
      correction.confidence,
    );
  }

  /**
   * Check if correction should be auto-applied
   */
  shouldAutoCorrect(
    correction: CorrectionOption,
    error: ExtendedGrammarError | SuggestionError,
  ): boolean {
    // Use scorer for base confidence/type checks
    if (!this.scorer.shouldAutoCorrect(correction, this.config.autoCorrectThreshold)) {
      return false;
    }

    // Only auto-correct simple error types
    const simpleTypes = ['spelling', 'punctuation'];
    return simpleTypes.includes(error.type);
  }

  /**
   * Get the top correction recommendation
   */
  getTopCorrection(corrections: CorrectionOption[]): CorrectionOption | null {
    if (corrections.length === 0) {
      return null;
    }

    return corrections.reduce((best, current) =>
      current.confidence > best.confidence ? current : best,
    );
  }

  /**
   * Fetch additional corrections from AI
   */
  private async fetchAdditionalCorrections(
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
    existingCorrections: string[],
  ): Promise<Omit<CorrectionOption, 'id'>[]> {
    const userPrompt = buildCorrectionsPrompt(
      error,
      context,
      existingCorrections,
    );

    const request: AIRequest = {
      messages: [
        { role: 'system', content: CORRECTIONS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'fast',
      maxTokens: 300,
      temperature: 0.5,
    };

    const response = await this.provider.sendRequest(request);
    return this.parseCorrectionsResponse(response.content);
  }

  /**
   * Parse corrections response from TOON format
   */
  private parseCorrectionsResponse(
    response: string,
  ): Omit<CorrectionOption, 'id'>[] {
    try {
      const toonBlock = this.extractToonBlock(response);
      const data = decodeToon<ToonCorrectionsResponse | ToonError>(toonBlock);

      if ('code' in data && 'message' in data) {
        return [];
      }

      const parsed = data as ToonCorrectionsResponse;

      return parsed.corrections.map((c) => ({
        text: c.text,
        description: c.description,
        confidence: c.confidence,
        type: c.type as CorrectionType,
        metadata: {
          preservesIntent: c.preservesIntent ?? true,
        },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Score and rank corrections
   */
  private scoreAndRankCorrections(
    corrections: CorrectionOption[],
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
  ): CorrectionOption[] {
    const scored = corrections.map((c) => ({
      ...c,
      confidence: this.scorer.scoreCorrection(c, error, {
        sentence: context.sentence,
      }),
    }));

    return this.scorer.rankCorrections(scored);
  }

  /**
   * Map operation to correction type
   */
  private mapOpToType(op: string): CorrectionType {
    switch (op) {
      case 'insert':
        return 'insertion';
      case 'delete':
        return 'deletion';
      case 'replace':
      default:
        return 'replacement';
    }
  }

  /**
   * Get error ID
   */
  private getErrorId(error: ExtendedGrammarError | SuggestionError): string {
    if ('id' in error && error.id) {
      return error.id;
    }
    return `err-${error.startIndex}-${error.endIndex}-${error.type}`;
  }

  /**
   * Extract TOON block from response
   */
  private extractToonBlock(response: string): string {
    const match = response.match(/```toon\n([\s\S]*?)```/);
    if (match) {
      return match[1].trim();
    }
    return response.trim();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoCorrectEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let engineInstance: AutoCorrectEngine | null = null;

/**
 * Create an auto-correct engine with the given provider
 */
export function createAutoCorrectEngine(
  provider: AIProvider,
  config?: Partial<AutoCorrectEngineConfig>,
): AutoCorrectEngine {
  return new AutoCorrectEngine(provider, config);
}

/**
 * Get or create a singleton auto-correct engine
 */
export function getAutoCorrectEngine(
  provider: AIProvider,
  config?: Partial<AutoCorrectEngineConfig>,
): AutoCorrectEngine {
  if (!engineInstance) {
    engineInstance = new AutoCorrectEngine(provider, config);
  }
  return engineInstance;
}

/**
 * Dispose of the auto-correct engine singleton
 */
export function disposeAutoCorrectEngine(): void {
  engineInstance = null;
}
