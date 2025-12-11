/**
 * Metrics Module
 * Word count, reading time, and text statistics utilities
 */

// Calculator
export {
  createReadingTimeCalculator,
  DEFAULT_READING_WPM,
  DEFAULT_SPEAKING_WPM,
  estimatePages,
  formatReadingTime,
  formatSpeakingTime,
  formatTimeValue,
  getReadingTimeCalculator,
  READING_SPEED_PRESETS,
  ReadingTimeCalculator,
  SPEAKING_SPEED_PRESETS,
  type TimeCalculatorOptions,
} from './calculator';
// Counter
export {
  calculateTextMetrics,
  countParagraphs,
  countSentences,
  countWords,
  getMetricsCounter,
  MetricsCounter,
} from './counter';

// Manager
export {
  disposeMetricsManager,
  getMetricsManager,
  initMetricsManager,
  MetricsManager,
  type MetricsManagerOptions,
  type MetricsUpdateListener,
} from './manager';
// Types
export {
  type CharacterCountMode,
  DEFAULT_METRICS_SETTINGS,
  EMPTY_METRICS_STATE,
  EMPTY_TEXT_METRICS,
  EMPTY_TIME_METRICS,
  type MetricsDisplayMode,
  type MetricsPosition,
  type MetricsSettings,
  type MetricsState,
  type TextMetrics,
  type TimeMetrics,
  type TimeValue,
} from './types';
// UI Manager
export {
  disposeMetricsUIManager,
  getMetricsUIManager,
  MetricsUIManager,
} from './ui-manager';
