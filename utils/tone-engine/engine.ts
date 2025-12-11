/**
 * Tone Detection & Rewrite Engine
 * Core engine for analyzing and transforming text tone
 */
import type { AIProvider, AIRequest, ModelType } from '../types';
import { ToneCache } from './cache';
import { checkPreRewrite, validateRewrite } from './guardrails';
import {
  buildToneDetectionPrompt,
  buildToneRetryPrompt,
  buildToneRewritePrompt,
  calculateChangePercent,
  countChars,
  countWords,
  isNonRewritableContent,
  TONE_DETECTION_SYSTEM,
  TONE_REWRITE_SYSTEM,
} from './prompts';
import {
  DEFAULT_TONE_ENGINE_CONFIG,
  type ToneDetectionRequest,
  type ToneDetectionResponse,
  type ToneDetectionResult,
  type ToneEngineConfig,
  type ToneLabel,
  type ToneRewriteRequest,
  type ToneRewriteResponse,
  type ToneRewriteStats,
} from './types';
import {
  parseToneDetectionResponse,
  parseToneRewriteResponse,
} from './validation';

// ============================================================================
// Tone Engine Error
// ============================================================================

export class ToneEngineError extends Error {
  constructor(
    message: string,
    public code:
      | 'TOO_SHORT'
      | 'TOO_LONG'
      | 'EMPTY_TEXT'
      | 'API_ERROR'
      | 'PARSE_ERROR'
      | 'LOW_CONFIDENCE'
      | 'SAFETY_REJECTED'
      | 'GUARDRAIL_VIOLATION'
      | 'INVALID_TONE',
    public retryable: boolean = true,
  ) {
    super(message);
    this.name = 'ToneEngineError';
  }
}

// ============================================================================
// Tone Engine Class
// ============================================================================

export class ToneEngine {
  private config: ToneEngineConfig;
  private cache: ToneCache;

  constructor(
    private provider: AIProvider,
    config?: Partial<ToneEngineConfig>,
  ) {
    this.config = { ...DEFAULT_TONE_ENGINE_CONFIG, ...config };
    this.cache = new ToneCache({
      maxEntries: 100,
      ttlMs: this.config.cacheTtlMs,
    });
  }

  // ==========================================================================
  // Tone Detection
  // ==========================================================================

