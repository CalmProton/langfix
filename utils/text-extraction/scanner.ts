/**
 * Editable Surface Scanner
 * Discovers and tracks editable elements across the page
 */

import { ContentEditableSurface } from './contenteditable-surface';
import {
  EDITABLE_SELECTORS,
  getSurfaceType,
  isEditableElement,
} from './helpers';
import { InputTextareaSurface } from './input-surface';
import type {
  EditableSurface,
  ScanResult,
  TextExtractionConfig,
} from './types';

// ============================================================================
// Surface Factory
// ============================================================================

/**
 * Create an EditableSurface from an HTMLElement
 */
export function createSurface(element: HTMLElement): EditableSurface | null {
  const surfaceType = getSurfaceType(element);
  if (!surfaceType) return null;

  if (surfaceType === 'input' || surfaceType === 'textarea') {
    return new InputTextareaSurface(
      element as HTMLInputElement | HTMLTextAreaElement,
    );
  }

  if (surfaceType === 'contenteditable') {
    return new ContentEditableSurface(element);
  }

  return null;
}

// ============================================================================
// Element Collection
// ============================================================================

/**
 * Collect all editable elements from a root node
 */
export function collectEditables(root: ParentNode): HTMLElement[] {
  const elements: HTMLElement[] = [];

  // Query for potential editable elements
  const candidates = root.querySelectorAll<HTMLElement>(EDITABLE_SELECTORS);

  for (const el of candidates) {
    if (isEditableElement(el)) {
      elements.push(el);
    }
  }

  return elements;
}

/**
 * Recursively scan a root node including shadow DOMs and iframes
 */
function scanRoot(
  root: ParentNode,
  config: TextExtractionConfig,
  visited: Set<ParentNode>,
): HTMLElement[] {
  // Avoid infinite loops
  if (visited.has(root)) return [];
  visited.add(root);

  const elements = collectEditables(root);

  // Scan shadow DOMs if enabled
  if (config.scanShadowDom !== false) {
    const allElements = root.querySelectorAll<HTMLElement>('*');
    for (const el of allElements) {
      if (el.shadowRoot && el.shadowRoot.mode === 'open') {
        elements.push(...scanRoot(el.shadowRoot, config, visited));
      }
    }
  }

  // Scan same-origin iframes if enabled
  if (config.scanIframes !== false) {
    const iframes = root.querySelectorAll<HTMLIFrameElement>('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          elements.push(...scanRoot(iframeDoc, config, visited));
        }
      } catch {
        // Cross-origin iframe, skip
      }
    }
  }

  return elements;
}

// ============================================================================
// Scanner Class
// ============================================================================

/**
 * Manages discovery and tracking of editable surfaces
 */
export class EditableScanner {
  private config: TextExtractionConfig;
  private surfaces: Map<HTMLElement, EditableSurface> = new Map();
  private observer: MutationObserver | null = null;
  private onAddCallbacks: Set<(surface: EditableSurface) => void> = new Set();
  private onRemoveCallbacks: Set<(surface: EditableSurface) => void> =
    new Set();

  constructor(config: TextExtractionConfig = {}) {
    this.config = {
      minTextLength: 3,
      debounceMs: 350,
      scanIframes: true,
      scanShadowDom: true,
      ...config,
    };
  }

  /**
   * Perform a full scan of all roots
   */
  scan(): ScanResult {
    const visited = new Set<ParentNode>();
    const elements = scanRoot(document, this.config, visited);

    const currentElements = new Set(elements);
    const previousElements = new Set(this.surfaces.keys());

    const added: EditableSurface[] = [];
    const removed: EditableSurface[] = [];

    // Find removed elements
    for (const el of previousElements) {
      if (!currentElements.has(el) || !el.isConnected) {
        const surface = this.surfaces.get(el);
        if (surface) {
          removed.push(surface);
          this.surfaces.delete(el);
          this.notifyRemove(surface);
        }
      }
    }

    // Find new elements and create surfaces
    for (const el of elements) {
      if (!this.surfaces.has(el)) {
        const surface = createSurface(el);
        if (surface) {
          this.surfaces.set(el, surface);
          added.push(surface);
          this.notifyAdd(surface);
        }
      }
    }

    return {
      surfaces: Array.from(this.surfaces.values()),
      added,
      removed,
    };
  }

  /**
   * Get all currently tracked surfaces
   */
  getSurfaces(): EditableSurface[] {
    return Array.from(this.surfaces.values());
  }

  /**
   * Get surface for a specific element
   */
  getSurfaceForElement(element: HTMLElement): EditableSurface | undefined {
    return this.surfaces.get(element);
  }

  /**
   * Start observing for dynamically added/removed editable elements
   */
  observe(): void {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      for (const mutation of mutations) {
        // Check added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            // Check if the added node or its descendants are editable
            if (isEditableElement(el) || el.querySelector(EDITABLE_SELECTORS)) {
              shouldRescan = true;
              break;
            }
          }
        }

        // Check removed nodes
        for (const node of mutation.removedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (this.surfaces.has(el)) {
              shouldRescan = true;
              break;
            }
          }
        }

        // Check attribute changes on editable elements
        if (
          mutation.type === 'attributes' &&
          mutation.target.nodeType === Node.ELEMENT_NODE
        ) {
          const attr = mutation.attributeName;
          if (
            attr === 'contenteditable' ||
            attr === 'disabled' ||
            attr === 'type'
          ) {
            shouldRescan = true;
          }
        }

        if (shouldRescan) break;
      }

      if (shouldRescan) {
        this.scan();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable', 'disabled', 'type'],
    });

    // Also listen for SPA navigation
    window.addEventListener('popstate', this.handleNavigation);
    window.addEventListener('hashchange', this.handleNavigation);
  }

  /**
   * Stop observing for changes
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    window.removeEventListener('popstate', this.handleNavigation);
    window.removeEventListener('hashchange', this.handleNavigation);
  }

  /**
   * Subscribe to new surface additions
   */
  onAdd(callback: (surface: EditableSurface) => void): () => void {
    this.onAddCallbacks.add(callback);
    return () => this.onAddCallbacks.delete(callback);
  }

  /**
   * Subscribe to surface removals
   */
  onRemove(callback: (surface: EditableSurface) => void): () => void {
    this.onRemoveCallbacks.add(callback);
    return () => this.onRemoveCallbacks.delete(callback);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.disconnect();
    this.surfaces.clear();
    this.onAddCallbacks.clear();
    this.onRemoveCallbacks.clear();
  }

  private handleNavigation = (): void => {
    // Delay scan slightly to allow DOM to update
    setTimeout(() => this.scan(), 100);
  };

  private notifyAdd(surface: EditableSurface): void {
    for (const callback of this.onAddCallbacks) {
      try {
        callback(surface);
      } catch (error) {
        console.error('[LangFix] Error in onAdd callback:', error);
      }
    }
  }

  private notifyRemove(surface: EditableSurface): void {
    for (const callback of this.onRemoveCallbacks) {
      try {
        callback(surface);
      } catch (error) {
        console.error('[LangFix] Error in onRemove callback:', error);
      }
    }
  }
}

/**
 * Create a new EditableScanner instance
 */
export function createScanner(config?: TextExtractionConfig): EditableScanner {
  return new EditableScanner(config);
}
