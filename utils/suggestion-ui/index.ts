/**
 * Suggestion UI Module
 * Inline overlay for displaying writing suggestions
 */

// Manager
export {
  disposeSuggestionUIManager,
  getSuggestionUIManager,
  SuggestionUIManager,
} from './manager';
// Rect Helpers
export {
  calculatePopupPosition,
  cleanupMirror,
  createPositionInvalidator,
  getAllRectsFromRange,
  getRectFromRange,
  getRectFromTextarea,
  getScrollPosition,
  getViewport,
  isRectVisible,
  rectsOverlap,
} from './rect-helpers';
// Shadow Container
export {
  disposeShadowContainer,
  getShadowContainer,
  ShadowContainer,
} from './shadow-container';
// Store
export { createSuggestionStore, SuggestionStore } from './store';

// Surface Adapter
export {
  addToIgnoreList,
  clearIgnoreList,
  createSurfaceAdapter,
  hasDispose,
  isIgnored,
} from './surface-adapter';
// Types
export type {
  ActionResult,
  DictionaryAddCallback,
  Disposer,
  ErrorAppliedCallback,
  ErrorFocusCallback,
  ErrorIgnoredCallback,
  ErrorUnderlineProps,
  EventRegistration,
  PopupAnchor,
  PopupPosition,
  Rect,
  SuggestionAction,
  SuggestionError,
  SuggestionPopupProps,
  SuggestionUIConfig,
  SuggestionUIEvents,
  SuggestionUIState,
  SurfaceAdapter,
  ThemeMode,
  UnderlineStyle,
  UnderlineType,
  ViewportRect,
  VisibilityState,
} from './types';
export { DEFAULT_SUGGESTION_UI_CONFIG } from './types';
