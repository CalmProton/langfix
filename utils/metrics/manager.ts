/**
 * Metrics Manager
 * Centralized manager for computing and caching text metrics
 */
import type { EditableSurface } from '../text-extraction/types';
import {
  createReadingTimeCalculator,
  type ReadingTimeCalculator,
} from './calculator';
import { MetricsCounter } from './counter';
import type { MetricsSettings, MetricsState } from './types';
import { DEFAULT_METRICS_SETTINGS, EMPTY_METRICS_STATE } from './types';

/**
 * Options for MetricsManager
 */
export interface MetricsManagerOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Initial settings */
  settings?: Partial<MetricsSettings>;
}

/**
 * Listener for metrics updates
 */
export type MetricsUpdateListener = (state: MetricsState) => void;

/**
 * MetricsManager class
 * Manages metrics computation with debouncing and caching
 */
export class MetricsManager {
  private counter: MetricsCounter;
  private calculator: ReadingTimeCalculator;
  private settings: MetricsSettings;

  // Caching
  private lastText: string = '';
  private cachedState: MetricsState = EMPTY_METRICS_STATE;

  // Debouncing
  private debounceMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Event listeners
  private listeners: Set<MetricsUpdateListener> = new Set();

  // Current surface
  private currentSurface: EditableSurface | null = null;
  private surfaceWatchDisposer: (() => void) | null = null;

  constructor(options: MetricsManagerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 300;
    this.settings = { ...DEFAULT_METRICS_SETTINGS, ...options.settings };

    this.counter = new MetricsCounter();
    this.calculator = createReadingTimeCalculator({
      wordsPerMinute: this.settings.readingSpeed,
      speakingWordsPerMinute: this.settings.speakingSpeed,
    });
  }

  /**
   * Update settings
   */
  public updateSettings(settings: Partial<MetricsSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Update calculator speeds if changed
    if (settings.readingSpeed !== undefined) {
      this.calculator.setReadingSpeed(settings.readingSpeed);
    }
    if (settings.speakingSpeed !== undefined) {
      this.calculator.setSpeakingSpeed(settings.speakingSpeed);
    }

    // Recalculate with new settings if we have cached text
    if (this.lastText) {
      this.computeAndNotify(this.lastText);
    }
  }

  /**
   * Get current settings
   */
  public getSettings(): MetricsSettings {
    return { ...this.settings };
  }

  /**
   * Set the current surface to track
   */
  public setSurface(surface: EditableSurface | null): void {
    // Cleanup previous watcher
    if (this.surfaceWatchDisposer) {
      this.surfaceWatchDisposer();
      this.surfaceWatchDisposer = null;
    }

    this.currentSurface = surface;

    if (surface) {
      // Initial calculation
      const text = surface.getText();
      this.computeAndNotify(text);
    } else {
      // Clear metrics when no surface
      this.lastText = '';
      this.cachedState = EMPTY_METRICS_STATE;
      this.notifyListeners();
    }
  }

  /**
   * Get current surface
   */
  public getSurface(): EditableSurface | null {
    return this.currentSurface;
  }

  /**
   * Calculate metrics for text (immediately, no debounce)
   */
  public calculate(text: string): MetricsState {
    // Return cached if text hasn't changed
    if (text === this.lastText && this.cachedState.timestamp > 0) {
      return this.cachedState;
    }

    this.lastText = text;
    const textMetrics = this.counter.calculate(text);
    const timeMetrics = this.calculator.calculateTimes(textMetrics.words);

    this.cachedState = {
      text: textMetrics,
      time: timeMetrics,
      timestamp: Date.now(),
    };

    return this.cachedState;
  }

  /**
   * Calculate metrics with debouncing (for real-time updates)
   */
  public calculateDebounced(text: string): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.computeAndNotify(text);
    }, this.debounceMs);
  }

  /**
   * Process text change from surface
   */
  public onTextChange(text: string): void {
    if (!this.settings.enabled) return;
    this.calculateDebounced(text);
  }

  /**
   * Get current metrics state
   */
  public getState(): MetricsState {
    return this.cachedState;
  }

  /**
   * Subscribe to metrics updates
   */
  public onUpdate(listener: MetricsUpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Force refresh metrics for current surface
   */
  public refresh(): void {
    if (this.currentSurface) {
      const text = this.currentSurface.getText();
      this.computeAndNotify(text);
    }
  }

  /**
   * Dispose the manager and cleanup resources
   */
  public dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.surfaceWatchDisposer) {
      this.surfaceWatchDisposer();
      this.surfaceWatchDisposer = null;
    }

    this.listeners.clear();
    this.currentSurface = null;
    this.lastText = '';
    this.cachedState = EMPTY_METRICS_STATE;
  }

  /**
   * Compute metrics and notify listeners
   */
  private computeAndNotify(text: string): void {
    this.calculate(text);
    this.notifyListeners();
  }

  /**
   * Notify all listeners of current state
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.cachedState);
      } catch (error) {
        console.error('[LangFix Metrics] Listener error:', error);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: MetricsManager | null = null;

/**
 * Get or create the singleton MetricsManager instance
 */
export function getMetricsManager(
  options?: MetricsManagerOptions,
): MetricsManager {
  if (!managerInstance) {
    managerInstance = new MetricsManager(options);
  }
  return managerInstance;
}

/**
 * Initialize MetricsManager with options
 */
export function initMetricsManager(
  options: MetricsManagerOptions,
): MetricsManager {
  if (managerInstance) {
    managerInstance.dispose();
  }
  managerInstance = new MetricsManager(options);
  return managerInstance;
}

/**
 * Dispose the singleton instance
 */
export function disposeMetricsManager(): void {
  if (managerInstance) {
    managerInstance.dispose();
    managerInstance = null;
  }
}
