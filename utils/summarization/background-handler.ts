/**
 * Summarization Background Handler
 * Handles summarization requests from content scripts in the background
 */

import { getProviderFromStorage } from '#utils/ai-providers';
import { decodeToon, type ParseOutcome } from '#utils/toon';
import type {
  SelectionType,
  SummarizationError,
  SummaryRequest,
  SummaryResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

interface PortMessage {
  type: string;
  payload: unknown;
}

interface ActiveRequest {
  id: string;
  aborted: boolean;
}

interface BrowserPort {
  postMessage(message: unknown): void;
  onMessage: {
    addListener(callback: (message: unknown) => void): void;
  };
  onDisconnect: {
    addListener(callback: () => void): void;
  };
}

interface SummaryParsedResult {
  bullets: string[];
  keyTakeaway?: string;
}

// ============================================================================
// Cache Implementation
// ============================================================================

class SummaryCache {
  private cache = new Map<string, SummaryParsedResult>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  private getCacheKey(text: string): string {
    // Use first 100 chars + length as key
    return `${text.slice(0, 100)}:${text.length}`;
  }

  get(text: string): SummaryParsedResult | null {
    return this.cache.get(this.getCacheKey(text)) || null;
  }

  set(text: string, result: SummaryParsedResult): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(this.getCacheKey(text), result);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildSummaryPrompt(
  text: string,
  type: SelectionType,
  maxBullets: number,
): string {
  const typeLabel = type === 'multi-paragraph' ? 'multi-paragraph text' : type;

  return `Summarize the following ${typeLabel} in ${maxBullets} concise bullet points. Focus on key information and main ideas.

Text to summarize:
"""
${text}
"""

Provide:
1. ${maxBullets} bullet points (each 10-15 words max)
2. One sentence key takeaway (15-20 words max)

Respond in TOON format:
\`\`\`toon
(bullets
  "first key point here"
  "second key point here"
  ${maxBullets > 2 ? '"third key point here"' : ''}
  ${maxBullets > 3 ? '"fourth key point here"' : ''}
  ${maxBullets > 4 ? '"fifth key point here"' : ''}
)
(keyTakeaway "main idea in one sentence")
\`\`\``;
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseSummaryResponse(
  response: string,
): ParseOutcome<SummaryParsedResult> {
  // Extract TOON block if present
  const toonMatch = response.match(/```toon\n([\s\S]*?)```/);
  const raw = toonMatch ? toonMatch[1].trim() : response.trim();

  try {
    const data = decodeToon<{
      bullets?: string[];
      keyTakeaway?: string;
    }>(raw);

    if (!data.bullets || !Array.isArray(data.bullets)) {
      // Try to extract bullets from plain text fallback
      const bulletMatches = response.match(/[•\-*]\s*(.+)/g);
      if (bulletMatches) {
        return {
          ok: true,
          data: {
            bullets: bulletMatches.map((b) =>
              b.replace(/^[•\-*]\s*/, '').trim(),
            ),
            keyTakeaway: undefined,
          },
          raw,
        };
      }
      return {
        ok: false,
        error: 'invalid_structure: missing bullets array',
        raw,
      };
    }

    return {
      ok: true,
      data: {
        bullets: data.bullets,
        keyTakeaway: data.keyTakeaway,
      },
      raw,
    };
  } catch (error) {
    // Try JSON fallback
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.bullets && Array.isArray(parsed.bullets)) {
          return {
            ok: true,
            data: {
              bullets: parsed.bullets,
              keyTakeaway: parsed.keyTakeaway,
            },
            raw,
          };
        }
      }
    } catch {
      // JSON parsing also failed
    }

    // Try plain text bullet extraction
    const bulletMatches = response.match(/(?:^|\n)[•\-*\d.]\s*(.+)/g);
    if (bulletMatches && bulletMatches.length > 0) {
      return {
        ok: true,
        data: {
          bullets: bulletMatches.map((b) =>
            b.replace(/^[\n•\-*\d.]\s*/, '').trim(),
          ),
          keyTakeaway: undefined,
        },
        raw,
      };
    }

    return { ok: false, error: `decode_failed: ${String(error)}`, raw };
  }
}

