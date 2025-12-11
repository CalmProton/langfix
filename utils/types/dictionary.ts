/**
 * Dictionary & Custom Rules Types
 * TypeBox schemas for personal dictionary and custom rules
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Personal Dictionary
// ============================================================================

export const DictionaryEntry = Type.Object({
  /** Unique identifier for the entry */
  id: Type.Optional(Type.String()),
  /** The word or phrase to whitelist */
  word: Type.String(),
  /** Whether to match case exactly */
  caseSensitive: Type.Boolean({ default: false }),
  /** Optional contexts to apply this entry (e.g., 'work', 'technical') */
  context: Type.Optional(Type.Array(Type.String())),
  /** Timestamp when the word was added */
  addedAt: Type.Number(),
  /** Track how often it's been used/matched */
  usageCount: Type.Optional(Type.Number()),
  /** Optional user notes about why the word was added */
  notes: Type.Optional(Type.String()),
});
export type DictionaryEntry = Static<typeof DictionaryEntry>;

export const PersonalDictionary = Type.Array(DictionaryEntry);
export type PersonalDictionary = Static<typeof PersonalDictionary>;

// Maximum entries allowed (sync storage quota consideration)
export const MAX_DICTIONARY_ENTRIES = 500;

// ============================================================================
// Dictionary Contexts
// ============================================================================

/** User-defined context labels for organizing dictionary entries */
export const DictionaryContext = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
});
export type DictionaryContext = Static<typeof DictionaryContext>;

export const DictionaryContexts = Type.Array(DictionaryContext);
export type DictionaryContexts = Static<typeof DictionaryContexts>;

// Default contexts
export const DEFAULT_CONTEXTS: DictionaryContext[] = [
  {
    id: 'work',
    name: 'Work',
    description: 'Professional/business terminology',
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Technical jargon and abbreviations',
  },
  { id: 'personal', name: 'Personal', description: 'Personal names and terms' },
];

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
  /** User-friendly name for the rule */
  name: Type.Optional(Type.String()),
  type: RuleType,
  /** The word/phrase or regex pattern to match */
  pattern: Type.String(),
  /** Whether pattern is a regex (default: false = literal match) */
  isRegex: Type.Boolean({ default: false }),
  /** For 'replace' and 'prefer' types */
  replacement: Type.Optional(Type.String()),
  /** Explanation/message for the rule (shown to user) */
  message: Type.Optional(Type.String()),
  caseSensitive: Type.Boolean({ default: false }),
  enabled: Type.Boolean({ default: true }),
  /** Optional contexts to apply this rule */
  context: Type.Optional(Type.Array(Type.String())),
  createdAt: Type.Number(),
  /** Last time this rule was triggered */
  lastUsed: Type.Optional(Type.Number()),
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

// ============================================================================
// Import/Export Types
// ============================================================================

export const DictionaryExport = Type.Object({
  version: Type.Number(),
  exportedAt: Type.Number(),
  dictionary: PersonalDictionary,
  rules: CustomRules,
  contexts: Type.Optional(DictionaryContexts),
});
export type DictionaryExport = Static<typeof DictionaryExport>;

// Current export version for compatibility checking
export const DICTIONARY_EXPORT_VERSION = 1;
