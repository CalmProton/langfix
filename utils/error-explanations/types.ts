/**
 * Error Explanations Types
 * Types for detailed error explanations and auto-correct functionality
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Error Category
// ============================================================================

export const ErrorCategory = Type.Union([
  Type.Literal('spelling'),
  Type.Literal('grammar'),
  Type.Literal('punctuation'),
  Type.Literal('style'),
  Type.Literal('clarity'),
  Type.Literal('conciseness'),
  Type.Literal('tone'),
  Type.Literal('word_choice'),
]);
export type ErrorCategory = Static<typeof ErrorCategory>;

// ============================================================================
// Severity Levels
// ============================================================================

export const ExplanationSeverity = Type.Union([
  Type.Literal('critical'),
  Type.Literal('warning'),
  Type.Literal('suggestion'),
]);
export type ExplanationSeverity = Static<typeof ExplanationSeverity>;

// ============================================================================
// Correction Types
// ============================================================================

export const CorrectionType = Type.Union([
  Type.Literal('replacement'),
  Type.Literal('insertion'),
  Type.Literal('deletion'),
  Type.Literal('rephrase'),
]);
export type CorrectionType = Static<typeof CorrectionType>;

/**
 * Single correction option
 */
export interface CorrectionOption {
  /** Unique identifier */
  id: string;
  /** The corrected text */
  text: string;
  /** Brief description of why this correction */
  description: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Type of correction */
  type: CorrectionType;
  /** Additional metadata */
  metadata?: CorrectionMetadata;
}

export interface CorrectionMetadata {
  /** Whether this correction preserves the original intent */
  preservesIntent: boolean;
  /** Formality level change (if any) */
  formalityChange?: 'more_formal' | 'less_formal' | 'neutral';
  /** Tone change description (if any) */
  toneChange?: string;
}

// ============================================================================
// Error Explanation
// ============================================================================

/**
 * Context around the error
 */
export interface ErrorContext {
  /** The sentence containing the error */
  sentence: string;
  /** Text before the error (for context) */
  textBefore?: string;
  /** Text after the error (for context) */
  textAfter?: string;
}

/**
 * Detailed explanation content
 */
export interface ExplanationDetails {
  /** Why this was flagged as an error */
  reason: string;
  /** The underlying grammar/style rule */
  rule?: string;
  /** Examples showing incorrect vs correct usage */
  examples?: ExplanationExample[];
  /** Reference to style guide (AP, Chicago, etc.) */
  styleGuide?: string;
  /** Link to learn more (optional) */
  learnMore?: string;
}

export interface ExplanationExample {
  /** Incorrect example */
  incorrect: string;
  /** Correct version */
  correct: string;
  /** Optional explanation for this example */
  note?: string;
}

/**
 * Complete error explanation
 */
export interface ErrorExplanation {
  /** Unique identifier linking to the original error */
  errorId: string;
  /** Brief one-liner summary */
  summary: string;
  /** Error category */
  category: ErrorCategory;
  /** Severity level for UI display */
  severity: ExplanationSeverity;
  /** Detailed explanation content */
  explanation: ExplanationDetails;
  /** Available corrections */
  corrections: CorrectionOption[];
  /** Overall confidence for the top correction (0-1) */
  confidence: number;
  /** Context around the error */
  context: ErrorContext;
  /** Whether detailed explanation has been loaded */
  detailedLoaded: boolean;
  /** Timestamp when explanation was generated */
  generatedAt: number;
}

// ============================================================================
// Engine Options
// ============================================================================

export interface ExplanationOptions {
  /** Whether to include examples */
  includeExamples: boolean;
  /** Whether to include style guide references */
  includeStyleGuide: boolean;
  /** Maximum number of correction options */
  maxCorrections: number;
  /** Preferred language for explanations */
  language: string;
}

export const DEFAULT_EXPLANATION_OPTIONS: ExplanationOptions = {
  includeExamples: true,
  includeStyleGuide: true,
  maxCorrections: 5,
  language: 'en',
};

export interface CorrectionOptions {
  /** Minimum confidence threshold for corrections */
  minConfidence: number;
  /** Maximum number of alternatives */
  maxAlternatives: number;
  /** Whether to include rephrase options */
  includeRephrase: boolean;
}

export const DEFAULT_CORRECTION_OPTIONS: CorrectionOptions = {
  minConfidence: 0.3,
  maxAlternatives: 5,
  includeRephrase: true,
};

// ============================================================================
// History & Learning Types
// ============================================================================

