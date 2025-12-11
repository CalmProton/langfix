/**
 * Tone Detection & Rewrite Types
 * TypeBox schemas for tone analysis and rewriting
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Tone Labels
// ============================================================================

export const ToneLabel = Type.Union([
  Type.Literal('neutral'),
  Type.Literal('professional'),
  Type.Literal('friendly'),
  Type.Literal('empathetic'),
  Type.Literal('confident'),
  Type.Literal('apologetic'),
  Type.Literal('direct'),
  Type.Literal('informal'),
  Type.Literal('other'),
]);
export type ToneLabel = Static<typeof ToneLabel>;

/**
 * All valid tone labels
 */
export const TONE_LABELS: ToneLabel[] = [
  'neutral',
  'professional',
  'friendly',
  'empathetic',
  'confident',
  'apologetic',
  'direct',
  'informal',
  'other',
];

/**
 * Tone metadata for UI display
 */
export const TONE_METADATA: Record<
  ToneLabel,
  { label: string; description: string; icon: string }
> = {
  neutral: {
    label: 'Neutral',
    description: 'Fact-focused, minimal emotion',
    icon: '📋',
  },
  professional: {
    label: 'Professional',
    description: 'Formal, courteous, concise',
    icon: '💼',
  },
  friendly: {
    label: 'Friendly',
    description: 'Warm, approachable, light',
    icon: '😊',
  },
  empathetic: {
    label: 'Empathetic',
    description: 'Validating, supportive',
    icon: '🤝',
  },
  confident: {
    label: 'Confident',
    description: 'Decisive, assertive',
    icon: '💪',
  },
  apologetic: {
    label: 'Apologetic',
    description: 'Owning mistakes, making amends',
    icon: '🙏',
  },
  direct: {
    label: 'Direct',
    description: 'Clear, low hedging',
    icon: '🎯',
  },
  informal: {
    label: 'Informal',
    description: 'Casual, contractions allowed',
    icon: '💬',
  },
  other: {
    label: 'Other',
    description: 'Unclear or mixed tone',
    icon: '❓',
  },
};

// ============================================================================
// Tone Detection Types
// ============================================================================

export const ToneDetectionResult = Type.Object({
  /** Primary detected tone */
  primary: ToneLabel,
  /** Secondary tone (optional, when mixed) */
  secondary: Type.Optional(ToneLabel),
  /** Confidence score 0-1 */
  confidence: Type.Number(),
  /** Evidence snippets from text (max 60 chars each) */
  evidence: Type.Array(Type.String()),
  /** Optional analysis notes */
  notes: Type.Optional(Type.String()),
});
export type ToneDetectionResult = Static<typeof ToneDetectionResult>;

export const ToneDetectionRequest = Type.Object({
  /** Text to analyze */
  text: Type.String(),
  /** Force use of main model even for short text */
  forceMainModel: Type.Optional(Type.Boolean()),
});
export type ToneDetectionRequest = Static<typeof ToneDetectionRequest>;

export const ToneDetectionResponse = Type.Object({
  /** Detection result */
  detection: ToneDetectionResult,
  /** Original text analyzed */
  analyzedText: Type.String(),
  /** Processing metadata */
  metadata: Type.Object({
    /** Processing duration in ms */
    duration: Type.Number(),
    /** Model used (fast, main, cached) */
    model: Type.String(),
    /** Whether result was from cache */
    fromCache: Type.Boolean(),
    /** Any parse warnings */
    parseWarnings: Type.Optional(Type.Array(Type.String())),
  }),
});
export type ToneDetectionResponse = Static<typeof ToneDetectionResponse>;

// ============================================================================
// Tone Rewrite Types
// ============================================================================

export const ToneRewriteResult = Type.Object({
  /** Target tone achieved */
  tone: ToneLabel,
  /** Rewritten text */
  output: Type.String(),
  /** Rewrite notes/decisions */
  notes: Type.Optional(Type.String()),
});
export type ToneRewriteResult = Static<typeof ToneRewriteResult>;

