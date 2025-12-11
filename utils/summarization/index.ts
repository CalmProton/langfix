/**
 * Summarization Module
 * Re-exports for summarization functionality
 */

// Background Handler
export {
  getSummarizationHandler,
  SummarizationHandler,
} from './background-handler';

// Manager
export {
  disposeSummarizationManager,
  getSummarizationManager,
  SummarizationManager,
} from './manager';

// Selection Handler
export {
  analyzeSelection,
  getSelectionBottomRect,
  getSelectionRange,
  getSelectionRect,
  getSelectionWithContext,
  validateSelection,
} from './selection-handler';

// Types
export type {
  SelectionInfo,
  SelectionType,
  SummarizationConfig,
  SummarizationError,
  SummarizationErrorCode,
  SummarizationMessage,
  SummarizationState,
  SummarizationStatus,
  SummaryRequest,
  SummaryResponse,
  SummaryStreamChunk,
} from './types';
export {
  DEFAULT_SUMMARIZATION_CONFIG,
  DEFAULT_SUMMARIZATION_STATE,
  ERROR_MESSAGES,
  getBulletCount,
  SelectionInfo as SelectionInfoSchema,
  SelectionType as SelectionTypeSchema,
  SummarizationError as SummarizationErrorSchema,
  SummarizationErrorCode as SummarizationErrorCodeSchema,
  SummarizationStatus as SummarizationStatusSchema,
  SummaryRequest as SummaryRequestSchema,
  SummaryResponse as SummaryResponseSchema,
  SummaryStreamChunk as SummaryStreamChunkSchema,
} from './types';
