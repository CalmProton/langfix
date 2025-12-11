/**
 * Tone Detection & Rewrite Engine
 * AI-powered tone analysis and tone-shifting rewrites
 */

// Cache
export { getGlobalToneCache, resetGlobalToneCache, ToneCache } from './cache';

// Engine
export { createToneEngine, ToneEngine, ToneEngineError } from './engine';

// Guardrails
export {
  checkContentSafety,
  checkPreRewrite,
  containsLegalContent,
  containsPII,
  containsSafetyKeywords,
  type GuardrailResult,
  guardrails,
  isRiskyToneShift,
  type PreRewriteCheckResult,
  validateRewrite,
} from './guardrails';

// Prompts
export {
  buildToneDetectionPrompt,
  buildToneRetryPrompt,
  buildToneRewritePrompt,
  isNonRewritableContent,
  TONE_DETECTION_SYSTEM,
  TONE_REWRITE_INSTRUCTIONS,
  TONE_REWRITE_SYSTEM,
} from './prompts';

// Types
export {
  DEFAULT_TONE_CACHE_CONFIG,
  DEFAULT_TONE_ENGINE_CONFIG,
  TONE_LABELS,
  TONE_METADATA,
  type ToneCacheConfig,
  type ToneCacheEntry,
  type ToneCacheKey,
  ToneDetectionRequest,
  ToneDetectionRequest as ToneDetectionRequestSchema,
  ToneDetectionResponse,
  ToneDetectionResponse as ToneDetectionResponseSchema,
  ToneDetectionResult,
  ToneDetectionResult as ToneDetectionResultSchema,
  type ToneEngineConfig,
  ToneErrorCode,
  ToneErrorCode as ToneErrorCodeSchema,
  ToneLabel,
  ToneLabel as ToneLabelSchema,
  ToneRewriteRequest,
  ToneRewriteRequest as ToneRewriteRequestSchema,
  ToneRewriteResponse,
  ToneRewriteResponse as ToneRewriteResponseSchema,
  ToneRewriteResult,
  ToneRewriteResult as ToneRewriteResultSchema,
  ToneRewriteStats,
  ToneRewriteStats as ToneRewriteStatsSchema,
} from './types';

// Validation
export {
  parseToneDetectionResponse,
  parseToneRewriteResponse,
  type ToneDetectionParseResult,
  type ToneRewriteParseResult,
  validateLengthConstraint,
  validatePreservedContent,
  validateToneLabel,
} from './validation';
