/**
 * Focus Tracker
 * Tracks the currently focused editable surface
 */
import type { EditableSurface } from './types';
import type { EditableScanner } from './scanner';
import { isEditableElement } from './helpers';

/**
 * Callback for focus changes
 */
export type FocusCallback = (
  current: EditableSurface | null,
  previous: EditableSurface | null
) => void;

/**
 * Manages focus tracking for editable surfaces
 */
export class FocusTracker {
  private scanner: EditableScanner;
  private current: EditableSurface | null = null;
  private callbacks: Set<FocusCallback> = new Set();
  private isListening = false;

  constructor(scanner: EditableScanner) {
    this.scanner = scanner;
  }

  /**
   * Get the currently focused editable surface
   */
  getCurrent(): EditableSurface | null {
    return this.current;
  }

  /**
   * Check if there's a focused editable surface
   */
  hasFocus(): boolean {
    return this.current !== null;
  }

  /**
   * Start tracking focus
   */
  start(): void {
    if (this.isListening) return;
    this.isListening = true;

    // Check initial focus
    this.checkFocus();

    // Listen for focus events
    document.addEventListener('focusin', this.handleFocusIn, true);
    document.addEventListener('focusout', this.handleFocusOut, true);
  }

  /**
   * Stop tracking focus
   */
  stop(): void {
    if (!this.isListening) return;
    this.isListening = false;

    document.removeEventListener('focusin', this.handleFocusIn, true);
    document.removeEventListener('focusout', this.handleFocusOut, true);
  }

  /**
   * Subscribe to focus changes
   */
  onChange(callback: FocusCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.current = null;
    this.callbacks.clear();
  }

  private handleFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Find the editable element (target or its ancestor)
    const editable = this.findEditableElement(target);
    if (!editable) return;

    const surface = this.scanner.getSurfaceForElement(editable);
    if (surface && surface !== this.current) {
      this.setFocus(surface);
    }
  };

  private handleFocusOut = (event: FocusEvent): void => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;

    // If focus is moving to another element, wait for focusin to handle it
    if (relatedTarget) {
      const nextEditable = this.findEditableElement(relatedTarget);
      if (nextEditable) {
        // Focus is moving to another editable, focusin will handle it
        return;
      }
    }

    // Focus is leaving editables entirely
    // Use a small delay to prevent flickering during rapid focus changes
    setTimeout(() => {
      if (this.current && !this.current.isFocused()) {
        this.setFocus(null);
      }
    }, 0);
  };

  private findEditableElement(target: HTMLElement): HTMLElement | null {
    // Check if target itself is editable
    if (isEditableElement(target)) {
      return target;
    }

    // Check ancestors
    let parent = target.parentElement;
    while (parent) {
      if (isEditableElement(parent)) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  private checkFocus(): void {
    const active = document.activeElement;
    if (active && active instanceof HTMLElement) {
      const editable = this.findEditableElement(active);
      if (editable) {
        const surface = this.scanner.getSurfaceForElement(editable);
        if (surface) {
          this.setFocus(surface);
        }
      }
    }
  }

  private setFocus(surface: EditableSurface | null): void {
    const previous = this.current;
    this.current = surface;

    if (previous !== surface) {
      this.notifyChange(surface, previous);
    }
  }

  private notifyChange(
    current: EditableSurface | null,
    previous: EditableSurface | null
  ): void {
    for (const callback of this.callbacks) {
      try {
        callback(current, previous);
      } catch (error) {
        console.error('[LangFix] Error in focus callback:', error);
      }
    }
  }
}

/**
 * Create a new FocusTracker instance
 */
export function createFocusTracker(scanner: EditableScanner): FocusTracker {
  return new FocusTracker(scanner);
}
