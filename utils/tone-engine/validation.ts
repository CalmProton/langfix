/**
 * Tone Detection & Rewrite Validation
 * Parsing and validation utilities for tone analysis responses
 */
import { decode } from '@toon-format/toon';
import {
  TONE_LABELS,
  type ToneDetectionResult,
  type ToneLabel,
  type ToneRewriteResult,
} from './types';

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
    return matches[matches.length - 1][1].trim();
  }
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

// ============================================================================
// Tone Label Validation
// ============================================================================

/**
 * Set of valid tone labels for fast lookup
 */
const VALID_TONE_LABELS = new Set<string>(TONE_LABELS);

/**
 * Validate and normalize a tone label
 */
export function validateToneLabel(
  label: unknown,
  fallback: ToneLabel = 'other',
): ToneLabel {
  if (typeof label !== 'string') return fallback;
  const normalized = label.toLowerCase().trim() as ToneLabel;
  return VALID_TONE_LABELS.has(normalized) ? normalized : fallback;
}

// ============================================================================
// Tone Detection Parsing
// ============================================================================

export interface ToneDetectionParseResult {
  detection: ToneDetectionResult | null;
  warnings: string[];
  error?: string;
  raw: string;
}

/**
 * Parse tone detection response from AI
 */
export function parseToneDetectionResponse(
  response: string,
): ToneDetectionParseResult {
  const raw = extractToonBlock(response);
  const warnings: string[] = [];

  try {
    const data = decode(raw) as Record<string, unknown>;

    // Check for error response
    if (isErrorResponse(data)) {
      return {
        detection: null,
        warnings,
        error: `${data.error.code}: ${data.error.message}`,
        raw,
      };
    }

    // Look for 'tone' key in decoded data
    const toneData = data.tone || data;

    if (!toneData || typeof toneData !== 'object') {
      return {
        detection: null,
        warnings,
        error: 'invalid_structure: missing tone object',
        raw,
      };
    }

    const entry = toneData as Record<string, unknown>;

    // Parse primary tone
    const primary = validateToneLabel(entry.primary);
    if (primary !== entry.primary) {
      warnings.push(`Normalized primary tone: ${entry.primary} → ${primary}`);
    }

    // Parse secondary tone (optional)
    let secondary: ToneLabel | undefined;
    if (entry.secondary !== undefined && entry.secondary !== null) {
      secondary = validateToneLabel(entry.secondary);
      if (secondary !== entry.secondary) {
        warnings.push(
          `Normalized secondary tone: ${entry.secondary} → ${secondary}`,
        );
      }
    }

    // Parse confidence (clamp to 0-1)
    let confidence = 0.5;
    if (typeof entry.confidence === 'number') {
      confidence = Math.max(0, Math.min(1, entry.confidence));
      if (confidence !== entry.confidence) {
        warnings.push(
          `Clamped confidence: ${entry.confidence} → ${confidence}`,
        );
      }
    } else {
      warnings.push('Missing confidence, defaulting to 0.5');
    }

    // Parse evidence array
    let evidence: string[] = [];
    if (Array.isArray(entry.evidence)) {
      evidence = entry.evidence
        .filter((e): e is string => typeof e === 'string')
        .slice(0, 4) // Max 4 snippets
        .map((e) => (e.length > 60 ? `${e.substring(0, 57)}...` : e)); // Truncate long snippets
    } else if (typeof entry.evidence === 'string') {
      // Handle pipe-separated format
      evidence = entry.evidence.split('|').filter(Boolean).slice(0, 4);
    }

    // Parse notes (optional)
    const notes = typeof entry.notes === 'string' ? entry.notes : undefined;

    // Apply low confidence threshold
    const detection: ToneDetectionResult = {
      primary: confidence < 0.35 ? 'other' : primary,
      secondary: confidence >= 0.35 ? secondary : undefined,
      confidence,
      evidence,
      notes,
    };

    return { detection, warnings, raw };
  } catch (error) {
    return {
      detection: null,
      warnings,
      error: `decode_failed: ${String(error)}`,
      raw,
    };
  }
}

