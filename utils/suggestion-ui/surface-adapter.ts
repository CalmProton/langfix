/**
 * Surface Adapter
 * Adapter for applying corrections to editable surfaces
 */

import { createRangeFromOffsets } from '#utils/text-extraction/helpers';
import type { EditableSurface } from '#utils/text-extraction/types';
import {
  cleanupMirror,
  getAllRectsFromRange,
  getRectFromRange,
  getRectFromTextarea,
} from './rect-helpers';
import type {
  ActionResult,
  SuggestionError,
  SurfaceAdapter,
  ViewportRect,
} from './types';

// Storage for ignored error patterns (session-based)
const ignoredPatterns = new Set<string>();

/**
 * Generate a pattern key for ignoring errors
 */
function getIgnoreKey(error: SuggestionError): string {
  return `${error.type}:${error.original.toLowerCase()}`;
}

/**
 * Check if an error should be ignored
 */
export function isIgnored(error: SuggestionError): boolean {
  return ignoredPatterns.has(getIgnoreKey(error));
}

/**
 * Add to ignore list
 */
export function addToIgnoreList(error: SuggestionError): void {
  ignoredPatterns.add(getIgnoreKey(error));
}

/**
 * Clear ignore list
 */
export function clearIgnoreList(): void {
  ignoredPatterns.clear();
}

// ============================================================================
// Textarea/Input Adapter
// ============================================================================

class TextareaSurfaceAdapter implements SurfaceAdapter {
  private rectCache: Map<string, ViewportRect> = new Map();
  private cacheValid = false;

  constructor(public readonly surface: EditableSurface) {}

  apply(error: SuggestionError, suggestion: string): ActionResult {
    try {
      const root = this.surface.root;
      if (
        !(
          root instanceof HTMLTextAreaElement ||
          root instanceof HTMLInputElement
        )
      ) {
        return { success: false, message: 'Invalid surface type' };
      }

      const currentText = this.surface.getText();

      // Verify the error text still matches
      const currentOriginal = currentText.slice(
        error.startIndex,
        error.endIndex,
      );
      if (currentOriginal !== error.original) {
        return {
          success: false,
          message: 'Text has changed since check',
        };
      }

      // Apply replacement
      this.surface.replace(error.startIndex, error.endIndex, suggestion);
      this.invalidateRects();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  ignore(error: SuggestionError): ActionResult {
    addToIgnoreList(error);
    return { success: true };
  }

  async addToDictionary(word: string): Promise<ActionResult> {
    try {
      // Import dynamically to avoid circular dependencies
      const { addToDictionary } = await import('../storage');
      await addToDictionary(word);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error ? err.message : 'Failed to add to dictionary',
      };
    }
  }

  getErrorRect(error: SuggestionError): ViewportRect | null {
    const cached = this.rectCache.get(error.id);
    if (cached && this.cacheValid) {
      return cached;
    }

    const root = this.surface.root;
    if (
      !(root instanceof HTMLTextAreaElement || root instanceof HTMLInputElement)
    ) {
      return null;
    }

    const rect = getRectFromTextarea(root, error.startIndex, error.endIndex);
    if (rect) {
      this.rectCache.set(error.id, rect);
    }
    return rect;
  }

  getErrorRects(errors: SuggestionError[]): Map<string, ViewportRect> {
    const result = new Map<string, ViewportRect>();
    for (const error of errors) {
      const rect = this.getErrorRect(error);
      if (rect) {
        result.set(error.id, rect);
      }
    }
    this.cacheValid = true;
    return result;
  }

  invalidateRects(): void {
    this.cacheValid = false;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    cleanupMirror(this.surface.root);
    this.rectCache.clear();
  }
}

// ============================================================================
// ContentEditable Adapter
// ============================================================================

class ContentEditableSurfaceAdapter implements SurfaceAdapter {
  private rectCache: Map<string, ViewportRect> = new Map();
  private multiLineRectCache: Map<string, ViewportRect[]> = new Map();
  private cacheValid = false;

  constructor(public readonly surface: EditableSurface) {}

  apply(error: SuggestionError, suggestion: string): ActionResult {
    try {
      const root = this.surface.root;
      const currentText = this.surface.getText();

      // Verify the error text still matches
      const currentOriginal = currentText.slice(
        error.startIndex,
        error.endIndex,
      );
      if (currentOriginal !== error.original) {
        return {
          success: false,
          message: 'Text has changed since check',
        };
      }

      // Create range for the error
      const range = createRangeFromOffsets(
        root,
        error.startIndex,
        error.endIndex,
      );
      if (!range) {
        return {
          success: false,
          message: 'Could not locate error in document',
        };
      }

      // Use execCommand for undo support if available
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);

        // Try execCommand for undo support
        const useExecCommand = document.queryCommandSupported?.('insertText');
        if (useExecCommand) {
          document.execCommand('insertText', false, suggestion);
        } else {
          // Fallback to range API
          range.deleteContents();
          range.insertNode(document.createTextNode(suggestion));
        }
      }

      this.invalidateRects();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  ignore(error: SuggestionError): ActionResult {
    addToIgnoreList(error);
    return { success: true };
  }

  async addToDictionary(word: string): Promise<ActionResult> {
    try {
      const { addToDictionary } = await import('../storage');
      await addToDictionary(word);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error ? err.message : 'Failed to add to dictionary',
      };
    }
  }

  getErrorRect(error: SuggestionError): ViewportRect | null {
    const cached = this.rectCache.get(error.id);
    if (cached && this.cacheValid) {
      return cached;
    }

    const root = this.surface.root;
    const range = createRangeFromOffsets(
      root,
      error.startIndex,
      error.endIndex,
    );
    if (!range) {
      return null;
    }

    const rect = getRectFromRange(range);
    if (rect) {
      this.rectCache.set(error.id, rect);
    }
    return rect;
  }

  /**
   * Get all rects for multi-line errors (for underline rendering)
   */
  getMultiLineRects(error: SuggestionError): ViewportRect[] {
    const cached = this.multiLineRectCache.get(error.id);
    if (cached && this.cacheValid) {
      return cached;
    }

    const root = this.surface.root;
    const range = createRangeFromOffsets(
      root,
      error.startIndex,
      error.endIndex,
    );
    if (!range) {
      return [];
    }

    const rects = getAllRectsFromRange(range);
    this.multiLineRectCache.set(error.id, rects);
    return rects;
  }

  getErrorRects(errors: SuggestionError[]): Map<string, ViewportRect> {
    const result = new Map<string, ViewportRect>();
    for (const error of errors) {
      const rect = this.getErrorRect(error);
      if (rect) {
        result.set(error.id, rect);
      }
    }
    this.cacheValid = true;
    return result;
  }

  invalidateRects(): void {
    this.cacheValid = false;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.rectCache.clear();
    this.multiLineRectCache.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a surface adapter for an editable surface
 */
export function createSurfaceAdapter(
  surface: EditableSurface,
): SurfaceAdapter & { dispose: () => void } {
  const type = surface.type;

  if (type === 'textarea' || type === 'input') {
    return new TextareaSurfaceAdapter(surface);
  }

  return new ContentEditableSurfaceAdapter(surface);
}

/**
 * Type guard to check if adapter has dispose method
 */
export function hasDispose(
  adapter: SurfaceAdapter,
): adapter is SurfaceAdapter & { dispose: () => void } {
  return (
    'dispose' in adapter &&
    typeof (adapter as { dispose?: unknown }).dispose === 'function'
  );
}
