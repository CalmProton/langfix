/**
 * Rect Helper Utilities
 * Functions for calculating and managing element positions
 */

import type { PopupAnchor, PopupPosition, Rect, ViewportRect } from './types';
import { DEFAULT_SUGGESTION_UI_CONFIG } from './types';

// ============================================================================
// Viewport Utilities
// ============================================================================

/**
 * Get current viewport dimensions
 */
export function getViewport(): { width: number; height: number } {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/**
 * Get current scroll position
 */
export function getScrollPosition(): { x: number; y: number } {
  return {
    x: window.scrollX || document.documentElement.scrollLeft,
    y: window.scrollY || document.documentElement.scrollTop,
  };
}

/**
 * Clamp a value to a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Range to Rect Conversion
// ============================================================================

/**
 * Get viewport rect from a DOM Range
 */
export function getRectFromRange(range: Range): ViewportRect | null {
  try {
    const rects = range.getClientRects();
    if (rects.length === 0) {
      const bounds = range.getBoundingClientRect();
      if (bounds.width === 0 && bounds.height === 0) {
        return null;
      }
      return normalizeRect({
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      });
    }

    const firstRect = rects[0];
    return normalizeRect({
      x: firstRect.left,
      y: firstRect.top,
      width: firstRect.width,
      height: firstRect.height,
    });
  } catch {
    return null;
  }
}

/**
 * Get all rects for a multi-line range (for underline rendering)
 */
export function getAllRectsFromRange(range: Range): ViewportRect[] {
  try {
    const rects = range.getClientRects();
    const result: ViewportRect[] = [];

    for (const rect of rects) {
      if (rect.width > 0 && rect.height > 0) {
        result.push(
          normalizeRect({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          }),
        );
      }
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Normalize and clamp rect to viewport
 */
function normalizeRect(rect: Rect): ViewportRect {
  const viewport = getViewport();
  const original = { ...rect };

  let viewportClamped = false;
  let x = rect.x;
  let y = rect.y;
  let width = rect.width;
  let height = rect.height;

  if (x < 0) {
    width += x;
    x = 0;
    viewportClamped = true;
  }

  if (x + width > viewport.width) {
    width = viewport.width - x;
    viewportClamped = true;
  }

  if (y < 0) {
    height += y;
    y = 0;
    viewportClamped = true;
  }

  if (y + height > viewport.height) {
    height = viewport.height - y;
    viewportClamped = true;
  }

  return {
    x,
    y,
    width: Math.max(0, width),
    height: Math.max(0, height),
    viewportClamped,
    original,
  };
}

// ============================================================================
// Textarea/Input Mirror Utilities
// ============================================================================

const mirrorCache = new WeakMap<HTMLElement, HTMLDivElement>();

const MIRROR_STYLES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-transform',
  'word-spacing',
  'text-indent',
  'white-space',
  'word-wrap',
  'word-break',
  'overflow-wrap',
  'line-height',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'box-sizing',
  'text-align',
  'direction',
] as const;

function getMirror(element: HTMLTextAreaElement | HTMLInputElement): HTMLDivElement {
  let mirror = mirrorCache.get(element);
  if (mirror) return mirror;

  mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');

  Object.assign(mirror.style, {
    position: 'absolute',
    top: '-9999px',
    left: '-9999px',
    visibility: 'hidden',
    overflow: 'hidden',
    pointerEvents: 'none',
  });

  document.body.appendChild(mirror);
  mirrorCache.set(element, mirror);

  return mirror;
}

function updateMirror(
  element: HTMLTextAreaElement | HTMLInputElement,
  mirror: HTMLDivElement,
): void {
  const computed = window.getComputedStyle(element);

  for (const prop of MIRROR_STYLES) {
    mirror.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  mirror.style.width = `${element.offsetWidth}px`;
}

/**
 * Get rect for text range in textarea/input
 */
export function getRectFromTextarea(
  element: HTMLTextAreaElement | HTMLInputElement,
  start: number,
  end: number,
): ViewportRect | null {
  const text = element.value;
  if (start < 0 || end > text.length || start >= end) {
    return null;
  }

  const mirror = getMirror(element);
  updateMirror(element, mirror);

  const before = document.createTextNode(text.slice(0, start));
  const marker = document.createElement('span');
  marker.textContent = text.slice(start, end) || '\u200b';
  const after = document.createTextNode(text.slice(end));

  mirror.innerHTML = '';
  mirror.appendChild(before);
  mirror.appendChild(marker);
  mirror.appendChild(after);

  const elementRect = element.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  const x = elementRect.left + (markerRect.left - mirrorRect.left) - element.scrollLeft;
  const y = elementRect.top + (markerRect.top - mirrorRect.top) - element.scrollTop;

  return normalizeRect({
    x,
    y,
    width: markerRect.width,
    height: markerRect.height,
  });
}

/**
 * Cleanup mirror element for an input
 */
export function cleanupMirror(element: HTMLElement): void {
  const mirror = mirrorCache.get(element);
  if (mirror) {
    mirror.remove();
    mirrorCache.delete(element);
  }
}

// ============================================================================
// Popup Positioning
// ============================================================================

/**
 * Calculate popup position anchored to an error rect
 */
export function calculatePopupPosition(
  anchorRect: ViewportRect,
  popupWidth: number,
  popupHeight: number,
  config = DEFAULT_SUGGESTION_UI_CONFIG,
): PopupPosition {
  const viewport = getViewport();
  const { popupFlipThreshold } = config;

  let anchor: PopupAnchor = 'below';
  let y = anchorRect.y + anchorRect.height + 4;

  const spaceBelow = viewport.height - (anchorRect.y + anchorRect.height);
  const spaceAbove = anchorRect.y;

  if (spaceBelow < popupFlipThreshold && spaceAbove > spaceBelow) {
    anchor = 'above';
    y = anchorRect.y - popupHeight - 4;
  }

  let x = anchorRect.x;
  const padding = 8;
  const maxWidth = viewport.width - padding * 2;
  const maxHeight = viewport.height - padding * 2;

  if (x + popupWidth > viewport.width - padding) {
    x = viewport.width - popupWidth - padding;
  }

  x = Math.max(padding, x);
  y = clamp(y, padding, viewport.height - popupHeight - padding);

  return {
    x,
    y,
    anchor,
    maxWidth,
    maxHeight,
  };
}

// ============================================================================
// Scroll/Resize Handling
// ============================================================================

/**
 * Create a debounced position invalidation handler
 */
export function createPositionInvalidator(
  callback: () => void,
  debounceMs = DEFAULT_SUGGESTION_UI_CONFIG.positionDebounceMs,
): { attach: () => void; detach: () => void } {
  let frameId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const invalidate = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        callback();
        frameId = null;
      });
      timeoutId = null;
    }, debounceMs);
  };

  const handleScroll = () => invalidate();
  const handleResize = () => invalidate();

  return {
    attach() {
      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
      window.addEventListener('resize', handleResize, { passive: true });
    },
    detach() {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

// ============================================================================
// Intersection Check
// ============================================================================

/**
 * Check if a rect is visible in the viewport
 */
export function isRectVisible(rect: Rect): boolean {
  const viewport = getViewport();
  return (
    rect.x < viewport.width &&
    rect.x + rect.width > 0 &&
    rect.y < viewport.height &&
    rect.y + rect.height > 0
  );
}

/**
 * Check if two rects overlap
 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
