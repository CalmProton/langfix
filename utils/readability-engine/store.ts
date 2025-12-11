/**
 * Readability Store
 * Reactive store for managing readability UI state
 */
import type {
  ReadabilityResult,
  SentenceScore,
} from '#utils/readability-engine/types';

// ============================================================================
// Types
// ============================================================================

export type ReadabilityVisibility = 'hidden' | 'heatmap' | 'legend';

export interface ReadabilityUIState {
  /** Current readability result */
  result: ReadabilityResult | null;
  /** Whether the heatmap overlay is visible */
  visibility: ReadabilityVisibility;
  /** Currently hovered sentence ID */
  hoveredSentenceId: string | null;
  /** Whether analysis is in progress */
  loading: boolean;
  /** Current surface being analyzed */
  surfaceId: string | null;
  /** Whether to use model refinement */
  useModelRefinement: boolean;
  /** Error message if analysis failed */
  error: string | null;
}

export type ReadabilityAction =
  | { type: 'SET_RESULT'; result: ReadabilityResult }
  | { type: 'CLEAR_RESULT' }
  | { type: 'SET_VISIBILITY'; visibility: ReadabilityVisibility }
  | { type: 'SET_HOVERED_SENTENCE'; id: string | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SURFACE'; surfaceId: string | null }
  | { type: 'SET_MODEL_REFINEMENT'; enabled: boolean }
  | { type: 'SET_ERROR'; error: string | null };

export type Disposer = () => void;

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): ReadabilityUIState => ({
  result: null,
  visibility: 'hidden',
  hoveredSentenceId: null,
  loading: false,
  surfaceId: null,
  useModelRefinement: false,
  error: null,
});

// ============================================================================
// Store Implementation
// ============================================================================

export class ReadabilityStore {
  private state: ReadabilityUIState;
  private listeners: Set<(state: ReadabilityUIState) => void>;
  private resultListeners: Set<(result: ReadabilityResult | null) => void>;
  private visibilityListeners: Set<(visibility: ReadabilityVisibility) => void>;
  private hoveredSentenceListeners: Set<
    (sentence: SentenceScore | null) => void
  >;

  constructor() {
    this.state = createInitialState();
    this.listeners = new Set();
    this.resultListeners = new Set();
    this.visibilityListeners = new Set();
    this.hoveredSentenceListeners = new Set();
  }

  /**
   * Get current state snapshot
   */
  getState(): Readonly<ReadabilityUIState> {
    return this.state;
  }

  /**
   * Get the current readability result
   */
  getResult(): ReadabilityResult | null {
    return this.state.result;
  }

  /**
   * Get the currently hovered sentence
   */
  getHoveredSentence(): SentenceScore | null {
    if (!this.state.hoveredSentenceId || !this.state.result) {
      return null;
    }
    return (
      this.state.result.sentences.find(
        (s) => s.id === this.state.hoveredSentenceId,
      ) ?? null
    );
  }

  /**
   * Get sentences filtered by level
   */
  getSentencesByLevel(
    level: 'easy' | 'moderate' | 'hard',
  ): readonly SentenceScore[] {
    if (!this.state.result) return [];
    return this.state.result.sentences.filter((s) => s.level === level);
  }

  /**
   * Check if heatmap is visible
   */
  isHeatmapVisible(): boolean {
    return (
      this.state.visibility === 'heatmap' || this.state.visibility === 'legend'
    );
  }

  /**
   * Dispatch an action to update state
   */
  dispatch(action: ReadabilityAction): void {
    const prevState = this.state;
    this.state = this.reduce(this.state, action);

    if (this.state !== prevState) {
      this.notifyListeners(prevState);
    }
  }

  /**
   * Reducer function
   */
  private reduce(
    state: ReadabilityUIState,
    action: ReadabilityAction,
  ): ReadabilityUIState {
    switch (action.type) {
      case 'SET_RESULT':
        return {
          ...state,
          result: action.result,
          loading: false,
          error: null,
        };

      case 'CLEAR_RESULT':
        return {
          ...state,
          result: null,
          hoveredSentenceId: null,
        };

      case 'SET_VISIBILITY':
        return {
          ...state,
          visibility: action.visibility,
          // Clear hovered sentence when hiding
          hoveredSentenceId:
            action.visibility === 'hidden' ? null : state.hoveredSentenceId,
        };

      case 'SET_HOVERED_SENTENCE':
        return {
          ...state,
          hoveredSentenceId: action.id,
        };

      case 'SET_LOADING':
        return {
          ...state,
          loading: action.loading,
          error: action.loading ? null : state.error,
        };

      case 'SET_SURFACE':
        return {
          ...state,
          surfaceId: action.surfaceId,
          // Clear result when surface changes
          result: action.surfaceId !== state.surfaceId ? null : state.result,
          hoveredSentenceId:
            action.surfaceId !== state.surfaceId
              ? null
              : state.hoveredSentenceId,
        };

      case 'SET_MODEL_REFINEMENT':
        return {
          ...state,
          useModelRefinement: action.enabled,
        };

      case 'SET_ERROR':
        return {
          ...state,
          error: action.error,
          loading: false,
        };

      default:
        return state;
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(prevState: ReadabilityUIState): void {
    // General listeners
    for (const listener of this.listeners) {
      listener(this.state);
    }

    // Result listeners
    if (prevState.result !== this.state.result) {
      for (const listener of this.resultListeners) {
        listener(this.state.result);
      }
    }

    // Visibility listeners
    if (prevState.visibility !== this.state.visibility) {
      for (const listener of this.visibilityListeners) {
        listener(this.state.visibility);
      }
    }

    // Hovered sentence listeners
    if (prevState.hoveredSentenceId !== this.state.hoveredSentenceId) {
      for (const listener of this.hoveredSentenceListeners) {
        listener(this.getHoveredSentence());
      }
    }
  }

  // ============================================================================
  // Subscription Methods
  // ============================================================================

  /**
   * Subscribe to all state changes
   */
  subscribe(listener: (state: ReadabilityUIState) => void): Disposer {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to result changes
   */
  onResultChange(
    listener: (result: ReadabilityResult | null) => void,
  ): Disposer {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  /**
   * Subscribe to visibility changes
   */
  onVisibilityChange(
    listener: (visibility: ReadabilityVisibility) => void,
  ): Disposer {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  /**
   * Subscribe to hovered sentence changes
   */
  onHoveredSentenceChange(
    listener: (sentence: SentenceScore | null) => void,
  ): Disposer {
    this.hoveredSentenceListeners.add(listener);
    return () => this.hoveredSentenceListeners.delete(listener);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Toggle heatmap visibility
   */
  toggleHeatmap(): void {
    const newVisibility =
      this.state.visibility === 'hidden' ? 'heatmap' : 'hidden';
    this.dispatch({ type: 'SET_VISIBILITY', visibility: newVisibility });
  }

  /**
   * Show heatmap with legend
   */
  showWithLegend(): void {
    this.dispatch({ type: 'SET_VISIBILITY', visibility: 'legend' });
  }

  /**
   * Hide heatmap
   */
  hide(): void {
    this.dispatch({ type: 'SET_VISIBILITY', visibility: 'hidden' });
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
// Singleton Instance
// ============================================================================

let globalStore: ReadabilityStore | null = null;

/**
 * Get the global readability store instance
 */
export function getReadabilityStore(): ReadabilityStore {
  if (!globalStore) {
    globalStore = new ReadabilityStore();
  }
  return globalStore;
}

/**
 * Create a new isolated store instance (for testing)
 */
export function createReadabilityStore(): ReadabilityStore {
  return new ReadabilityStore();
}
