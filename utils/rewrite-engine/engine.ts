/**
 * Rewrite Engine
 * Core rewriting functionality with AI provider integration
 */
import type { AIProvider } from '#utils/types';
import {
  buildRetryPrompt,
  buildRewritePrompt,
  calculateChangePercent,
  countChars,
  countWords,
  REWRITE_SYSTEM_PROMPT,
} from './prompts';
import {
  DEFAULT_REWRITE_CONFIG,
  type RewriteEngineConfig,
  type RewriteMode,
  type RewriteOptions,
  type RewriteResult,
  type RewriteStats,
} from './types';

// ============================================================================
// Rewrite Error
// ============================================================================

export class RewriteError extends Error {
  constructor(
    message: string,
    public code:
      | 'TOO_SHORT'
      | 'TOO_LONG'
      | 'API_ERROR'
      | 'NO_CHANGE'
      | 'EMPTY_RESPONSE'
      | 'INVALID_MODE',
    public retryable: boolean = true,
  ) {
    super(message);
    this.name = 'RewriteError';
  }
}

// ============================================================================
// Rewrite Engine Class
// ============================================================================

export class RewriteEngine {
  private config: RewriteEngineConfig;

  constructor(
    private provider: AIProvider,
    config?: Partial<RewriteEngineConfig>,
  ) {
    this.config = { ...DEFAULT_REWRITE_CONFIG, ...config };
  }

