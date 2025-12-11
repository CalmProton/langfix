/**
 * Metrics Types
 * TypeBox schemas and types for word count, reading time, and text statistics
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Text Metrics
// ============================================================================

export const TextMetrics = Type.Object({
  /** Total word count (non-whitespace word boundary) */
  words: Type.Number(),
  /** Total character count including spaces */
  charactersWithSpaces: Type.Number(),
  /** Total character count excluding spaces */
  charactersWithoutSpaces: Type.Number(),
  /** Sentence count (based on `.`, `!`, `?` boundaries) */
  sentences: Type.Number(),
  /** Paragraph count (based on line breaks) */
  paragraphs: Type.Number(),
  /** Average word length (characters per word) */
  averageWordLength: Type.Number(),
  /** Average sentence length (words per sentence) */
  averageSentenceLength: Type.Number(),
});
export type TextMetrics = Static<typeof TextMetrics>;

// ============================================================================
// Time Metrics
// ============================================================================

export const TimeValue = Type.Object({
  /** Minutes component */
  minutes: Type.Number(),
  /** Seconds component */
  seconds: Type.Number(),
});
export type TimeValue = Static<typeof TimeValue>;

export const TimeMetrics = Type.Object({
  /** Estimated reading time */
  readingTime: TimeValue,
  /** Estimated speaking time (for presentations) */
  speakingTime: TimeValue,
});
export type TimeMetrics = Static<typeof TimeMetrics>;

// ============================================================================
// Metrics State
// ============================================================================

export const MetricsState = Type.Object({
  /** Text-based metrics */
  text: TextMetrics,
  /** Time-based metrics */
  time: TimeMetrics,
  /** Timestamp when metrics were computed */
  timestamp: Type.Number(),
});
export type MetricsState = Static<typeof MetricsState>;

// ============================================================================
// Display Mode
// ============================================================================

export const MetricsDisplayMode = Type.Union([
  Type.Literal('pill'),
  Type.Literal('panel'),
  Type.Literal('inline'),
  Type.Literal('hidden'),
]);
export type MetricsDisplayMode = Static<typeof MetricsDisplayMode>;

// ============================================================================
// Position
// ============================================================================

export const MetricsPosition = Type.Union([
  Type.Literal('top-right'),
  Type.Literal('top-left'),
  Type.Literal('bottom-right'),
  Type.Literal('bottom-left'),
]);
export type MetricsPosition = Static<typeof MetricsPosition>;

// ============================================================================
// Character Count Mode
// ============================================================================

export const CharacterCountMode = Type.Union([
  Type.Literal('with-spaces'),
  Type.Literal('without-spaces'),
]);
export type CharacterCountMode = Static<typeof CharacterCountMode>;

// ============================================================================
// Metrics Settings
// ============================================================================

// ============================================================================
// Custom Position
// ============================================================================

export const MetricsCustomPosition = Type.Object({
  /** Storage mode */
  mode: Type.Union([Type.Literal('ratio'), Type.Literal('px')]),
  /** X coordinate (ratio: 0..1 of viewport width, px: pixels from left) */
  x: Type.Number(),
  /** Y coordinate (ratio: 0..1 of viewport height, px: pixels from top) */
  y: Type.Number(),
});
export type MetricsCustomPosition = Static<typeof MetricsCustomPosition>;

// ============================================================================
// Metrics Settings
// ============================================================================

export const MetricsSettings = Type.Object({
  /** Whether metrics display is enabled */
  enabled: Type.Boolean({ default: true }),
  /** Display mode for the metrics overlay */
  displayMode: MetricsDisplayMode,
  /** Position of the metrics overlay */
  position: MetricsPosition,
  /** Whether to show reading time estimate */
  showReadingTime: Type.Boolean({ default: true }),
  /** Whether to show speaking time estimate */
  showSpeakingTime: Type.Boolean({ default: false }),
  /** Reading speed in words per minute */
  readingSpeed: Type.Number({ default: 238 }),
  /** Speaking speed in words per minute */
  speakingSpeed: Type.Number({ default: 140 }),
  /** Character count display mode */
  characterCountMode: CharacterCountMode,
});
export type MetricsSettings = Static<typeof MetricsSettings>;

export const DEFAULT_METRICS_SETTINGS: MetricsSettings = {
  enabled: true,
  displayMode: 'pill',
  position: 'bottom-right',
  showReadingTime: true,
  showSpeakingTime: false,
  readingSpeed: 238,
  speakingSpeed: 140,
  characterCountMode: 'with-spaces',
};

// ============================================================================
// Empty/Default States
// ============================================================================

export const EMPTY_TEXT_METRICS: TextMetrics = {
  words: 0,
  charactersWithSpaces: 0,
  charactersWithoutSpaces: 0,
  sentences: 0,
  paragraphs: 0,
  averageWordLength: 0,
  averageSentenceLength: 0,
};

export const EMPTY_TIME_METRICS: TimeMetrics = {
  readingTime: { minutes: 0, seconds: 0 },
  speakingTime: { minutes: 0, seconds: 0 },
};

export const EMPTY_METRICS_STATE: MetricsState = {
  text: EMPTY_TEXT_METRICS,
  time: EMPTY_TIME_METRICS,
  timestamp: 0,
};
