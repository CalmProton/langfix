/**
 * Text Extraction Module
 * Main entry point for the text extraction functionality
 *
 * Provides unified API for detecting, tracking, and interacting with
 * editable text surfaces across web pages.
 */

// Types
export type {
  EditableSurface,
  TextSelection,
  ExtractedText,
  ChangeCallback,
  ChangeOptions,
  Disposer,
  SurfaceType,
  PlatformConfig,
  TextExtractionConfig,
  ScanResult,
} from './types';

// Helpers
export {
  EDITABLE_SELECTORS,
  CODE_EDITOR_MARKERS,
  PLATFORM_SELECTORS,
  isVisible,
  isInCodeEditor,
  hasNonEditableAncestor,
  isSecretField,
  isEditableElement,
  getSurfaceType,
  getPlainText,
  getTextOffset,
  createRangeFromOffsets,
  debounce,
  dispatchInputEvent,
  dispatchChangeEvent,
} from './helpers';

// Surface Adapters
export { InputTextareaSurface, createInputTextareaSurface } from './input-surface';
export { ContentEditableSurface, createContentEditableSurface } from './contenteditable-surface';

// Scanner
export { EditableScanner, createScanner, createSurface, collectEditables } from './scanner';

// Focus Tracker
export { FocusTracker, createFocusTracker } from './focus-tracker';
export type { FocusCallback } from './focus-tracker';

// ============================================================================
// Convenience Factory
// ============================================================================

import type { TextExtractionConfig, EditableSurface } from './types';
import { EditableScanner } from './scanner';
import { FocusTracker, type FocusCallback } from './focus-tracker';

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
    callback: (text: string, selection: { start: number; end: number }) => void
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
  config?: TextExtractionConfig
): TextExtractionManager {
  return new TextExtractionManager(config);
}