  /**
   * Rewrite text using the specified mode
   */
  async rewrite(
    text: string,
    mode: RewriteMode,
    options?: RewriteOptions,
  ): Promise<RewriteResult> {
    const start = performance.now();

    // Validate input
    this.validateInput(text);

    // Build the prompt
    const userPrompt = buildRewritePrompt(text, mode, options);

    // Calculate max tokens based on mode
    const maxTokens = this.calculateMaxTokens(text, mode, options);

    // Make the AI request
    const response = await this.provider.sendRequest({
      messages: [
        { role: 'system', content: REWRITE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'main', // Always use main model for rewrites
      maxTokens,
      temperature: options?.temperature ?? this.config.defaultTemperature,
    });

    // Clean and validate response
    const rewritten = this.cleanResponse(response.content);

    if (!rewritten) {
      throw new RewriteError('Empty response from AI', 'EMPTY_RESPONSE', true);
    }

    // Calculate statistics
    const stats = this.calculateStats(text, rewritten);
    const processingTime = performance.now() - start;

    return {
      original: text,
      rewritten,
      mode,
      stats,
      processingTime,
    };
  }

  /**
   * Retry rewrite with variation
   * Used when user wants a different result
   */
  async retryRewrite(
    text: string,
    mode: RewriteMode,
    previousResult: string,
    options?: RewriteOptions,
  ): Promise<RewriteResult> {
    const start = performance.now();

    // Validate input
    this.validateInput(text);

    // Build retry prompt that asks for different result
    const userPrompt = buildRetryPrompt(text, mode, previousResult, options);

    // Calculate max tokens
    const maxTokens = this.calculateMaxTokens(text, mode, options);

    // Make the AI request with slightly higher temperature for variation
    const temperature = Math.min(
      (options?.temperature ?? this.config.defaultTemperature) + 0.1,
      1.0,
    );

    const response = await this.provider.sendRequest({
      messages: [
        { role: 'system', content: REWRITE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'main',
      maxTokens,
      temperature,
    });

    // Clean and validate response
    const rewritten = this.cleanResponse(response.content);

    if (!rewritten) {
      throw new RewriteError('Empty response from AI', 'EMPTY_RESPONSE', true);
    }

    // Calculate statistics
    const stats = this.calculateStats(text, rewritten);
    const processingTime = performance.now() - start;

    return {
      original: text,
      rewritten,
      mode,
      stats,
      processingTime,
    };
  }

  /**
   * Stream rewrite for real-time display
   */
  async *streamRewrite(
    text: string,
    mode: RewriteMode,
    options?: RewriteOptions,
  ): AsyncGenerator<string, RewriteResult, unknown> {
    const start = performance.now();

    // Validate input
    this.validateInput(text);

    // Check if provider supports streaming
    if (!this.provider.streamRequest) {
      // Fallback to non-streaming
      const result = await this.rewrite(text, mode, options);
      yield result.rewritten;
      return result;
    }

    // Build the prompt
    const userPrompt = buildRewritePrompt(text, mode, options);
    const maxTokens = this.calculateMaxTokens(text, mode, options);

    // Stream the response
    let fullResponse = '';
    const stream = this.provider.streamRequest({
      messages: [
        { role: 'system', content: REWRITE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      modelType: 'main',
      maxTokens,
      temperature: options?.temperature ?? this.config.defaultTemperature,
    });

    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    // Clean the final response
    const rewritten = this.cleanResponse(fullResponse);

    if (!rewritten) {
      throw new RewriteError('Empty response from AI', 'EMPTY_RESPONSE', true);
    }

    // Calculate final statistics
    const stats = this.calculateStats(text, rewritten);
    const processingTime = performance.now() - start;

    return {
      original: text,
      rewritten,
      mode,
      stats,
      processingTime,
    };
  }

  /**
   * Validate input text
   */
  private validateInput(text: string): void {
    const trimmed = text.trim();

    if (trimmed.length < this.config.minTextLength) {
      throw new RewriteError(
        `Text is too short. Minimum ${this.config.minTextLength} characters required.`,
        'TOO_SHORT',
        false,
      );
    }

    if (trimmed.length > this.config.maxTextLength) {
      throw new RewriteError(
        `Text is too long. Maximum ${this.config.maxTextLength} characters allowed.`,
        'TOO_LONG',
        false,
      );
    }
  }

  /**
   * Clean the AI response
   */
  private cleanResponse(response: string): string {
    let cleaned = response.trim();

    // Remove surrounding quotes if present
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }

    // Remove markdown code blocks if present
    const codeBlockMatch = cleaned.match(/^```(?:\w+)?\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // Remove common prefixes the model might add
    const prefixPatterns = [
      /^here(?:'s| is)(?: the)? (?:rewritten|revised|updated|new) (?:text|version):\s*/i,
      /^(?:rewritten|revised|updated) (?:text|version):\s*/i,
      /^here you go:\s*/i,
      /^sure[,!]?\s*/i,
    ];

    for (const pattern of prefixPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
  }

  /**
   * Calculate max tokens based on mode and text length
   */
  private calculateMaxTokens(
    text: string,
    mode: RewriteMode,
    options?: RewriteOptions,
  ): number {
    if (options?.maxTokens) {
      return options.maxTokens;
    }

    // Rough estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(text.length / 4);

    switch (mode) {
      case 'shorten':
        // Allow for same length (in case shortening isn't dramatic)
        return Math.max(estimatedTokens, 100);
      case 'expand':
        // Allow for 3x expansion
        return Math.max(estimatedTokens * 3, 500);
      case 'simplify':
        // Usually similar length or slightly longer
        return Math.max(estimatedTokens * 1.5, 200);
      case 'professional':
      case 'casual':
      case 'academic':
        // Tone changes usually keep similar length
        return Math.max(estimatedTokens * 1.5, 200);
      case 'improve':
        // Improvements usually keep similar length
        return Math.max(estimatedTokens * 1.5, 200);
      default:
        return Math.max(estimatedTokens * 2, 300);
    }
  }

  /**
   * Calculate statistics for a rewrite
   */
  private calculateStats(original: string, rewritten: string): RewriteStats {
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
   * Get available rewrite modes
   */
  static getModes(): RewriteMode[] {
    return [
      'shorten',
      'expand',
      'simplify',
      'professional',
      'casual',
      'academic',
      'improve',
    ];
  }
}
