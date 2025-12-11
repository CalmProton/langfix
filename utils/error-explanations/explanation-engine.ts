/**
 * Explanation Engine
 * Generate detailed error explanations using AI providers
 */

import type { ExtendedGrammarError } from '../grammar-engine/types';
import type { SuggestionError } from '../suggestion-ui/types';
import { decodeToon } from '../toon';
import type { AIProvider, AIRequest } from '../types';
import { type ExplanationCache, getExplanationCache } from './cache';
import {
  type ConfidenceScorer,
  getConfidenceScorer,
} from './confidence-scorer';
import {
  buildDetailedExplanationPrompt,
  buildQuickExplanationPrompt,
  DETAILED_EXPLANATION_SYSTEM_PROMPT,
  isSimpleError,
  mapErrorTypeToCategory,
  mapSeverityToExplanationSeverity,
  QUICK_EXPLANATION_SYSTEM_PROMPT,
} from './prompts';
import type {
  CorrectionOption,
  CorrectionType,
  DetailedExplanationResponse,
  ErrorContext,
  ErrorExplanation,
  ExplanationDetails,
  ExplanationOptions,
  QuickExplanationResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

interface ToonError {
  code: string;
  message: string;
}

interface ExplanationEngineConfig {
  /** Timeout for quick explanations (ms) */
  quickTimeoutMs: number;
  /** Timeout for detailed explanations (ms) */
  detailedTimeoutMs: number;
  /** Whether to use cache */
  useCache: boolean;
}

const DEFAULT_CONFIG: ExplanationEngineConfig = {
  quickTimeoutMs: 5000,
  detailedTimeoutMs: 15000,
  useCache: true,
};

// ============================================================================
// Explanation Engine Class
// ============================================================================

export class ExplanationEngine {
  private cache: ExplanationCache;
  private scorer: ConfidenceScorer;
  private config: ExplanationEngineConfig;

  constructor(
    private provider: AIProvider,
    config?: Partial<ExplanationEngineConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = getExplanationCache();
    this.scorer = getConfidenceScorer();
  }

  /**
   * Generate a quick explanation for an error
   * Uses the fast model for common errors
   */
  async generateQuickExplanation(
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
    _options?: Partial<ExplanationOptions>,
  ): Promise<ErrorExplanation> {
    // Check cache first
    if (this.config.useCache) {
      const cacheKey = {
        type: error.type,
        text: error.original,
        rule: error.explanation,
      };
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build prompt
    const userPrompt = buildQuickExplanationPrompt(error, context);

    // Make AI request
    const request: AIRequest = {
      messages: [
        { role: 'system', content: QUICK_EXPLANATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'fast',
      maxTokens: 500,
      temperature: 0.3,
    };

    try {
      const response = await this.provider.sendRequest(request);
      const explanation = this.parseQuickResponse(
        response.content,
        error,
        context,
      );

      // Cache the result
      if (this.config.useCache) {
        const cacheKey = {
          type: error.type,
          text: error.original,
          rule: error.explanation,
        };
        this.cache.set(cacheKey, explanation);
      }

      return explanation;
    } catch {
      // Return fallback explanation
      return this.createFallbackExplanation(error, context);
    }
  }

  /**
   * Generate a detailed explanation for an error
   * Uses the main model for complex explanations
   */
  async generateDetailedExplanation(
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
    existingExplanation?: ErrorExplanation,
  ): Promise<ErrorExplanation> {
    // Build prompt
    const userPrompt = buildDetailedExplanationPrompt(error, context);

    // Make AI request with main model
    const request: AIRequest = {
      messages: [
        { role: 'system', content: DETAILED_EXPLANATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'main',
      maxTokens: 1000,
      temperature: 0.4,
    };

    try {
      const response = await this.provider.sendRequest(request);
      const explanation = this.parseDetailedResponse(
        response.content,
        error,
        context,
        existingExplanation,
      );

      // Update cache with detailed version
      if (this.config.useCache) {
        const cacheKey = {
          type: error.type,
          text: error.original,
          rule: error.explanation,
        };
        this.cache.set(cacheKey, explanation);
      }

      return explanation;
    } catch {
      // Return existing or fallback explanation
      return (
        existingExplanation || this.createFallbackExplanation(error, context)
      );
    }
  }

  /**
   * Get explanation (auto-selects quick or detailed based on error type)
   */
  async getExplanation(
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
    forceDetailed: boolean = false,
  ): Promise<ErrorExplanation> {
    if (forceDetailed || !isSimpleError(error)) {
      return this.generateDetailedExplanation(error, context);
    }
    return this.generateQuickExplanation(error, context);
  }

  /**
   * Parse quick explanation response from TOON format
   */
  private parseQuickResponse(
    response: string,
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
  ): ErrorExplanation {
    try {
      const toonBlock = this.extractToonBlock(response);
      const data = decodeToon<QuickExplanationResponse | ToonError>(toonBlock);

      // Check for error response
      if ('code' in data && 'message' in data) {
        throw new Error(`AI error: ${data.message}`);
      }

      const parsed = data as QuickExplanationResponse;

      // Convert corrections
      const corrections: CorrectionOption[] = parsed.corrections.map(
        (c, index) => ({
          id: `${this.getErrorId(error)}-c${index}`,
          text: c.text,
          description: c.description,
          confidence: c.confidence,
          type: c.type as CorrectionType,
        }),
      );

      // Score and rank corrections
      const scoredCorrections = corrections.map((c) => ({
        ...c,
        confidence: this.scorer.scoreCorrection(c, error, {
          sentence: context.sentence,
        }),
      }));

      return {
        errorId: this.getErrorId(error),
        summary: parsed.summary,
        category: parsed.category,
        severity: parsed.severity,
        explanation: {
          reason: parsed.reason,
        },
        corrections: this.scorer.rankCorrections(scoredCorrections),
        confidence: scoredCorrections[0]?.confidence || 0.5,
        context,
        detailedLoaded: false,
        generatedAt: Date.now(),
      };
    } catch {
      return this.createFallbackExplanation(error, context);
    }
  }

  /**
   * Parse detailed explanation response from TOON format
   */
  private parseDetailedResponse(
    response: string,
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
    existing?: ErrorExplanation,
  ): ErrorExplanation {
    try {
      const toonBlock = this.extractToonBlock(response);
      const data = decodeToon<DetailedExplanationResponse | ToonError>(
        toonBlock,
      );

      // Check for error response
      if ('code' in data && 'message' in data) {
        throw new Error(`AI error: ${data.message}`);
      }

      const parsed = data as DetailedExplanationResponse;

      // Convert corrections with metadata
      const corrections: CorrectionOption[] = parsed.corrections.map(
        (c, index) => ({
          id: `${this.getErrorId(error)}-c${index}`,
          text: c.text,
          description: c.description,
          confidence: c.confidence,
          type: c.type as CorrectionType,
          metadata: {
            preservesIntent: c.preservesIntent ?? true,
            formalityChange: c.formalityChange,
          },
        }),
      );

      // Score corrections
      const scoredCorrections = corrections.map((c) => ({
        ...c,
        confidence: this.scorer.scoreCorrection(c, error, {
          sentence: context.sentence,
        }),
      }));

      // Build explanation details
      const explanationDetails: ExplanationDetails = {
        reason: parsed.reason,
        rule: parsed.rule,
        styleGuide: parsed.styleGuide,
        examples: parsed.examples?.map((e) => ({
          incorrect: e.incorrect,
          correct: e.correct,
          note: e.note,
        })),
      };

      return {
        errorId: this.getErrorId(error),
        summary: parsed.summary,
        category: parsed.category,
        severity: parsed.severity,
        explanation: explanationDetails,
        corrections: this.scorer.rankCorrections(scoredCorrections),
        confidence: scoredCorrections[0]?.confidence || 0.5,
        context,
        detailedLoaded: true,
        generatedAt: Date.now(),
      };
    } catch {
      return existing || this.createFallbackExplanation(error, context);
    }
  }

  /**
   * Create a fallback explanation when AI fails
   */
  private createFallbackExplanation(
    error: ExtendedGrammarError | SuggestionError,
    context: ErrorContext,
  ): ErrorExplanation {
    const category = mapErrorTypeToCategory(error.type);
    const severity = mapSeverityToExplanationSeverity(error.severity);

    // Create correction from existing suggestion
    const corrections: CorrectionOption[] = [
      {
        id: `${this.getErrorId(error)}-c0`,
        text: error.suggestion,
        description: 'Suggested correction',
        confidence: 0.7,
        type:
          error.op === 'insert'
            ? 'insertion'
            : error.op === 'delete'
              ? 'deletion'
              : 'replacement',
      },
    ];

    // Add alternatives if available
    if (error.alternatives) {
      error.alternatives.forEach((alt, index) => {
        corrections.push({
          id: `${this.getErrorId(error)}-c${index + 1}`,
          text: alt,
          description: 'Alternative suggestion',
          confidence: 0.5,
          type: 'replacement',
        });
      });
    }

    return {
      errorId: this.getErrorId(error),
      summary: error.explanation || `${category} issue detected`,
      category,
      severity,
      explanation: {
        reason: error.explanation || 'This text may contain an error.',
      },
      corrections,
      confidence: 0.6,
      context,
      detailedLoaded: false,
      generatedAt: Date.now(),
    };
  }

  /**
   * Get error ID (works with both ExtendedGrammarError and SuggestionError)
   */
  private getErrorId(error: ExtendedGrammarError | SuggestionError): string {
    if ('id' in error && error.id) {
      return error.id;
    }
    // Generate ID from error properties
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
}

// ============================================================================
// Factory Functions
// ============================================================================

let engineInstance: ExplanationEngine | null = null;

/**
 * Create an explanation engine with the given provider
 */
export function createExplanationEngine(
  provider: AIProvider,
  config?: Partial<ExplanationEngineConfig>,
): ExplanationEngine {
  return new ExplanationEngine(provider, config);
}

/**
 * Get or create a singleton explanation engine
 */
export function getExplanationEngine(
  provider: AIProvider,
  config?: Partial<ExplanationEngineConfig>,
): ExplanationEngine {
  if (!engineInstance) {
    engineInstance = new ExplanationEngine(provider, config);
  }
  return engineInstance;
}

/**
 * Dispose of the explanation engine singleton
 */
export function disposeExplanationEngine(): void {
  engineInstance = null;
}
