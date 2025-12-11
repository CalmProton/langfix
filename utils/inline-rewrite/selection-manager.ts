/**
 * Inline Rewrite Selection Manager
 * Handles text selection detection and validation for inline rewrite
 */

import type { EditableSurface } from '../text-extraction/types';
import {
  DEFAULT_INLINE_REWRITE_CONFIG,
  type InlineRewriteConfig,
  type InlineRewriteError,
  type InlineSelection,
} from './types';

// ============================================================================
// Selection Utilities
// ============================================================================

/**
 * Get the current selection from a surface
 */
export function getSelectionFromSurface(
  surface: EditableSurface,
  config: InlineRewriteConfig = DEFAULT_INLINE_REWRITE_CONFIG,
): InlineSelection | null {
  const selection = surface.getSelection();

  // No selection or collapsed selection
  if (selection.start === selection.end) {
    return null;
  }

  const fullText = surface.getText();
  const text = fullText.slice(selection.start, selection.end);

  // Get context
  const contextStart = Math.max(0, selection.start - config.contextChars);
  const contextEnd = Math.min(
    fullText.length,
    selection.end + config.contextChars,
  );

  return {
    surfaceId: surface.id,
    start: selection.start,
    end: selection.end,
    text,
    contextBefore:
      contextStart < selection.start
        ? fullText.slice(contextStart, selection.start)
        : undefined,
    contextAfter:
      contextEnd > selection.end
        ? fullText.slice(selection.end, contextEnd)
        : undefined,
  };
}

/**
 * Validate selection for rewriting
 */
export function validateSelection(
  selection: InlineSelection,
  config: InlineRewriteConfig = DEFAULT_INLINE_REWRITE_CONFIG,
): InlineRewriteError | null {
  const textLength = selection.text.trim().length;

  if (textLength < config.minSelectionLength) {
    return {
      code: 'TOO_SHORT',
      message: `Selection is too short. Minimum ${config.minSelectionLength} characters required.`,
      retryable: false,
    };
  }

  if (textLength > config.maxSelectionLength) {
    return {
      code: 'TOO_LONG',
      message: `Selection is too long. Maximum ${config.maxSelectionLength} characters allowed.`,
      retryable: false,
    };
  }

  return null;
}

/**
 * Get viewport rect for a selection range
 */
export function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();

  if (rects.length === 0) {
    return null;
  }

  // Return the first rect (start of selection)
  return rects[0];
}

/**
 * Get all rects for a multi-line selection
 */
export function getAllSelectionRects(): DOMRect[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return [];
  }

  const range = selection.getRangeAt(0);
  return Array.from(range.getClientRects());
}

// ============================================================================
// Selection Manager Class
// ============================================================================

export type SelectionChangeCallback = (
  selection: InlineSelection | null,
  rect: DOMRect | null,
) => void;

export class SelectionManager {
  private config: InlineRewriteConfig;
  private currentSurface: EditableSurface | null = null;
  private listeners: SelectionChangeCallback[] = [];
  private selectionChangeHandler: (() => void) | null = null;
  private isListening = false;

  constructor(config?: Partial<InlineRewriteConfig>) {
    this.config = { ...DEFAULT_INLINE_REWRITE_CONFIG, ...config };
  }

  /**
   * Set the current surface to track
   */
  setSurface(surface: EditableSurface | null): void {
    this.currentSurface = surface;
  }

  /**
   * Get current surface
   */
  getSurface(): EditableSurface | null {
    return this.currentSurface;
  }

  /**
   * Start listening for selection changes
   */
  startListening(): void {
    if (this.isListening) return;
    this.isListening = true;

    this.selectionChangeHandler = () => {
      this.notifyListeners();
    };

    document.addEventListener('selectionchange', this.selectionChangeHandler);
  }

  /**
   * Stop listening for selection changes
   */
  stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;

    if (this.selectionChangeHandler) {
      document.removeEventListener(
        'selectionchange',
        this.selectionChangeHandler,
      );
      this.selectionChangeHandler = null;
    }
  }

  /**
   * Subscribe to selection changes
   */
  onSelectionChange(callback: SelectionChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get the current valid selection (if any)
   */
  getCurrentSelection(): InlineSelection | null {
    if (!this.currentSurface) return null;
    return getSelectionFromSurface(this.currentSurface, this.config);
  }

  /**
   * Validate current selection
   */
  validateCurrentSelection(): InlineRewriteError | null {
    const selection = this.getCurrentSelection();
    if (!selection) {
      return {
        code: 'NO_SELECTION',
        message: 'No text is selected.',
        retryable: false,
      };
    }
    return validateSelection(selection, this.config);
  }

  /**
   * Notify all listeners of selection change
   */
  private notifyListeners(): void {
    const selection = this.getCurrentSelection();
    const rect = selection ? getSelectionRect() : null;

    for (const listener of this.listeners) {
      listener(selection, rect);
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopListening();
    this.listeners = [];
    this.currentSurface = null;
  }
}

/**
 * Create a selection manager instance
 */
export function createSelectionManager(
  config?: Partial<InlineRewriteConfig>,
): SelectionManager {
  return new SelectionManager(config);
}
