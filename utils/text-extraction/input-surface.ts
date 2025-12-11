/**
 * Input/Textarea Surface Adapter
 * Implements EditableSurface for standard input and textarea elements
 */
import type {
  ChangeCallback,
  ChangeOptions,
  Disposer,
  EditableSurface,
  SurfaceType,
  TextSelection,
} from './types';
import { debounce, dispatchInputEvent, generateSurfaceId } from './helpers';

const DEFAULT_DEBOUNCE_MS = 350;

/**
 * EditableSurface implementation for input and textarea elements
 */
export class InputTextareaSurface implements EditableSurface {
  readonly root: HTMLInputElement | HTMLTextAreaElement;
  readonly type: SurfaceType;
  readonly id: string;

  constructor(element: HTMLInputElement | HTMLTextAreaElement) {
    this.root = element;
    this.type = element instanceof HTMLTextAreaElement ? 'textarea' : 'input';
    this.id = generateSurfaceId();
  }

  getText(): string {
    return this.root.value;
  }

  getSelection(): TextSelection {
    return {
      start: this.root.selectionStart ?? 0,
      end: this.root.selectionEnd ?? 0,
    };
  }

  setSelection(start: number, end: number): void {
    this.root.setSelectionRange(start, end);
  }

  replace(start: number, end: number, text: string): void {
    const value = this.root.value;
    const before = value.slice(0, start);
    const after = value.slice(end);

    // Set the new value
    this.root.value = before + text + after;

    // Position cursor at end of inserted text
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
    const events = ['input', 'change', 'keyup'];
    for (const event of events) {
      this.root.addEventListener(event, handler);
    }

    // Return disposer function
    return () => {
      handler.cancel();
      for (const event of events) {
        this.root.removeEventListener(event, handler);
      }
    };
  }

  isValid(): boolean {
    return this.root.isConnected;
  }

  focus(): void {
    this.root.focus();
  }

  isFocused(): boolean {
    return document.activeElement === this.root;
  }
}

/**
 * Create an InputTextareaSurface from an element if it's a valid input/textarea
 */
export function createInputTextareaSurface(
  element: HTMLElement
): InputTextareaSurface | null {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return new InputTextareaSurface(element);
  }
  return null;
}