export const ToneRewriteRequest = Type.Object({
  /** Text to rewrite */
  text: Type.String(),
  /** Target tone */
  targetTone: ToneLabel,
  /** Detected source tone (optional, for context) */
  sourceTone: Type.Optional(ToneLabel),
  /** Additional rewrite instructions */
  instructions: Type.Optional(Type.String()),
});
export type ToneRewriteRequest = Static<typeof ToneRewriteRequest>;

export const ToneRewriteStats = Type.Object({
  /** Original word count */
  originalWords: Type.Number(),
  /** Rewritten word count */
  rewrittenWords: Type.Number(),
  /** Percentage change in word count */
  changePercent: Type.Number(),
  /** Original character count */
  originalChars: Type.Number(),
  /** Rewritten character count */
  rewrittenChars: Type.Number(),
});
export type ToneRewriteStats = Static<typeof ToneRewriteStats>;

export const ToneRewriteResponse = Type.Object({
  /** Rewrite result */
  rewrite: ToneRewriteResult,
  /** Original text */
  originalText: Type.String(),
  /** Statistics about the rewrite */
  stats: ToneRewriteStats,
  /** Processing metadata */
  metadata: Type.Object({
    /** Processing duration in ms */
    duration: Type.Number(),
    /** Model used */
    model: Type.String(),
    /** Guardrails applied */
    guardrails: Type.Optional(Type.Array(Type.String())),
  }),
});
export type ToneRewriteResponse = Static<typeof ToneRewriteResponse>;

// ============================================================================
// Error Types
// ============================================================================

export const ToneErrorCode = Type.Union([
  Type.Literal('TOO_SHORT'),
  Type.Literal('TOO_LONG'),
  Type.Literal('EMPTY_TEXT'),
  Type.Literal('API_ERROR'),
  Type.Literal('PARSE_ERROR'),
  Type.Literal('LOW_CONFIDENCE'),
  Type.Literal('SAFETY_REJECTED'),
  Type.Literal('GUARDRAIL_VIOLATION'),
  Type.Literal('INVALID_TONE'),
]);
export type ToneErrorCode = Static<typeof ToneErrorCode>;

// ============================================================================
// Engine Configuration
// ============================================================================

export interface ToneEngineConfig {
  /** Minimum text length for analysis (chars) */
  minTextLength: number;
  /** Maximum text length for analysis (chars) */
  maxTextLength: number;
  /** Word count threshold for fast vs main model */
  fastModelWordThreshold: number;
  /** Confidence threshold below which 'other' is returned */
  lowConfidenceThreshold: number;
  /** Maximum evidence snippets to return */
  maxEvidenceSnippets: number;
  /** Maximum length per evidence snippet */
  maxEvidenceLength: number;
  /** Allowed length change for rewrites (percentage) */
  maxLengthChangePercent: number;
  /** Enable caching */
  enableCache: boolean;
  /** Cache TTL in ms */
  cacheTtlMs: number;
  /** Default temperature for detection */
  detectionTemperature: number;
  /** Default temperature for rewrite */
  rewriteTemperature: number;
}

export const DEFAULT_TONE_ENGINE_CONFIG: ToneEngineConfig = {
  minTextLength: 5,
  maxTextLength: 10000,
  fastModelWordThreshold: 80,
  lowConfidenceThreshold: 0.35,
  maxEvidenceSnippets: 4,
  maxEvidenceLength: 60,
  maxLengthChangePercent: 15,
  enableCache: true,
  cacheTtlMs: 10 * 60 * 1000, // 10 minutes
  detectionTemperature: 0.3,
  rewriteTemperature: 0.5,
};

// ============================================================================
// Cache Types
// ============================================================================

export interface ToneCacheKey {
  textHash: string;
  promptVersion: string;
}

export interface ToneCacheEntry {
  result: ToneDetectionResult;
  timestamp: number;
  expiresAt: number;
}

export interface ToneCacheConfig {
  maxEntries: number;
  ttlMs: number;
}

export const DEFAULT_TONE_CACHE_CONFIG: ToneCacheConfig = {
  maxEntries: 100,
  ttlMs: 10 * 60 * 1000, // 10 minutes
};
