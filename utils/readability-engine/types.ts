/**
 * Readability Engine Types
 * TypeBox schemas and types for readability scoring and heatmap
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Readability Level
// ============================================================================

export const ReadabilityLevel = Type.Union([
  Type.Literal('easy'),
  Type.Literal('moderate'),
  Type.Literal('hard'),
  Type.Literal('unknown'),
]);
export type ReadabilityLevel = Static<typeof ReadabilityLevel>;

// ============================================================================
// Sentence Score
// ============================================================================

export const SentenceScore = Type.Object({
  /** Stable ID derived from text hash + offsets */
  id: Type.String(),
  /** Range in the extracted plain text */
  range: Type.Object({
    start: Type.Number(),
    end: Type.Number(),
  }),
  /** Readability score 0-100 (higher = easier to read) */
  score: Type.Number(),
  /** Readability level category */
  level: ReadabilityLevel,
  /** Reasons why the sentence is hard/easy to read */
  reasons: Type.Array(Type.String()),
  /** Number of tokens in the sentence */
  tokenCount: Type.Number(),
  /** Word count */
  wordCount: Type.Number(),
  /** Syllable count */
  syllableCount: Type.Number(),
  /** Average word length */
  avgWordLength: Type.Number(),
  /** Complex word ratio (words >= 3 syllables) */
  complexWordRatio: Type.Number(),
  /** Whether passive voice was detected */
  hasPassiveVoice: Type.Boolean(),
});
export type SentenceScore = Static<typeof SentenceScore>;

// ============================================================================
// Overall Score
// ============================================================================

export const OverallScore = Type.Object({
  /** Readability score 0-100 (higher = easier to read) */
  score: Type.Number(),
  /** Readability level category */
  level: ReadabilityLevel,
  /** Summary reasons for overall readability */
  reasons: Type.Array(Type.String()),
  /** Human-readable grade level (e.g., "5th grade", "College") */
  gradeLevel: Type.String(),
  /** Flesch Reading Ease score (unmodified) */
  fleschScore: Type.Number(),
  /** Total word count */
  wordCount: Type.Number(),
  /** Total sentence count */
  sentenceCount: Type.Number(),
  /** Average words per sentence */
  avgWordsPerSentence: Type.Number(),
  /** Average syllables per word */
  avgSyllablesPerWord: Type.Number(),
});
export type OverallScore = Static<typeof OverallScore>;

// ============================================================================
// Readability Result
// ============================================================================

export const ReadabilitySource = Type.Union([
  Type.Literal('local'),
  Type.Literal('model'),
  Type.Literal('blended'),
]);
export type ReadabilitySource = Static<typeof ReadabilitySource>;

export const ReadabilityResult = Type.Object({
  /** Overall document/selection score */
  overall: OverallScore,
  /** Per-sentence scores for heatmap */
  sentences: Type.Array(SentenceScore),
  /** Detected language or 'unknown' */
  language: Type.String(),
  /** Timestamp when analysis was computed */
  computedAt: Type.Number(),
  /** Source of the analysis */
  source: ReadabilitySource,
  /** Processing time in milliseconds */
  processingTime: Type.Number(),
  /** Whether result was from cache */
  fromCache: Type.Optional(Type.Boolean()),
});
export type ReadabilityResult = Static<typeof ReadabilityResult>;

// ============================================================================
// Analysis Request
// ============================================================================

export interface ReadabilityRequest {
  /** Text to analyze */
  text: string;
  /** Pre-parsed sentence boundaries (optional - will be computed if not provided) */
  sentenceBoundaries?: Array<{ start: number; end: number }>;
  /** Whether to use AI model for refinement (default: false) */
  useModelRefinement?: boolean;
  /** Context hint for language detection */
  languageHint?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ReadabilityCacheConfig {
  /** Max number of cached entries */
  maxEntries: number;
  /** Max cache size in bytes */
  maxBytes: number;
  /** TTL in milliseconds */
  ttlMs: number;
}

export interface ReadabilityEngineConfig {
  /** Enable caching */
  enableCache: boolean;
  /** Cache configuration */
  cacheConfig: ReadabilityCacheConfig;
  /** Timeout for model refinement in milliseconds */
  modelTimeoutMs: number;
  /** Number of hardest sentences to send for model refinement */
  topKSentences: number;
  /** Score threshold for "easy" level (score >= this) */
  easyThreshold: number;
  /** Score threshold for "hard" level (score <= this) */
  hardThreshold: number;
}

export const DEFAULT_READABILITY_CONFIG: ReadabilityEngineConfig = {
  enableCache: true,
  cacheConfig: {
    maxEntries: 100,
    maxBytes: 512 * 1024, // 512KB
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
  modelTimeoutMs: 600,
  topKSentences: 3,
  easyThreshold: 70,
  hardThreshold: 40,
};

// ============================================================================
// Heatmap Color Mapping
// ============================================================================

export interface HeatmapColor {
  /** CSS background color */
  background: string;
  /** CSS text color for accessibility */
  text: string;
  /** Opacity value (0-1) */
  opacity: number;
}

export const HEATMAP_COLORS: Record<ReadabilityLevel, HeatmapColor> = {
  easy: {
    background: 'rgba(34, 197, 94, 0.15)', // green-500
    text: 'inherit',
    opacity: 0.15,
  },
  moderate: {
    background: 'rgba(234, 179, 8, 0.20)', // yellow-500
    text: 'inherit',
    opacity: 0.20,
  },
  hard: {
    background: 'rgba(239, 68, 68, 0.25)', // red-500
    text: 'inherit',
    opacity: 0.25,
  },
  unknown: {
    background: 'transparent',
    text: 'inherit',
    opacity: 0,
  },
};

// ============================================================================
// Model Refinement Types
// ============================================================================

export const ModelSentenceFeedback = Type.Object({
  /** Sentence ID that was analyzed */
  sentenceId: Type.String(),
  /** Suggested improvements */
  suggestions: Type.Array(Type.String()),
  /** Additional reasons for difficulty */
  additionalReasons: Type.Array(Type.String()),
  /** Adjusted score from model (optional) */
  adjustedScore: Type.Optional(Type.Number()),
});
export type ModelSentenceFeedback = Static<typeof ModelSentenceFeedback>;

export const ModelRefinementResult = Type.Object({
  feedback: Type.Array(ModelSentenceFeedback),
});
export type ModelRefinementResult = Static<typeof ModelRefinementResult>;
