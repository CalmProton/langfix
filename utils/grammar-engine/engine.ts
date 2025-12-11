/**
 * Grammar Engine
 * Core grammar checking functionality with AI provider integration
 */
import type { AIProvider, GrammarContext, ModelType } from '#utils/types';
import { GrammarCache } from './cache';
import { applyFilters } from './filters';
import {
  buildGrammarCheckPrompt,
  countWords,
  GRAMMAR_FAST_SYSTEM_PROMPT,
  GRAMMAR_MAIN_SYSTEM_PROMPT,
} from './prompts';
import {
  DEFAULT_ENGINE_CONFIG,
  type ExtendedGrammarError,
  type GrammarCheckResult,
  type GrammarEngineConfig,
} from './types';
import {
  safeParseToon,
  sortAndDedupeErrors,
  validateErrors,
} from './validation';

// ============================================================================
// Model Selection
// ============================================================================

/**
 * Select which model to use based on text characteristics
 */
function selectModel(text: string, config: GrammarEngineConfig): ModelType {
  const wordCount = countWords(text);

  // Use main model for longer texts
  if (wordCount > config.mainModelWordThreshold) {
    return 'main';
  }

  // Use fast model for shorter texts
  return 'fast';
}

/**
 * Determine if we should retry on main model after fast model failure
 */
function shouldRetry(
  result: GrammarCheckResult,
  text: string,
  _config: GrammarEngineConfig,
): boolean {
  // Don't retry if already used main model
  if (result.modelUsed === 'main') {
    return false;
  }

  const wordCount = countWords(text);

  // Retry if parse failed and text is non-trivial
  if (result.parseErrors && result.parseErrors.length > 0 && wordCount > 20) {
    return true;
  }

  // Retry if text is moderately long and no errors found (might be false negative)
  if (result.errors.length === 0 && wordCount > 100) {
    return true;
  }

  return false;
}

// ============================================================================
// Grammar Engine Class
// ============================================================================

export class GrammarEngine {
  private cache: GrammarCache;
  private config: GrammarEngineConfig;

  constructor(
    private provider: AIProvider,
    config?: Partial<GrammarEngineConfig>,
  ) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.cache = new GrammarCache(this.config.cacheConfig);
  }

  /**
   * Check text for grammar, spelling, and punctuation errors
   */
  async checkText(
    text: string,
    context?: GrammarContext,
  ): Promise<GrammarCheckResult> {
    const start = performance.now();

    // Handle empty/trivial text
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      return {
        errors: [],
        processingTime: performance.now() - start,
        modelUsed: 'fast',
        cacheHit: false,
      };
    }

    // Select model
    const modelType = selectModel(text, this.config);
    const temperature = modelType === 'fast' ? 0.1 : 0.3;

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = this.cache.key({
        text,
        model: modelType,
        promptVersion: GrammarCache.PROMPT_VERSION,
        temperature,
      });

      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          processingTime: performance.now() - start,
          cacheHit: true,
        };
      }
    }

    // Make AI request
    const result = await this.makeRequest(text, modelType, context, start);

    // Check if we should retry on main model
    if (shouldRetry(result, text, this.config)) {
      return this.retryOnMain(text, context, start);
    }

    // Cache successful result
    if (this.config.enableCache && result.parseErrors?.length === 0) {
      const cacheKey = this.cache.key({
        text,
        model: modelType,
        promptVersion: GrammarCache.PROMPT_VERSION,
        temperature,
      });
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Make grammar check request to AI provider
   */
  private async makeRequest(
    text: string,
    modelType: ModelType,
    context: GrammarContext | undefined,
    startTime: number,
  ): Promise<GrammarCheckResult> {
    const systemPrompt =
      modelType === 'fast'
        ? GRAMMAR_FAST_SYSTEM_PROMPT
        : GRAMMAR_MAIN_SYSTEM_PROMPT;

    try {
      const response = await this.provider.sendRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildGrammarCheckPrompt(text, context) },
        ],
        modelType,
        maxTokens: modelType === 'fast' ? 1024 : 2048,
        temperature: modelType === 'fast' ? 0.1 : 0.3,
      });

      // Parse response
      const parsed = safeParseToon(response.content, text);

      // Validate and filter errors
      const validated = validateErrors(parsed.errors, text);
      const sorted = sortAndDedupeErrors(validated);
      const filtered = await applyFilters(sorted);

      return {
        errors: filtered,
        processingTime: performance.now() - startTime,
        modelUsed: modelType,
        cacheHit: false,
        parseErrors: parsed.warnings.length > 0 ? parsed.warnings : undefined,
      };
    } catch (error) {
      // Return empty result on error
      return {
        errors: [],
        processingTime: performance.now() - startTime,
        modelUsed: modelType,
        cacheHit: false,
        parseErrors: [`Request failed: ${String(error)}`],
      };
    }
  }

  /**
   * Retry grammar check on main model
   */
  private async retryOnMain(
    text: string,
    context: GrammarContext | undefined,
    startTime: number,
  ): Promise<GrammarCheckResult> {
    return this.makeRequest(text, 'main', context, startTime);
  }

  /**
   * Check text incrementally, yielding errors for each sentence
   * Useful for long documents
   */
  async *checkIncrementally(
    text: string,
    context?: GrammarContext,
  ): AsyncGenerator<ExtendedGrammarError[]> {
    // Split text into sentences
    const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const matches = text.matchAll(sentenceRegex);

    for (const match of matches) {
      const sentence = match[0];
      const offset = match.index ?? 0;

      // Skip very short sentences
      if (sentence.trim().length < 3) {
        continue;
      }

      const result = await this.checkText(sentence, context);

      // Adjust indices to account for offset
      const adjustedErrors = result.errors.map((error) => ({
        ...error,
        startIndex: error.startIndex + offset,
        endIndex: error.endIndex + offset,
      }));

      yield adjustedErrors;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.stats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Prune expired cache entries
   */
  pruneCache(): number {
    return this.cache.prune();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a grammar engine using the stored provider configuration
 */
export async function createGrammarEngine(
  config?: Partial<GrammarEngineConfig>,
): Promise<GrammarEngine | null> {
  const { getProviderFromStorage } = await import('../ai-providers');
  const provider = await getProviderFromStorage();

  if (!provider) {
    return null;
  }

  return new GrammarEngine(provider, config);
}
