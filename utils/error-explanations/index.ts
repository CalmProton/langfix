/**
 * Error Explanations Module
 * Detailed error explanations and auto-correct functionality
 */

// Auto-Correct Engine
export {
  AutoCorrectEngine,
  createAutoCorrectEngine,
  disposeAutoCorrectEngine,
  getAutoCorrectEngine,
} from './auto-correct-engine';

// Cache
export {
  disposeExplanationCache,
  ExplanationCache,
  getExplanationCache,
} from './cache';

// Confidence Scorer
export {
  ConfidenceScorer,
  createConfidenceScorer,
  getConfidenceScorer,
} from './confidence-scorer';

// Correction History
export {
  CorrectionHistory,
  createCorrectionHistory,
  disposeCorrectionHistory,
  getCorrectionHistory,
} from './correction-history';

// Explanation Engine
export {
  createExplanationEngine,
  disposeExplanationEngine,
  ExplanationEngine,
  getExplanationEngine,
} from './explanation-engine';

// Prompts
export {
  buildCorrectionsPrompt,
  buildDetailedExplanationPrompt,
  buildQuickExplanationPrompt,
  DETAILED_EXPLANATION_SYSTEM_PROMPT,
  isSimpleError,
  mapErrorTypeToCategory,
  mapSeverityToExplanationSeverity,
  QUICK_EXPLANATION_SYSTEM_PROMPT,
} from './prompts';

// Types
export type {
  CachedExplanation,
  CorrectionAction,
  CorrectionMetadata,
  CorrectionOption,
  CorrectionOptions,
  CorrectionRecord,
  CorrectionType,
  DetailedExplanationResponse,
  ErrorCategory,
  ErrorContext,
  ErrorExplanation,
  ErrorHandlingSettings,
  ExplanationCacheConfig,
  ExplanationCacheKey,
  ExplanationDetails,
  ExplanationExample,
  ExplanationOptions,
  ExplanationSeverity,
  HistorySummary,
  QuickExplanationResponse,
  UserPreferences,
} from './types';

export {
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CORRECTION_OPTIONS,
  DEFAULT_ERROR_HANDLING_SETTINGS,
  DEFAULT_EXPLANATION_OPTIONS,
} from './types';
