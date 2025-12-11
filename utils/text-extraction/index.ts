/**
 * Text Extraction Module
 * Main entry point for the text extraction functionality
 *
 * Provides unified API for detecting, tracking, and interacting with
 * editable text surfaces across web pages.
 */

export {
  ContentEditableSurface,
  createContentEditableSurface,
} from './contenteditable-surface';
export type { FocusCallback } from './focus-tracker';
// Focus Tracker
export { createFocusTracker, FocusTracker } from './focus-tracker';
// Helpers
export {
  CODE_EDITOR_MARKERS,
  createRangeFromOffsets,
  debounce,
  dispatchChangeEvent,
  dispatchInputEvent,
  EDITABLE_SELECTORS,
  getPlainText,
  getSurfaceType,
  getTextOffset,
  hasNonEditableAncestor,
  isEditableElement,
  isInCodeEditor,
  isSecretField,
  isVisible,
  PLATFORM_SELECTORS,
} from './helpers';
// Surface Adapters
export {
  createInputTextareaSurface,
  InputTextareaSurface,
} from './input-surface';
// Scanner
export {
  collectEditables,
  createScanner,
  createSurface,
  EditableScanner,
} from './scanner';
// Types
export type {
  ChangeCallback,
  ChangeOptions,
  Disposer,
  EditableSurface,
  ExtractedText,
  PlatformConfig,
  ScanResult,
  SurfaceType,
  TextExtractionConfig,
  TextSelection,
} from './types';

// ============================================================================
// Convenience Factory
// ============================================================================

import { type FocusCallback, FocusTracker } from './focus-tracker';
import { EditableScanner } from './scanner';
import type { EditableSurface, TextExtractionConfig } from './types';

/**
 * Unified text extraction manager
 * Combines scanner and focus tracking into a single interface
 */
export class TextExtractionManager {
  readonly scanner: EditableScanner;
  readonly focusTracker: FocusTracker;

  private isInitialized = false;
  private changeDisposers: Map<string, () => void> = new Map();

  constructor(config?: TextExtractionConfig) {
    this.scanner = new EditableScanner(config);
    this.focusTracker = new FocusTracker(this.scanner);
  }

  /**
   * Initialize the manager - scan for surfaces and start tracking
   */
  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Perform initial scan
    this.scanner.scan();

    // Start observing for new surfaces
    this.scanner.observe();

    // Start focus tracking
    this.focusTracker.start();
  }

  /**
   * Get all currently tracked editable surfaces
   */
  getSurfaces(): EditableSurface[] {
    return this.scanner.getSurfaces();
  }

  /**
   * Get the currently focused surface
   */
  getFocusedSurface(): EditableSurface | null {
    return this.focusTracker.getCurrent();
  }

  /**
   * Subscribe to focus changes
   */
  onFocusChange(callback: FocusCallback): () => void {
    return this.focusTracker.onChange(callback);
  }

  /**
   * Subscribe to new surface additions
   */
  onSurfaceAdd(callback: (surface: EditableSurface) => void): () => void {
    return this.scanner.onAdd(callback);
  }

  /**
   * Subscribe to surface removals
   */
  onSurfaceRemove(callback: (surface: EditableSurface) => void): () => void {
    return this.scanner.onRemove(callback);
  }

  /**
   * Watch a specific surface for changes
   */
  watchSurface(
    surface: EditableSurface,
    callback: (text: string, selection: { start: number; end: number }) => void,
  ): () => void {
    // Remove existing watcher if any
    const existingDisposer = this.changeDisposers.get(surface.id);
    if (existingDisposer) {
      existingDisposer();
    }

    // Add new watcher
    const disposer = surface.onChange(callback);
    this.changeDisposers.set(surface.id, disposer);

    return () => {
      disposer();
      this.changeDisposers.delete(surface.id);
    };
  }

  /**
   * Trigger a manual rescan
   */
  rescan(): void {
    this.scanner.scan();
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    // Clean up all change watchers
    for (const disposer of this.changeDisposers.values()) {
      disposer();
    }
    this.changeDisposers.clear();

    // Clean up tracker and scanner
    this.focusTracker.dispose();
    this.scanner.dispose();

    this.isInitialized = false;
  }
}

/**
 * Create a new TextExtractionManager instance
 */
export function createTextExtractionManager(
  config?: TextExtractionConfig,
): TextExtractionManager {
  return new TextExtractionManager(config);
}
