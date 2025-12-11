/**
 * Metrics UI Manager
 * Main controller for the text metrics overlay system
 */

import { type App, createApp, reactive } from 'vue';
import { metricsSettingsStorage } from '#utils/storage';
import {
  getShadowContainer,
  type ShadowContainer,
} from '#utils/suggestion-ui/shadow-container';
import type { EditableSurface } from '#utils/text-extraction/types';
import MetricsDisplay from '@/components/metrics-ui/MetricsDisplay.vue';
import { MetricsManager, type MetricsManagerOptions } from './manager';
import type { MetricsSettings, MetricsState } from './types';
import { DEFAULT_METRICS_SETTINGS, EMPTY_METRICS_STATE } from './types';

// ============================================================================
// Render State
// ============================================================================

interface MetricsRenderState {
  metrics: MetricsState;
  settings: MetricsSettings;
}

// ============================================================================
// Metrics UI Manager
// ============================================================================

export class MetricsUIManager {
  private container: ShadowContainer | null = null;
  private metricsManager: MetricsManager;
  private settings: MetricsSettings;

  private vueApp: App | null = null;
  private renderState: MetricsRenderState;
  private mountPoint: HTMLElement | null = null;

  private currentSurface: EditableSurface | null = null;
  private textWatcher: (() => void) | null = null;

  private isInitialized = false;
  private isDestroyed = false;

  constructor(options?: MetricsManagerOptions) {
    this.metricsManager = new MetricsManager(options);
    this.settings = { ...DEFAULT_METRICS_SETTINGS, ...options?.settings };

    // Initialize reactive state
    this.renderState = reactive({
      metrics: EMPTY_METRICS_STATE,
      settings: this.settings,
    });

    // Subscribe to metrics updates
    this.metricsManager.onUpdate((state) => {
      this.renderState.metrics = state;
    });
  }

  /**
   * Initialize the metrics UI
   */
  public async init(): Promise<void> {
    if (this.isInitialized || this.isDestroyed) return;

    try {
      // Load settings from storage
      const storedSettings = await metricsSettingsStorage.getValue();
      if (storedSettings) {
        this.updateSettings(storedSettings);
      }

      // Get shadow container
      this.container = getShadowContainer();
      this.container.mount();

      // Create mount point inside popups container
      this.mountPoint = document.createElement('div');
      this.mountPoint.id = 'langfix-metrics-root';
      this.container.popupsContainer.appendChild(this.mountPoint);

      // Create and mount Vue app
      this.vueApp = createApp(MetricsDisplay, {
        metrics: this.renderState.metrics,
        settings: this.renderState.settings,
        onToggleExpanded: (_expanded: boolean) => {
          // Could track expanded state if needed
        },
      });

      this.vueApp.mount(this.mountPoint);
      this.isInitialized = true;

      // Watch for settings changes
      metricsSettingsStorage.watch((newSettings) => {
        if (newSettings) {
          this.updateSettings(newSettings);
        }
      });
    } catch (error) {
      console.error('[LangFix Metrics] Failed to initialize:', error);
    }
  }

  /**
   * Set the current surface to track
   */
  public setSurface(surface: EditableSurface | null): void {
    // Clear existing watcher
    if (this.textWatcher) {
      this.textWatcher();
      this.textWatcher = null;
    }

    this.currentSurface = surface;
    this.metricsManager.setSurface(surface);

    if (surface) {
      // Initial calculation
      const text = surface.getText();
      this.metricsManager.onTextChange(text);

      // Watch for text changes using a simple interval
      // (surface.onTextChange would be better if available)
      let lastText = text;
      const checkInterval = setInterval(() => {
        if (!this.currentSurface || this.isDestroyed) {
          clearInterval(checkInterval);
          return;
        }
        const currentText = this.currentSurface.getText();
        if (currentText !== lastText) {
          lastText = currentText;
          this.metricsManager.onTextChange(currentText);
        }
      }, 300);

      this.textWatcher = () => {
        clearInterval(checkInterval);
      };
    }
  }

  /**
   * Update settings
   */
  public updateSettings(settings: Partial<MetricsSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.renderState.settings = this.settings;
    this.metricsManager.updateSettings(settings);
  }

  /**
   * Get current settings
   */
  public getSettings(): MetricsSettings {
    return { ...this.settings };
  }

  /**
   * Get current metrics state
   */
  public getMetrics(): MetricsState {
    return this.metricsManager.getState();
  }

  /**
   * Force refresh metrics
   */
  public refresh(): void {
    this.metricsManager.refresh();
  }

  /**
   * Dispose the manager and cleanup resources
   */
  public dispose(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Clear text watcher
    if (this.textWatcher) {
      this.textWatcher();
      this.textWatcher = null;
    }

    // Unmount Vue app
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }

    // Remove mount point
    if (this.mountPoint?.parentNode) {
      this.mountPoint.parentNode.removeChild(this.mountPoint);
      this.mountPoint = null;
    }

    // Dispose metrics manager
    this.metricsManager.dispose();

    this.container = null;
    this.currentSurface = null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let uiManagerInstance: MetricsUIManager | null = null;

/**
 * Get or create the singleton MetricsUIManager instance
 */
export function getMetricsUIManager(
  options?: MetricsManagerOptions,
): MetricsUIManager {
  if (!uiManagerInstance) {
    uiManagerInstance = new MetricsUIManager(options);
  }
  return uiManagerInstance;
}

/**
 * Dispose the singleton instance
 */
export function disposeMetricsUIManager(): void {
  if (uiManagerInstance) {
    uiManagerInstance.dispose();
    uiManagerInstance = null;
  }
}
