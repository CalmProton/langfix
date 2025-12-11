/**
 * Tone Detection & Rewrite Prompts
 * TOON-formatted prompts for tone analysis and rewriting
 */
import type { ToneLabel, ToneRewriteRequest } from './types';

// ============================================================================
// Tone Detection Prompts
// ============================================================================

/**
 * System prompt for tone detection
 */
export const TONE_DETECTION_SYSTEM = `You are an expert at analyzing the tone and emotional register of text.
Detect the primary tone and optionally a secondary tone from the text.

Allowed tones:
- neutral: Fact-focused, minimal emotion (status updates, reports)
- professional: Formal, courteous, concise (workplace email, support)
- friendly: Warm, approachable, light (community replies)
- empathetic: Validating, supportive (support for negative sentiment)
- confident: Decisive, assertive (proposals, instructions)
- apologetic: Owning mistakes, making amends (incident comms)
- direct: Clear, low hedging (action requests)
- informal: Casual, contractions allowed (personal chats)
- other: Fallback when unclear or mixed

Response Rules:
- confidence must be between 0 and 1
- evidence should be short snippets from the text (max 60 chars each, max 4 snippets)
- Only include secondary tone when confidence gap with primary is <= 0.2
- If confidence < 0.35, use 'other' as primary tone

Return EXACTLY one fenced TOON block with no additional prose.`;

/**
 * Build user prompt for tone detection
 */
export function buildToneDetectionPrompt(text: string): string {
  return `Analyze the tone of this text and return a TOON response.

Return format:
\`\`\`toon
tone{primary,secondary?,confidence,evidence[],notes?}:
  friendly,neutral,0.82,["thanks for your help","really appreciate it"],"warm greetings with acknowledgment"
\`\`\`

If you cannot analyze the text:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to detect tone
\`\`\`

Text to analyze:
"""
${text}
"""`;
}

// ============================================================================
// Tone Rewrite Prompts
// ============================================================================

/**
 * System prompt for tone rewriting
 */
export const TONE_REWRITE_SYSTEM = `You are an expert at rewriting text to match a specific tone while preserving meaning.

Critical Rules:
1. PRESERVE the original meaning and all factual information
2. DO NOT alter quoted text ("..." or '...')
3. DO NOT modify URLs, links, or email addresses
4. DO NOT change code blocks or technical commands
5. Keep the rewritten length within ±15% of the original
6. Maintain the same language as the input
7. Keep proper nouns and names unchanged

Return EXACTLY one fenced TOON block with no additional prose.`;

/**
 * Tone-specific rewriting instructions
 */
export const TONE_REWRITE_INSTRUCTIONS: Record<ToneLabel, string> = {
  neutral: `Rewrite to sound neutral and objective:
- Remove emotional language and opinions
- Focus on facts and information
- Use passive voice where appropriate
- Avoid superlatives and intensifiers`,

  professional: `Rewrite to sound professional and formal:
- Use formal vocabulary and complete sentences
- Avoid contractions and colloquialisms
- Maintain courteous but businesslike tone
- Be clear, concise, and polished`,

  friendly: `Rewrite to sound friendly and approachable:
- Add warmth and personal touches
- Use conversational language
- Include appropriate greetings/closings
- Show genuine interest and positivity`,

  empathetic: `Rewrite to sound empathetic and supportive:
- Acknowledge feelings and concerns
- Use validating language ("I understand...")
- Show care and consideration
- Offer reassurance where appropriate`,

  confident: `Rewrite to sound confident and assertive:
- Use decisive language ("will" instead of "might")
- Remove hedging words (maybe, perhaps, I think)
- Make clear, direct statements
- Project competence and certainty`,

  apologetic: `Rewrite to sound apologetic and sincere:
- Take clear ownership of issues
- Express genuine regret
- Explain without making excuses
- Offer remediation or next steps`,

  direct: `Rewrite to be direct and clear:
- Get straight to the point
- Remove unnecessary qualifiers
- Use short, clear sentences
- Focus on action and outcomes`,

  informal: `Rewrite to sound casual and relaxed:
- Use contractions naturally
- Include colloquial expressions
- Adopt a conversational, friendly style
- Keep it natural, not forced`,

  other: `Keep the text largely as-is with minor improvements for clarity:
- Fix any obvious issues
- Maintain the original style
- Do not force a specific tone`,
};

/**
 * Build user prompt for tone rewriting
 */
export function buildToneRewritePrompt(request: ToneRewriteRequest): string {
  const { text, targetTone, sourceTone, instructions } = request;

  let prompt = `Rewrite this text to sound ${targetTone}.

${TONE_REWRITE_INSTRUCTIONS[targetTone]}`;

  if (sourceTone) {
    prompt += `\n\nCurrent tone: ${sourceTone} → Target: ${targetTone}`;
  }

  if (instructions) {
    prompt += `\n\nAdditional instructions: ${instructions}`;
  }

  prompt += `

Return format:
\`\`\`toon
rewrite{tone,output,notes?}:
  ${targetTone},<rewritten text here>,"brief notes on changes made"
\`\`\`

If you cannot rewrite the text (e.g., contains only code/URLs):
\`\`\`toon
error{code,message}:
  cannot_rewrite,Text cannot be meaningfully rewritten
\`\`\`

Original text:
"""
${text}
"""`;

  return prompt;
}

/**
 * Build retry prompt for different rewrite variation
 */
export function buildToneRetryPrompt(
  request: ToneRewriteRequest,
  previousResult: string,
): string {
  const { text, targetTone, instructions } = request;

  let prompt = `Rewrite this text to sound ${targetTone}.

${TONE_REWRITE_INSTRUCTIONS[targetTone]}

IMPORTANT: Provide a DIFFERENT rewrite than this previous attempt:
"""
${previousResult}
"""`;

  if (instructions) {
    prompt += `\n\nAdditional instructions: ${instructions}`;
  }

  prompt += `

Return format:
\`\`\`toon
rewrite{tone,output,notes?}:
  ${targetTone},<rewritten text here>,"brief notes on changes made"
\`\`\`

Original text:
"""
${text}
"""`;

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

/**
 * Check if text is primarily URLs, code, or quoted content
 */
export function isNonRewritableContent(text: string): boolean {
  const trimmed = text.trim();

  // Check if mostly URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = trimmed.match(urlPattern) || [];
  const urlLength = urls.join('').length;
  if (urlLength / trimmed.length > 0.7) {
    return true;
  }

  // Check if mostly code blocks
  const codeBlockPattern = /```[\s\S]*?```/g;
  const codeBlocks = trimmed.match(codeBlockPattern) || [];
  const codeLength = codeBlocks.join('').length;
  if (codeLength / trimmed.length > 0.7) {
    return true;
  }

  return false;
}
