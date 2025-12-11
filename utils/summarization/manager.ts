/**
 * Summarization Manager
 * Main controller for the summarization feature in content scripts
 */

import { type App, createApp, reactive } from 'vue';
import SummarizationPopup from '#components/summarization-ui/SummarizationPopup.vue';
import { browser } from '#imports';
import { calculatePopupPosition } from '#utils/suggestion-ui/rect-helpers';
import {
  getShadowContainer,
  type ShadowContainer,
} from '#utils/suggestion-ui/shadow-container';
import {
  analyzeSelection,
  getSelectionBottomRect,
  validateSelection,
} from './selection-handler';
import {
  DEFAULT_SUMMARIZATION_CONFIG,
  DEFAULT_SUMMARIZATION_STATE,
  getBulletCount,
  type SummarizationConfig,
  type SummarizationError,
  type SummarizationState,
  type SummaryResponse,
} from './types';

// ============================================================================
// Request ID Generation
// ============================================================================

let requestIdCounter = 0;

function generateRequestId(): string {
  return `summary-${++requestIdCounter}-${Date.now()}`;
}

// ============================================================================
// Summarization Manager
// ============================================================================

export class SummarizationManager {
  private config: SummarizationConfig;
  private container: ShadowContainer;
  private state: SummarizationState;
  private isDestroyed = false;
  private port: ReturnType<typeof browser.runtime.connect> | null = null;
  private stateListeners: Set<() => void> = new Set();
  private popupApp: App | null = null;
  private popupContainer: HTMLElement | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private messageListener: ((message: unknown) => void) | null = null;

  constructor(config?: Partial<SummarizationConfig>) {
    this.config = { ...DEFAULT_SUMMARIZATION_CONFIG, ...config };
    this.container = getShadowContainer();
    this.state = reactive({ ...DEFAULT_SUMMARIZATION_STATE });
  }

  /**
   * Initialize the manager
   */
  init(): void {
    if (this.isDestroyed) return;

    this.setupKeyboardShortcut();
    this.setupMessageListener();
  }

  /**
   * Get the current state (reactive)
   */
  getState(): SummarizationState {
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
   * Setup keyboard shortcut (Ctrl+Shift+S / Cmd+Shift+S)
   */
  private setupKeyboardShortcut(): void {
    if (!this.config.keyboardShortcutEnabled) return;

    this.keydownHandler = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+S (Windows/Linux) or Cmd+Shift+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSummarize();
      }

      // Close popup on Escape
      if (e.key === 'Escape' && this.state.status !== 'idle') {
        e.preventDefault();
        this.closePopup();
      }
    };