// ============================================================================
// Summarization Background Handler
// ============================================================================

export class SummarizationHandler {
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private cache = new SummaryCache(50);

  /**
   * Handle a port connection for summarization
   */
  handleConnection(port: BrowserPort): void {
    port.onMessage.addListener(async (message: unknown) => {
      const msg = message as PortMessage;
      switch (msg.type) {
        case 'SUMMARY_START':
          await this.handleStart(port, msg.payload as SummaryRequest);
          break;
        case 'SUMMARY_CANCEL':
          this.handleCancel(msg.payload as { id: string });
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      // Mark all requests as aborted when port disconnects
      for (const request of this.activeRequests.values()) {
        request.aborted = true;
      }
    });
  }

  /**
   * Handle a start request
   */
  private async handleStart(
    port: BrowserPort,
    request: SummaryRequest,
  ): Promise<void> {
    const { id, text, type, maxBullets = 3 } = request;
    const startTime = Date.now();

    // Track this request
    this.activeRequests.set(id, { id, aborted: false });

    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      this.sendComplete(port, id, cached, true, Date.now() - startTime);
      this.activeRequests.delete(id);
      return;
    }

    // Get AI provider
    const provider = await getProviderFromStorage();
    if (!provider) {
      this.sendError(port, id, {
        code: 'NO_API_KEY',
        message: 'AI provider not configured. Please add API key in settings.',
        retryable: false,
      });
      this.activeRequests.delete(id);
      return;
    }

    try {
      // Build prompt
      const prompt = buildSummaryPrompt(
        text,
        type as SelectionType,
        maxBullets,
      );

      // Call AI provider using sendRequest
      const response = await provider.sendRequest({
        modelType: 'main',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 500,
      });

      // Check if cancelled
      if (this.isAborted(id)) return;

      // Parse response
      const parseResult = parseSummaryResponse(response.content);
      if (!parseResult.ok) {
        this.sendError(port, id, {
          code: 'PARSE_ERROR',
          message: 'Failed to parse summary response. Please try again.',
          retryable: true,
        });
        this.activeRequests.delete(id);
        return;
      }

      // Cache the result
      this.cache.set(text, parseResult.data);

      // Send completion
      this.sendComplete(
        port,
        id,
        parseResult.data,
        false,
        Date.now() - startTime,
      );
    } catch (error) {
      if (this.isAborted(id)) return;
      this.handleError(port, id, error);
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
   * Check if a request is aborted
   */
  private isAborted(id: string): boolean {
    const request = this.activeRequests.get(id);
    return request ? request.aborted : true;
  }

  /**
   * Send completion message
   */
  private sendComplete(
    port: BrowserPort,
    id: string,
    result: SummaryParsedResult,
    cached: boolean,
    processingTime: number,
  ): void {
    const response: SummaryResponse = {
      id,
      bullets: result.bullets,
      keyTakeaway: result.keyTakeaway,
      cached,
      processingTime,
    };

    port.postMessage({
      type: 'SUMMARY_COMPLETE',
      payload: response,
    });
  }

  /**
   * Send error message
   */
  private sendError(
    port: BrowserPort,
    id: string,
    error: SummarizationError,
  ): void {
    port.postMessage({
      type: 'SUMMARY_ERROR',
      payload: { id, error },
    });
  }

  /**
   * Handle errors from AI calls
   */
  private handleError(port: BrowserPort, id: string, error: unknown): void {
    console.error('[LangFix] Summarization error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for specific error types
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      this.sendError(port, id, {
        code: 'RATE_LIMIT',
        message: 'Rate limit reached. Please try again in a moment.',
        retryable: true,
      });
      return;
    }

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      this.sendError(port, id, {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        retryable: true,
      });
      return;
    }

    this.sendError(port, id, {
      code: 'API_ERROR',
      message: 'AI service error. Please try again.',
      retryable: true,
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: SummarizationHandler | null = null;

/**
 * Get the summarization handler singleton
 */
export function getSummarizationHandler(): SummarizationHandler {
  if (!instance) {
    instance = new SummarizationHandler();
  }
  return instance;
}
