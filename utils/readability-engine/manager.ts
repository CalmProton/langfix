/**
 * Readability Manager
 * Coordinates the readability engine, store, and UI overlay
 */

import type { EditableSurface } from '#utils/text-extraction/types';
import type { AIProvider } from '#utils/types';
import { ReadabilityEngine } from './engine';
import {
  createReadabilityStore,
  getReadabilityStore,
  type ReadabilityStore,
} from './store';
import type { ReadabilityEngineConfig, ReadabilityResult } from './types';

// ============================================================================
// Manager Options
// ============================================================================

export interface ReadabilityManagerOptions {
  /** AI provider for model refinement (optional) */
  provider?: AIProvider;
  /** Engine configuration */
  engineConfig?: Partial<ReadabilityEngineConfig>;
  /** Whether to auto-analyze on text changes */
  autoAnalyze?: boolean;
  /** Debounce delay for auto-analysis in ms */
  debounceMs?: number;
  /** Whether to use the global store or create a local one */
  useGlobalStore?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ReadabilityManagerOptions, 'provider'>> = {
  engineConfig: {},
  autoAnalyze: false,
  debounceMs: 500,
  useGlobalStore: true,
};

// ============================================================================
// Manager Class
// ============================================================================

export class ReadabilityManager {
  private engine: ReadabilityEngine;
  private store: ReadabilityStore;
  private options: Required<Omit<ReadabilityManagerOptions, 'provider'>>;
  private provider?: AIProvider;

  // Track attached surface for cleanup
  private attachedSurfaceId: string | null = null;
  private changeDisposer: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ReadabilityManagerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.provider = options.provider;
    this.engine = new ReadabilityEngine(
      this.provider,
      this.options.engineConfig,
    );
    this.store = this.options.useGlobalStore
      ? getReadabilityStore()
      : createReadabilityStore();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the store for UI bindings
   */
  getStore(): ReadabilityStore {
    return this.store;
  }

  /**
   * Analyze text and update the store
   */
  async analyze(
    text: string,
    useModelRefinement = false,
  ): Promise<ReadabilityResult> {
    this.store.dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const result = await this.engine.analyze({
        text,
        useModelRefinement:
          useModelRefinement || this.store.getState().useModelRefinement,
      });

      this.store.dispatch({ type: 'SET_RESULT', result });
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Analysis failed';
      this.store.dispatch({ type: 'SET_ERROR', error: message });
      throw error;
    }
  }

  /**
   * Attach to an editable surface for automatic analysis
   */
  attachToSurface(surface: EditableSurface): void {
    // Detach from previous surface
    this.detach();

    this.attachedSurfaceId = surface.id;
    this.store.dispatch({ type: 'SET_SURFACE', surfaceId: surface.id });

    if (this.options.autoAnalyze) {
      // Initial analysis
      const text = surface.getText();
      if (text.trim().length > 10) {
        this.analyze(text);
      }

      // Subscribe to changes
      this.changeDisposer = surface.onChange(
        (newText) => {
          this.debouncedAnalyze(newText);
        },
        { debounceMs: 0 },
      ); // We handle our own debouncing
    }
  }

  /**
   * Detach from the current surface
   */
  detach(): void {
    if (this.changeDisposer) {
      this.changeDisposer();
      this.changeDisposer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.attachedSurfaceId = null;
    this.store.dispatch({ type: 'SET_SURFACE', surfaceId: null });
  }

  /**
   * Show the heatmap overlay
   */
  showHeatmap(): void {
    this.store.dispatch({ type: 'SET_VISIBILITY', visibility: 'heatmap' });
  }

  /**
   * Show the heatmap with legend
   */
  showWithLegend(): void {
    this.store.dispatch({ type: 'SET_VISIBILITY', visibility: 'legend' });
  }

  /**
   * Hide the heatmap overlay
   */
  hideHeatmap(): void {
    this.store.dispatch({ type: 'SET_VISIBILITY', visibility: 'hidden' });
  }

  /**
   * Toggle heatmap visibility
   */
  toggleHeatmap(): void {
    this.store.toggleHeatmap();
  }

  /**
   * Get the current result
   */
  getResult(): ReadabilityResult | null {
    return this.store.getResult();
  }

  /**
   * Clear the current analysis
   */
  clear(): void {
    this.store.dispatch({ type: 'CLEAR_RESULT' });
  }

  /**
   * Set whether to use model refinement
   */
  setModelRefinement(enabled: boolean): void {
    this.store.dispatch({ type: 'SET_MODEL_REFINEMENT', enabled });
  }

  /**
   * Get the currently attached surface ID
   */
  getAttachedSurfaceId(): string | null {
    return this.attachedSurfaceId;
  }

  /**
   * Check if attached to a surface
   */
  isAttached(): boolean {
    return this.attachedSurfaceId !== null;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detach();
    this.store.reset();
    this.engine.clearCache();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Debounced analysis for text changes
   */
  private debouncedAnalyze(text: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (text.trim().length > 10) {
        this.analyze(text);
      }
    }, this.options.debounceMs);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let globalManager: ReadabilityManager | null = null;

/**
 * Get the global readability manager instance
 */
export function getReadabilityManager(): ReadabilityManager {
  if (!globalManager) {
    globalManager = new ReadabilityManager();
  }
  return globalManager;
}

/**
 * Initialize the global manager with options
 */
export function initReadabilityManager(
  options: ReadabilityManagerOptions,
): ReadabilityManager {
  if (globalManager) {
    globalManager.dispose();
  }
  globalManager = new ReadabilityManager(options);
  return globalManager;
}

/**
 * Create an isolated manager instance
 */
export function createReadabilityManager(
  options: ReadabilityManagerOptions = {},
): ReadabilityManager {
  return new ReadabilityManager({ ...options, useGlobalStore: false });
}
