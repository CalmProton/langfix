/**
 * Inline Rewrite Manager
 * Main controller for the inline rewrite feature
 */

import { reactive } from 'vue';
import { browser } from '#imports';
import type { RewriteMode } from '../rewrite-engine/types';
import {
  getShadowContainer,
  type ShadowContainer,
} from '../suggestion-ui/shadow-container';
import type { EditableSurface } from '../text-extraction/types';
import {
  createSelectionManager,
  type SelectionManager,
} from './selection-manager';
import {
  DEFAULT_INLINE_REWRITE_CONFIG,
  DEFAULT_INLINE_REWRITE_STATE,
  type InlineRewriteConfig,
  type InlineRewriteError,
  type InlineRewriteErrorCode,
  type InlineRewriteResult,
  type InlineRewriteState,
  type InlineRewriteStreamChunk,
  type InlineSelection,
} from './types';

// ============================================================================
// Request ID Generation
// ============================================================================

let requestIdCounter = 0;

function generateRequestId(): string {
  return `rewrite-${++requestIdCounter}-${Date.now()}`;
}

// ============================================================================
// Inline Rewrite Manager
// ============================================================================

export class InlineRewriteManager {
  private config: InlineRewriteConfig;
  private container: ShadowContainer;
  private selectionManager: SelectionManager;
  private state: InlineRewriteState;
  private abortController: AbortController | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private messageListener: ((message: unknown) => void) | null = null;
  private isDestroyed = false;
  private port: ReturnType<typeof browser.runtime.connect> | null = null;
  private stateListeners: Set<() => void> = new Set();

  constructor(config?: Partial<InlineRewriteConfig>) {
    this.config = { ...DEFAULT_INLINE_REWRITE_CONFIG, ...config };
    this.container = getShadowContainer();
    this.selectionManager = createSelectionManager(this.config);
    this.state = reactive({ ...DEFAULT_INLINE_REWRITE_STATE });
  }

  /**
   * Initialize the manager
   */
  init(): void {
    if (this.isDestroyed) return;

    this.setupKeyboardShortcut();
    this.setupContextMenu();
  }

  /**
   * Set the current surface
   */
  setSurface(surface: EditableSurface | null): void {
    this.selectionManager.setSurface(surface);
    if (surface) {
      this.state.surfaceId = surface.id;
    } else {
      this.state.surfaceId = null;
    }
  }

  /**
   * Get the current state (reactive)
   */
  getState(): InlineRewriteState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Notify state listeners
   */
  private notifyStateChange(): void {
    for (const listener of this.stateListeners) {
      listener();
    }
  }

