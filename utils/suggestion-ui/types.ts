/**
 * Suggestion UI Types
 * Types for the inline suggestion overlay system
 */

import type { ExtendedGrammarError } from '#utils/grammar-engine/types';
import type { EditableSurface } from '#utils/text-extraction/types';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Suggestion error with UI state
 */
export interface SuggestionError extends ExtendedGrammarError {
  /** Unique identifier for this error instance */
  id: string;
  /** Surface this error belongs to */
  surfaceId: string;
}

/**
 * Position rectangle for UI elements
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extended rect with viewport information
 */
export interface ViewportRect extends Rect {
  /** Whether the rect was clamped to fit viewport */
  viewportClamped: boolean;
  /** Original unclamped rect */
  original: Rect;
}

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Error type to underline color mapping
 */
export type UnderlineType =
  | 'grammar'
  | 'spelling'
  | 'punctuation'
  | 'contextual';

/**
 * Underline style variant based on severity
 */
export type UnderlineStyle = 'wavy' | 'dotted' | 'dashed';

// ============================================================================
// State Types
// ============================================================================

/**
 * Visibility state for the suggestion UI
 */
export type VisibilityState = 'hidden' | 'underlines' | 'popup';

/**
 * Suggestion UI state
 */
export interface SuggestionUIState {
  /** All errors for the current surface */
  errors: SuggestionError[];
  /** Currently active (focused) error ID */
  activeErrorId: string | null;
  /** Current visibility state */
  visibility: VisibilityState;
  /** Current theme */
  theme: ThemeMode;
  /** Whether the popup is open */
  popupOpen: boolean;
  /** Loading state for async operations */
  loading: boolean;
  /** Current surface being tracked */
  surfaceId: string | null;
}

/**
 * Store action types
 */
export type SuggestionAction =
  | { type: 'SET_ERRORS'; errors: SuggestionError[] }
  | { type: 'ADD_ERRORS'; errors: SuggestionError[] }
  | { type: 'REMOVE_ERROR'; id: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_ACTIVE_ERROR'; id: string | null }
  | { type: 'SET_VISIBILITY'; visibility: VisibilityState }
  | { type: 'SET_THEME'; theme: ThemeMode }
  | { type: 'SET_POPUP_OPEN'; open: boolean }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SURFACE'; surfaceId: string | null };

// ============================================================================
// Surface Adapter Types
// ============================================================================

/**
 * Action result type
 */
export interface ActionResult {
  success: boolean;
  message?: string;
}

/**
 * Surface adapter interface for applying corrections
 */
export interface SurfaceAdapter {
  /** Get the underlying editable surface */
  readonly surface: EditableSurface;

  /**
   * Apply a suggestion to replace text
   * @param error - The error to fix
   * @param suggestion - The replacement text
   */
  apply(error: SuggestionError, suggestion: string): ActionResult;

  /**
   * Ignore an error (don't show again for this session)
   * @param error - The error to ignore
   */
  ignore(error: SuggestionError): ActionResult;

  /**
   * Add word to personal dictionary
   * @param word - The word to add
   */
  addToDictionary(word: string): Promise<ActionResult>;

  /**
   * Get the viewport rect for an error's text range
   * @param error - The error to get rect for
   */
  getErrorRect(error: SuggestionError): ViewportRect | null;

  /**
   * Get all error rects (for batch rendering)
   * @param errors - Errors to get rects for
   */
  getErrorRects(errors: SuggestionError[]): Map<string, ViewportRect>;

  /**
   * Recalculate cached positions (call on scroll/resize)
   */
  invalidateRects(): void;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Callback for error applied event
 */
export type ErrorAppliedCallback = (
  error: SuggestionError,
  suggestion: string,
) => void;

/**
 * Callback for error ignored event
 */
export type ErrorIgnoredCallback = (error: SuggestionError) => void;

/**
 * Callback for dictionary add event
 */
export type DictionaryAddCallback = (word: string) => void;

/**
 * Callback for error focus event
 */
export type ErrorFocusCallback = (error: SuggestionError | null) => void;

/**
 * Event map for suggestion UI
 */
export interface SuggestionUIEvents {
  errorApplied: ErrorAppliedCallback;
  errorIgnored: ErrorIgnoredCallback;
  dictionaryAdd: DictionaryAddCallback;
  errorFocus: ErrorFocusCallback;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for ErrorUnderline component
 */
export interface ErrorUnderlineProps {
  error: SuggestionError;
  rect: ViewportRect;
  isActive: boolean;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Props for SuggestionPopup component
 */
export interface SuggestionPopupProps {
  error: SuggestionError;
  rect: ViewportRect;
  onApply: (suggestion: string) => void;
  onIgnore: () => void;
  onAddToDictionary: () => void;
  onClose: () => void;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Suggestion UI configuration
 */
export interface SuggestionUIConfig {
  /** Z-index for underlines layer */
  underlineZIndex: number;
  /** Z-index for popup */
  popupZIndex: number;
  /** Popup flip threshold (pixels from viewport edge) */
  popupFlipThreshold: number;
  /** Whether to animate transitions */
  animate: boolean;
  /** Debounce delay for scroll/resize handlers */
  positionDebounceMs: number;
}

/**
 * Default configuration
 */
export const DEFAULT_SUGGESTION_UI_CONFIG: SuggestionUIConfig = {
  underlineZIndex: 2147483640,
  popupZIndex: 2147483645,
  popupFlipThreshold: 200,
  animate: true,
  positionDebounceMs: 16,
};

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Disposer function for cleanup
 */
export type Disposer = () => void;

/**
 * Event listener registration result
 */
export interface EventRegistration {
  unsubscribe: Disposer;
}

/**
 * Popup anchor position
 */
export type PopupAnchor = 'below' | 'above';

/**
 * Popup position result
 */
export interface PopupPosition {
  x: number;
  y: number;
  anchor: PopupAnchor;
  maxWidth: number;
  maxHeight: number;
}
