/**
 * Text Extraction Helper Utilities
 * Shared utilities for editable surface detection and text manipulation
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Base selectors for editable elements
 */
export const EDITABLE_SELECTORS = [
  'textarea',
  'input:not([type="password"]):not([type="hidden"]):not([type="file"]):not([disabled])',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="textbox"]',
  '[role="combobox"][aria-multiline="true"]',
].join(', ');

/**
 * Selectors for code editors to exclude
 */
export const CODE_EDITOR_MARKERS = [
  '.monaco-editor',
  '.CodeMirror',
  '.cm-editor', // CodeMirror 6
  '.prism-live',
  '[data-code-editor]',
  '.ace_editor',
  '.code-editor',
];

/**
 * Platform-specific selectors for enhanced detection
 */
export const PLATFORM_SELECTORS: Record<string, string[]> = {
  gmail: ['div[role="textbox"][contenteditable]'],
  notion: ['[data-content-editable-leaf]'],
  slack: ['div[data-qa="message_input"]'],
  twitter: ['div[data-testid="tweetTextarea_0"]'],
  discord: ['div[role="textbox"][data-slate-editor]'],
};

/**
 * Block-level display values for text extraction
 */
const BLOCK_DISPLAYS = new Set([
  'block',
  'flex',
  'grid',
  'table',
  'table-row',
  'table-cell',
  'list-item',
]);

// ============================================================================
// ID Generation
// ============================================================================

let surfaceIdCounter = 0;

/**
 * Generate a unique ID for a surface
 */
export function generateSurfaceId(): string {
  return `surface-${++surfaceIdCounter}-${Date.now()}`;
}

// ============================================================================
// Element Detection
// ============================================================================

/**
 * Check if an element is visible
 */
export function isVisible(el: HTMLElement): boolean {
  // Check if element is attached to DOM
  if (!el.isConnected) return false;

  const style = getComputedStyle(el);

  // Check CSS visibility properties
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (Number.parseFloat(style.opacity) === 0) return false;

  // Check dimensions
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;

  // offsetParent is null for hidden elements (except fixed position)
  if (el.offsetParent === null && style.position !== 'fixed') return false;

  return true;
}

/**
 * Check if an element is inside a code editor
 */
export function isInCodeEditor(el: HTMLElement): boolean {
  for (const marker of CODE_EDITOR_MARKERS) {
    if (el.closest(marker)) return true;
  }
  return false;
}

/**
 * Check if an element has contenteditable="false" ancestor
 */
export function hasNonEditableAncestor(el: HTMLElement): boolean {
  let parent = el.parentElement;
  while (parent) {
    if (parent.getAttribute('contenteditable') === 'false') return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Check if an element is a password or secret field
 */
export function isSecretField(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'password') return true;
    if (el.autocomplete === 'current-password' || el.autocomplete === 'new-password') return true;
  }
  if (el.getAttribute('aria-secret') === 'true') return true;
  return false;
}

/**
 * Check if an element is an editable text surface
 */
export function isEditableElement(el: HTMLElement): boolean {
  // Must be visible
  if (!isVisible(el)) return false;

  // Exclude password/secret fields
  if (isSecretField(el)) return false;

  // Exclude code editors
  if (isInCodeEditor(el)) return false;

  // Exclude elements with contenteditable="false" ancestors
  if (hasNonEditableAncestor(el)) return false;

  // Check if it's a textarea
  if (el instanceof HTMLTextAreaElement) return true;

  // Check if it's an editable input
  if (el instanceof HTMLInputElement) {
    const textTypes = ['text', 'email', 'url', 'search', 'tel', 'number'];
    return textTypes.includes(el.type) && !el.disabled && !el.readOnly;
  }

  // Check contenteditable
  const contentEditable = el.getAttribute('contenteditable');
  if (contentEditable === 'true' || contentEditable === '') return true;

  // Check ARIA roles
  const role = el.getAttribute('role');
  if (role === 'textbox') return true;
  if (role === 'combobox' && el.getAttribute('aria-multiline') === 'true') return true;

  return false;
}

