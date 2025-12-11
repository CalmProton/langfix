/**
 * Grammar Engine Types
 * Extended types for grammar checking with validation and caching
 */
import { type Static, Type } from '@sinclair/typebox';
import type { ModelType } from '../types';

// ============================================================================
// Grammar Check Result
// ============================================================================

export const GrammarCheckResult = Type.Object({
  /** Array of detected grammar/spelling/punctuation errors */
  errors: Type.Array(
    Type.Object({
      type: Type.Union([
        Type.Literal('grammar'),
        Type.Literal('spelling'),
        Type.Literal('punctuation'),
        Type.Literal('contextual'),
      ]),
      op: Type.Union([
        Type.Literal('insert'),
        Type.Literal('replace'),
        Type.Literal('delete'),
      ]),
      original: Type.String(),
      suggestion: Type.String(),
      startIndex: Type.Number(),
      endIndex: Type.Number(),
      severity: Type.Union([
        Type.Literal('error'),
        Type.Literal('warning'),
        Type.Literal('info'),
      ]),
      explanation: Type.String(),
      alternatives: Type.Optional(Type.Array(Type.String())),
    }),
  ),
  /** Processing time in milliseconds */
  processingTime: Type.Number(),
  /** Which model was used */
  modelUsed: Type.Union([Type.Literal('main'), Type.Literal('fast')]),
  /** Whether result came from cache */
  cacheHit: Type.Boolean(),
  /** Non-fatal parser warnings */
  parseErrors: Type.Optional(Type.Array(Type.String())),
});
export type GrammarCheckResult = Static<typeof GrammarCheckResult>;

// ============================================================================
// Extended Grammar Error (with op field)
// ============================================================================

export const ExtendedGrammarError = Type.Object({
  type: Type.Union([
    Type.Literal('grammar'),
    Type.Literal('spelling'),
    Type.Literal('punctuation'),
    Type.Literal('contextual'),
  ]),
  op: Type.Union([
    Type.Literal('insert'),
    Type.Literal('replace'),
    Type.Literal('delete'),
  ]),
  original: Type.String(),
  suggestion: Type.String(),
  startIndex: Type.Number(),
  endIndex: Type.Number(),
  severity: Type.Union([
    Type.Literal('error'),
    Type.Literal('warning'),
    Type.Literal('info'),
  ]),
  explanation: Type.String(),
  alternatives: Type.Optional(Type.Array(Type.String())),
});
export type ExtendedGrammarError = Static<typeof ExtendedGrammarError>;

export type ErrorType = 'grammar' | 'spelling' | 'punctuation' | 'contextual';
export type ErrorOp = 'insert' | 'replace' | 'delete';
export type ErrorSeverity = 'error' | 'warning' | 'info';

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheKey {
  text: string;
  model: ModelType;
  promptVersion: string;
  temperature: number;
}

export interface CacheEntry {
  result: GrammarCheckResult;
  timestamp: number;
}

export interface CacheConfig {
  /** Maximum number of entries */
  maxEntries: number;
  /** Maximum total cache size in bytes (approximate) */
  maxBytes: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
}

// ============================================================================
// Engine Configuration
// ============================================================================

export interface GrammarEngineConfig {
  /** Timeout for fast model requests in ms */
  fastTimeoutMs: number;
  /** Timeout for main model requests in ms */
  mainTimeoutMs: number;
  /** Word count threshold for using main model */
  mainModelWordThreshold: number;
  /** Whether to enable caching */
  enableCache: boolean;
  /** Cache configuration */
  cacheConfig: CacheConfig;
}

export const DEFAULT_ENGINE_CONFIG: GrammarEngineConfig = {
  fastTimeoutMs: 7000,
  mainTimeoutMs: 15000,
  mainModelWordThreshold: 200,
  enableCache: true,
  cacheConfig: {
    maxEntries: 200,
    maxBytes: 1024 * 1024, // 1MB
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
};

// ============================================================================
// Parse Result
// ============================================================================

export interface ParseResult {
  errors: ExtendedGrammarError[];
  warnings: string[];
}
