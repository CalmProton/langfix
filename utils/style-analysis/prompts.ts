/**
 * Style Analysis Prompts
 * TOON-formatted prompts for style, clarity, and conciseness analysis
 */
import type {
  IssueCategory,
  SensitivityLevel,
  StyleAnalysisRequest,
  WritingContext,
} from './types';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Build category-specific instructions
 */
function buildCategoryInstructions(categories: IssueCategory[]): string {
  const sections: string[] = [];

  if (categories.includes('style')) {
    sections.push(`**STYLE ISSUES:**
- passive-voice: Subject receives action (e.g., "was written by" → "wrote")
- weak-verb: Generic action words (e.g., "made a decision" → "decided")
- overused-word: Repetitive vocabulary (e.g., repeated "very", "really")
- cliche: Overused expressions (e.g., "at the end of the day")
- nominalization: Verb→noun conversion (e.g., "make a decision" → "decide")
- hedge-word: Weakening language (e.g., "I think maybe it might...")`);
  }

  if (categories.includes('clarity')) {
    sections.push(`**CLARITY ISSUES:**
- vague-language: Imprecise terms (e.g., "some people", "stuff")
- complex-sentence: Too many clauses, 40+ words
- ambiguous-pronoun: Unclear references (e.g., "He told him he was wrong")
- jargon: Technical/specialized terms without explanation
- double-negative: Confusing negations (e.g., "not uncommon" → "common")
- abstract-language: Conceptual vs concrete (e.g., "optimize synergies")`);
  }

  if (categories.includes('conciseness')) {
    sections.push(`**CONCISENESS ISSUES:**
- redundancy: Repetition (e.g., "absolutely essential" → "essential")
- filler-word: Padding words (e.g., "basically", "actually", "really")
- wordy-phrase: Long versions of short words (e.g., "due to the fact that" → "because")
- excessive-qualifier: Too many modifiers (e.g., "very really quite good")
- needless-adverb: Weak intensifiers (e.g., "extremely happy" → "ecstatic")`);
  }

  return sections.join('\n\n');
}

/**
 * Get sensitivity instructions
 */
function getSensitivityInstructions(sensitivity: SensitivityLevel): string {
  switch (sensitivity) {
    case 'low':
      return `Sensitivity: LOW
- Only flag the most obvious and impactful issues
- Focus on clarity-critical problems
- Skip minor style suggestions`;

    case 'high':
      return `Sensitivity: HIGH
- Flag all potential issues, including subtle ones
- Include stylistic preferences
- Provide comprehensive analysis`;

    case 'medium':
    default:
      return `Sensitivity: MEDIUM
- Flag clear issues that affect readability
- Balance between being helpful and not overwhelming
- Skip very minor issues`;
  }
}

/**
 * Get context instructions
 */
function getContextInstructions(context: WritingContext): string {
  switch (context) {
    case 'formal':
      return `Writing Context: FORMAL
- Prioritize clarity and precision
- Flag casual language and contractions
- Suggest professional alternatives`;

    case 'casual':
      return `Writing Context: CASUAL
- Allow informal expressions
- Focus on clarity over formality
- Accept conversational tone`;

    case 'technical':
      return `Writing Context: TECHNICAL
- Allow necessary jargon when appropriate
- Prioritize precision over brevity
- Flag unclear technical explanations`;

    case 'creative':
      return `Writing Context: CREATIVE
- Allow stylistic choices and artistic expression
- Focus on flow and readability
- Be lenient with unconventional structures`;

    default:
      return `Writing Context: GENERAL
- Balance formality and accessibility
- Focus on clear communication`;
  }
}

/**
 * Build the system prompt for style analysis
 */
export function buildStyleSystemPrompt(
  context: WritingContext = 'formal',
  sensitivity: SensitivityLevel = 'medium',
  categories: IssueCategory[] = ['style', 'clarity', 'conciseness'],
): string {
  return `You are an expert writing coach analyzing text for style, clarity, and conciseness issues.

${getContextInstructions(context)}

${getSensitivityInstructions(sensitivity)}

Analyze the text and identify issues in these categories:

${buildCategoryInstructions(categories)}

Respond with exactly one fenced TOON block. Do not add prose before or after.

TOON schema (half-open spans [start,end), UTF-16 indices):
\`\`\`toon
issues[N]{category,type,severity,startIndex,endIndex,originalText,message,explanation,suggestions}:
  style,passive-voice,info,0,35,The report was written by John,Consider active voice,Active voice is more direct and engaging,John wrote the report|The team authored the report
  clarity,complex-sentence,warning,40,150,very long sentence here...,This sentence is too long,Break into smaller sentences for clarity,First part. Second part.
  conciseness,wordy-phrase,info,200,225,due to the fact that,Use a simpler phrase,This phrase can be shortened,because|since
\`\`\`

Rules:
- category: style, clarity, conciseness
- type: Issue type slug (passive-voice, weak-verb, vague-language, etc.)
- severity: info (suggestion), warning (should fix)
- startIndex/endIndex: 0-based UTF-16 character indices (half-open)
- originalText: Exact text from input
- message: Brief issue description (10-15 words max)
- explanation: Why this is an issue and how to improve (1-2 sentences)
- suggestions: Pipe-separated list of alternatives (1-3 suggestions)
- No overlapping spans; spans must be sorted by startIndex
- If no issues found, return: \`\`\`toon\\nissues[0]{}\\n\`\`\`

If you cannot analyze the text, return:
\`\`\`toon
error{code,message}:
  unprocessable,Failed to analyze text
\`\`\``;
}

// ============================================================================
// User Prompts
// ============================================================================

/**
 * Build the user prompt for style analysis
 */
export function buildStyleUserPrompt(request: StyleAnalysisRequest): string {
  const {
    text,
    context = 'formal',
    sensitivity = 'medium',
    categories = ['style', 'clarity', 'conciseness'],
  } = request;

  // Build context section in TOON format
  const contextParts = [
    `context:${context}`,
    `sensitivity:${sensitivity}`,
    `categories:${categories.join('|')}`,
  ];

  return `Analyze the following text for style, clarity, and conciseness issues.

Analysis Parameters:
\`\`\`toon
params{context,sensitivity,categories}:
  ${contextParts.map((p) => p.split(':')[1]).join(',')}
\`\`\`

TEXT:
"""
${text}
"""

Response:`;
}

/**
 * Build complete prompt for style analysis
 */
export function buildStyleAnalysisPrompt(request: StyleAnalysisRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const {
    context = 'formal',
    sensitivity = 'medium',
    categories = ['style', 'clarity', 'conciseness'],
  } = request;

  return {
    systemPrompt: buildStyleSystemPrompt(context, sensitivity, categories),
    userPrompt: buildStyleUserPrompt(request),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate the complexity of text for model selection
 */
export function estimateTextComplexity(
  text: string,
): 'simple' | 'moderate' | 'complex' {
  const wordCount = countWords(text);
  const sentenceCount = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;
  const avgWordsPerSentence =
    sentenceCount > 0 ? wordCount / sentenceCount : wordCount;

  if (wordCount < 50 && avgWordsPerSentence < 15) {
    return 'simple';
  }
  if (wordCount > 200 || avgWordsPerSentence > 25) {
    return 'complex';
  }
  return 'moderate';
}
