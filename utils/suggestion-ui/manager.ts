/**
 * Suggestion UI Manager
 * Main controller for the inline suggestion overlay system
 */

import { type App, createApp, h, reactive } from 'vue';
// Import Vue components
import ErrorUnderline from '@/components/suggestion-ui/ErrorUnderline.vue';
import SuggestionPopup from '@/components/suggestion-ui/SuggestionPopup.vue';
import type { ExtendedGrammarError } from '../grammar-engine/types';
import type { EditableSurface } from '../text-extraction/types';
import { createPositionInvalidator } from './rect-helpers';
import {
  disposeShadowContainer,
  getShadowContainer,
  type ShadowContainer,
} from './shadow-container';
import { createSuggestionStore, type SuggestionStore } from './store';
import { createSurfaceAdapter, hasDispose, isIgnored } from './surface-adapter';
import type {
  Disposer,
  SuggestionError,
  SuggestionUIConfig,
  SurfaceAdapter,
  ThemeMode,
  ViewportRect,
} from './types';
import { DEFAULT_SUGGESTION_UI_CONFIG } from './types';

// ============================================================================
// Error ID Generation
// ============================================================================

let errorIdCounter = 0;

function generateErrorId(): string {
  return `err-${++errorIdCounter}-${Date.now()}`;
}

/**
 * Convert grammar errors to suggestion errors with IDs
 */
function toSuggestionErrors(
  errors: ExtendedGrammarError[],
  surfaceId: string,
): SuggestionError[] {
  return errors
    .map((error) => ({
      ...error,
      id: generateErrorId(),
      surfaceId,
    }))
    .filter((error) => !isIgnored(error));
}

// ============================================================================
// Vue App for Rendering
// ============================================================================

interface RenderState {
  errors: SuggestionError[];
  rects: Map<string, ViewportRect>;
  activeErrorId: string | null;
  activeRect: ViewportRect | null;
}

function createRendererApp(
  state: RenderState,
  handlers: {
    onErrorClick: (id: string) => void;
    onErrorKeydown: (id: string, event: KeyboardEvent) => void;
    onApply: (suggestion: string) => void;
    onIgnore: () => void;
    onAddToDictionary: () => void;
    onClose: () => void;
  },
): App {
  return createApp({
    setup() {
      const reactiveState = reactive(state);

      return () => {
        const children = [];

        // Render underlines
        for (const error of reactiveState.errors) {
          const rect = reactiveState.rects.get(error.id);
          if (!rect) continue;

          children.push(
            h(ErrorUnderline, {
              key: error.id,
              error,
              rect,
              isActive: error.id === reactiveState.activeErrorId,
              onClick: () => handlers.onErrorClick(error.id),
              onKeydown: (event: KeyboardEvent) =>
                handlers.onErrorKeydown(error.id, event),
            }),
          );
        }

        // Render popup for active error
        if (reactiveState.activeErrorId && reactiveState.activeRect) {
          const activeError = reactiveState.errors.find(
            (e) => e.id === reactiveState.activeErrorId,
          );
          if (activeError) {
            children.push(
              h(SuggestionPopup, {
                key: 'popup',
                error: activeError,
                rect: reactiveState.activeRect,
                onApply: handlers.onApply,
                onIgnore: handlers.onIgnore,
                onAddToDictionary: handlers.onAddToDictionary,
                onClose: handlers.onClose,
              }),
            );
          }
        }

        return children;
      };
    },
  });
}

// ============================================================================
// Suggestion UI Manager
// ============================================================================

export class SuggestionUIManager {
  private container: ShadowContainer;
  private store: SuggestionStore;
  private config: SuggestionUIConfig;

  private currentSurface: EditableSurface | null = null;
  private currentAdapter: (SurfaceAdapter & { dispose?: () => void }) | null =
    null;

  private vueApp: App | null = null;
  private renderState: RenderState;
  private positionInvalidator: ReturnType<
    typeof createPositionInvalidator
  > | null = null;

  private disposers: Disposer[] = [];
  private isDestroyed = false;

  constructor(config?: Partial<SuggestionUIConfig>) {
    this.config = { ...DEFAULT_SUGGESTION_UI_CONFIG, ...config };
    this.container = getShadowContainer();
    this.store = createSuggestionStore();

    this.renderState = reactive({
      errors: [],
      rects: new Map(),
      activeErrorId: null,
      activeRect: null,
    });

    this.setupStoreSubscriptions();
  }

  /**
   * Initialize and mount the UI
   */
  init(): void {
    if (this.isDestroyed) return;

    this.container.mount();
    this.mountVueApp();
    this.setupPositionHandling();
  }

  /**
   * Set the current surface to track
   */
  setSurface(surface: EditableSurface | null): void {
    if (this.isDestroyed) return;

    // Clean up previous adapter
    if (this.currentAdapter && hasDispose(this.currentAdapter)) {
      this.currentAdapter.dispose();
    }

    this.currentSurface = surface;
    this.currentAdapter = surface ? createSurfaceAdapter(surface) : null;

    this.store.setSurface(surface?.id ?? null);
    this.store.setVisibility(surface ? 'underlines' : 'hidden');

    this.updateRects();
  }

  /**
   * Set grammar errors for the current surface
   */
  setErrors(errors: ExtendedGrammarError[]): void {
    if (this.isDestroyed || !this.currentSurface) return;

    const suggestionErrors = toSuggestionErrors(errors, this.currentSurface.id);
    this.store.setErrors(suggestionErrors);

    this.updateRects();
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.store.clearErrors();
    this.renderState.errors = [];
    this.renderState.rects.clear();
    this.renderState.activeErrorId = null;
    this.renderState.activeRect = null;
  }

