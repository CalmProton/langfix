/**
 * Error Explanation Prompts
 * TOON prompts for generating error explanations and corrections
 */
import type { ExtendedGrammarError } from '#utils/grammar-engine/types';
import type { SuggestionError } from '#utils/suggestion-ui/types';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * System prompt for quick explanations (fast model)
 * Used for common errors - spelling, simple grammar
 */
export const QUICK_EXPLANATION_SYSTEM_PROMPT = `You are a helpful writing assistant that explains grammar and style errors concisely.

Your task is to provide a brief explanation of why text was flagged and suggest corrections.

Rules:
- Provide a brief summary (1 sentence max)
- Identify the error category
- Give a clear reason for the error
- Suggest 1-3 corrections with confidence scores (0-1)
- Use simple, encouraging language

Respond with exactly one fenced TOON block. Do not add prose before or after.

TOON schema:
\`\`\`toon
explanation{summary,category,severity,reason,corrections[N]{text,description,confidence,type}}:
  Brief summary here,spelling,warning,Reason for the error
  :
    corrected text,Why this correction,0.95,replacement
    alternate fix,Alternative approach,0.75,replacement
\`\`\`

Categories: spelling, grammar, punctuation, style, clarity, conciseness, tone, word_choice
Severity: critical (must fix), warning (should fix), suggestion (optional)
Type: replacement, insertion, deletion, rephrase

If you cannot provide an explanation, return:
\`\`\`toon
error{code,message}:
  unprocessable,Unable to explain this error
\`\`\``;

/**
 * System prompt for detailed explanations (main model)
 * Used for complex style issues, context-dependent errors
 */
export const DETAILED_EXPLANATION_SYSTEM_PROMPT = `You are an expert writing tutor that provides detailed, educational explanations of grammar and style issues.

Your task is to explain errors thoroughly so users can learn and improve their writing.

Rules:
- Provide a clear summary
- Explain the underlying rule or principle
- Include 2-3 examples (incorrect vs correct)
- Reference style guides when relevant (AP, Chicago, etc.)
- Suggest multiple correction approaches with confidence scores
- Use educational, encouraging tone

Respond with exactly one fenced TOON block. Do not add prose before or after.

TOON schema:
\`\`\`toon
explanation{summary,category,severity,reason,rule,styleGuide,examples[N]{incorrect,correct,note},corrections[N]{text,description,confidence,type,preservesIntent,formalityChange}}:
  Brief summary,grammar,warning,Why this is an error,Underlying grammar rule,AP Style
  :
    Incorrect example,Correct version,Optional note
    Another wrong way,The right way,
  :
    corrected text,Why this fix,0.9,replacement,true,neutral
    alternative,Different approach,0.7,rephrase,true,more_formal
\`\`\`

Categories: spelling, grammar, punctuation, style, clarity, conciseness, tone, word_choice
Severity: critical, warning, suggestion
Type: replacement, insertion, deletion, rephrase
FormalityChange: more_formal, less_formal, neutral

If you cannot provide an explanation, return:
\`\`\`toon
error{code,message}:
  unprocessable,Unable to explain this error
\`\`\``;

// ============================================================================
// User Prompt Builders
// ============================================================================

/**
 * Build context description for prompts
 */
function buildContextSection(
  sentence: string,
  textBefore?: string,
  textAfter?: string,
): string {
  let context = `Sentence: "${sentence}"`;
  if (textBefore) {
    context += `\nText before: "${textBefore}"`;
  }
  if (textAfter) {
    context += `\nText after: "${textAfter}"`;
  }
  return context;
}

/**
 * Build prompt for quick explanation
 */
export function buildQuickExplanationPrompt(
  error: ExtendedGrammarError | SuggestionError,
  context: {
    sentence: string;
    textBefore?: string;
    textAfter?: string;
  },
): string {
  const contextSection = buildContextSection(
    context.sentence,
    context.textBefore,
    context.textAfter,
  );

  return `Explain this writing error and suggest corrections.

ERROR:
- Type: ${error.type}
- Original text: "${error.original}"
- Current suggestion: "${error.suggestion}"
- Operation: ${error.op}
- Severity: ${error.severity}
${error.explanation ? `- Initial explanation: "${error.explanation}"` : ''}

CONTEXT:
${contextSection}

Provide a brief explanation with 1-3 correction options. Respond with only a TOON block.`;
}

