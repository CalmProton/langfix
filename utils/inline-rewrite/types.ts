/**
 * Inline Rewrite Types
 * TypeBox schemas for inline rewrite functionality
 */
import { type Static, Type } from '@sinclair/typebox';
import { RewriteMode, RewriteStats } from '#utils/rewrite-engine/types';

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Selection context for inline rewrite
 */
export const InlineSelection = Type.Object({
  /** Surface identifier */
  surfaceId: Type.String(),
  /** Start offset in the surface text */
  start: Type.Number(),
  /** End offset in the surface text */
  end: Type.Number(),
  /** Selected text */
  text: Type.String(),
  /** Text before selection (for context) */
  contextBefore: Type.Optional(Type.String()),
  /** Text after selection (for context) */
  contextAfter: Type.Optional(Type.String()),
});
export type InlineSelection = Static<typeof InlineSelection>;

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Inline rewrite request
 */
export const InlineRewriteRequest = Type.Object({
  /** Unique request identifier */
  id: Type.String(),
  /** Rewrite mode */
  mode: RewriteMode,
  /** Selection information */
  selection: InlineSelection,
  /** Temperature for generation */
  temperature: Type.Optional(Type.Number()),
  /** Whether to stream the response */
  stream: Type.Optional(Type.Boolean()),
});
export type InlineRewriteRequest = Static<typeof InlineRewriteRequest>;

/**
 * Stream chunk for inline rewrite
 */
export const InlineRewriteStreamChunk = Type.Object({
  /** Request identifier */
  id: Type.String(),
  /** Content delta (new text chunk) */
  contentDelta: Type.String(),
  /** Whether this is the final chunk */
  done: Type.Optional(Type.Boolean()),
  /** Error information if failed */
  error: Type.Optional(
    Type.Object({
      code: Type.String(),
      message: Type.String(),
      retryable: Type.Boolean(),
    }),
  ),
});
export type InlineRewriteStreamChunk = Static<typeof InlineRewriteStreamChunk>;

/**
 * Final inline rewrite result
 */
export const InlineRewriteResult = Type.Object({
  /** Request identifier */
  id: Type.String(),
  /** Rewritten text */
  rewritten: Type.String(),
  /** Original text */
  original: Type.String(),
  /** Mode used for rewriting */
  mode: RewriteMode,
  /** Statistics about the rewrite */
  stats: RewriteStats,
  /** Processing time in milliseconds */
  processingTime: Type.Number(),
});
export type InlineRewriteResult = Static<typeof InlineRewriteResult>;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Inline rewrite error codes
 */
export const InlineRewriteErrorCode = Type.Union([
  Type.Literal('TOO_SHORT'),
  Type.Literal('TOO_LONG'),
  Type.Literal('API_ERROR'),
  Type.Literal('RATE_LIMIT'),
  Type.Literal('ABORTED'),
  Type.Literal('NO_CHANGE'),
  Type.Literal('EMPTY_RESPONSE'),
  Type.Literal('NO_SELECTION'),
  Type.Literal('INVALID_SURFACE'),
]);
export type InlineRewriteErrorCode = Static<typeof InlineRewriteErrorCode>;

/**
 * Inline rewrite error
 */
export interface InlineRewriteError {
  code: InlineRewriteErrorCode;
  message: string;
  retryable: boolean;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Popup status
 */
export type InlineRewriteStatus =
  | 'idle'
  | 'loading'
  | 'streaming'
  | 'done'
  | 'error';

/**
 * Inline rewrite popup state
 */
export interface InlineRewriteState {
  /** Current status */
  status: InlineRewriteStatus;
  /** Active request ID */
  activeRequestId: string | null;
  /** Selected mode */
  mode: RewriteMode;
  /** Surface ID being edited */
  surfaceId: string | null;
  /** Original selected text */
  originalText: string;
  /** Current streamed/completed result */
  resultText: string;
  /** Error if any */
  error: InlineRewriteError | null;
  /** Previous result for retry comparison */
  previousResult: string | null;
  /** Processing time in ms */
  processingTime: number | null;
  /** Statistics after completion */
  stats: Static<typeof RewriteStats> | null;
}

/**
 * Default inline rewrite state
 */
export const DEFAULT_INLINE_REWRITE_STATE: InlineRewriteState = {
  status: 'idle',
  activeRequestId: null,
  mode: 'improve',
  surfaceId: null,
  originalText: '',
  resultText: '',
  error: null,
  previousResult: null,
  processingTime: null,
  stats: null,
};

// ============================================================================
// Configuration
// ============================================================================

/**
 * Inline rewrite configuration
 */
export interface InlineRewriteConfig {
  /** Minimum selection length (chars) */
  minSelectionLength: number;
  /** Maximum selection length (chars) */
  maxSelectionLength: number;
  /** Context chars to include before/after selection */
  contextChars: number;
  /** Default temperature */
  defaultTemperature: number;
  /** Use fast model for short selections */
  useFastModelThreshold: number;
  /** Keyboard shortcut */
  shortcut: string;
}

/**
 * Default configuration
 */
export const DEFAULT_INLINE_REWRITE_CONFIG: InlineRewriteConfig = {
  minSelectionLength: 10,
  maxSelectionLength: 2000,
  contextChars: 100,
  defaultTemperature: 0.7,
  useFastModelThreshold: 200,
  shortcut: 'Ctrl+Shift+R',
};

// ============================================================================
// Message Types (Background <-> Content Script)
// ============================================================================

/**
 * Messages from content script to background
 */
export type InlineRewriteMessage =
  | {
      type: 'INLINE_REWRITE_START';
      payload: InlineRewriteRequest;
    }
  | {
      type: 'INLINE_REWRITE_CANCEL';
      payload: { id: string };
    }
  | {
      type: 'INLINE_REWRITE_RETRY';
      payload: {
        id: string;
        mode: RewriteMode;
        previousResult: string;
        selection: InlineSelection;
      };
    };

/**
 * Messages from background to content script
 */
export type InlineRewriteResponse =
  | {
      type: 'INLINE_REWRITE_CHUNK';
      payload: InlineRewriteStreamChunk;
    }
  | {
      type: 'INLINE_REWRITE_COMPLETE';
      payload: InlineRewriteResult;
    }
  | {
      type: 'INLINE_REWRITE_ERROR';
      payload: {
        id: string;
        error: InlineRewriteError;
      };
    };
