/**
 * Genre Engine Types
 * TypeBox schemas for genre-based writing modes
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Formality Level
// ============================================================================

export const FormalityLevel = Type.Union([
  Type.Literal('very-low'),
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('medium-high'),
  Type.Literal('high'),
  Type.Literal('very-high'),
]);
export type FormalityLevel = Static<typeof FormalityLevel>;

// ============================================================================
// Preferred Person
// ============================================================================

export const PreferredPerson = Type.Union([
  Type.Literal('first'),
  Type.Literal('second'),
  Type.Literal('third'),
  Type.Literal('flexible'),
  Type.Literal('imperative'),
]);
export type PreferredPerson = Static<typeof PreferredPerson>;

// ============================================================================
// Vocabulary Level
// ============================================================================

export const VocabularyLevel = Type.Union([
  Type.Literal('simple'),
  Type.Literal('everyday'),
  Type.Literal('professional'),
  Type.Literal('advanced'),
  Type.Literal('technical'),
  Type.Literal('legal'),
  Type.Literal('varied'),
]);
export type VocabularyLevel = Static<typeof VocabularyLevel>;

// ============================================================================
// Sentence Complexity
// ============================================================================

export const SentenceComplexity = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('varied'),
]);
export type SentenceComplexity = Static<typeof SentenceComplexity>;

// ============================================================================
// Passive Voice Policy
// ============================================================================

export const PassiveVoicePolicy = Type.Union([
  Type.Literal('avoid'),
  Type.Literal('acceptable'),
  Type.Literal('flexible'),
]);
export type PassiveVoicePolicy = Static<typeof PassiveVoicePolicy>;

// ============================================================================
// Jargon Level
// ============================================================================

export const JargonLevel = Type.Union([
  Type.Literal('avoid'),
  Type.Literal('minimal'),
  Type.Literal('domain-specific'),
  Type.Literal('business-standard'),
  Type.Literal('technical-standard'),
  Type.Literal('legal-standard'),
]);
export type JargonLevel = Static<typeof JargonLevel>;

// ============================================================================
// Genre ID
// ============================================================================

export const GenreId = Type.Union([
  Type.Literal('academic'),
  Type.Literal('business'),
  Type.Literal('creative'),
  Type.Literal('technical'),
  Type.Literal('casual'),
  Type.Literal('journalistic'),
  Type.Literal('legal'),
]);
export type GenreId = Static<typeof GenreId>;

/**
 * All built-in genre IDs
 */
export const GENRE_IDS: GenreId[] = [
  'academic',
  'business',
  'creative',
  'technical',
  'casual',
  'journalistic',
  'legal',
];

// ============================================================================
// Genre Configuration Schema
// ============================================================================

export const GenreConfigSchema = Type.Object({
  /** Unique identifier for the genre */
  id: Type.String(),
  /** Display name */
  name: Type.String(),
  /** Short description of the genre */
  description: Type.String(),
  /** Icon emoji for the genre */
  icon: Type.String(),

  // Style parameters
  /** Formality level for the writing */
  formality: FormalityLevel,
  /** Whether contractions are allowed */
  allowContractions: Type.Boolean(),
  /** Preferred grammatical person */
  preferredPerson: PreferredPerson,
  /** Vocabulary complexity level */
  vocabularyLevel: VocabularyLevel,
  /** Expected sentence complexity */
  sentenceComplexity: SentenceComplexity,
  /** Policy on passive voice usage */
  passiveVoice: PassiveVoicePolicy,
  /** Level of domain jargon */
  jargonLevel: JargonLevel,

  // Special rules (optional)
  /** Allow sentence fragments for stylistic effect */
  allowedFragments: Type.Optional(Type.Boolean()),
  /** Allow emoticons/emojis */
  allowedEmoticons: Type.Optional(Type.Boolean()),
  /** Allow relaxed punctuation */
  relaxedPunctuation: Type.Optional(Type.Boolean()),
  /** Require objective tone */
  objectiveTone: Type.Optional(Type.Boolean()),
  /** Require consistent terminology */
  consistentTerminology: Type.Optional(Type.Boolean()),
  /** Require defined terms for clarity */
  requireDefinedTerms: Type.Optional(Type.Boolean()),

  // Prompt modifications
  /** Suffix to add to system prompts */
  systemPromptSuffix: Type.String(),
  /** Modifiers for grammar checking */
  grammarCheckModifiers: Type.Array(Type.String()),
  /** Modifiers for style checking */
  styleCheckModifiers: Type.Array(Type.String()),
  /** Instructions for rewriting */
  rewriteInstructions: Type.String(),
});
export type GenreConfig = Static<typeof GenreConfigSchema>;

