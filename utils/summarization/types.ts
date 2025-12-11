/**
 * Summarization Types
 * TypeBox schemas for summarization functionality
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Type of text selection for summarization
 */
export const SelectionType = Type.Union([
  Type.Literal('sentence'),
  Type.Literal('paragraph'),
  Type.Literal('multi-paragraph'),
]);
export type SelectionType = Static<typeof SelectionType>;

/**
 * Selection info for summarization
 */
export const SelectionInfo = Type.Object({
  /** Selected text content */
  text: Type.String(),
  /** Type of selection detected */
  type: SelectionType,
  /** Word count of selection */
  wordCount: Type.Number(),
  /** Character count of selection */
  charCount: Type.Number(),
});
export type SelectionInfo = Static<typeof SelectionInfo>;

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Summary request to background
 */
export const SummaryRequest = Type.Object({
  /** Unique request identifier */
  id: Type.String(),
  /** Text to summarize */
  text: Type.String(),
  /** Type of selection */
  type: SelectionType,
  /** Maximum number of bullet points */
  maxBullets: Type.Optional(Type.Number()),
});
export type SummaryRequest = Static<typeof SummaryRequest>;

/**
 * Summary response from AI
 */
export const SummaryResponse = Type.Object({
  /** Request identifier */
  id: Type.String(),
  /** Bullet point summaries */
  bullets: Type.Array(Type.String()),
  /** Key takeaway sentence */
  keyTakeaway: Type.Optional(Type.String()),
  /** Whether result was from cache */
  cached: Type.Boolean(),
  /** Processing time in milliseconds */
  processingTime: Type.Number(),
});
export type SummaryResponse = Static<typeof SummaryResponse>;

/**
 * Stream chunk for summarization
 */
export const SummaryStreamChunk = Type.Object({
  /** Request identifier */
  id: Type.String(),
  /** Content delta */
  contentDelta: Type.String(),
  /** Whether this is the final chunk */
  done: Type.Optional(Type.Boolean()),
  /** Error if failed */
  error: Type.Optional(
    Type.Object({
      code: Type.String(),
      message: Type.String(),
      retryable: Type.Boolean(),
    }),
  ),
});
export type SummaryStreamChunk = Static<typeof SummaryStreamChunk>;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Summarization error codes
 */
export const SummarizationErrorCode = Type.Union([
  Type.Literal('TOO_SHORT'),
  Type.Literal('TOO_LONG'),
  Type.Literal('NO_SELECTION'),
  Type.Literal('NO_API_KEY'),
  Type.Literal('RATE_LIMIT'),
  Type.Literal('NETWORK_ERROR'),
  Type.Literal('API_ERROR'),
  Type.Literal('PARSE_ERROR'),
  Type.Literal('CANCELLED'),
]);
export type SummarizationErrorCode = Static<typeof SummarizationErrorCode>;

/**
 * Summarization error
 */
export const SummarizationError = Type.Object({
  /** Error code */
  code: SummarizationErrorCode,
  /** Human-readable message */
  message: Type.String(),
  /** Whether the operation can be retried */
  retryable: Type.Boolean(),
});
export type SummarizationError = Static<typeof SummarizationError>;

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Summarization UI status
 */
export const SummarizationStatus = Type.Union([
  Type.Literal('idle'),
  Type.Literal('loading'),
  Type.Literal('streaming'),
  Type.Literal('done'),
  Type.Literal('error'),
]);
export type SummarizationStatus = Static<typeof SummarizationStatus>;

/**
 * Summarization UI state
 */
export interface SummarizationState {
  /** Current status */
  status: SummarizationStatus;
  /** Original text being summarized */
  originalText: string;
  /** Bullet point summaries */
  bullets: string[];
  /** Key takeaway */
  keyTakeaway: string | null;
  /** Whether result was cached */
  cached: boolean;
  /** Error if any */
  error: SummarizationError | null;
  /** Active request ID */
  activeRequestId: string | null;
  /** Processing time in ms */
  processingTime: number | null;
  /** Selection type */
  selectionType: SelectionType | null;
}

/**
 * Default summarization state
 */
export const DEFAULT_SUMMARIZATION_STATE: SummarizationState = {
  status: 'idle',
  originalText: '',
  bullets: [],
  keyTakeaway: null,
  cached: false,
  error: null,
  activeRequestId: null,
  processingTime: null,
  selectionType: null,
};

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Summarization configuration
 */
export interface SummarizationConfig {
  /** Minimum text length to summarize (words) */
  minWords: number;
  /** Maximum text length to summarize (words) */
  maxWords: number;
  /** Cache size limit */
  cacheSize: number;
  /** Temperature for generation */
  temperature: number;
  /** Enable keyboard shortcut */
  keyboardShortcutEnabled: boolean;
  /** Enable context menu */
  contextMenuEnabled: boolean;
}

/**
 * Default summarization configuration
 */
export const DEFAULT_SUMMARIZATION_CONFIG: SummarizationConfig = {
  minWords: 10,
  maxWords: 1000,
  cacheSize: 50,
  temperature: 0.3,
  keyboardShortcutEnabled: true,
  contextMenuEnabled: true,
};

// ============================================================================
// Message Types
// ============================================================================

/**
 * Messages for content script communication
 */
export interface SummarizationMessage {
  type: 'SUMMARIZE_SELECTION' | 'SUMMARIZE_CANCEL' | 'SUMMARIZE_RESULT';
  payload?: SummaryRequest | SummaryResponse | { id: string };
}

/**
 * Error messages for user display
 */
export const ERROR_MESSAGES: Record<SummarizationErrorCode, string> = {
  TOO_SHORT: 'Selection too short to summarize (minimum 10 words)',
  TOO_LONG: 'Selection exceeds 1000 words. Please select a smaller portion.',
  NO_SELECTION: 'Please select some text to summarize.',
  NO_API_KEY: 'AI provider not configured. Please add API key in settings.',
  RATE_LIMIT: 'Rate limit reached. Please try again in a moment.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  API_ERROR: 'AI service error. Please try again.',
  PARSE_ERROR: 'Failed to parse summary. Please try again.',
  CANCELLED: 'Summarization cancelled.',
};

/**
 * Get bullet count based on selection type and word count
 */
export function getBulletCount(type: SelectionType, wordCount: number): number {
  if (type === 'sentence' || wordCount < 50) {
    return 2;
  }
  if (type === 'paragraph' || wordCount < 200) {
    return 3;
  }
  if (wordCount < 500) {
    return 4;
  }
  return 5;
}
