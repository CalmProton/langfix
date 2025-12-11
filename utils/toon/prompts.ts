/**
 * AI Prompt Templates
 * Templates for communicating with AI models using TOON format
 */

import type { GrammarContext, RewriteMode } from '../types';
import { encodeToon } from './index';

// ============================================================================
// System Prompts
// ============================================================================

export const GRAMMAR_SYSTEM_PROMPT = `You are a writing assistant. When returning structured data, respond with exactly one fenced TOON block. Do not add prose before or after.

If you cannot produce the data, return:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to generate TOON
\`\`\`

Example input: "He dont like teh weather"
Example response:
\`\`\`toon
errors[2]{type,original,suggestion,startIndex,endIndex,explanation}:
  grammar,dont,doesn't,3,7,Subject-verb agreement: "he" requires "doesn't"
  spelling,teh,the,13,16,Common typo
\`\`\``;

export const STYLE_SYSTEM_PROMPT = `You are a writing style analyst. When returning structured data, respond with exactly one fenced TOON block. Do not add prose before or after.

If you cannot produce the data, return:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to generate TOON
\`\`\`

Example response for style issues:
\`\`\`toon
issues[2]{type,text,suggestion,startIndex,endIndex,severity}:
  passive,was written,wrote,10,21,warning
  wordiness,in order to,to,45,57,info
readability{score,grade}:72,Grade 8
\`\`\``;

export const REWRITE_SYSTEM_PROMPT = `You are a text rewriting assistant. When returning structured data, respond with exactly one fenced TOON block. Do not add prose before or after.

If you cannot produce the data, return:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to generate TOON
\`\`\`

Example response:
\`\`\`toon
original:The project was completed by the team in a timely manner.
rewritten:The team completed the project on time.
changes[2]{from,to,reason}:
  was completed by,completed,Active voice is more direct
  in a timely manner,on time,More concise phrasing
\`\`\``;

// ============================================================================
// User Prompt Builders
// ============================================================================

/**
 * Build grammar check prompt
 */
export function buildGrammarPrompt(
  text: string,
  context?: GrammarContext,
): string {
  const contextSection = context ? `\n\n${buildContextToon(context)}` : '';

  return `Analyze the following text for grammar, spelling, and punctuation errors.

Rules:
- Respond with exactly one fenced TOON block and nothing else.
- Use fields: type (grammar|spelling|punctuation), original, suggestion, startIndex, endIndex, explanation.
- startIndex and endIndex are 0-based UTF-16 character indices.
- If no errors found, return an empty errors array.
- If you cannot comply, return a fenced TOON block with error{code,message}.

TEXT:
"""
${text}
"""${contextSection}

Response:`;
}

/**
 * Build style analysis prompt
 */
export function buildStylePrompt(
  text: string,
  context?: GrammarContext,
): string {
  const contextSection = context ? `\n\n${buildContextToon(context)}` : '';

  return `Analyze the following text for style issues (passive voice, wordiness, clarity, filler words).

Rules:
- Respond with exactly one fenced TOON block and nothing else.
- Include issues array with: type (passive|wordiness|clarity|filler), text, suggestion, startIndex, endIndex, severity (info|warning).
- Include readability object with: score (0-100), grade (e.g., "Grade 8").
- If no issues found, return an empty issues array.
- If you cannot comply, return a fenced TOON block with error{code,message}.

TEXT:
"""
${text}
"""${contextSection}

Response:`;
}

/**
 * Build rewrite prompt
 */
export function buildRewritePrompt(
  text: string,
  mode: RewriteMode,
  context?: GrammarContext,
): string {
  const modeInstructions: Record<RewriteMode, string> = {
    shorten: 'Make the text more concise while preserving the core meaning.',
    expand: 'Expand the text with more detail and explanation.',
    simplify: 'Simplify the language to make it easier to understand.',
    professional: 'Rewrite in a formal, professional tone.',
    casual: 'Rewrite in a casual, conversational tone.',
  };

  const contextSection = context ? `\n\n${buildContextToon(context)}` : '';

  return `Rewrite the following text.

Mode: ${mode}
Instruction: ${modeInstructions[mode]}

Rules:
- Respond with exactly one fenced TOON block and nothing else.
- Include: original, rewritten, and changes array with {from, to, reason}.
- If you cannot comply, return a fenced TOON block with error{code,message}.

TEXT:
"""
${text}
"""${contextSection}

Response:`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildContextToon(context: object): string {
  return `CONTEXT (TOON):
\`\`\`toon
${encodeToon(context)}
\`\`\``;
}