  /**
   * Detect the tone of text
   */
  async detectTone(
    request: ToneDetectionRequest,
  ): Promise<ToneDetectionResponse> {
    const start = performance.now();
    const { text, forceMainModel } = request;

    // Validate input
    this.validateInput(text);

    // Check for non-analyzable content
    if (isNonRewritableContent(text)) {
      return this.createEmptyDetectionResponse(text, start, 'none');
    }

    // Check cache first
    if (this.config.enableCache) {
      const cacheKey = this.cache.key(text);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          detection: cached,
          analyzedText: text,
          metadata: {
            duration: performance.now() - start,
            model: 'cached',
            fromCache: true,
          },
        };
      }
    }

    // Select model based on text length
    const wordCount = countWords(text);
    const modelType: ModelType =
      forceMainModel || wordCount > this.config.fastModelWordThreshold
        ? 'main'
        : 'fast';

    try {
      const result = await this.performDetection(text, modelType);

      // Cache successful results (detection only)
      if (this.config.enableCache) {
        const cacheKey = this.cache.key(text);
        this.cache.set(cacheKey, result.detection);
      }

      return {
        detection: result.detection,
        analyzedText: text,
        metadata: {
          duration: performance.now() - start,
          model: modelType,
          fromCache: false,
          parseWarnings:
            result.warnings.length > 0 ? result.warnings : undefined,
        },
      };
    } catch (error) {
      if (error instanceof ToneEngineError) {
        throw error;
      }
      throw new ToneEngineError(
        `Failed to detect tone: ${String(error)}`,
        'API_ERROR',
        true,
      );
    }
  }

  /**
   * Perform the actual tone detection via AI
   */
  private async performDetection(
    text: string,
    modelType: ModelType,
  ): Promise<{ detection: ToneDetectionResult; warnings: string[] }> {
    const userPrompt = buildToneDetectionPrompt(text);

    const aiRequest: AIRequest = {
      messages: [
        { role: 'system', content: TONE_DETECTION_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      modelType,
      temperature: this.config.detectionTemperature,
    };

    const response = await this.provider.sendRequest(aiRequest);

    // Parse TOON response
    const parseResult = parseToneDetectionResponse(response.content);

    if (!parseResult.detection) {
      throw new ToneEngineError(
        parseResult.error || 'Failed to parse detection response',
        'PARSE_ERROR',
        true,
      );
    }

    return {
      detection: parseResult.detection,
      warnings: parseResult.warnings,
    };
  }

  /**
   * Create empty detection response for edge cases
   */
  private createEmptyDetectionResponse(
    text: string,
    startTime: number,
    model: string,
  ): ToneDetectionResponse {
    return {
      detection: {
        primary: 'other',
        confidence: 0,
        evidence: [],
        notes: 'Text cannot be analyzed (code/URLs only)',
      },
      analyzedText: text,
      metadata: {
        duration: performance.now() - startTime,
        model,
        fromCache: false,
      },
    };
  }

  // ==========================================================================
  // Tone Rewriting
  // ==========================================================================

  /**
   * Rewrite text to match target tone
   */
  async rewriteTone(
    request: ToneRewriteRequest,
  ): Promise<ToneRewriteResponse> {
    const start = performance.now();
    const { text, targetTone, sourceTone } = request;

    // Validate input
    this.validateInput(text);

    // Run pre-rewrite checks
    const preCheck = checkPreRewrite(text, sourceTone, targetTone);
    if (!preCheck.canRewrite) {
      throw new ToneEngineError(
        `Cannot rewrite: ${preCheck.blockReasons.join(', ')}`,
        'SAFETY_REJECTED',
        false,
      );
    }

    // Check for non-rewritable content
    if (isNonRewritableContent(text)) {
      throw new ToneEngineError(
        'Text contains mostly code/URLs and cannot be meaningfully rewritten',
        'SAFETY_REJECTED',
        false,
      );
    }

    try {
      const result = await this.performRewrite(request);

      // Validate against guardrails
      const guardrailCheck = validateRewrite(
        text,
        result.rewrite,
        this.config.maxLengthChangePercent,
      );

      if (!guardrailCheck.allowed) {
        throw new ToneEngineError(
          `Guardrail violation: ${guardrailCheck.violations.join(', ')}`,
          'GUARDRAIL_VIOLATION',
          true,
        );
      }

      // Calculate stats
      const stats = this.calculateStats(text, result.rewrite.output);

      return {
        rewrite: result.rewrite,
        originalText: text,
        stats,
        metadata: {
          duration: performance.now() - start,
          model: 'main',
          guardrails:
            guardrailCheck.warnings.length > 0
              ? guardrailCheck.warnings
              : undefined,
        },
      };
    } catch (error) {
      if (error instanceof ToneEngineError) {
        throw error;
      }
      throw new ToneEngineError(
        `Failed to rewrite tone: ${String(error)}`,
        'API_ERROR',
        true,
      );
    }
  }

  /**
   * Retry rewrite with variation
   */
  async retryRewriteTone(
    request: ToneRewriteRequest,
    previousResult: string,
  ): Promise<ToneRewriteResponse> {
    const start = performance.now();
    const { text, targetTone, sourceTone } = request;

    // Validate input
    this.validateInput(text);

    // Run pre-rewrite checks
    const preCheck = checkPreRewrite(text, sourceTone, targetTone);
    if (!preCheck.canRewrite) {
      throw new ToneEngineError(
        `Cannot rewrite: ${preCheck.blockReasons.join(', ')}`,
        'SAFETY_REJECTED',
        false,
      );
    }

    try {
      const userPrompt = buildToneRetryPrompt(request, previousResult);

      const aiRequest: AIRequest = {
        messages: [
          { role: 'system', content: TONE_REWRITE_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        modelType: 'main',
        temperature: Math.min(this.config.rewriteTemperature + 0.1, 1.0),
      };

      const response = await this.provider.sendRequest(aiRequest);
      const parseResult = parseToneRewriteResponse(response.content);

      if (!parseResult.rewrite) {
        throw new ToneEngineError(
          parseResult.error || 'Failed to parse rewrite response',
          'PARSE_ERROR',
          true,
        );
      }

      // Validate against guardrails
      const guardrailCheck = validateRewrite(
        text,
        parseResult.rewrite,
        this.config.maxLengthChangePercent,
      );

      if (!guardrailCheck.allowed) {
        throw new ToneEngineError(
          `Guardrail violation: ${guardrailCheck.violations.join(', ')}`,
          'GUARDRAIL_VIOLATION',
          true,
        );
      }

      // Calculate stats
      const stats = this.calculateStats(text, parseResult.rewrite.output);

      return {
        rewrite: parseResult.rewrite,
        originalText: text,
        stats,
        metadata: {
          duration: performance.now() - start,
          model: 'main',
          guardrails:
            guardrailCheck.warnings.length > 0
              ? guardrailCheck.warnings
              : undefined,
        },
      };
    } catch (error) {
      if (error instanceof ToneEngineError) {
        throw error;
      }
      throw new ToneEngineError(
        `Failed to retry rewrite: ${String(error)}`,
        'API_ERROR',
        true,
      );
    }
  }

  /**
   * Perform the actual tone rewrite via AI
   */
  private async performRewrite(request: ToneRewriteRequest): Promise<{
    rewrite: NonNullable<
      ReturnType<typeof parseToneRewriteResponse>['rewrite']
    >;
    warnings: string[];
  }> {
    const userPrompt = buildToneRewritePrompt(request);

    const aiRequest: AIRequest = {
      messages: [
        { role: 'system', content: TONE_REWRITE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'main', // Always use main model for rewrites
      temperature: this.config.rewriteTemperature,
    };

    const response = await this.provider.sendRequest(aiRequest);
    const parseResult = parseToneRewriteResponse(response.content);

    if (!parseResult.rewrite) {
      throw new ToneEngineError(
        parseResult.error || 'Failed to parse rewrite response',
        'PARSE_ERROR',
        true,
      );
    }

    return {
      rewrite: parseResult.rewrite,
      warnings: parseResult.warnings,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Validate input text
   */
  private validateInput(text: string): void {
    const trimmed = text.trim();

    if (!trimmed) {
      throw new ToneEngineError(
        'Text cannot be empty',
        'EMPTY_TEXT',
        false,
      );
    }

    if (trimmed.length < this.config.minTextLength) {
      throw new ToneEngineError(
        `Text is too short. Minimum ${this.config.minTextLength} characters required.`,
        'TOO_SHORT',
        false,
      );
    }

    if (trimmed.length > this.config.maxTextLength) {
      throw new ToneEngineError(
        `Text is too long. Maximum ${this.config.maxTextLength} characters allowed.`,
        'TOO_LONG',
        false,
      );
    }
  }

  /**
   * Calculate rewrite statistics
   */
  private calculateStats(original: string, rewritten: string): ToneRewriteStats {
    const originalWords = countWords(original);
    const rewrittenWords = countWords(rewritten);
    const originalChars = countChars(original);
    const rewrittenChars = countChars(rewritten);

    return {
      originalWords,
      rewrittenWords,
      changePercent: calculateChangePercent(originalWords, rewrittenWords),
      originalChars,
      rewrittenChars,
    };
  }

  /**
   * Get available tone labels
   */
  static getToneLabels(): ToneLabel[] {
    return [
      'neutral',
      'professional',
      'friendly',
      'empathetic',
      'confident',
      'apologetic',
      'direct',
      'informal',
    ];
  }

  /**
   * Get quick target tones for UI
   */
  static getQuickTargets(): ToneLabel[] {
    return ['professional', 'friendly', 'direct'];
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ReturnType<ToneCache['getStats']> {
    return this.cache.getStats();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a tone engine instance
 */
export function createToneEngine(
  provider: AIProvider,
  config?: Partial<ToneEngineConfig>,
): ToneEngine {
  return new ToneEngine(provider, config);
}
