/**
 * Inline Rewrite Background Handler
 * Handles streaming rewrite requests from content scripts
 */

import { type RewriteEngine, RewriteError } from '../rewrite-engine/engine';
import {
  calculateChangePercent,
  countChars,
  countWords,
} from '../rewrite-engine/prompts';
import type { RewriteMode, RewriteResult } from '../rewrite-engine/types';
import type {
  InlineRewriteRequest,
  InlineRewriteResult,
  InlineRewriteStreamChunk,
  InlineSelection,
} from './types';

// ============================================================================
// Types for Background Handler
// ============================================================================

interface PortMessage {
  type: string;
  payload: unknown;
}

interface ActiveRequest {
  id: string;
  aborted: boolean;
}

/**
 * Port interface compatible with browser.runtime.Port
 */
interface BrowserPort {
  postMessage(message: unknown): void;
  onMessage: {
    addListener(callback: (message: unknown) => void): void;
  };
  onDisconnect: {
    addListener(callback: () => void): void;
  };
}

// ============================================================================
// Inline Rewrite Background Handler
// ============================================================================

export class InlineRewriteHandler {
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private rewriteEngine: RewriteEngine | null = null;

  /**
   * Set the rewrite engine to use
   */
  setRewriteEngine(engine: RewriteEngine): void {
    this.rewriteEngine = engine;
  }

