/**
 * Suggestion UI Store
 * Simple reactive store for managing suggestion UI state
 */

import type {
  Disposer,
  SuggestionAction,
  SuggestionError,
  SuggestionUIState,
  ThemeMode,
  VisibilityState,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): SuggestionUIState => ({
  errors: [],
  activeErrorId: null,
  visibility: 'hidden',
  theme: 'system',
  popupOpen: false,
  loading: false,
  surfaceId: null,
});

// ============================================================================
// Store Implementation
// ============================================================================

export class SuggestionStore {
  private state: SuggestionUIState;
  private listeners: Set<(state: SuggestionUIState) => void>;
  private errorListeners: Set<(errors: SuggestionError[]) => void>;
  private activeErrorListeners: Set<(error: SuggestionError | null) => void>;
  private visibilityListeners: Set<(visibility: VisibilityState) => void>;

  constructor() {
    this.state = createInitialState();
    this.listeners = new Set();
    this.errorListeners = new Set();
    this.activeErrorListeners = new Set();
    this.visibilityListeners = new Set();
  }

  /**
   * Get current state snapshot
   */
  getState(): Readonly<SuggestionUIState> {
    return this.state;
  }

  /**
   * Get errors for the current surface
   */
  getErrors(): readonly SuggestionError[] {
    return this.state.errors;
  }

  /**
   * Get the currently active error
   */
  getActiveError(): SuggestionError | null {
    if (!this.state.activeErrorId) return null;
    return (
      this.state.errors.find((e) => e.id === this.state.activeErrorId) ?? null
    );
  }

  /**
   * Dispatch an action to update state
   */
  dispatch(action: SuggestionAction): void {
    const prevState = this.state;
    this.state = this.reduce(this.state, action);

    // Notify listeners if state changed
    if (this.state !== prevState) {
      this.notifyListeners(prevState);
    }
  }

