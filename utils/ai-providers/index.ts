/**
 * AI Providers
 * Factory function and exports for AI provider management
 */

import type { AIProvider, ProviderConfig } from '#utils/types';
import { AnthropicProvider } from './anthropic';
import { AIProviderError } from './errors';
import { OpenAIProvider, OpenRouterProvider } from './openai';

export { AnthropicProvider } from './anthropic';
// Re-export components
export { BaseProvider } from './base';

/**
 * Create an AI provider instance based on configuration
 */
export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'anthropic':
      return new AnthropicProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        mainModel: config.mainModel,
        fastModel: config.fastModel,
      });

    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        mainModel: config.mainModel,
        fastModel: config.fastModel,
      });

    case 'openrouter':
      return new OpenRouterProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        mainModel: config.mainModel,
        fastModel: config.fastModel,
      });

    case 'custom':
      // Custom provider uses OpenAI-compatible format by default
      // For Anthropic-compatible, they'd need to use a custom implementation
      if (config.apiFormat === 'anthropic') {
        return new AnthropicProvider({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          mainModel: config.mainModel,
          fastModel: config.fastModel,
        });
      }
      return new OpenAIProvider(
        {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          mainModel: config.mainModel,
          fastModel: config.fastModel,
          headers: config.headers,
        },
        'Custom',
      );

    default:
      throw new AIProviderError(
        `Unknown provider type: ${(config as ProviderConfig).type}`,
        'UNKNOWN',
      );
  }
}

/**
 * Get provider instance from storage settings
 * This is a convenience function that combines storage access with provider creation
 */
export async function getProviderFromStorage(): Promise<AIProvider | null> {
  // Dynamic import to avoid circular dependencies
  const { getProviderConfig } = await import('../storage');
  const config = await getProviderConfig();

  if (!config || !config.apiKey) {
    return null;
  }

  return createProvider(config);
}
