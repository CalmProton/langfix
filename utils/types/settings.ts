/**
 * Settings Types
 * TypeBox schemas for extension settings and feature configuration
 */
import { Type, type Static } from '@sinclair/typebox';
import { ProviderType, ApiFormat } from './ai-provider';

// ============================================================================
// Feature Settings
// ============================================================================

export const FeatureSettings = Type.Object({
  // Core
  grammarCheck: Type.Boolean({ default: true }),
  spellCheck: Type.Boolean({ default: true }),
  punctuationCheck: Type.Boolean({ default: true }),

  // Style
  styleAnalysis: Type.Boolean({ default: true }),
  passiveVoiceDetection: Type.Boolean({ default: true }),
  adverbDetection: Type.Boolean({ default: false }),

  // Readability
  readabilityScore: Type.Boolean({ default: true }),
  readabilityHeatmap: Type.Boolean({ default: false }),

  // Enhancement
  synonymSuggestions: Type.Boolean({ default: true }),
  rewritingSuggestions: Type.Boolean({ default: true }),
  toneDetection: Type.Boolean({ default: false }),

  // Utility
  wordCount: Type.Boolean({ default: true }),
  autoCorrect: Type.Boolean({ default: false }),
});
export type FeatureSettings = Static<typeof FeatureSettings>;

export const DEFAULT_FEATURES: FeatureSettings = {
  grammarCheck: true,
  spellCheck: true,
  punctuationCheck: true,
  styleAnalysis: true,
  passiveVoiceDetection: true,
  adverbDetection: false,
  readabilityScore: true,
  readabilityHeatmap: false,
  synonymSuggestions: true,
  rewritingSuggestions: true,
  toneDetection: false,
  wordCount: true,
  autoCorrect: false,
};

// ============================================================================
// Theme Settings
// ============================================================================

export const ThemeType = Type.Union([
  Type.Literal('auto'),
  Type.Literal('light'),
  Type.Literal('dark'),
]);
export type ThemeType = Static<typeof ThemeType>;

// ============================================================================
// Provider Settings (stored separately from API key)
// ============================================================================

export const ProviderSettings = Type.Object({
  type: ProviderType,
  baseUrl: Type.Optional(Type.String()),
  apiFormat: Type.Optional(ApiFormat),
  mainModel: Type.String(),
  fastModel: Type.String(),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
});
export type ProviderSettings = Static<typeof ProviderSettings>;

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  type: 'anthropic',
  mainModel: 'claude-sonnet-4-20250514',
  fastModel: 'claude-haiku-4-20250514',
};

// ============================================================================
// Behavior Settings
// ============================================================================

export const BehaviorSettings = Type.Object({
  autoCheck: Type.Boolean({ default: true }),
  checkDelay: Type.Number({ default: 500 }), // ms
  excludedSites: Type.Array(Type.String(), { default: [] }),
});
export type BehaviorSettings = Static<typeof BehaviorSettings>;

export const DEFAULT_BEHAVIOR_SETTINGS: BehaviorSettings = {
  autoCheck: true,
  checkDelay: 500,
  excludedSites: [],
};

// ============================================================================
// Appearance Settings
// ============================================================================

export const AppearanceSettings = Type.Object({
  theme: ThemeType,
  showWordCount: Type.Boolean({ default: true }),
});
export type AppearanceSettings = Static<typeof AppearanceSettings>;

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'auto',
  showWordCount: true,
};

// ============================================================================
// Combined Settings (for reference, actual storage is split)
// ============================================================================

export const LangFixSettings = Type.Object({
  provider: ProviderSettings,
  features: FeatureSettings,
  behavior: BehaviorSettings,
  appearance: AppearanceSettings,
});
export type LangFixSettings = Static<typeof LangFixSettings>;
