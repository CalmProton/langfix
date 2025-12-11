/**
 * Grammar Engine
 * AI-powered grammar, spelling, and punctuation checking
 */

// Cache implementation
export { GrammarCache } from './cache';
// Main engine class and factory
export { createGrammarEngine, GrammarEngine } from './engine';

// Filters
export {
  applyFilters,
  filterByDictionary,
  filterBySessionIgnore,
} from './filters';

// Prompts
export {
  buildGrammarCheckPrompt,
  countWords,
  GRAMMAR_FAST_SYSTEM_PROMPT,
  GRAMMAR_MAIN_SYSTEM_PROMPT,
} from './prompts';
// Types
export type {
  CacheConfig,
  CacheEntry,
  CacheKey,
  ErrorOp,
  ErrorSeverity,
  ErrorType,
  ExtendedGrammarError,
  GrammarCheckResult,
  GrammarEngineConfig,
  ParseResult,
} from './types';
export { DEFAULT_ENGINE_CONFIG } from './types';
// Validation utilities
export {
  safeParseToon,
  sortAndDedupeErrors,
  validateErrors,
} from './validation';