/**
 * Build prompt for detailed explanation
 */
export function buildDetailedExplanationPrompt(
  error: ExtendedGrammarError | SuggestionError,
  context: {
    sentence: string;
    textBefore?: string;
    textAfter?: string;
  },
): string {
  const contextSection = buildContextSection(
    context.sentence,
    context.textBefore,
    context.textAfter,
  );

  const alternatives =
    error.alternatives && error.alternatives.length > 0
      ? `- Alternatives: ${error.alternatives.join(', ')}`
      : '';

  return `Provide a detailed, educational explanation of this writing error.

ERROR:
- Type: ${error.type}
- Original text: "${error.original}"
- Suggested correction: "${error.suggestion}"
- Operation: ${error.op}
- Severity: ${error.severity}
${error.explanation ? `- Initial explanation: "${error.explanation}"` : ''}
${alternatives}

CONTEXT:
${contextSection}

Requirements:
1. Explain WHY this is considered an error
2. Reference the underlying grammar/style rule
3. Provide 2-3 examples showing incorrect vs correct usage
4. Suggest multiple correction options with confidence scores
5. Note which style guide applies (if relevant)

Respond with only a TOON block containing the full explanation.`;
}

/**
 * Build prompt for generating additional corrections
 */
export function buildCorrectionsPrompt(
  error: ExtendedGrammarError | SuggestionError,
  context: {
    sentence: string;
    textBefore?: string;
    textAfter?: string;
  },
  existingCorrections: string[],
): string {
  const contextSection = buildContextSection(
    context.sentence,
    context.textBefore,
    context.textAfter,
  );

  return `Suggest additional corrections for this writing issue.

ERROR:
- Original text: "${error.original}"
- Type: ${error.type}

CONTEXT:
${contextSection}

EXISTING CORRECTIONS (don't repeat these):
${existingCorrections.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

Suggest 2-3 additional corrections that are different from the existing ones.
Consider:
- Different phrasings that preserve meaning
- Varying levels of formality
- Alternative word choices

Respond with a TOON block:
\`\`\`toon
corrections[N]{text,description,confidence,type,preservesIntent}:
  new correction,Why this works,0.7,replacement,true
\`\`\``;
}

// ============================================================================
// Category Mapping
// ============================================================================

/**
 * Map grammar engine error types to explanation categories
 */
export function mapErrorTypeToCategory(
  errorType: string,
):
  | 'spelling'
  | 'grammar'
  | 'punctuation'
  | 'style'
  | 'clarity'
  | 'word_choice' {
  switch (errorType) {
    case 'spelling':
      return 'spelling';
    case 'grammar':
      return 'grammar';
    case 'punctuation':
      return 'punctuation';
    case 'contextual':
      return 'word_choice';
    case 'style':
      return 'style';
    case 'clarity':
      return 'clarity';
    default:
      return 'grammar';
  }
}

/**
 * Map grammar engine severity to explanation severity
 */
export function mapSeverityToExplanationSeverity(
  severity: string,
): 'critical' | 'warning' | 'suggestion' {
  switch (severity) {
    case 'error':
      return 'critical';
    case 'warning':
      return 'warning';
    case 'info':
      return 'suggestion';
    default:
      return 'warning';
  }
}

/**
 * Determine if error is simple enough for quick explanation (fast model)
 */
export function isSimpleError(
  error: ExtendedGrammarError | SuggestionError,
): boolean {
  // Simple errors: spelling, punctuation, basic grammar
  const simpleTypes = ['spelling', 'punctuation'];
  if (simpleTypes.includes(error.type)) {
    return true;
  }

  // Short original text is usually simple
  if (error.original.length <= 20) {
    return true;
  }

  // Replace operations with single-word suggestions are usually simple
  if (
    error.op === 'replace' &&
    !error.suggestion.includes(' ') &&
    error.original.split(' ').length <= 2
  ) {
    return true;
  }

  return false;
}
