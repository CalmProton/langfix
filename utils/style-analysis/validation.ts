/**
 * Style Analysis Validation
 * Parsing and validation utilities for style analysis responses
 */
import { decode } from '@toon-format/toon';
import type { IssueCategory, IssueSeverity, StyleIssue } from './types';

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
 * Generate unique ID for an issue
 */
function generateIssueId(): string {
  return `style_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Valid categories for style analysis
 */
const VALID_CATEGORIES: Set<IssueCategory> = new Set([
  'style',
  'clarity',
  'conciseness',
]);

/**
 * Valid severities for style analysis
 */
const VALID_SEVERITIES: Set<IssueSeverity> = new Set(['info', 'warning']);

/**
 * Valid issue types by category
 */
const VALID_ISSUE_TYPES: Record<IssueCategory, Set<string>> = {
  style: new Set([
    'passive-voice',
    'weak-verb',
    'overused-word',
    'cliche',
    'nominalization',
    'hedge-word',
  ]),
  clarity: new Set([
    'vague-language',
    'complex-sentence',
    'ambiguous-pronoun',
    'jargon',
    'double-negative',
    'abstract-language',
  ]),
  conciseness: new Set([
    'redundancy',
    'filler-word',
    'wordy-phrase',
    'excessive-qualifier',
    'needless-adverb',
  ]),
};

/**
 * Parse raw issue from TOON decode into StyleIssue
 */
function parseRawIssue(raw: unknown, warnings: string[]): StyleIssue | null {
  if (typeof raw !== 'object' || raw === null) {
    warnings.push('Invalid issue entry: not an object');
    return null;
  }

  const entry = raw as Record<string, unknown>;

  // Required fields
  const category = entry.category as string;
  const type = entry.type as string;
  const startIndex = entry.startIndex as number;
  const endIndex = entry.endIndex as number;

  // Validate category
  if (!VALID_CATEGORIES.has(category as IssueCategory)) {
    warnings.push(`Invalid category: ${category}`);
    return null;
  }

  // Validate type for category
  const validTypes = VALID_ISSUE_TYPES[category as IssueCategory];
  if (!validTypes.has(type)) {
    warnings.push(`Invalid type "${type}" for category "${category}"`);
    // Allow unknown types but log warning
  }

  // Validate indices
  if (typeof startIndex !== 'number' || typeof endIndex !== 'number') {
    warnings.push('Missing or invalid startIndex/endIndex');
    return null;
  }

  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
    warnings.push(`Invalid indices: [${startIndex}, ${endIndex}]`);
    return null;
  }

  // Default severity to 'info' if not specified
  let severity = entry.severity as string | undefined;
  if (!severity || !VALID_SEVERITIES.has(severity as IssueSeverity)) {
    severity = 'info';
  }

  // Parse suggestions if present
  let suggestions: string[] = [];
  if (typeof entry.suggestions === 'string' && entry.suggestions) {
    suggestions = entry.suggestions.split('|').filter(Boolean);
  } else if (Array.isArray(entry.suggestions)) {
    suggestions = entry.suggestions.map(String).filter(Boolean);
  }

  return {
    id: generateIssueId(),
    category: category as IssueCategory,
    type,
    severity: severity as IssueSeverity,
    startIndex,
    endIndex,
    originalText: String(entry.originalText ?? ''),
    message: String(entry.message ?? ''),
    explanation: String(entry.explanation ?? ''),
    suggestions,
    context: entry.context ? String(entry.context) : undefined,
  };
}

/**
 * Parse result from TOON parsing
 */
export interface StyleParseResult {
  issues: StyleIssue[];
  warnings: string[];
}

/**
 * Safely parse TOON response with error handling
 */
export function safeParseStyleToon(
  response: string,
  _text: string,
): StyleParseResult {
  const warnings: string[] = [];
  const raw = extractToonBlock(response);

  try {
    const data = decode(raw);

    // Check for error response
    if (isErrorResponse(data)) {
      warnings.push(`AI error: ${data.error.code} - ${data.error.message}`);
      return { issues: [], warnings };
    }

    // Handle various response shapes
    let rawIssues: unknown[] = [];

    if (data && typeof data === 'object') {
      if ('issues' in data && Array.isArray(data.issues)) {
        rawIssues = data.issues;
      } else if (Array.isArray(data)) {
        rawIssues = data;
      }
    }

    // Parse each issue
    const issues: StyleIssue[] = [];
    for (const rawIssue of rawIssues) {
      const parsed = parseRawIssue(rawIssue, warnings);
      if (parsed) {
        issues.push(parsed);
      }
    }

    return { issues, warnings };
  } catch (error) {
    warnings.push(`TOON decode failed: ${String(error)}`);
    return { issues: [], warnings };
  }
}

// ============================================================================
// Issue Validation
// ============================================================================

/**
 * Validate issues against the source text
 */
export function validateIssues(
  issues: StyleIssue[],
  text: string,
): StyleIssue[] {
  const validated: StyleIssue[] = [];

  for (const issue of issues) {
    // Bounds check
    if (issue.startIndex < 0 || issue.endIndex > text.length) {
      continue;
    }

    if (issue.startIndex >= issue.endIndex) {
      continue;
    }

    // Verify originalText matches text
    const actualText = text.substring(issue.startIndex, issue.endIndex);
    if (actualText.toLowerCase() !== issue.originalText.toLowerCase()) {
      // Try to fix by using actual text
      issue.originalText = actualText;
    }

    // Ensure we have at least a message
    if (!issue.message && !issue.explanation) {
      continue;
    }

    validated.push(issue);
  }

  return validated;
}

/**
 * Sort issues by startIndex and remove overlapping spans
 */
export function sortAndDedupeIssues(issues: StyleIssue[]): StyleIssue[] {
  // Sort by startIndex
  const sorted = [...issues].sort((a, b) => a.startIndex - b.startIndex);

  // Remove overlaps (keep first occurrence)
  const deduped: StyleIssue[] = [];
  let lastEndIndex = -1;

  for (const issue of sorted) {
    if (issue.startIndex >= lastEndIndex) {
      deduped.push(issue);
      lastEndIndex = issue.endIndex;
    }
    // Skip overlapping issues
  }

  return deduped;
}

/**
 * Filter issues by category
 */
export function filterIssuesByCategory(
  issues: StyleIssue[],
  categories: IssueCategory[],
): StyleIssue[] {
  const categorySet = new Set(categories);
  return issues.filter((issue) => categorySet.has(issue.category));
}
