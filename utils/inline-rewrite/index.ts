/**
 * Inline Rewrite Module
 * Re-exports for inline rewrite functionality
 */

// Background Handler
export { getInlineRewriteHandler, InlineRewriteHandler } from './background-handler';

// Manager
export {
  disposeInlineRewriteManager,
  getInlineRewriteManager,
  InlineRewriteManager,
} from './manager';

// Selection Manager
export {
  createSelectionManager,
  getAllSelectionRects,
  getSelectionFromSurface,
  getSelectionRect,
  SelectionManager,
  validateSelection,
} from './selection-manager';

// Types
export type {
  InlineRewriteConfig,
  InlineRewriteError,
  InlineRewriteErrorCode,
  InlineRewriteMessage,
  InlineRewriteResponse,
  InlineRewriteResult,
  InlineRewriteState,
  InlineRewriteStatus,
  InlineRewriteStreamChunk,
  InlineSelection,
} from './types';
export {
  DEFAULT_INLINE_REWRITE_CONFIG,
  DEFAULT_INLINE_REWRITE_STATE,
  InlineRewriteErrorCode as InlineRewriteErrorCodeSchema,
  InlineRewriteRequest,
  InlineRewriteResult as InlineRewriteResultSchema,
  InlineRewriteStreamChunk as InlineRewriteStreamChunkSchema,
  InlineSelection as InlineSelectionSchema,
} from './types';
