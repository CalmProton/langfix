/**
 * Translation Service
 * AI-powered translation with formality and context support
 */
import type { AIProvider } from '../types';
import { detectLanguage } from './detector';
import {
  getLanguageName,
  type TranslationFormality,
  type TranslationOptions,
  type TranslationResult,
} from './types';

// ============================================================================
// Translation Prompts
// ============================================================================

/**
 * Build translation system prompt
 */
function buildTranslationSystemPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  options?: {
    formality?: TranslationFormality;
    context?: string;
    glossary?: Record<string, string>;
  },
): string {
  const sourceName = getLanguageName(sourceLanguage);
  const targetName = getLanguageName(targetLanguage);

  let prompt = `You are a professional translator. Translate text from ${sourceName} to ${targetName}.

CRITICAL RULES:
1. Return ONLY the translated text
2. Do not include the original text
3. Do not add explanations, notes, or commentary
4. Preserve the original formatting (line breaks, paragraphs, lists)
5. Do not add quotation marks around the translation
6. If the text is already in the target language, return it unchanged`;

  if (options?.formality) {
    const formalityInstructions = {
      formal:
        'Use formal language, proper titles, and polite forms. Suitable for business or official communication.',
      informal:
        'Use casual, conversational language. Suitable for friends and peers.',
      neutral: 'Use neutral, standard language that is neither too formal nor too casual.',
    };
    prompt += `\n\nFORMALITY: ${formalityInstructions[options.formality]}`;
  }

  if (options?.context) {
    prompt += `\n\nCONTEXT: ${options.context}`;
  }

  if (options?.glossary && Object.keys(options.glossary).length > 0) {
    const glossaryEntries = Object.entries(options.glossary)
      .map(([term, translation]) => `  "${term}" → "${translation}"`)
      .join('\n');
    prompt += `\n\nGLOSSARY (use these specific translations):\n${glossaryEntries}`;
  }

  return prompt;
}

/**
 * Build translation user prompt
 */
function buildTranslationUserPrompt(text: string): string {
  return `Translate the following text:\n\n${text}`;
}

// ============================================================================
// Translation Functions
// ============================================================================

/**
 * Translate text using AI
 */
export async function translateText(
  text: string,
  options: TranslationOptions,
  provider: AIProvider,
): Promise<TranslationResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      translatedText: '',
      sourceLanguage: options.sourceLanguage || 'en',
      targetLanguage: options.targetLanguage,
      confidence: 1.0,
    };
  }

  // Detect source language if not provided
  let sourceLanguage = options.sourceLanguage;
  if (!sourceLanguage) {
    const detection = await detectLanguage(trimmed, { provider });
    sourceLanguage = detection.language;
  }

  // If source and target are the same, return original
  if (sourceLanguage === options.targetLanguage) {
    return {
      translatedText: trimmed,
      sourceLanguage,
      targetLanguage: options.targetLanguage,
      confidence: 1.0,
    };
  }

  // Build prompts
  const systemPrompt = buildTranslationSystemPrompt(
    sourceLanguage,
    options.targetLanguage,
    {
      formality: options.formality,
      context: options.context,
      glossary: options.glossary,
    },
  );

  const userPrompt = buildTranslationUserPrompt(trimmed);

  // Determine model type based on text length
  // Short texts (< 100 words) use fast model, longer texts use main model
  const wordCount = trimmed.split(/\s+/).length;
  const modelType = wordCount > 100 ? 'main' : 'fast';

  try {
    const response = await provider.sendRequest({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      modelType,
      maxTokens: Math.max(trimmed.length * 3, 1024), // Allow for expansion
      temperature: 0.3,
    });

    const translatedText = response.content.trim();

    return {
      translatedText,
      sourceLanguage,
      targetLanguage: options.targetLanguage,
      confidence: 0.9,
      formality: options.formality,
    };
  } catch (error) {
    console.error('[LangFix] Translation failed:', error);
    throw error;
  }
}

/**
 * Translate text with alternatives
 * Returns multiple translation options
 */