// ============================================================================
// Tone Rewrite Parsing
// ============================================================================

export interface ToneRewriteParseResult {
  rewrite: ToneRewriteResult | null;
  warnings: string[];
  error?: string;
  raw: string;
}

/**
 * Parse tone rewrite response from AI
 */
export function parseToneRewriteResponse(
  response: string,
): ToneRewriteParseResult {
  const raw = extractToonBlock(response);
  const warnings: string[] = [];

  try {
    const data = decode(raw) as Record<string, unknown>;

    // Check for error response
    if (isErrorResponse(data)) {
      return {
        rewrite: null,
        warnings,
        error: `${data.error.code}: ${data.error.message}`,
        raw,
      };
    }

    // Look for 'rewrite' key in decoded data
    const rewriteData = data.rewrite || data;

    if (!rewriteData || typeof rewriteData !== 'object') {
      return {
        rewrite: null,
        warnings,
        error: 'invalid_structure: missing rewrite object',
        raw,
      };
    }

    const entry = rewriteData as Record<string, unknown>;

    // Parse tone
    const tone = validateToneLabel(entry.tone);
    if (tone !== entry.tone) {
      warnings.push(`Normalized tone: ${entry.tone} → ${tone}`);
    }

    // Parse output
    if (typeof entry.output !== 'string' || !entry.output.trim()) {
      return {
        rewrite: null,
        warnings,
        error: 'invalid_structure: missing or empty output',
        raw,
      };
    }
    const output = entry.output.trim();

    // Parse notes (optional)
    const notes = typeof entry.notes === 'string' ? entry.notes : undefined;

    const rewrite: ToneRewriteResult = {
      tone,
      output,
      notes,
    };

    return { rewrite, warnings, raw };
  } catch (error) {
    return {
      rewrite: null,
      warnings,
      error: `decode_failed: ${String(error)}`,
      raw,
    };
  }
}

// ============================================================================
// Content Preservation Validation
// ============================================================================

/**
 * Extract quoted strings from text
 */
function extractQuotedStrings(text: string): string[] {
  const doubleQuotes = text.match(/"[^"]+"/g) || [];
  const singleQuotes = text.match(/'[^']+'/g) || [];
  return [...doubleQuotes, ...singleQuotes];
}

/**
 * Extract URLs from text
 */
function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>)]+/g) || [];
}

/**
 * Extract code blocks from text
 */
function extractCodeBlocks(text: string): string[] {
  const fenced = text.match(/```[\s\S]*?```/g) || [];
  const inline = text.match(/`[^`]+`/g) || [];
  return [...fenced, ...inline];
}

/**
 * Validate that preserved content hasn't been modified
 */
export function validatePreservedContent(
  original: string,
  rewritten: string,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check quoted strings
  const originalQuotes = extractQuotedStrings(original);
  for (const quote of originalQuotes) {
    if (!rewritten.includes(quote)) {
      violations.push(`Modified quoted string: ${quote.substring(0, 30)}...`);
    }
  }

  // Check URLs
  const originalUrls = extractUrls(original);
  for (const url of originalUrls) {
    if (!rewritten.includes(url)) {
      violations.push(`Modified URL: ${url.substring(0, 50)}...`);
    }
  }

  // Check code blocks
  const originalCode = extractCodeBlocks(original);
  for (const code of originalCode) {
    if (!rewritten.includes(code)) {
      violations.push(`Modified code block: ${code.substring(0, 30)}...`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Validate length constraint for rewrite
 */
export function validateLengthConstraint(
  original: string,
  rewritten: string,
  maxChangePercent: number = 15,
): { valid: boolean; changePercent: number } {
  const originalLen = original.trim().length;
  const rewrittenLen = rewritten.trim().length;

  if (originalLen === 0) {
    return { valid: rewrittenLen === 0, changePercent: 0 };
  }

  const changePercent = Math.abs(
    ((rewrittenLen - originalLen) / originalLen) * 100,
  );

  return {
    valid: changePercent <= maxChangePercent,
    changePercent: Math.round(changePercent),
  };
}