  /**
   * Reducer function
   */
  private reduce(
    state: SuggestionUIState,
    action: SuggestionAction,
  ): SuggestionUIState {
    switch (action.type) {
      case 'SET_ERRORS':
        return {
          ...state,
          errors: action.errors,
          // Clear active error if it's no longer in the list
          activeErrorId: action.errors.some((e) => e.id === state.activeErrorId)
            ? state.activeErrorId
            : null,
        };

      case 'ADD_ERRORS':
        return {
          ...state,
          errors: [...state.errors, ...action.errors],
        };

      case 'REMOVE_ERROR': {
        const newErrors = state.errors.filter((e) => e.id !== action.id);
        return {
          ...state,
          errors: newErrors,
          activeErrorId:
            state.activeErrorId === action.id ? null : state.activeErrorId,
          popupOpen:
            state.activeErrorId === action.id ? false : state.popupOpen,
        };
      }

      case 'CLEAR_ERRORS':
        return {
          ...state,
          errors: [],
          activeErrorId: null,
          popupOpen: false,
        };

      case 'SET_ACTIVE_ERROR':
        return {
          ...state,
          activeErrorId: action.id,
          popupOpen: action.id !== null,
        };

      case 'SET_VISIBILITY':
        return {
          ...state,
          visibility: action.visibility,
          // Hide popup when visibility changes to hidden
          popupOpen: action.visibility === 'hidden' ? false : state.popupOpen,
        };

      case 'SET_THEME':
        return {
          ...state,
          theme: action.theme,
        };

      case 'SET_POPUP_OPEN':
        return {
          ...state,
          popupOpen: action.open,
          activeErrorId: action.open ? state.activeErrorId : null,
        };

      case 'SET_LOADING':
        return {
          ...state,
          loading: action.loading,
        };

      case 'SET_SURFACE':
        return {
          ...state,
          surfaceId: action.surfaceId,
          // Clear errors when surface changes
          errors: action.surfaceId !== state.surfaceId ? [] : state.errors,
          activeErrorId:
            action.surfaceId !== state.surfaceId ? null : state.activeErrorId,
          popupOpen:
            action.surfaceId !== state.surfaceId ? false : state.popupOpen,
        };

      default:
        return state;
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(prevState: SuggestionUIState): void {
    // General listeners
    for (const listener of this.listeners) {
      listener(this.state);
    }

    // Error-specific listeners
    if (prevState.errors !== this.state.errors) {
      for (const listener of this.errorListeners) {
        listener(this.state.errors);
      }
    }

    // Active error listeners
    if (prevState.activeErrorId !== this.state.activeErrorId) {
      for (const listener of this.activeErrorListeners) {
        listener(this.getActiveError());
      }
    }

    // Visibility listeners
    if (prevState.visibility !== this.state.visibility) {
      for (const listener of this.visibilityListeners) {
        listener(this.state.visibility);
      }
    }
  }

  // ============================================================================
  // Subscription Methods
  // ============================================================================

  /**
   * Subscribe to all state changes
   */
  subscribe(listener: (state: SuggestionUIState) => void): Disposer {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to error changes only
   */
  onErrorsChange(listener: (errors: SuggestionError[]) => void): Disposer {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Subscribe to active error changes
   */
  onActiveErrorChange(
    listener: (error: SuggestionError | null) => void,
  ): Disposer {
    this.activeErrorListeners.add(listener);
    return () => this.activeErrorListeners.delete(listener);
  }

  /**
   * Subscribe to visibility changes
   */
  onVisibilityChange(
    listener: (visibility: VisibilityState) => void,
  ): Disposer {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  // ============================================================================
  // Convenience Actions
  // ============================================================================

  /**
   * Set errors for the current surface
   */
  setErrors(errors: SuggestionError[]): void {
    this.dispatch({ type: 'SET_ERRORS', errors });
  }

  /**
   * Add new errors to the list
   */
  addErrors(errors: SuggestionError[]): void {
    this.dispatch({ type: 'ADD_ERRORS', errors });
  }

  /**
   * Remove a single error
   */
  removeError(id: string): void {
    this.dispatch({ type: 'REMOVE_ERROR', id });
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.dispatch({ type: 'CLEAR_ERRORS' });
  }

  /**
   * Set the active (focused) error
   */
  setActiveError(id: string | null): void {
    this.dispatch({ type: 'SET_ACTIVE_ERROR', id });
  }

  /**
   * Set visibility state
   */
  setVisibility(visibility: VisibilityState): void {
    this.dispatch({ type: 'SET_VISIBILITY', visibility });
  }

  /**
   * Set theme mode
   */
  setTheme(theme: ThemeMode): void {
    this.dispatch({ type: 'SET_THEME', theme });
  }

  /**
   * Open the popup for an error
   */
  openPopup(errorId: string): void {
    this.dispatch({ type: 'SET_ACTIVE_ERROR', id: errorId });
  }

  /**
   * Close the popup
   */
  closePopup(): void {
    this.dispatch({ type: 'SET_POPUP_OPEN', open: false });
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.dispatch({ type: 'SET_LOADING', loading });
  }

  /**
   * Set current surface
   */
  setSurface(surfaceId: string | null): void {
    this.dispatch({ type: 'SET_SURFACE', surfaceId });
  }

  /**
   * Navigate to next error
   */
  nextError(): SuggestionError | null {
    const errors = this.state.errors;
    if (errors.length === 0) return null;

    const currentIndex = this.state.activeErrorId
      ? errors.findIndex((e) => e.id === this.state.activeErrorId)
      : -1;

    const nextIndex = (currentIndex + 1) % errors.length;
    const nextError = errors[nextIndex];
    this.setActiveError(nextError.id);
    return nextError;
  }

  /**
   * Navigate to previous error
   */
  prevError(): SuggestionError | null {
    const errors = this.state.errors;
    if (errors.length === 0) return null;

    const currentIndex = this.state.activeErrorId
      ? errors.findIndex((e) => e.id === this.state.activeErrorId)
      : 0;

    const prevIndex = currentIndex <= 0 ? errors.length - 1 : currentIndex - 1;
    const prevError = errors[prevIndex];
    this.setActiveError(prevError.id);
    return prevError;
  }

  /**
   * Reset store to initial state
   */
  reset(): void {
    const prevState = this.state;
    this.state = createInitialState();
    this.notifyListeners(prevState);
  }
}

// ============================================================================
// Store Factory
// ============================================================================

/**
 * Create a new suggestion store instance
 */
export function createSuggestionStore(): SuggestionStore {
  return new SuggestionStore();
}
