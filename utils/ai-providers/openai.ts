/**
 * OpenAI Provider
 * Implementation using openai SDK
 * Also used for OpenAI-compatible APIs (OpenRouter, custom providers)
 */
import OpenAI from 'openai';
import type {
  AIRequest,
  AIResponse,
  CustomConfig,
  OpenAIConfig,
  OpenRouterConfig,
} from '#utils/types';
import { DEFAULT_BASE_URLS } from '#utils/types';
import { BaseProvider } from './base';
import { AIProviderError } from './errors';

type OpenAICompatibleConfig =
  | Omit<OpenAIConfig, 'type'>
  | Omit<OpenRouterConfig, 'type'>
  | Omit<CustomConfig, 'type'>;

export class OpenAIProvider extends BaseProvider {
  name: string;
  private client: OpenAI;
  private extraHeaders?: Record<string, string>;

  constructor(config: OpenAICompatibleConfig, providerName = 'OpenAI') {
    super(config);
    this.name = providerName;

    // Handle custom headers for custom providers
    this.extraHeaders = 'headers' in config ? config.headers : undefined;

    // Determine base URL
    let baseUrl: string;
    if (config.baseUrl) {
      baseUrl = config.baseUrl;
    } else if (providerName === 'OpenRouter') {
      baseUrl = DEFAULT_BASE_URLS.openrouter;
    } else {
      baseUrl = DEFAULT_BASE_URLS.openai;
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: baseUrl,
      defaultHeaders: this.extraHeaders,
    });
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.getModel(request.modelType),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';

      return {
        content,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
            }
          : undefined,
      };
    } catch (error) {
      throw AIProviderError.fromError(error);
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Make a minimal request to validate the key
      await this.client.chat.completions.create({
        model: this.config.fastModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (error) {
      const aiError = AIProviderError.fromError(error);
      if (aiError.code === 'INVALID_KEY') {
        return false;
      }
      // For other errors (rate limit, network), assume key might be valid
      throw aiError;
    }
  }

  async *streamRequest(request: AIRequest): AsyncIterable<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.getModel(request.modelType),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (error) {
      throw AIProviderError.fromError(error);
    }
  }
}

/**
 * OpenRouter Provider (uses OpenAI-compatible API)
 */
export class OpenRouterProvider extends OpenAIProvider {
  constructor(config: Omit<OpenRouterConfig, 'type'>) {
    super(config, 'OpenRouter');
  }
}