/**
 * Determine the surface type for an element
 */
export function getSurfaceType(el: HTMLElement): 'input' | 'textarea' | 'contenteditable' | null {
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLInputElement) return 'input';

  const contentEditable = el.getAttribute('contenteditable');
  if (contentEditable === 'true' || contentEditable === '') return 'contenteditable';

  const role = el.getAttribute('role');
  if (role === 'textbox' || role === 'combobox') return 'contenteditable';

  return null;
}

// ============================================================================
// Text Extraction for ContentEditable
// ============================================================================

/**
 * Check if a node creates a block boundary
 */
function isBlockNode(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const display = getComputedStyle(node as Element).display;
  return BLOCK_DISPLAYS.has(display);
}

/**
 * Get plain text from a contenteditable element
 * Preserves block boundaries as newlines
 */
export function getPlainText(el: HTMLElement): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

  let prevWasBlock = false;

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        parts.push(text);
        prevWasBlock = false;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Check for <br> elements
      if ((node as Element).tagName === 'BR') {
        parts.push('\n');
        prevWasBlock = true;
        continue;
      }

      // Add newline before block elements (if not already added)
      if (isBlockNode(node) && parts.length > 0 && !prevWasBlock) {
        parts.push('\n');
        prevWasBlock = true;
      }
    }
  }

  return parts.join('');
}

/**
 * Get the text offset for a DOM position within a contenteditable
 */
export function getTextOffset(root: HTMLElement, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

  let prevWasBlock = false;

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        return offset + targetOffset;
      }
      // For element nodes, we're at the start
      return offset;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length || 0;
      prevWasBlock = false;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') {
        offset += 1; // Count <br> as newline
        prevWasBlock = true;
      } else if (isBlockNode(node) && offset > 0 && !prevWasBlock) {
        offset += 1; // Add newline for block boundary
        prevWasBlock = true;
      }
    }

    // If target is a child of current node, check children
    if (node.contains(targetNode)) {
      continue;
    }
  }

  return offset;
}

/**
 * Create a DOM Range from plain-text offsets
 */
export function createRangeFromOffsets(
  root: HTMLElement,
  startOffset: number,
  endOffset: number
): Range | null {
  const range = document.createRange();
  let currentOffset = 0;
  let startSet = false;
  let endSet = false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let prevWasBlock = false;

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (startSet && endSet) break;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      const nodeEnd = currentOffset + length;

      if (!startSet && startOffset >= currentOffset && startOffset <= nodeEnd) {
        range.setStart(node, startOffset - currentOffset);
        startSet = true;
      }

      if (!endSet && endOffset >= currentOffset && endOffset <= nodeEnd) {
        range.setEnd(node, endOffset - currentOffset);
        endSet = true;
      }

      currentOffset = nodeEnd;
      prevWasBlock = false;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') {
        const nodeEnd = currentOffset + 1;
        if (!startSet && startOffset === currentOffset) {
          range.setStartBefore(node);
          startSet = true;
        }
        if (!endSet && endOffset === currentOffset) {
          range.setEndBefore(node);
          endSet = true;
        }
        currentOffset = nodeEnd;
        prevWasBlock = true;
      } else if (isBlockNode(node) && currentOffset > 0 && !prevWasBlock) {
        currentOffset += 1;
        prevWasBlock = true;
      }
    }
  }

  // If we didn't set the end, set it at the end of the last node
  if (startSet && !endSet) {
    range.setEndAfter(root.lastChild || root);
  }

  return startSet ? range : null;
}

// ============================================================================
// Debounce Utility
// ============================================================================

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, ms);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

// ============================================================================
// Event Dispatch
// ============================================================================

/**
 * Dispatch an input event to trigger app reactivity
 */
export function dispatchInputEvent(el: HTMLElement): void {
  const event = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
  });
  el.dispatchEvent(event);
}

/**
 * Dispatch a change event
 */
export function dispatchChangeEvent(target: HTMLElement): void {
  target.dispatchEvent(
    new Event('change', {
      bubbles: true,
      cancelable: true,
    })
  );
}