  /**
   * Set the theme mode
   */
  setTheme(theme: ThemeMode): void {
    this.store.setTheme(theme);
    this.container.setTheme(theme);
  }

  /**
   * Navigate to next error
   */
  nextError(): void {
    const error = this.store.nextError();
    if (error) {
      this.scrollToError(error);
    }
  }

  /**
   * Navigate to previous error
   */
  prevError(): void {
    const error = this.store.prevError();
    if (error) {
      this.scrollToError(error);
    }
  }

  /**
   * Get current error count
   */
  getErrorCount(): number {
    return this.store.getErrors().length;
  }

  /**
   * Subscribe to store changes
   */
  onStateChange(callback: () => void): Disposer {
    return this.store.subscribe(callback);
  }

  /**
   * Destroy the manager and cleanup resources
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Cleanup Vue app
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }

    // Cleanup position handling
    if (this.positionInvalidator) {
      this.positionInvalidator.detach();
      this.positionInvalidator = null;
    }

    // Cleanup adapter
    if (this.currentAdapter && hasDispose(this.currentAdapter)) {
      this.currentAdapter.dispose();
    }

    // Cleanup subscriptions
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];

    // Cleanup container
    disposeShadowContainer();

    // Reset store
    this.store.reset();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupStoreSubscriptions(): void {
    // Sync store state to render state
    const unsubErrors = this.store.onErrorsChange((errors) => {
      this.renderState.errors = errors;
    });

    const unsubActive = this.store.onActiveErrorChange((error) => {
      this.renderState.activeErrorId = error?.id ?? null;
      if (error && this.currentAdapter) {
        this.renderState.activeRect = this.currentAdapter.getErrorRect(error);
      } else {
        this.renderState.activeRect = null;
      }
    });

    this.disposers.push(unsubErrors, unsubActive);
  }

  private mountVueApp(): void {
    const mountPoint = document.createElement('div');
    this.container.popupsContainer.appendChild(mountPoint);

    this.vueApp = createRendererApp(this.renderState, {
      onErrorClick: (id) => this.handleErrorClick(id),
      onErrorKeydown: (id, event) => this.handleErrorKeydown(id, event),
      onApply: (suggestion) => this.handleApply(suggestion),
      onIgnore: () => this.handleIgnore(),
      onAddToDictionary: () => this.handleAddToDictionary(),
      onClose: () => this.handleClose(),
    });

    this.vueApp.mount(mountPoint);
  }

  private setupPositionHandling(): void {
    this.positionInvalidator = createPositionInvalidator(
      () => this.updateRects(),
      this.config.positionDebounceMs,
    );
    this.positionInvalidator.attach();
  }

  private updateRects(): void {
    if (!this.currentAdapter) {
      this.renderState.rects.clear();
      return;
    }

    const errors = this.store.getErrors();
    const rects = this.currentAdapter.getErrorRects([...errors]);
    this.renderState.rects = rects;

    // Update active rect if needed
    const activeError = this.store.getActiveError();
    if (activeError) {
      this.renderState.activeRect = rects.get(activeError.id) ?? null;
    }
  }

  private scrollToError(error: SuggestionError): void {
    const rect = this.renderState.rects.get(error.id);
    if (rect && this.currentSurface) {
      // Focus the surface and scroll into view if needed
      this.currentSurface.focus();

      // Check if rect is outside viewport
      const viewportHeight = window.innerHeight;
      if (rect.y < 0 || rect.y + rect.height > viewportHeight) {
        // Scroll element into view
        const element = this.currentSurface.root;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleErrorClick(id: string): void {
    this.store.setActiveError(id);
  }

  private handleErrorKeydown(_id: string, event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextError();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevError();
    }
  }

  private async handleApply(suggestion: string): Promise<void> {
    const activeError = this.store.getActiveError();
    if (!activeError || !this.currentAdapter) return;

    const result = this.currentAdapter.apply(activeError, suggestion);

    if (result.success) {
      this.store.removeError(activeError.id);
      this.container.announce(`Applied correction: ${suggestion}`);

      // Invalidate rects since text changed
      this.currentAdapter.invalidateRects();
      this.updateRects();
    } else {
      this.container.announce(`Failed to apply: ${result.message}`);
    }
  }

  private handleIgnore(): void {
    const activeError = this.store.getActiveError();
    if (!activeError || !this.currentAdapter) return;

    this.currentAdapter.ignore(activeError);
    this.store.removeError(activeError.id);
    this.container.announce('Error ignored');
  }

  private async handleAddToDictionary(): Promise<void> {
    const activeError = this.store.getActiveError();
    if (!activeError || !this.currentAdapter) return;

    const result = await this.currentAdapter.addToDictionary(
      activeError.original,
    );

    if (result.success) {
      this.store.removeError(activeError.id);
      this.container.announce(`Added "${activeError.original}" to dictionary`);
    } else {
      this.container.announce(`Failed to add to dictionary: ${result.message}`);
    }
  }

  private handleClose(): void {
    this.store.closePopup();
  }
}

// ============================================================================
// Factory
// ============================================================================

let sharedManager: SuggestionUIManager | null = null;

/**
 * Get or create the shared suggestion UI manager
 */
export function getSuggestionUIManager(
  config?: Partial<SuggestionUIConfig>,
): SuggestionUIManager {
  if (!sharedManager) {
    sharedManager = new SuggestionUIManager(config);
  }
  return sharedManager;
}

/**
 * Dispose the shared manager
 */
export function disposeSuggestionUIManager(): void {
  if (sharedManager) {
    sharedManager.destroy();
    sharedManager = null;
  }
}
