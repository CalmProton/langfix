/**
 * Rewrite Engine Prompts
 * System prompts and user prompt builders for text rewriting
 */
import type { RewriteMode, RewriteOptions } from './types';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Base system prompt for all rewrite operations
 */
export const REWRITE_SYSTEM_PROMPT = `You are a professional writing assistant specializing in text rewriting.

Rules:
1. Preserve the original meaning and key information
2. Return ONLY the rewritten text, no explanations or commentary
3. Match the approximate tone unless specifically asked to change it
4. Keep proper nouns, names, and specific terminology unchanged
5. Maintain the same language as the input text
6. Do not wrap the output in quotes or markdown formatting
7. Do not add prefixes like "Here's the rewritten text:" - just output the text directly`;

// ============================================================================
// Mode-Specific Prompts
// ============================================================================

/**
 * Prompts for each rewrite mode
 */
export const MODE_PROMPTS: Record<RewriteMode, string> = {
  shorten: `Rewrite this text to be more concise. Remove filler words, combine sentences where possible, and eliminate redundancy. Target: reduce length by 30-50% while keeping all important information.`,

  expand: `Expand this text with more detail and elaboration. Add relevant examples, explanations, or context where appropriate. Maintain a natural flow and ensure additions are meaningful. Target: increase length by 50-100%.`,

  simplify: `Simplify this text for a general audience. Use common words (aim for 8th grade reading level), shorter sentences, and clear structure. Replace jargon and complex terminology with everyday language while preserving the core meaning.`,

  professional: `Rewrite this text in a professional, formal business tone. Use appropriate business language, avoid contractions and colloquialisms, and maintain a polished, confident voice. Ensure clarity and precision.`,

  casual: `Rewrite this text in a casual, conversational tone. Make it friendly and approachable. Use contractions naturally, prefer simpler words, and adopt a relaxed style as if talking to a friend. Keep it natural, not forced.`,

  academic: `Rewrite this text in an academic style. Use precise and formal language, avoid first person where appropriate, include hedging language (e.g., "suggests", "indicates") where suitable, and maintain scholarly formality. Ensure objectivity and clarity.`,

  improve: `Improve this text for clarity, flow, and impact. Fix any awkward phrasing, enhance word choices, improve sentence structure, and boost readability while maintaining the original meaning, tone, and intent.`,
};

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Build the complete user prompt for a rewrite request
 */
export function buildRewritePrompt(
  text: string,
  mode: RewriteMode,
  options?: RewriteOptions,
): string {
  let prompt = MODE_PROMPTS[mode];

  if (options?.instructions) {
    prompt += `\n\nAdditional requirements: ${options.instructions}`;
  }

  if (options?.language) {
    prompt += `\n\nKeep the response in ${options.language}.`;
  }

  prompt += `\n\nOriginal text:\n"""\n${text}\n"""`;

  return prompt;
}

/**
 * Build a prompt for retrying with variation
 * Used when user clicks "Try Again" to get a different result
 */
export function buildRetryPrompt(
  text: string,
  mode: RewriteMode,
  previousResult: string,
  options?: RewriteOptions,
): string {
  let prompt = MODE_PROMPTS[mode];

  prompt += `\n\nImportant: Provide a DIFFERENT rewrite than this previous attempt:\n"""\n${previousResult}\n"""`;

  if (options?.instructions) {
    prompt += `\n\nAdditional requirements: ${options.instructions}`;
  }

  if (options?.language) {
    prompt += `\n\nKeep the response in ${options.language}.`;
  }

  prompt += `\n\nOriginal text:\n"""\n${text}\n"""`;

  return prompt;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Count characters in text (excluding leading/trailing whitespace)
 */
export function countChars(text: string): number {
  return text.trim().length;
}

/**
 * Calculate percentage change between two values
 */
export function calculateChangePercent(
  original: number,
  updated: number,
): number {
  if (original === 0) return updated > 0 ? 100 : 0;
  return Math.round(((updated - original) / original) * 100);
}
