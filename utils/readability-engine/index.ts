/**
 * Readability Engine
 * Core module for readability scoring and heatmap generation
 */

// Cache
export { type CacheKeyParams, ReadabilityCache } from './cache';
// Engine
export { quickAnalyze, ReadabilityEngine } from './engine';
// Flesch scoring
export {
  type CompositeScoreInputs,
  type CompositeScoreOptions,
  calculateCompositeScore,
  calculateFleschKincaidGrade,
  calculateFleschScore,
  calculateReadabilityMetrics,
  getGradeLevel,
  getScoreLabel,
  type ReadabilityMetrics,
  scoreToLevel,
} from './flesch';
// Language detection
export {
  detectLanguage,
  getEnglishWordRatio,
  hasNonLatinCharacters,
  isEnglish,
} from './language';
// Manager
export {
  createReadabilityManager,
  getReadabilityManager,
  initReadabilityManager,
  ReadabilityManager,
  type ReadabilityManagerOptions,
} from './manager';

// Passive voice detection
export {
  countPassiveVoice,
  detectPassiveVoice,
  hasPassiveVoice,
  type PassiveVoiceMatch,
} from './passive-voice';
// Rewrite Bridge
export {
  createSimplifyMessage,
  extractSentenceText,
  onSimplifyRequest,
  type SimplifyEventHandler,
  type SimplifyOptions,
  type SimplifyRequest,
  triggerSimplify,
} from './rewrite-bridge';
// Store
export {
  createReadabilityStore,
  type Disposer,
  getReadabilityStore,
  type ReadabilityAction,
  ReadabilityStore,
  type ReadabilityUIState,
  type ReadabilityVisibility,
} from './store';
// Syllable counting
export {
  countSentences,
  countSyllables,
  countTextSyllables,
  countWords,
  extractWords,
  getAverageWordLength,
  getComplexWordRatio,
  isComplexWord,
  splitIntoSentences,
} from './syllables';

// Types
export {
  DEFAULT_READABILITY_CONFIG,
  HEATMAP_COLORS,
  type HeatmapColor,
  type ModelRefinementResult,
  type ModelSentenceFeedback,
  type OverallScore,
  type ReadabilityCacheConfig,
  type ReadabilityEngineConfig,
  type ReadabilityLevel,
  type ReadabilityRequest,
  type ReadabilityResult,
  type ReadabilitySource,
  type SentenceScore,
} from './types';
