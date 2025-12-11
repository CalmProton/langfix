/**
 * AI Provider Errors
 * Custom error classes for AI provider operations
 */
import type { AIErrorCode } from '../types';

export class AIProviderError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }

  static fromError(error: unknown): AIProviderError {
    if (error instanceof AIProviderError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Try to detect error type from message
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('invalid_api_key')
    ) {
      return new AIProviderError('Invalid API key', 'INVALID_KEY', false);
    }

    if (
      message.includes('429') ||
      message.includes('rate_limit') ||
      message.includes('too many requests')
    ) {
      return new AIProviderError('Rate limit exceeded', 'RATE_LIMIT', true);
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('ECONNREFUSED')
    ) {
      return new AIProviderError('Network error', 'NETWORK', true);
    }

    return new AIProviderError(message, 'UNKNOWN', false);
  }
}