// ============================================================================
// Custom Genre
// ============================================================================

export const CustomGenreSchema = Type.Intersect([
  GenreConfigSchema,
  Type.Object({
    /** Flag indicating this is a user-created genre */
    isCustom: Type.Literal(true),
    /** The built-in genre this was based on */
    baseGenre: Type.String(),
    /** User modifications applied to base genre */
    userModifications: Type.Partial(GenreConfigSchema),
  }),
]);
export type CustomGenre = Static<typeof CustomGenreSchema>;

// ============================================================================
// Genre History Entry
// ============================================================================

export const GenreHistoryEntrySchema = Type.Object({
  /** URL where the genre was used */
  url: Type.String(),
  /** Domain of the URL */
  domain: Type.String(),
  /** Genre ID that was used */
  genreUsed: Type.String(),
  /** Timestamp when the genre was used */
  timestamp: Type.Number(),
});
export type GenreHistoryEntry = Static<typeof GenreHistoryEntrySchema>;

// ============================================================================
// User Genre Preferences
// ============================================================================

export const UserGenrePreferencesSchema = Type.Object({
  /** Current genre ID or 'auto' for auto-detection */
  currentGenre: Type.Union([Type.String(), Type.Literal('auto')]),
  /** Whether to auto-detect genre based on context */
  autoDetectGenre: Type.Boolean(),
  /** User-created custom genres */
  customGenres: Type.Array(CustomGenreSchema),
  /** History of genre usage per URL/domain */
  genreHistory: Type.Array(GenreHistoryEntrySchema),
});
export type UserGenrePreferences = Static<typeof UserGenrePreferencesSchema>;

// ============================================================================
// Detection Context
// ============================================================================

export const DetectionContextSchema = Type.Object({
  /** Current page URL */
  url: Type.String(),
  /** Text being analyzed */
  text: Type.String(),
  /** Type of input element (e.g., contenteditable, textarea) */
  elementType: Type.Optional(Type.String()),
  /** Page title */
  pageTitle: Type.Optional(Type.String()),
});
export type DetectionContext = Static<typeof DetectionContextSchema>;

// ============================================================================
// Genre Detection Result
// ============================================================================

export const GenreDetectionResultSchema = Type.Object({
  /** Detected genre ID */
  genreId: Type.String(),
  /** Confidence score 0-1 */
  confidence: Type.Number(),
  /** Evidence or reason for detection */
  reason: Type.String(),
  /** Whether this was from cache/history */
  fromHistory: Type.Boolean(),
});
export type GenreDetectionResult = Static<typeof GenreDetectionResultSchema>;

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_GENRE_PREFERENCES: UserGenrePreferences = {
  currentGenre: 'auto',
  autoDetectGenre: true,
  customGenres: [],
  genreHistory: [],
};

// ============================================================================
// Genre Metadata for UI
// ============================================================================

export interface GenreMetadata {
  id: GenreId;
  name: string;
  description: string;
  icon: string;
  formalityLabel: string;
}

export const GENRE_METADATA: Record<GenreId, GenreMetadata> = {
  academic: {
    id: 'academic',
    name: 'Academic',
    description: 'Formal writing for research papers, essays, and academic publications',
    icon: '🎓',
    formalityLabel: 'High',
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Professional communication for emails, reports, and business documents',
    icon: '💼',
    formalityLabel: 'Medium-High',
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Expressive writing for stories, blogs, and creative content',
    icon: '✍️',
    formalityLabel: 'Flexible',
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    description: 'Clear documentation, manuals, and technical specifications',
    icon: '⚙️',
    formalityLabel: 'Medium',
  },
  casual: {
    id: 'casual',
    name: 'Casual',
    description: 'Conversational writing for social media and personal communication',
    icon: '💬',
    formalityLabel: 'Low',
  },
  journalistic: {
    id: 'journalistic',
    name: 'Journalistic',
    description: 'Clear, factual writing for news articles and blog posts',
    icon: '📰',
    formalityLabel: 'Medium',
  },
  legal: {
    id: 'legal',
    name: 'Legal',
    description: 'Precise language for contracts, policies, and legal documents',
    icon: '⚖️',
    formalityLabel: 'Very High',
  },
};