    document.addEventListener('keydown', this.keydownHandler, {
      capture: true,
    });
  }

  /**
   * Setup message listener for context menu
   */
  private setupMessageListener(): void {
    this.messageListener = (message: unknown) => {
      const msg = message as { type: string };
      if (msg.type === 'SUMMARIZE_SELECTION') {
        this.triggerSummarize();
      }
    };

    browser.runtime.onMessage.addListener(this.messageListener);
  }

  /**
   * Trigger summarization for current selection
   */
  async triggerSummarize(): Promise<void> {
    // Analyze the current selection
    const selection = analyzeSelection();
    if (!selection) {
      this.showError({
        code: 'NO_SELECTION',
        message: 'Please select some text to summarize.',
        retryable: false,
      });
      return;
    }

    // Validate selection length
    const validationError = validateSelection(
      selection,
      this.config.minWords,
      this.config.maxWords,
    );
    if (validationError) {
      this.showError(validationError as SummarizationError);
      return;
    }

    // Get selection rect for popup positioning
    const rect = getSelectionBottomRect();
    if (!rect) {
      return;
    }

    // Close any existing popup
    this.closePopup();

    // Calculate bullet count based on selection
    const maxBullets = getBulletCount(selection.type, selection.wordCount);

    // Update state
    const requestId = generateRequestId();
    this.state.status = 'loading';
    this.state.originalText = selection.text;
    this.state.selectionType = selection.type;
    this.state.bullets = [];
    this.state.keyTakeaway = null;
    this.state.cached = false;
    this.state.error = null;
    this.state.activeRequestId = requestId;
    this.state.processingTime = null;
    this.notifyStateChange();

    // Mount the popup
    this.mountPopup(rect);

    // Start the summarization request
    this.startSummarization(
      requestId,
      selection.text,
      selection.type,
      maxBullets,
    );
  }

  /**
   * Mount the summarization popup
   */
  private mountPopup(rect: DOMRect): void {
    // Create container element
    this.popupContainer = document.createElement('div');
    this.popupContainer.className = 'lf-summarization-popup-container';
    this.container.popupsContainer.appendChild(this.popupContainer);

    // Calculate position
    const position = calculatePopupPosition(
      {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        viewportClamped: false,
        original: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      },
      320, // popup width
      280, // estimated popup height
    );

    // Create and mount Vue app
    this.popupApp = createApp(SummarizationPopup, {
      state: this.state,
      position: { x: position.x, y: position.y },
      anchor: position.anchor,
      onClose: () => this.closePopup(),
      onCopy: () => this.copySummary(),
      onRetry: () => this.retrySummarization(),
    });

    this.popupApp.mount(this.popupContainer);
  }

  /**
   * Close and unmount the popup
   */
  closePopup(): void {
    // Cancel any active request
    if (this.state.activeRequestId) {
      this.cancelCurrentRequest();
    }

    // Unmount Vue app
    if (this.popupApp) {
      this.popupApp.unmount();
      this.popupApp = null;
    }

    // Remove container
    if (this.popupContainer) {
      this.popupContainer.remove();
      this.popupContainer = null;
    }

    // Reset state
    Object.assign(this.state, DEFAULT_SUMMARIZATION_STATE);
    this.notifyStateChange();
  }

  /**
   * Show error state
   */
  private showError(error: SummarizationError): void {
    this.state.status = 'error';
    this.state.error = error;
    this.notifyStateChange();

    // If no popup mounted, mount it to show error
    if (!this.popupContainer) {
      const rect = getSelectionBottomRect();
      if (rect) {
        this.mountPopup(rect);
      }
    }
  }

  /**
   * Start summarization request via background port
   */
  private startSummarization(
    requestId: string,
    text: string,
    type: string,
    maxBullets: number,
  ): void {
    // Connect to background script
    this.port = browser.runtime.connect({ name: 'summarization' });

    this.port.onMessage.addListener((message: unknown) => {
      const msg = message as {
        type: string;
        payload: SummaryResponse | { error: SummarizationError };
      };

      if (msg.type === 'SUMMARY_CHUNK') {
        // Handle streaming chunk - reserved for future streaming support
        // For now, we just wait for the final result
      } else if (msg.type === 'SUMMARY_COMPLETE') {
        this.handleSummaryComplete(msg.payload as SummaryResponse);
      } else if (msg.type === 'SUMMARY_ERROR') {
        const errorPayload = msg.payload as { error: SummarizationError };
        this.handleSummaryError(errorPayload.error);
      }
    });

    this.port.onDisconnect.addListener(() => {
      this.port = null;
    });

    // Send request
    this.port.postMessage({
      type: 'SUMMARY_START',
      payload: {
        id: requestId,
        text,
        type,
        maxBullets,
      },
    });
  }

  /**
   * Handle successful summary completion
   */
  private handleSummaryComplete(response: SummaryResponse): void {
    if (response.id !== this.state.activeRequestId) return;

    this.state.status = 'done';
    this.state.bullets = response.bullets;
    this.state.keyTakeaway = response.keyTakeaway || null;
    this.state.cached = response.cached;
    this.state.processingTime = response.processingTime;
    this.notifyStateChange();
  }

  /**
   * Handle summary error
   */
  private handleSummaryError(error: SummarizationError): void {
    this.state.status = 'error';
    this.state.error = error;
    this.notifyStateChange();
  }

  /**
   * Cancel the current request
   */
  private cancelCurrentRequest(): void {
    if (this.port && this.state.activeRequestId) {
      this.port.postMessage({
        type: 'SUMMARY_CANCEL',
        payload: { id: this.state.activeRequestId },
      });
      this.port.disconnect();
      this.port = null;
    }
    this.state.activeRequestId = null;
  }

  /**
   * Copy summary to clipboard
   */
  async copySummary(): Promise<void> {
    if (this.state.bullets.length === 0) return;

    let summaryText = '';

    if (this.state.keyTakeaway) {
      summaryText += `${this.state.keyTakeaway}\n\n`;
    }

    summaryText += this.state.bullets.map((b) => `• ${b}`).join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
    } catch (error) {
      console.error('[LangFix] Failed to copy summary:', error);
    }
  }

  /**
   * Retry the current summarization
   */
  retrySummarization(): void {
    if (!this.state.originalText || !this.state.selectionType) return;

    const maxBullets = getBulletCount(
      this.state.selectionType,
      this.state.originalText.split(/\s+/).length,
    );

    // Generate new request ID
    const requestId = generateRequestId();
    this.state.status = 'loading';
    this.state.bullets = [];
    this.state.keyTakeaway = null;
    this.state.cached = false;
    this.state.error = null;
    this.state.activeRequestId = requestId;
    this.state.processingTime = null;
    this.notifyStateChange();

    // Start new request
    this.startSummarization(
      requestId,
      this.state.originalText,
      this.state.selectionType,
      maxBullets,
    );
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    this.isDestroyed = true;

    // Remove keyboard handler
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler, {
        capture: true,
      });
      this.keydownHandler = null;
    }

    // Remove message listener
    if (this.messageListener) {
      browser.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }

    // Close popup
    this.closePopup();

    // Clear listeners
    this.stateListeners.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: SummarizationManager | null = null;

/**
 * Get the summarization manager singleton
 */
export function getSummarizationManager(): SummarizationManager {
  if (!instance) {
    instance = new SummarizationManager();
  }
  return instance;
}

/**
 * Dispose the summarization manager singleton
 */
export function disposeSummarizationManager(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
