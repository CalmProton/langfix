/**
 * Grammar Engine Prompts
 * Specialized prompts for grammar checking with strict TOON output
 */
import type { GrammarContext } from '../types';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * System prompt for fast grammar checking
 * Used for basic grammar, spelling, and punctuation
 */
export const GRAMMAR_FAST_SYSTEM_PROMPT = `You are a grammar checking assistant. Analyze text for:
- Grammar errors (subject-verb agreement, tense, articles, etc.)
- Spelling mistakes
- Punctuation errors

Respond with exactly one fenced TOON block. Do not add prose before or after.

TOON schema (half-open spans [start,end), UTF-16 indices):
\`\`\`toon
errors[N]{type,op,original,suggestion,startIndex,endIndex,severity,explanation}:
  grammar,replace,original text,suggested fix,0,5,error,Brief explanation
  spelling,replace,typo,correct,10,14,error,Misspelling
  punctuation,insert,"",".",20,20,warning,Missing period
\`\`\`

Rules:
- type: grammar, spelling, punctuation
- op: insert (startIndex==endIndex, empty original), replace (both populated), delete (empty suggestion)
- severity: error, warning, info
- No overlapping spans; spans must be sorted by startIndex
- If no errors, return: \`\`\`toon\\nerrors[0]{}\\n\`\`\`

If you cannot produce the data, return:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to analyze text
\`\`\``;

/**
 * System prompt for contextual/advanced grammar checking
 * Used for meaning-sensitive fixes and detailed explanations
 */
export const GRAMMAR_MAIN_SYSTEM_PROMPT = `You are an advanced writing assistant. Check for:
- Context-dependent word choice errors (their/there/they're, its/it's)
- Commonly confused words
- Incorrect word usage based on meaning
- Missing or incorrect articles in context
- Grammar errors (subject-verb agreement, tense, etc.)
- Spelling mistakes with context awareness
- Punctuation errors

Respond with exactly one fenced TOON block. Do not add prose before or after.

TOON schema (half-open spans [start,end), UTF-16 indices):
\`\`\`toon
errors[N]{type,op,original,suggestion,startIndex,endIndex,severity,explanation,alternatives}:
  contextual,replace,there,their,5,10,error,Possessive needed here,they're|theirs
  grammar,replace,dont,don't,15,19,error,Missing apostrophe
\`\`\`

Rules:
- type: grammar, spelling, punctuation, contextual
- op: insert (startIndex==endIndex, empty original), replace (both populated), delete (empty suggestion)
- severity: error, warning, info
- alternatives: optional, pipe-separated list of other suggestions
- No overlapping spans; spans must be sorted by startIndex
- If no errors, return: \`\`\`toon\\nerrors[0]{}\\n\`\`\`

Provide detailed explanations for each error.

If you cannot produce the data, return:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to analyze text
\`\`\``;

// ============================================================================
// User Prompt Builders
// ============================================================================

/**
 * Build context section in TOON format
 */
function buildContextToon(context: GrammarContext): string {
  const parts: string[] = [];

  if (context.language) {
    parts.push(`language:${context.language}`);
  }
  if (context.dialect) {
    parts.push(`dialect:${context.dialect}`);
  }
  if (context.formalityLevel) {
    parts.push(`formality:${context.formalityLevel}`);
  }

  if (parts.length === 0) return '';

  return `Context:\n\`\`\`toon\ncontext{${parts.map(p => p.split(':')[0]).join(',')}}:\n  ${parts.map(p => p.split(':')[1]).join(',')}\n\`\`\``;
}

/**
 * Build grammar check user prompt
 */
export function buildGrammarCheckPrompt(
  text: string,
  context?: GrammarContext,
): string {
  const contextSection = context ? `\n\n${buildContextToon(context)}` : '';

  return `Analyze the following text for errors.

Rules:
- Respond with exactly one fenced TOON block and nothing else.
- Use fields: type, op, original, suggestion, startIndex, endIndex, severity, explanation
- startIndex and endIndex are 0-based UTF-16 character indices (half-open interval)
- If no errors found, return an empty errors array.

TEXT:
"""
${text}
"""${contextSection}

Response:`;
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
