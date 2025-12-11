/**
 * Readability Model Refinement Prompts
 * Prompts for AI-assisted readability analysis
 */

// ============================================================================
// System Prompt
// ============================================================================

export const READABILITY_REFINEMENT_SYSTEM_PROMPT = `You are a writing clarity expert. Analyze the given sentences for readability issues and provide specific, actionable suggestions for improvement.

Focus on:
1. Sentence structure complexity
2. Word choice (simpler alternatives)
3. Passive voice usage
4. Unnecessary jargon or filler words
5. Run-on sentences or fragments

Respond in TOON format with this structure:
[feedback
  [sentence
    id: "sentence_id"
    suggestions: ["suggestion1", "suggestion2"]
    reasons: ["reason1", "reason2"]
    adjusted_score: 45
  ]
]

Keep suggestions brief (under 20 words each). Focus on the most impactful improvements.`;

// ============================================================================
// User Prompt Builder
// ============================================================================

export interface RefinementSentence {
  id: string;
  text: string;
  score: number;
  reasons: string[];
}

/**
 * Build the user prompt for model refinement
 *
 * @param sentences - Hard sentences to analyze
 * @returns Formatted prompt string
 */
export function buildRefinementPrompt(sentences: RefinementSentence[]): string {
  const sentenceList = sentences
    .map(
      (s) =>
        `ID: ${s.id}\nScore: ${s.score}/100\nText: "${s.text}"\nInitial reasons: ${s.reasons.join(', ')}`,
    )
    .join('\n\n');

  return `Analyze these hard-to-read sentences and provide improvement suggestions:

${sentenceList}

For each sentence, provide:
1. Additional reasons why it's hard to read
2. Specific suggestions to simplify it
3. An adjusted score (0-100) based on your analysis

Respond in TOON format.`;
}

// ============================================================================
// Response Parsing
// ============================================================================

import type { ModelSentenceFeedback } from './types';

/**
 * Parse model refinement response
 * Extracts feedback from TOON-formatted response
 *
 * @param response - Raw model response
 * @returns Parsed feedback array
 */
export function parseRefinementResponse(
  response: string,
): ModelSentenceFeedback[] {
  const feedback: ModelSentenceFeedback[] = [];

  try {
    // Simple TOON-style parsing
    // Look for [sentence ...] blocks
    const sentenceBlocks = response.matchAll(
      /\[sentence\s+([\s\S]*?)\]/gi,
    );

    for (const match of sentenceBlocks) {
      const block = match[1];

      // Extract id
      const idMatch = block.match(/id:\s*"([^"]+)"/i);
      const id = idMatch?.[1] ?? '';

      // Extract suggestions array
      const suggestionsMatch = block.match(
        /suggestions:\s*\[([\s\S]*?)\]/i,
      );
      const suggestions = suggestionsMatch
        ? extractArrayItems(suggestionsMatch[1])
        : [];

      // Extract reasons array
      const reasonsMatch = block.match(/reasons:\s*\[([\s\S]*?)\]/i);
      const additionalReasons = reasonsMatch
        ? extractArrayItems(reasonsMatch[1])
        : [];

      // Extract adjusted score
      const scoreMatch = block.match(/adjusted_score:\s*(\d+)/i);
      const adjustedScore = scoreMatch
        ? Number.parseInt(scoreMatch[1], 10)
        : undefined;

      if (id) {
        feedback.push({
          sentenceId: id,
          suggestions,
          additionalReasons,
          adjustedScore,
        });
      }
    }
  } catch (error) {
    console.warn('Failed to parse refinement response:', error);
  }

  return feedback;
}

/**
 * Extract array items from a TOON array string
 * e.g., '"item1", "item2"' -> ['item1', 'item2']
 */
function extractArrayItems(arrayContent: string): string[] {
  const items: string[] = [];
  const matches = arrayContent.matchAll(/"([^"]+)"/g);

  for (const match of matches) {
    items.push(match[1]);
  }

  return items;
}
