/**
 * Rewrite Engine Types
 * TypeBox schemas for rewrite functionality
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Rewrite Modes
// ============================================================================

export const RewriteMode = Type.Union([
  Type.Literal('shorten'),
  Type.Literal('expand'),
  Type.Literal('simplify'),
  Type.Literal('professional'),
  Type.Literal('casual'),
  Type.Literal('academic'),
  Type.Literal('improve'),
]);
export type RewriteMode = Static<typeof RewriteMode>;

// ============================================================================
// Rewrite Options
// ============================================================================

export const RewriteOptions = Type.Object({
  /** Additional instructions for the rewrite */
  instructions: Type.Optional(Type.String()),
  /** Temperature for LLM generation (0.0-1.0) */
  temperature: Type.Optional(Type.Number()),
  /** Maximum tokens for response */
  maxTokens: Type.Optional(Type.Number()),
  /** Language of the text */
  language: Type.Optional(Type.String()),
});
export type RewriteOptions = Static<typeof RewriteOptions>;

// ============================================================================
// Rewrite Statistics
// ============================================================================

export const RewriteStats = Type.Object({
  /** Word count of original text */
  originalWords: Type.Number(),
  /** Word count of rewritten text */
  rewrittenWords: Type.Number(),
  /** Percentage change in word count */
  changePercent: Type.Number(),
  /** Character count of original text */
  originalChars: Type.Number(),
  /** Character count of rewritten text */
  rewrittenChars: Type.Number(),
});
export type RewriteStats = Static<typeof RewriteStats>;

// ============================================================================
// Rewrite Result
// ============================================================================

export const RewriteResult = Type.Object({
  /** Original text that was rewritten */
  original: Type.String(),
  /** Rewritten text */
  rewritten: Type.String(),
  /** Mode used for rewriting */
  mode: RewriteMode,
  /** Statistics about the rewrite */
  stats: RewriteStats,
  /** Processing time in milliseconds */
  processingTime: Type.Number(),
});
export type RewriteResult = Static<typeof RewriteResult>;

// ============================================================================
// Rewrite Error Codes
// ============================================================================

export const RewriteErrorCode = Type.Union([
  Type.Literal('TOO_SHORT'),
  Type.Literal('TOO_LONG'),
  Type.Literal('API_ERROR'),
  Type.Literal('NO_CHANGE'),
  Type.Literal('INVALID_MODE'),
  Type.Literal('EMPTY_RESPONSE'),
]);
export type RewriteErrorCode = Static<typeof RewriteErrorCode>;

// ============================================================================
// Engine Configuration
// ============================================================================

export interface RewriteEngineConfig {
  /** Minimum text length (characters) for rewriting */
  minTextLength: number;
  /** Maximum text length (characters) for rewriting */
  maxTextLength: number;
  /** Default temperature for rewrites */
  defaultTemperature: number;
  /** Enable caching of rewrite results */
  enableCache: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl: number;
}

export const DEFAULT_REWRITE_CONFIG: RewriteEngineConfig = {
  minTextLength: 10,
  maxTextLength: 10000,
  defaultTemperature: 0.7,
  enableCache: true,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// Mode Metadata
// ============================================================================

export interface RewriteModeMetadata {
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
}

export const REWRITE_MODE_METADATA: Record<RewriteMode, RewriteModeMetadata> = {
  shorten: {
    label: 'Shorten',
    description: 'Reduce length while keeping meaning',
    icon: 'compress',
    shortcut: 'Ctrl+Shift+S',
  },
  expand: {
    label: 'Expand',
    description: 'Add detail and elaboration',
    icon: 'expand',
    shortcut: 'Ctrl+Shift+E',
  },
  simplify: {
    label: 'Simplify',
    description: 'Use simpler words and sentences',
    icon: 'lightbulb',
    shortcut: 'Ctrl+Shift+L',
  },
  professional: {
    label: 'Professional',
    description: 'Formal business tone',
    icon: 'briefcase',
  },
  casual: {
    label: 'Casual',
    description: 'Friendly, conversational tone',
    icon: 'chat',
  },
  academic: {
    label: 'Academic',
    description: 'Scholarly, precise language',
    icon: 'graduation-cap',
  },
  improve: {
    label: 'Improve',
    description: 'General enhancement',
    icon: 'sparkles',
    shortcut: 'Ctrl+Shift+I',
  },
};