export async function translateTextWithAlternatives(
  text: string,
  options: TranslationOptions,
  provider: AIProvider,
  alternativeCount = 3,
): Promise<TranslationResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      translatedText: '',
      sourceLanguage: options.sourceLanguage || 'en',
      targetLanguage: options.targetLanguage,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // Detect source language if not provided
  let sourceLanguage = options.sourceLanguage;
  if (!sourceLanguage) {
    const detection = await detectLanguage(trimmed, { provider });
    sourceLanguage = detection.language;
  }

  const sourceName = getLanguageName(sourceLanguage);
  const targetName = getLanguageName(options.targetLanguage);

  const systemPrompt = `You are a professional translator. Translate text from ${sourceName} to ${targetName}.

Provide exactly ${alternativeCount} different translations, each on a new line, numbered 1-${alternativeCount}.
Each translation should have a slightly different style or phrasing while maintaining the same meaning.

Format:
1. [first translation]
2. [second translation]
3. [third translation]

Do not include the original text or any explanations.`;

  const wordCount = trimmed.split(/\s+/).length;
  const modelType = wordCount > 50 ? 'main' : 'fast';

  try {
    const response = await provider.sendRequest({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Translate:\n\n${trimmed}` },
      ],
      modelType,
      maxTokens: Math.max(trimmed.length * 3 * alternativeCount, 2048),
      temperature: 0.6, // Higher temperature for variety
    });

    // Parse numbered alternatives
    const lines = response.content.trim().split('\n');
    const alternatives: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        alternatives.push(match[1].trim());
      }
    }

    // If parsing failed, use full response as primary translation
    if (alternatives.length === 0) {
      alternatives.push(response.content.trim());
    }

    return {
      translatedText: alternatives[0],
      sourceLanguage,
      targetLanguage: options.targetLanguage,
      confidence: 0.85,
      alternatives: alternatives.slice(1),
      formality: options.formality,
    };
  } catch (error) {
    console.error('[LangFix] Translation with alternatives failed:', error);
    throw error;
  }
}

/**
 * Quick translation for short phrases
 * Uses the fast model with minimal prompting
 */
export async function quickTranslate(
  text: string,
  targetLanguage: string,
  provider: AIProvider,
): Promise<string> {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length > 200) {
    throw new Error('Quick translate is only for short text (< 200 chars)');
  }

  const targetName = getLanguageName(targetLanguage);

  try {
    const response = await provider.sendRequest({
      messages: [
        {
          role: 'system',
          content: `Translate the following text to ${targetName}. Return ONLY the translation, nothing else.`,
        },
        { role: 'user', content: trimmed },
      ],
      modelType: 'fast',
      maxTokens: 256,
      temperature: 0.2,
    });

    return response.content.trim();
  } catch (error) {
    console.error('[LangFix] Quick translation failed:', error);
    throw error;
  }
}

// ============================================================================
// Translation Utilities
// ============================================================================

/**
 * Estimate translation word count
 * Some languages expand or contract during translation
 */
export function estimateTranslatedLength(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): number {
  const baseLength = text.length;

  // Expansion/contraction ratios (approximate)
  const ratios: Record<string, number> = {
    'en-de': 1.2, // English to German often expands
    'en-fr': 1.1,
    'en-es': 1.1,
    'en-zh': 0.8, // Chinese is more compact
    'en-ja': 0.9,
    'en-ko': 0.9,
    'de-en': 0.85,
    'fr-en': 0.9,
    'es-en': 0.9,
    'zh-en': 1.3,
    'ja-en': 1.2,
    'ko-en': 1.2,
  };

  const key = `${sourceLanguage}-${targetLanguage}`;
  const ratio = ratios[key] ?? 1.0;

  return Math.ceil(baseLength * ratio);
}

/**
 * Check if translation is likely needed
 * (text is not already in target language)
 */
export async function needsTranslation(
  text: string,
  targetLanguage: string,
  provider?: AIProvider,
): Promise<boolean> {
  const detection = await detectLanguage(text, { provider });
  return detection.language !== targetLanguage;
}
