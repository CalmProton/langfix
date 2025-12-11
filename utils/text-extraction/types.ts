/**
 * Text Extraction Types
 * Types and interfaces for the editable surface abstraction
 */

/**
 * Text selection range in plain-text offsets
 */
export interface TextSelection {
  /** Start offset (0-based, inclusive) */
  start: number;
  /** End offset (0-based, exclusive) */
  end: number;
}

/**
 * Extracted text with selection information
 */
export interface ExtractedText {
  /** Plain text content */
  text: string;
  /** Selection start offset (0-based) */
  selectionStart: number;
  /** Selection end offset (0-based) */
  selectionEnd: number;
}

/**
 * Change event callback type
 */
export type ChangeCallback = (text: string, selection: TextSelection) => void;

/**
 * Disposer function returned by event subscriptions
 */
export type Disposer = () => void;

/**
 * Options for change detection
 */
export interface ChangeOptions {
  /** Debounce delay in milliseconds (default: 350) */
  debounceMs?: number;
}

/**
 * Surface type identifier
 */
export type SurfaceType = 'input' | 'textarea' | 'contenteditable';

/**
 * Unified interface for interacting with editable text surfaces
 * Abstracts away differences between input/textarea and contenteditable elements
 */
export interface EditableSurface {
  /** The root HTML element */
  readonly root: HTMLElement;

  /** Type of surface for identification */
  readonly type: SurfaceType;

  /** Unique identifier for this surface instance */
  readonly id: string;

  /**
   * Get the plain text content of the surface
   */
  getText(): string;

  /**
   * Get the current selection range
   */
  getSelection(): TextSelection;

  /**
   * Set the selection range
   * @param start - Start offset (0-based)
   * @param end - End offset (0-based)
   */
  setSelection(start: number, end: number): void;

  /**
   * Replace text in the given range with new text
   * Attempts to preserve undo history where possible
   * @param start - Start offset (0-based)
   * @param end - End offset (0-based)
   * @param text - Replacement text
   */
  replace(start: number, end: number, text: string): void;

  /**
   * Subscribe to text changes
   * @param callback - Called when text or selection changes
   * @param options - Configuration options
   * @returns Disposer function to unsubscribe
   */
  onChange(callback: ChangeCallback, options?: ChangeOptions): Disposer;

  /**
   * Check if the surface is still valid (attached to DOM)
   */
  isValid(): boolean;

  /**
   * Focus this surface
   */
  focus(): void;

  /**
   * Check if this surface is currently focused
   */
  isFocused(): boolean;
}

/**
 * Platform-specific configuration for enhanced detection
 */
export interface PlatformConfig {
  /** Platform name (e.g., 'gmail', 'notion', 'slack') */
  name: string;
  /** Additional selectors specific to this platform */
  selectors: string[];
  /** URL pattern to match */
  urlPattern: RegExp;
}

/**
 * Configuration for the text extraction module
 */
export interface TextExtractionConfig {
  /** Minimum text length to consider (default: 3) */
  minTextLength?: number;
  /** Debounce delay for change detection in ms (default: 350) */
  debounceMs?: number;
  /** Whether to scan same-origin iframes (default: true) */
  scanIframes?: boolean;
  /** Whether to scan shadow DOM (default: true) */
  scanShadowDom?: boolean;
  /** Additional platform-specific configurations */
  platforms?: PlatformConfig[];
}

/**
 * Result of scanning for editable surfaces
 */
export interface ScanResult {
  /** All discovered editable surfaces */
  surfaces: EditableSurface[];
  /** Surfaces that were newly added since last scan */
  added: EditableSurface[];
  /** Surfaces that were removed since last scan */
  removed: EditableSurface[];
}
