/**
 * AI Provider Types
 * TypeBox schemas for AI provider configuration and communication
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Provider Configuration Types
// ============================================================================

export const ProviderType = Type.Union([
  Type.Literal('anthropic'),
  Type.Literal('openai'),
  Type.Literal('openrouter'),
  Type.Literal('custom'),
]);
export type ProviderType = Static<typeof ProviderType>;

export const ApiFormat = Type.Union([
  Type.Literal('openai'),
  Type.Literal('anthropic'),
]);
export type ApiFormat = Static<typeof ApiFormat>;

export const ModelType = Type.Union([
  Type.Literal('main'),
  Type.Literal('fast'),
]);
export type ModelType = Static<typeof ModelType>;

// Base provider configuration
const BaseProviderConfig = Type.Object({
  apiKey: Type.String(),
  mainModel: Type.String(),
  fastModel: Type.String(),
});

export const AnthropicConfig = Type.Composite([
  BaseProviderConfig,
  Type.Object({
    type: Type.Literal('anthropic'),
    baseUrl: Type.Optional(Type.String()), // default: https://api.anthropic.com
  }),
]);
export type AnthropicConfig = Static<typeof AnthropicConfig>;

export const OpenAIConfig = Type.Composite([
  BaseProviderConfig,
  Type.Object({
    type: Type.Literal('openai'),
    baseUrl: Type.Optional(Type.String()), // default: https://api.openai.com
  }),
]);
export type OpenAIConfig = Static<typeof OpenAIConfig>;

export const OpenRouterConfig = Type.Composite([
  BaseProviderConfig,
  Type.Object({
    type: Type.Literal('openrouter'),
    baseUrl: Type.Optional(Type.String()), // default: https://openrouter.ai/api
  }),
]);
export type OpenRouterConfig = Static<typeof OpenRouterConfig>;

export const CustomConfig = Type.Composite([
  BaseProviderConfig,
  Type.Object({
    type: Type.Literal('custom'),
    apiFormat: ApiFormat,
    baseUrl: Type.String(), // required for custom
    headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  }),
]);
export type CustomConfig = Static<typeof CustomConfig>;

export const ProviderConfig = Type.Union([
  AnthropicConfig,
  OpenAIConfig,
  OpenRouterConfig,
  CustomConfig,
]);
export type ProviderConfig = Static<typeof ProviderConfig>;

// ============================================================================
// AI Request/Response Types
// ============================================================================

export const MessageRole = Type.Union([
  Type.Literal('user'),
  Type.Literal('assistant'),
  Type.Literal('system'),
]);
export type MessageRole = Static<typeof MessageRole>;

export const AIMessage = Type.Object({
  role: MessageRole,
  content: Type.String(),
});
export type AIMessage = Static<typeof AIMessage>;

export const AIRequest = Type.Object({
  messages: Type.Array(AIMessage),
  modelType: ModelType,
  maxTokens: Type.Optional(Type.Number()),
  temperature: Type.Optional(Type.Number()),
  stream: Type.Optional(Type.Boolean()),
});
export type AIRequest = Static<typeof AIRequest>;

export const AIUsage = Type.Object({
  inputTokens: Type.Number(),
  outputTokens: Type.Number(),
});
export type AIUsage = Static<typeof AIUsage>;

export const AIResponse = Type.Object({
  content: Type.String(),
  usage: Type.Optional(AIUsage),
});
export type AIResponse = Static<typeof AIResponse>;

// ============================================================================
// AI Provider Interface (runtime interface, not TypeBox schema)
// ============================================================================

export interface AIProvider {
  name: string;
  sendRequest(request: AIRequest): Promise<AIResponse>;
  validateApiKey(): Promise<boolean>;
  streamRequest?(request: AIRequest): AsyncIterable<string>;
}

// ============================================================================
// Error Types
// ============================================================================

export const AIErrorCode = Type.Union([
  Type.Literal('INVALID_KEY'),
  Type.Literal('RATE_LIMIT'),
  Type.Literal('NETWORK'),
  Type.Literal('PARSE'),
  Type.Literal('UNKNOWN'),
]);
export type AIErrorCode = Static<typeof AIErrorCode>;

// Note: AIProviderError class is defined in ../ai-providers/errors.ts

// ============================================================================
// Default Models by Provider
// ============================================================================

export const DEFAULT_MODELS = {
  anthropic: {
    main: 'claude-sonnet-4-20250514',
    fast: 'claude-haiku-4-20250514',
  },
  openai: {
    main: 'gpt-4o',
    fast: 'gpt-4o-mini',
  },
  openrouter: {
    main: 'anthropic/claude-sonnet-4',
    fast: 'anthropic/claude-haiku-4',
  },
} as const;

export const DEFAULT_BASE_URLS = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
} as const;
