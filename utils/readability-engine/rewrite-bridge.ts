/**
 * Readability Rewrite Bridge
 * Connects the readability heatmap "Simplify" CTA to the rewrite engine
 */
import type { EditableSurface } from '#utils/text-extraction/types';
import type { SentenceScore } from './types';

// ============================================================================
// Types
// ============================================================================

export interface SimplifyRequest {
  /** The sentence to simplify */
  sentence: SentenceScore;
  /** The full text context */
  fullText: string;
  /** The surface containing the text */
  surface?: EditableSurface;
}

export interface SimplifyOptions {
  /** Callback when simplification starts */
  onStart?: () => void;
  /** Callback when simplification completes */
  onComplete?: (result: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Bridge Functions
// ============================================================================

/**
 * Extract the sentence text from the full text using the range
 */
export function extractSentenceText(
  sentence: SentenceScore,
  fullText: string,
): string {
  return fullText.slice(sentence.range.start, sentence.range.end);
}

/**
 * Trigger the simplify rewrite flow for a sentence
 *
 * This function dispatches a custom event that the InlineRewriteManager
 * or content script can listen for to trigger the rewrite popup.
 *
 * @param request - The simplify request
 * @param options - Optional callbacks
 */
export function triggerSimplify(
  request: SimplifyRequest,
  options: SimplifyOptions = {},
): void {
  const sentenceText = extractSentenceText(request.sentence, request.fullText);

  // Dispatch a custom event for the rewrite system to handle
  const event = new CustomEvent('langfix:simplify-sentence', {
    detail: {
      text: sentenceText,
      range: request.sentence.range,
      surfaceId: request.surface?.id,
      mode: 'simplify',
      reasons: request.sentence.reasons,
      score: request.sentence.score,
    },
    bubbles: true,
    cancelable: true,
  });

  // Notify start
  options.onStart?.();

  // Dispatch and handle result
  const dispatched = document.dispatchEvent(event);

  if (!dispatched) {
    options.onError?.(new Error('Simplify event was cancelled'));
  }
}

/**
 * Create a message payload for background script communication
 */
export function createSimplifyMessage(
  sentence: SentenceScore,
  fullText: string,
): {
  type: 'REWRITE_REQUEST';
  payload: {
    text: string;
    mode: 'simplify';
    context: string;
    metadata: {
      source: 'readability';
      score: number;
      reasons: string[];
    };
  };
} {
  const sentenceText = extractSentenceText(sentence, fullText);

  // Get context (surrounding sentences)
  const contextStart = Math.max(0, sentence.range.start - 100);
  const contextEnd = Math.min(fullText.length, sentence.range.end + 100);
  const context = fullText.slice(contextStart, contextEnd);

  return {
    type: 'REWRITE_REQUEST',
    payload: {
      text: sentenceText,
      mode: 'simplify',
      context,
      metadata: {
        source: 'readability',
        score: sentence.score,
        reasons: sentence.reasons,
      },
    },
  };
}

// ============================================================================
// Event Listener Setup
// ============================================================================

export type SimplifyEventHandler = (
  event: CustomEvent<{
    text: string;
    range: { start: number; end: number };
    surfaceId?: string;
    mode: 'simplify';
    reasons: string[];
    score: number;
  }>,
) => void;

/**
 * Listen for simplify events from the readability UI
 *
 * @param handler - Function to handle simplify requests
 * @returns Cleanup function to remove the listener
 */
export function onSimplifyRequest(handler: SimplifyEventHandler): () => void {
  const wrappedHandler = (event: Event) => {
    handler(event as CustomEvent);
  };

  document.addEventListener('langfix:simplify-sentence', wrappedHandler);

  return () => {
    document.removeEventListener('langfix:simplify-sentence', wrappedHandler);
  };
}
