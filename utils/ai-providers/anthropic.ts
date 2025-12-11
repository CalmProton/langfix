/**
 * Anthropic Provider
 * Implementation using @anthropic-ai/sdk
 */
import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base';
import { AIProviderError } from './errors';
import type { AIRequest, AIResponse, AnthropicConfig } from '../types';
import { DEFAULT_BASE_URLS } from '../types';

export class AnthropicProvider extends BaseProvider {
  name = 'Anthropic';
  private client: Anthropic;

  constructor(config: Omit<AnthropicConfig, 'type'>) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl ?? DEFAULT_BASE_URLS.anthropic,
    });
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    try {
      // Extract system message if present
      const systemMessage = request.messages.find((m) => m.role === 'system');
      const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.getModel(request.modelType),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      // Extract text content
      const textContent = response.content.find((c) => c.type === 'text');
      const content = textContent?.type === 'text' ? textContent.text : '';

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw AIProviderError.fromError(error);
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Make a minimal request to validate the key
      await this.client.messages.create({
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
      // Extract system message if present
      const systemMessage = request.messages.find((m) => m.role === 'system');
      const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

      const stream = await this.client.messages.stream({
        model: this.getModel(request.modelType),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    } catch (error) {
      throw AIProviderError.fromError(error);
    }
  }
}
