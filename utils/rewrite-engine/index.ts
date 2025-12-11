/**
 * Rewrite Engine
 * AI-powered text rewriting with different style modes
 */

// Engine
export { RewriteEngine, RewriteError } from './engine';

// Prompts
export {
  buildRetryPrompt,
  buildRewritePrompt,
  calculateChangePercent,
  countChars,
  countWords,
  MODE_PROMPTS,
  REWRITE_SYSTEM_PROMPT,
} from './prompts';

// Types
export {
  DEFAULT_REWRITE_CONFIG,
  REWRITE_MODE_METADATA,
  type RewriteEngineConfig,
  type RewriteMode,
  RewriteMode as RewriteModeSchema,
  type RewriteModeMetadata,
  type RewriteOptions,
  RewriteOptions as RewriteOptionsSchema,
  type RewriteResult,
  RewriteResult as RewriteResultSchema,
  type RewriteStats,
  RewriteStats as RewriteStatsSchema,
} from './types';