  /**
   * Get current selection rect for popup positioning
   */
  getSelectionRect(): DOMRect | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    return rects.length > 0 ? rects[0] : null;
  }

  /**
   * Get the popups container for mounting UI
   */
  getPopupsContainer(): HTMLElement {
    return this.container.popupsContainer;
  }

  /**
   * Trigger inline rewrite for current selection
   */
  async triggerRewrite(mode?: RewriteMode): Promise<void> {
    const surface = this.selectionManager.getSurface();
    if (!surface) {
      this.showError({
        code: 'INVALID_SURFACE',
        message: 'No editable surface is focused.',
        retryable: false,
      });
      return;
    }

    const selection = this.selectionManager.getCurrentSelection();
    if (!selection) {
      this.showError({
        code: 'NO_SELECTION',
        message: 'Please select some text to rewrite.',
        retryable: false,
      });
      return;
    }

    const validationError = this.selectionManager.validateCurrentSelection();
    if (validationError) {
      this.showError(validationError);
      return;
    }

    // Show the popup
    this.openPopup(selection, mode || this.state.mode);
  }

  /**
   * Open the rewrite popup
   */
  private openPopup(selection: InlineSelection, mode: RewriteMode): void {
    this.state.status = 'loading';
    this.state.mode = mode;
    this.state.originalText = selection.text;
    this.state.resultText = '';
    this.state.error = null;
    this.state.previousResult = null;
    this.state.processingTime = null;
    this.state.stats = null;
    this.notifyStateChange();

    // Start the rewrite request
    this.startRewrite(selection, mode);
  }

  /**
   * Start a rewrite request
   */
  private startRewrite(selection: InlineSelection, mode: RewriteMode): void {
    const requestId = generateRequestId();
    this.state.activeRequestId = requestId;

    // Cancel any previous request
    this.cancelCurrentRequest();

    // Create abort controller
    this.abortController = new AbortController();

    // Connect to background script via port for streaming
    this.connectToBackground(requestId, selection, mode);
  }

  /**
   * Connect to background script and handle streaming
   */
  private connectToBackground(
    requestId: string,
    selection: InlineSelection,
    mode: RewriteMode,
  ): void {
    try {
      this.port = browser.runtime.connect({ name: 'inline-rewrite' });

      this.port.onMessage.addListener((message: unknown) => {
        const msg = message as { type: string; payload: unknown };
        if (msg.type === 'INLINE_REWRITE_CHUNK') {
          this.handleStreamChunk(msg.payload as InlineRewriteStreamChunk);
        } else if (msg.type === 'INLINE_REWRITE_COMPLETE') {
          this.handleComplete(msg.payload as InlineRewriteResult);
        } else if (msg.type === 'INLINE_REWRITE_ERROR') {
          const errorPayload = msg.payload as { error: InlineRewriteError };
          this.handleError(errorPayload.error);
        }
      });

      this.port.onDisconnect.addListener(() => {
        if (
          this.state.status === 'loading' ||
          this.state.status === 'streaming'
        ) {
          this.handleError({
            code: 'API_ERROR',
            message: 'Connection to background script lost.',
            retryable: true,
          });
        }
        this.port = null;
      });

      // Send the rewrite request
      this.port.postMessage({
        type: 'INLINE_REWRITE_START',
        payload: {
          id: requestId,
          mode,
          selection,
          temperature: this.config.defaultTemperature,
          stream: true,
        },
      });

      this.state.status = 'streaming';
      this.notifyStateChange();
    } catch (error) {
      this.handleError({
        code: 'API_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to connect to background script.',
        retryable: true,
      });
    }
  }

  /**
   * Handle a stream chunk
   */
  private handleStreamChunk(chunk: InlineRewriteStreamChunk): void {
    if (chunk.id !== this.state.activeRequestId) return;

    if (chunk.error) {
      this.handleError({
        code: chunk.error.code as InlineRewriteErrorCode,
        message: chunk.error.message,
        retryable: chunk.error.retryable,
      });
      return;
    }

    this.state.resultText += chunk.contentDelta;

    if (chunk.done) {
      this.state.status = 'done';
    }
    this.notifyStateChange();
  }

  /**
   * Handle rewrite completion
   */
  private handleComplete(result: InlineRewriteResult): void {
    if (result.id !== this.state.activeRequestId) return;

    this.state.status = 'done';
    this.state.resultText = result.rewritten;
    this.state.processingTime = result.processingTime;
    this.state.stats = result.stats;
    this.notifyStateChange();
  }

  /**
   * Handle errors
   */
  private handleError(error: InlineRewriteError): void {
    this.state.status = 'error';
    this.state.error = error;
    this.notifyStateChange();
  }

  /**
   * Show an error without starting a request
   */
  private showError(error: InlineRewriteError): void {
    this.state.status = 'error';
    this.state.error = error;
    this.state.originalText = '';
    this.state.resultText = '';
    this.notifyStateChange();
  }

  /**
   * Cancel the current request
   */
  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.port && this.state.activeRequestId) {
      try {
        this.port.postMessage({
          type: 'INLINE_REWRITE_CANCEL',
          payload: { id: this.state.activeRequestId },
        });
      } catch {
        // Port may be disconnected
      }
    }
  }

  /**
   * Retry the current rewrite with the same mode
   */
  async retry(): Promise<void> {
    const surface = this.selectionManager.getSurface();
    if (!surface) return;

    const selection = this.selectionManager.getCurrentSelection();
    if (!selection) return;

    // Store current result for comparison
    if (this.state.resultText) {
      this.state.previousResult = this.state.resultText;
    }

    this.state.status = 'loading';
    this.state.resultText = '';
    this.state.error = null;
    this.notifyStateChange();

    // Use retry message if we have a previous result
    if (this.state.previousResult && this.port) {
      const requestId = generateRequestId();
      this.state.activeRequestId = requestId;

      this.port.postMessage({
        type: 'INLINE_REWRITE_RETRY',
        payload: {
          id: requestId,
          mode: this.state.mode,
          previousResult: this.state.previousResult,
          selection,
        },
      });

      this.state.status = 'streaming';
      this.notifyStateChange();
    } else {
      this.startRewrite(selection, this.state.mode);
    }
  }

  /**
   * Apply the rewritten text
   */
  apply(): boolean {
    const surface = this.selectionManager.getSurface();
    if (!surface || !this.state.resultText) return false;

    const selection = this.selectionManager.getCurrentSelection();
    if (!selection) return false;

    try {
      // Replace the selected text with the rewritten version
      surface.replace(selection.start, selection.end, this.state.resultText);

      // Announce the change for screen readers
      this.container.announce('Text replaced successfully');

      this.close();
      return true;
    } catch (error) {
      console.error('[InlineRewrite] Failed to apply:', error);
      return false;
    }
  }

  /**
   * Copy result to clipboard
   */
  async copy(): Promise<boolean> {
    if (!this.state.resultText) return false;

    try {
      await navigator.clipboard.writeText(this.state.resultText);
      this.container.announce('Text copied to clipboard');
      return true;
    } catch (error) {
      console.error('[InlineRewrite] Failed to copy:', error);
      return false;
    }
  }

  /**
   * Change rewrite mode and regenerate
   */
  async changeMode(mode: RewriteMode): Promise<void> {
    this.state.mode = mode;
    const selection = this.selectionManager.getCurrentSelection();
    if (selection) {
      this.openPopup(selection, mode);
    }
  }

  /**
   * Close the popup
   */
  close(): void {
    this.cancelCurrentRequest();
    Object.assign(this.state, { ...DEFAULT_INLINE_REWRITE_STATE });

    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        // May already be disconnected
      }
      this.port = null;
    }
    this.notifyStateChange();
  }

  /**
   * Check if popup is open
   */
  isOpen(): boolean {
    return this.state.status !== 'idle';
  }

  /**
   * Setup keyboard shortcut
   */
  private setupKeyboardShortcut(): void {
    this.keydownHandler = (event: KeyboardEvent) => {
      // Parse shortcut (e.g., 'Ctrl+Shift+R')
      const parts = this.config.shortcut.split('+');
      const key = parts[parts.length - 1].toLowerCase();
      const needsCtrl = parts.includes('Ctrl');
      const needsShift = parts.includes('Shift');
      const needsAlt = parts.includes('Alt');

      const ctrlMatch = needsCtrl
        ? event.ctrlKey || event.metaKey
        : !event.ctrlKey && !event.metaKey;
      const shiftMatch = needsShift ? event.shiftKey : !event.shiftKey;
      const altMatch = needsAlt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === key;

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        event.stopPropagation();
        this.triggerRewrite();
      }

      // Escape to close
      if (event.key === 'Escape' && this.isOpen()) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
    };

    document.addEventListener('keydown', this.keydownHandler, {
      capture: true,
    });
  }

  /**
   * Setup context menu handler
   */
  private setupContextMenu(): void {
    // Context menu items are registered in the background script
    // We just handle the messages here
    this.messageListener = (message: unknown) => {
      const msg = message as { type?: string; mode?: RewriteMode };
      if (msg.type === 'CONTEXT_MENU_REWRITE' && msg.mode) {
        this.triggerRewrite(msg.mode);
      }
    };

    browser.runtime.onMessage.addListener(this.messageListener);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.cancelCurrentRequest();

    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        // May already be disconnected
      }
      this.port = null;
    }

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler, {
        capture: true,
      });
      this.keydownHandler = null;
    }

    if (this.messageListener) {
      browser.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }

    this.stateListeners.clear();
    this.selectionManager.dispose();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: InlineRewriteManager | null = null;

/**
 * Get the inline rewrite manager singleton
 */
export function getInlineRewriteManager(
  config?: Partial<InlineRewriteConfig>,
): InlineRewriteManager {
  if (!instance) {
    instance = new InlineRewriteManager(config);
  }
  return instance;
}

/**
 * Dispose the inline rewrite manager singleton
 */
export function disposeInlineRewriteManager(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
