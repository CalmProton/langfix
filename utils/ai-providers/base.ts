/**
 * Base AI Provider
 * Abstract base class for AI provider implementations
 */
import type { AIProvider, AIRequest, AIResponse, ModelType } from '#utils/types';

export abstract class BaseProvider implements AIProvider {
  abstract name: string;

  constructor(
    protected config: {
      apiKey: string;
      baseUrl?: string;
      mainModel: string;
      fastModel: string;
    },
  ) {}

  /**
   * Get the model name based on the model type
   */
  protected getModel(modelType: ModelType): string {
    return modelType === 'main' ? this.config.mainModel : this.config.fastModel;
  }

  /**
   * Send a request to the AI provider
   */
  abstract sendRequest(request: AIRequest): Promise<AIResponse>;

  /**
   * Validate the API key by making a simple request
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Stream a request (optional)
   */
  streamRequest?(request: AIRequest): AsyncIterable<string>;
}
