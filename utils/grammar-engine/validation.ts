/**
 * Grammar Engine Validation
 * Parsing and validation utilities for grammar check responses
 */
import { decode } from '@toon-format/toon';
import type { ExtendedGrammarError, ParseResult } from './types';

// ============================================================================
// TOON Response Parsing
// ============================================================================

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
 * Check if response contains an error block
 */
interface ToonErrorResponse {
  code: string;
  message: string;
}

function isErrorResponse(data: unknown): data is { error: ToonErrorResponse } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'object' &&
    (data as { error: ToonErrorResponse }).error !== null &&
    'code' in (data as { error: ToonErrorResponse }).error
  );
}

/**
 * Parse raw error from TOON decode into ExtendedGrammarError
 */
function parseRawError(
  raw: unknown,
  warnings: string[],
): ExtendedGrammarError | null {
  if (typeof raw !== 'object' || raw === null) {
    warnings.push('Invalid error entry: not an object');
    return null;
  }

  const entry = raw as Record<string, unknown>;

  // Required fields
  const type = entry.type as string;
  const startIndex = entry.startIndex as number;
  const endIndex = entry.endIndex as number;

  if (!['grammar', 'spelling', 'punctuation', 'contextual'].includes(type)) {
    warnings.push(`Invalid error type: ${type}`);
    return null;
  }

  if (typeof startIndex !== 'number' || typeof endIndex !== 'number') {
    warnings.push('Missing or invalid startIndex/endIndex');
    return null;
  }

  // Default op to 'replace' if not specified (backwards compatibility)
  let op = entry.op as string | undefined;
  if (!op) {
    op = 'replace';
  }
  if (!['insert', 'replace', 'delete'].includes(op)) {
    warnings.push(`Invalid op: ${op}`);
    return null;
  }

  // Default severity to 'error' if not specified
  let severity = entry.severity as string | undefined;
  if (!severity) {
    severity = 'error';
  }
  if (!['error', 'warning', 'info'].includes(severity)) {
    warnings.push(`Invalid severity: ${severity}, defaulting to 'error'`);
    severity = 'error';
  }

  // Parse alternatives if present
  let alternatives: string[] | undefined;
  if (typeof entry.alternatives === 'string' && entry.alternatives) {
    alternatives = entry.alternatives.split('|').filter(Boolean);
  }

  return {
    type: type as ExtendedGrammarError['type'],
    op: op as ExtendedGrammarError['op'],
    original: String(entry.original ?? ''),
    suggestion: String(entry.suggestion ?? ''),
    startIndex,
    endIndex,
    severity: severity as ExtendedGrammarError['severity'],
    explanation: String(entry.explanation ?? ''),
    alternatives,
  };
}

/**
 * Safely parse TOON response with error handling
 */
export function safeParseToon(response: string, _text: string): ParseResult {
  const warnings: string[] = [];
  const raw = extractToonBlock(response);

  try {
    const data = decode(raw);

    // Check for error response
    if (isErrorResponse(data)) {
      warnings.push(`AI error: ${data.error.code} - ${data.error.message}`);
      return { errors: [], warnings };
    }

    // Handle various response shapes
    let rawErrors: unknown[] = [];

    if (data && typeof data === 'object') {
      if ('errors' in data && Array.isArray(data.errors)) {
        rawErrors = data.errors;
      } else if (Array.isArray(data)) {
        rawErrors = data;
      }
    }

    // Parse each error
    const errors: ExtendedGrammarError[] = [];
    for (const rawError of rawErrors) {
      const parsed = parseRawError(rawError, warnings);
      if (parsed) {
        errors.push(parsed);
      }
    }

    return { errors, warnings };
  } catch (error) {
    warnings.push(`TOON decode failed: ${String(error)}`);
    return { errors: [], warnings };
  }
}

// ============================================================================
// Error Validation
// ============================================================================

/**
 * Validate errors against the source text
 */
export function validateErrors(
  errors: ExtendedGrammarError[],
  text: string,
): ExtendedGrammarError[] {
  const warnings: string[] = [];
  const validated: ExtendedGrammarError[] = [];

  for (const error of errors) {
    // Bounds check
    if (error.startIndex < 0 || error.endIndex > text.length) {
      warnings.push(
        `Dropping error: indices out of bounds [${error.startIndex}, ${error.endIndex}] for text length ${text.length}`,
      );
      continue;
    }

    if (error.startIndex > error.endIndex) {
      warnings.push(
        `Dropping error: startIndex > endIndex [${error.startIndex}, ${error.endIndex}]`,
      );
      continue;
    }

    // Op-specific validation
    if (error.op === 'insert') {
      if (error.startIndex !== error.endIndex) {
        warnings.push(
          `Dropping insert error: startIndex != endIndex [${error.startIndex}, ${error.endIndex}]`,
        );
        continue;
      }
      if (error.original !== '') {
        // Auto-fix: clear original for insert ops
        error.original = '';
      }
    } else if (error.op === 'delete') {
      if (error.suggestion !== '') {
        // Auto-fix: clear suggestion for delete ops
        error.suggestion = '';
      }
    } else if (error.op === 'replace') {
      // Verify original matches text (case-insensitive)
      const actualText = text.substring(error.startIndex, error.endIndex);
      if (actualText.toLowerCase() !== error.original.toLowerCase()) {
        // Try to fix by using actual text
        warnings.push(
          `Warning: original "${error.original}" doesn't match text "${actualText}" at [${error.startIndex}, ${error.endIndex}], using actual text`,
        );
        error.original = actualText;
      }
    }

    validated.push(error);
  }

  return validated;
}

/**
 * Sort errors by startIndex and remove overlapping spans
 */
export function sortAndDedupeErrors(
  errors: ExtendedGrammarError[],
): ExtendedGrammarError[] {
  // Sort by startIndex
  const sorted = [...errors].sort((a, b) => a.startIndex - b.startIndex);

  // Remove overlaps (keep first occurrence)
  const deduped: ExtendedGrammarError[] = [];
  let lastEndIndex = -1;

  for (const error of sorted) {
    if (error.startIndex >= lastEndIndex) {
      deduped.push(error);
      lastEndIndex = error.endIndex;
    }
    // Skip overlapping errors
  }

  return deduped;
}
