/**
 * Selection Handler
 * Utilities for analyzing text selection for summarization
 */

import type { SelectionInfo, SelectionType } from './types';

// ============================================================================
// Selection Analysis
// ============================================================================

/**
 * Analyze the current text selection
 * Returns null if no valid selection exists
 */
export function analyzeSelection(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return null;
  }

  const text = selection.toString().trim();
  if (!text) {
    return null;
  }

  const wordCount = countWords(text);
  const charCount = text.length;

  // Too short to summarize meaningfully
  if (wordCount < 3) {
    return null;
  }

  const type = detectSelectionType(text);

  return {
    text,
    type,
    wordCount,
    charCount,
  };
}

/**
 * Detect the type of text selection
 */
function detectSelectionType(text: string): SelectionType {
  // Check for paragraph breaks (double newlines or multiple newlines)
  const paragraphs = text
    .split(/\n\s*\n+/)
    .filter((p) => p.trim().length > 0);

  if (paragraphs.length > 1) {
    return 'multi-paragraph';
  }

  // Check for sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  // If multiple sentences, treat as paragraph
  if (sentences.length > 1) {
    return 'paragraph';
  }

  // Single sentence or partial text
  return 'sentence';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// ============================================================================
// Selection Range Utilities
// ============================================================================

/**
 * Get the current selection range
 */
export function getSelectionRange(): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  return selection.getRangeAt(0);
}

/**
 * Get the bounding rect of the current selection
 */
export function getSelectionRect(): DOMRect | null {
  const range = getSelectionRange();
  if (!range) {
    return null;
  }

  // Get all client rects and use the first one for positioning
  const rects = range.getClientRects();
  if (rects.length === 0) {
    const boundingRect = range.getBoundingClientRect();
    if (boundingRect.width === 0 && boundingRect.height === 0) {
      return null;
    }
    return boundingRect;
  }

  // Return the last rect (where cursor would be at the end of selection)
  return rects[rects.length - 1];
}

/**
 * Get the bottom-most rect of the selection for popup positioning
 */
export function getSelectionBottomRect(): DOMRect | null {
  const range = getSelectionRange();
  if (!range) {
    return null;
  }

  const rects = range.getClientRects();
  if (rects.length === 0) {
    return range.getBoundingClientRect();
  }

  // Find the rect with the highest bottom value
  let bottomMost = rects[0];
  for (const rect of rects) {
    if (rect.bottom > bottomMost.bottom) {
      bottomMost = rect;
    }
  }

  return bottomMost;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate selection for summarization
 * Returns error message if invalid, null if valid
 */
export function validateSelection(
  selection: SelectionInfo,
  minWords = 10,
  maxWords = 1000,
): { code: string; message: string; retryable: boolean } | null {
  if (selection.wordCount < minWords) {
    return {
      code: 'TOO_SHORT',
      message: `Selection too short (${selection.wordCount} words). Minimum is ${minWords} words.`,
      retryable: false,
    };
  }

  if (selection.wordCount > maxWords) {
    return {
      code: 'TOO_LONG',
      message: `Selection too long (${selection.wordCount} words). Maximum is ${maxWords} words.`,
      retryable: false,
    };
  }

  return null;
}

// ============================================================================
// Text Extraction from Selection
// ============================================================================

/**
 * Extract text from selection with surrounding context
 */
export function getSelectionWithContext(
  contextChars = 100,
): {
  text: string;
  before: string;
  after: string;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) {
    return null;
  }

  // Try to get context before selection
  let before = '';
  try {
    const beforeRange = document.createRange();
    beforeRange.setStart(
      range.startContainer,
      Math.max(0, range.startOffset - contextChars),
    );
    beforeRange.setEnd(range.startContainer, range.startOffset);
    before = beforeRange.toString();
  } catch {
    // Context extraction failed, use empty string
  }

  // Try to get context after selection
  let after = '';
  try {
    const afterRange = document.createRange();
    afterRange.setStart(range.endContainer, range.endOffset);
    afterRange.setEnd(
      range.endContainer,
      Math.min(
        range.endContainer.textContent?.length || 0,
        range.endOffset + contextChars,
      ),
    );
    after = afterRange.toString();
  } catch {
    // Context extraction failed, use empty string
  }

  return { text, before, after };
}