export type CorrectionAction = 'accepted' | 'rejected' | 'modified';

export interface CorrectionRecord {
  /** Timestamp of the action */
  timestamp: number;
  /** Error type */
  errorType: string;
  /** Error category */
  category: ErrorCategory;
  /** Original text */
  original: string;
  /** Suggested correction */
  suggestion: string;
  /** What action the user took */
  action: CorrectionAction;
  /** The text user actually applied (if modified) */
  appliedText?: string;
  /** Confidence of the correction */
  confidence: number;
}

export interface HistorySummary {
  /** Total corrections for similar errors */
  total: number;
  /** Acceptance rate for similar errors */
  acceptanceRate: number;
  /** Most common action for this error type */
  preferredAction: CorrectionAction;
}

export interface UserPreferences {
  /** Preferred correction confidence threshold */
  preferredConfidence: number;
  /** Categories user tends to accept corrections for */
  acceptedCategories: ErrorCategory[];
  /** Categories user tends to reject corrections for */
  rejectedCategories: ErrorCategory[];
}

// ============================================================================
// Cache Types
// ============================================================================

export interface ExplanationCacheKey {
  /** Error type */
  type: string;
  /** Original text that was flagged */
  text: string;
  /** Rule identifier (if any) */
  rule?: string;
}

export interface CachedExplanation {
  /** The cached explanation */
  explanation: ErrorExplanation;
  /** When it was cached */
  cachedAt: number;
  /** Cache expiry timestamp */
  expiresAt: number;
  /** Number of times accessed */
  accessCount: number;
}

export interface ExplanationCacheConfig {
  /** Maximum number of entries */
  maxEntries: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Whether caching is enabled */
  enabled: boolean;
}

export const DEFAULT_CACHE_CONFIG: ExplanationCacheConfig = {
  maxEntries: 500,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  enabled: true,
};

// ============================================================================
// Settings Types
// ============================================================================

export interface ErrorHandlingSettings {
  /** Explanation preferences */
  explanationLevel: 'quick' | 'detailed' | 'auto';
  showExamples: boolean;
  showRuleReferences: boolean;

  /** Auto-correct preferences */
  enableAutoCorrect: boolean;
  autoCorrectThreshold: number; // 0-1, confidence required
  confirmBeforeCorrect: boolean;

  /** History & learning */
  enableLearning: boolean;
  trackCorrectionHistory: boolean;

  /** Privacy */
  clearHistoryOnClose: boolean;
  privacyMode: boolean; // disables all history tracking
}

export const DEFAULT_ERROR_HANDLING_SETTINGS: ErrorHandlingSettings = {
  explanationLevel: 'auto',
  showExamples: true,
  showRuleReferences: true,
  enableAutoCorrect: true,
  autoCorrectThreshold: 0.85,
  confirmBeforeCorrect: false,
  enableLearning: true,
  trackCorrectionHistory: true,
  clearHistoryOnClose: false,
  privacyMode: false,
};

// ============================================================================
// API Response Types (for TOON parsing)
// ============================================================================

export const QuickExplanationResponse = Type.Object({
  summary: Type.String(),
  category: ErrorCategory,
  severity: ExplanationSeverity,
  reason: Type.String(),
  corrections: Type.Array(
    Type.Object({
      text: Type.String(),
      description: Type.String(),
      confidence: Type.Number(),
      type: CorrectionType,
    }),
  ),
});
export type QuickExplanationResponse = Static<typeof QuickExplanationResponse>;

export const DetailedExplanationResponse = Type.Object({
  summary: Type.String(),
  category: ErrorCategory,
  severity: ExplanationSeverity,
  reason: Type.String(),
  rule: Type.Optional(Type.String()),
  styleGuide: Type.Optional(Type.String()),
  examples: Type.Optional(
    Type.Array(
      Type.Object({
        incorrect: Type.String(),
        correct: Type.String(),
        note: Type.Optional(Type.String()),
      }),
    ),
  ),
  corrections: Type.Array(
    Type.Object({
      text: Type.String(),
      description: Type.String(),
      confidence: Type.Number(),
      type: CorrectionType,
      preservesIntent: Type.Optional(Type.Boolean()),
      formalityChange: Type.Optional(
        Type.Union([
          Type.Literal('more_formal'),
          Type.Literal('less_formal'),
          Type.Literal('neutral'),
        ]),
      ),
    }),
  ),
});
export type DetailedExplanationResponse = Static<
  typeof DetailedExplanationResponse
>;
