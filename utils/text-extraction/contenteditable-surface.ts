/**
 * ContentEditable Surface Adapter
 * Implements EditableSurface for contenteditable elements
 */
import type {
  ChangeCallback,
  ChangeOptions,
  Disposer,
  EditableSurface,
  SurfaceType,
  TextSelection,
} from './types';
import {
  createRangeFromOffsets,
  debounce,
  dispatchInputEvent,
  generateSurfaceId,
  getPlainText,
  getTextOffset,
} from './helpers';

const DEFAULT_DEBOUNCE_MS = 350;

/**
 * EditableSurface implementation for contenteditable elements
 */
export class ContentEditableSurface implements EditableSurface {
  readonly root: HTMLElement;
  readonly type: SurfaceType = 'contenteditable';
  readonly id: string;

  constructor(element: HTMLElement) {
    this.root = element;
    this.id = generateSurfaceId();
  }

  getText(): string {
    return getPlainText(this.root);
  }

  getSelection(): TextSelection {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { start: 0, end: 0 };
    }

    const range = selection.getRangeAt(0);

    // Check if selection is within this element
    if (!this.root.contains(range.startContainer)) {
      return { start: 0, end: 0 };
    }

    const start = getTextOffset(this.root, range.startContainer, range.startOffset);
    const end = getTextOffset(this.root, range.endContainer, range.endOffset);

    return { start, end };
  }

  setSelection(start: number, end: number): void {
    const range = createRangeFromOffsets(this.root, start, end);
    if (!range) return;

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }

  replace(start: number, end: number, text: string): void {
    // Create range for the text to replace
    const range = createRangeFromOffsets(this.root, start, end);
    if (!range) return;

    // Delete the selected content
    range.deleteContents();

    // Insert new text
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor to end of inserted text
    const newPosition = start + text.length;
    this.setSelection(newPosition, newPosition);

    // Dispatch input event to trigger app reactivity
    dispatchInputEvent(this.root);
  }

  onChange(callback: ChangeCallback, options?: ChangeOptions): Disposer {
    const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;

    const handler = debounce(() => {
      callback(this.getText(), this.getSelection());
    }, debounceMs);

    // Listen to multiple events for comprehensive change detection
    const events = ['input', 'keyup', 'compositionend'];
    for (const event of events) {
      this.root.addEventListener(event, handler);
    }

    // Use MutationObserver as fallback for apps that don't fire input events
    const observer = new MutationObserver(handler);
    observer.observe(this.root, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    // Return disposer function
    return () => {
      handler.cancel();
      for (const event of events) {
        this.root.removeEventListener(event, handler);
      }
      observer.disconnect();
    };
  }

  isValid(): boolean {
    return this.root.isConnected;
  }

  focus(): void {
    this.root.focus();
  }

  isFocused(): boolean {
    return document.activeElement === this.root || this.root.contains(document.activeElement);
  }
}

/**
 * Create a ContentEditableSurface from an element if it's a valid contenteditable
 */
export function createContentEditableSurface(
  element: HTMLElement
): ContentEditableSurface | null {
  const contentEditable = element.getAttribute('contenteditable');
  if (contentEditable === 'true' || contentEditable === '') {
    return new ContentEditableSurface(element);
  }

  // Also check for textbox role (common in web apps)
  const role = element.getAttribute('role');
  if (role === 'textbox') {
    return new ContentEditableSurface(element);
  }

  return null;
}
