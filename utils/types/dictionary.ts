/**
 * Dictionary & Custom Rules Types
 * TypeBox schemas for personal dictionary and custom rules
 */
import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Personal Dictionary
// ============================================================================

export const DictionaryEntry = Type.Object({
  word: Type.String(),
  addedAt: Type.Number(), // timestamp
});
export type DictionaryEntry = Static<typeof DictionaryEntry>;

export const PersonalDictionary = Type.Array(DictionaryEntry);
export type PersonalDictionary = Static<typeof PersonalDictionary>;

// Maximum entries allowed (sync storage quota consideration)
export const MAX_DICTIONARY_ENTRIES = 500;

// ============================================================================
// Custom Rules
// ============================================================================

export const RuleType = Type.Union([
  Type.Literal('replace'), // Always replace X with Y
  Type.Literal('ignore'), // Never flag this as an error
  Type.Literal('prefer'), // Prefer X over Y (suggestion only)
]);
export type RuleType = Static<typeof RuleType>;

export const CustomRule = Type.Object({
  id: Type.String(),
  type: RuleType,
  pattern: Type.String(), // The word/phrase to match
  replacement: Type.Optional(Type.String()), // For 'replace' and 'prefer' types
  caseSensitive: Type.Boolean({ default: false }),
  enabled: Type.Boolean({ default: true }),
  createdAt: Type.Number(),
});
export type CustomRule = Static<typeof CustomRule>;

export const CustomRules = Type.Array(CustomRule);
export type CustomRules = Static<typeof CustomRules>;

// Maximum rules allowed (sync storage quota consideration)
export const MAX_CUSTOM_RULES = 200;

// ============================================================================
// Session-specific ignored words (cleared on browser close)
// ============================================================================

export const SessionIgnoredWords = Type.Array(Type.String());
export type SessionIgnoredWords = Static<typeof SessionIgnoredWords>;