  /**
   * Handle a port connection for inline rewrite
   */
  handleConnection(port: BrowserPort): void {
    port.onMessage.addListener(async (message: unknown) => {
      const msg = message as PortMessage;
      switch (msg.type) {
        case 'INLINE_REWRITE_START':
          await this.handleStart(port, msg.payload as InlineRewriteRequest);
          break;
        case 'INLINE_REWRITE_CANCEL':
          this.handleCancel(msg.payload as { id: string });
          break;
        case 'INLINE_REWRITE_RETRY':
          await this.handleRetry(
            port,
            msg.payload as {
              id: string;
              mode: RewriteMode;
              previousResult: string;
              selection: InlineSelection;
            },
          );
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      // Cancel all active requests for this port
      // The requests will check the aborted flag and stop
    });
  }

  /**
   * Handle a start request
   */
  private async handleStart(
    port: BrowserPort,
    request: InlineRewriteRequest,
  ): Promise<void> {
    const { id, mode, selection, temperature } = request;

    // Track this request
    this.activeRequests.set(id, { id, aborted: false });

    if (!this.rewriteEngine) {
      this.sendError(port, id, {
        code: 'API_ERROR',
        message:
          'Rewrite engine not initialized. Please configure your AI provider.',
        retryable: false,
      });
      return;
    }

    try {
      // Use streaming if available
      if (request.stream) {
        await this.streamRewrite(port, id, selection.text, mode, temperature);
      } else {
        await this.nonStreamRewrite(
          port,
          id,
          selection.text,
          mode,
          temperature,
        );
      }
    } catch (error) {
      if (this.isAborted(id)) return;
      this.handleRewriteError(port, id, error);
    } finally {
      this.activeRequests.delete(id);
    }
  }

  /**
   * Handle a retry request
   */
  private async handleRetry(
    port: BrowserPort,
    request: {
      id: string;
      mode: RewriteMode;
      previousResult: string;
      selection: InlineSelection;
    },
  ): Promise<void> {
    const { id, mode, previousResult, selection } = request;

    // Track this request
    this.activeRequests.set(id, { id, aborted: false });

    if (!this.rewriteEngine) {
      this.sendError(port, id, {
        code: 'API_ERROR',
        message: 'Rewrite engine not initialized.',
        retryable: false,
      });
      return;
    }

    try {
      const result = await this.rewriteEngine.retryRewrite(
        selection.text,
        mode,
        previousResult,
      );

      if (this.isAborted(id)) return;

      this.sendComplete(
        port,
        id,
        result.rewritten,
        result.original,
        mode,
        result.processingTime,
      );
    } catch (error) {
      if (this.isAborted(id)) return;
      this.handleRewriteError(port, id, error);
    } finally {
      this.activeRequests.delete(id);
    }
  }

  /**
   * Handle a cancel request
   */
  private handleCancel(payload: { id: string }): void {
    const request = this.activeRequests.get(payload.id);
    if (request) {
      request.aborted = true;
    }
  }

  /**
   * Stream rewrite response
   */
  private async streamRewrite(
    port: BrowserPort,
    id: string,
    text: string,
    mode: RewriteMode,
    temperature?: number,
  ): Promise<void> {
    if (!this.rewriteEngine) return;

    const generator = this.rewriteEngine.streamRewrite(text, mode, {
      temperature,
    });

    let fullText = '';

    for await (const chunk of generator) {
      if (this.isAborted(id)) return;

      // If it's a string, it's a stream chunk
      if (typeof chunk === 'string') {
        fullText += chunk;
        this.sendChunk(port, id, chunk, false);
      } else {
        // Final result (RewriteResult)
        const result = chunk as RewriteResult;
        this.sendComplete(
          port,
          id,
          result.rewritten,
          result.original,
          mode,
          result.processingTime,
        );
        return;
      }
    }

    // If we got here without a final result, send completion
    this.sendChunk(port, id, '', true);
    this.sendComplete(port, id, fullText, text, mode, 0);
  }

  /**
   * Non-streaming rewrite
   */
  private async nonStreamRewrite(
    port: BrowserPort,
    id: string,
    text: string,
    mode: RewriteMode,
    temperature?: number,
  ): Promise<void> {
    if (!this.rewriteEngine) return;

    const result = await this.rewriteEngine.rewrite(text, mode, {
      temperature,
    });

    if (this.isAborted(id)) return;

    this.sendComplete(
      port,
      id,
      result.rewritten,
      result.original,
      mode,
      result.processingTime,
    );
  }

  /**
   * Send a stream chunk
   */
  private sendChunk(
    port: BrowserPort,
    id: string,
    contentDelta: string,
    done: boolean,
  ): void {
    const chunk: InlineRewriteStreamChunk = {
      id,
      contentDelta,
      done,
    };

    try {
      port.postMessage({
        type: 'INLINE_REWRITE_CHUNK',
        payload: chunk,
      });
    } catch {
      // Port may be disconnected
    }
  }

  /**
   * Send completion message
   */
  private sendComplete(
    port: BrowserPort,
    id: string,
    rewritten: string,
    original: string,
    mode: RewriteMode,
    processingTime: number,
  ): void {
    const result: InlineRewriteResult = {
      id,
      rewritten,
      original,
      mode,
      stats: {
        originalWords: countWords(original),
        rewrittenWords: countWords(rewritten),
        changePercent: calculateChangePercent(
          countWords(original),
          countWords(rewritten),
        ),
        originalChars: countChars(original),
        rewrittenChars: countChars(rewritten),
      },
      processingTime,
    };

    try {
      port.postMessage({
        type: 'INLINE_REWRITE_COMPLETE',
        payload: result,
      });
    } catch {
      // Port may be disconnected
    }
  }

  /**
   * Send error message
   */
  private sendError(
    port: BrowserPort,
    id: string,
    error: { code: string; message: string; retryable: boolean },
  ): void {
    try {
      port.postMessage({
        type: 'INLINE_REWRITE_ERROR',
        payload: { id, error },
      });
    } catch {
      // Port may be disconnected
    }
  }

  /**
   * Handle rewrite errors
   */
  private handleRewriteError(
    port: BrowserPort,
    id: string,
    error: unknown,
  ): void {
    if (error instanceof RewriteError) {
      this.sendError(port, id, {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      });
    } else if (error instanceof Error) {
      this.sendError(port, id, {
        code: 'API_ERROR',
        message: error.message,
        retryable: true,
      });
    } else {
      this.sendError(port, id, {
        code: 'API_ERROR',
        message: 'An unknown error occurred',
        retryable: true,
      });
    }
  }

  /**
   * Check if a request was aborted
   */
  private isAborted(id: string): boolean {
    const request = this.activeRequests.get(id);
    return request?.aborted ?? true;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: InlineRewriteHandler | null = null;

/**
 * Get the inline rewrite handler singleton
 */
export function getInlineRewriteHandler(): InlineRewriteHandler {
  if (!instance) {
    instance = new InlineRewriteHandler();
  }
  return instance;
}
