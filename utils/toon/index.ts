/**
 * TOON Utilities
 * Token-Oriented Object Notation for efficient AI communication
 *
 * TOON reduces token usage by ~40% compared to JSON while maintaining accuracy.
 */
import { encode, decode } from '@toon-format/toon';
import type {
  GrammarResult,
  StyleResult,
  RewriteResult,
  ToonError,
} from '../types';

// ============================================================================
// Core Encode/Decode Functions
// ============================================================================

/**
 * Encode data to TOON format
 * @param value - Data to encode
 * @returns TOON-formatted string
 */
export function encodeToon<T>(value: T): string {
  return encode(value);
}

/**
 * Decode TOON string to object
 * @param toonString - TOON-formatted string
 * @returns Decoded object
 */
export function decodeToon<T>(toonString: string): T {
  return decode(toonString) as T;
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Result of parsing a TOON response
 */
export type ParseOutcome<T> =
  | { ok: true; data: T; raw: string }
  | { ok: false; error: string; raw: string };

/**
 * Regex to extract TOON blocks from AI responses
 */
const TOON_BLOCK_REGEX = /```toon\n([\s\S]*?)```/g;

/**
 * Extract TOON content from AI response
 * Takes the last TOON block if multiple exist
 */
function extractToonBlock(response: string): string {
  const matches = [...response.matchAll(TOON_BLOCK_REGEX)];
  if (matches.length > 0) {
    // Take the last match (most likely to be the final answer)
    return matches[matches.length - 1][1].trim();
  }
  // If no fenced block, assume entire response is TOON
  return response.trim();
}

/**
 * Parse grammar check response from AI
 */
export function parseGrammarResponse(
  response: string,
): ParseOutcome<GrammarResult> {
  const raw = extractToonBlock(response);

  try {
    const data = decodeToon<GrammarResult | ToonError>(raw);

    // Check if it's an error response
    if ('code' in data && 'message' in data) {
      return {
        ok: false,
        error: `ai_error: ${data.code} - ${data.message}`,
        raw,
      };
    }

    // Validate structure
    if (!data.errors || !Array.isArray(data.errors)) {
      return {
        ok: false,
        error: 'invalid_structure: missing errors array',
        raw,
      };
    }

    return { ok: true, data: data as GrammarResult, raw };
  } catch (error) {
    return { ok: false, error: `decode_failed: ${String(error)}`, raw };
  }
}

/**
 * Parse style analysis response from AI
 */
export function parseStyleResponse(
  response: string,
): ParseOutcome<StyleResult> {
  const raw = extractToonBlock(response);

  try {
    const data = decodeToon<StyleResult | ToonError>(raw);

    // Check if it's an error response
    if ('code' in data && 'message' in data) {
      return {
        ok: false,
        error: `ai_error: ${data.code} - ${data.message}`,
        raw,
      };
    }

    // Validate structure
    if (!data.issues || !Array.isArray(data.issues)) {
      return {
        ok: false,
        error: 'invalid_structure: missing issues array',
        raw,
      };
    }

    return { ok: true, data: data as StyleResult, raw };
  } catch (error) {
    return { ok: false, error: `decode_failed: ${String(error)}`, raw };
  }
}

/**
 * Parse rewrite response from AI
 */
export function parseRewriteResponse(
  response: string,
): ParseOutcome<RewriteResult> {
  const raw = extractToonBlock(response);

  try {
    const data = decodeToon<RewriteResult | ToonError>(raw);

    // Check if it's an error response
    if ('code' in data && 'message' in data) {
      return {
        ok: false,
        error: `ai_error: ${data.code} - ${data.message}`,
        raw,
      };
    }

    // Validate structure
    if (
      typeof data.original !== 'string' ||
      typeof data.rewritten !== 'string'
    ) {
      return {
        ok: false,
        error: 'invalid_structure: missing original or rewritten',
        raw,
      };
    }

    return { ok: true, data: data as RewriteResult, raw };
  } catch (error) {
    return { ok: false, error: `decode_failed: ${String(error)}`, raw };
  }
}

// ============================================================================
// Streaming Support
// ============================================================================

/**
 * Stream event types for TOON parsing
 */
export type StreamEvent<T> =
  | { type: 'chunk'; data: string }
  | { type: 'complete'; raw: string; parsed: T }
  | { type: 'parseError'; raw: string; error: string };

/**
 * Stream and parse TOON responses with bounded buffer
 * @param stream - Async iterable of string chunks
 * @param parse - Parser function for the complete response
 * @param maxBuffer - Maximum buffer size (default 20KB)
 */
export async function* streamAndParse<T>(
  stream: AsyncIterable<string>,
  parse: (text: string) => ParseOutcome<T>,
  maxBuffer = 20000,
): AsyncIterable<StreamEvent<T>> {
  let buffer = '';

  for await (const chunk of stream) {
    buffer += chunk;

    if (buffer.length > maxBuffer) {
      yield {
        type: 'parseError',
        raw: buffer.slice(0, maxBuffer),
        error: 'buffer_limit_exceeded',
      };
      return;
    }

    yield { type: 'chunk', data: chunk };
  }

  const outcome = parse(buffer);
  if (outcome.ok) {
    yield { type: 'complete', raw: outcome.raw, parsed: outcome.data };
  } else {
    yield { type: 'parseError', raw: outcome.raw, error: outcome.error };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wrap data in a TOON code block for prompts
 */
export function wrapToonBlock(data: unknown): string {
  const encoded = encodeToon(data);
  return `\`\`\`toon\n${encoded}\n\`\`\``;
}

/**
 * Create a context section for prompts using TOON
 */
export function buildContextSection(context: object): string {
  return `CONTEXT (TOON):\n${wrapToonBlock(context)}`;
}
