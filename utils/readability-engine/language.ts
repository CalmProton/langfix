/**
 * Language Detection
 * Simple heuristic-based language detection for English
 *
 * For now, we only support English. Non-English text is marked as "unknown"
 * and scoring is skipped.
 */

// ============================================================================
// Common English Words
// ============================================================================

/**
 * Top 100 most common English words
 * Used as fingerprint for language detection
 */
const COMMON_ENGLISH_WORDS = new Set([
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'time',
  'no',
  'just',
  'him',
  'know',
  'take',
  'people',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
]);

// ============================================================================
// Detection Logic
// ============================================================================

/**
 * Extract words from text (simple tokenization)
 */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-—–,;:!?.()[\]{}'"]+/)
    .filter((w) => w.length > 0 && /^[a-z]+$/.test(w));
}

/**
 * Calculate the ratio of common English words in the text
 *
 * @param text - Text to analyze
 * @returns Ratio of common English words (0-1)
 */
export function getEnglishWordRatio(text: string): number {
  const words = extractWords(text);

  if (words.length === 0) {
    return 0;
  }

  const englishCount = words.filter((w) => COMMON_ENGLISH_WORDS.has(w)).length;
  return englishCount / words.length;
}

/**
 * Detect if text is English
 *
 * Uses a simple heuristic: if >15% of words are in the common English list,
 * consider it English. This threshold is low because specialized text
 * (technical, academic) may have fewer common words.
 *
 * @param text - Text to analyze
 * @param threshold - Minimum ratio of common words (default: 0.15)
 * @returns True if text appears to be English
 */
export function isEnglish(text: string, threshold = 0.15): boolean {
  // Require minimum text length for reliable detection
  if (text.trim().length < 20) {
    // Short text - check if it contains mostly ASCII letters
    const asciiRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    return asciiRatio > 0.5;
  }

  const ratio = getEnglishWordRatio(text);
  return ratio >= threshold;
}

/**
 * Detect language with confidence
 *
 * @param text - Text to analyze
 * @returns Language code or 'unknown'
 */
export function detectLanguage(text: string): 'en' | 'unknown' {
  if (isEnglish(text)) {
    return 'en';
  }
  return 'unknown';
}

/**
 * Check if text contains non-Latin characters
 * Useful for quick rejection of obviously non-English text
 *
 * @param text - Text to check
 * @returns True if text contains significant non-Latin characters
 */
export function hasNonLatinCharacters(text: string): boolean {
  // Count characters with code points > 127 (outside basic ASCII)
  let nonLatinCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      nonLatinCount++;
    }
  }
  const ratio = nonLatinCount / text.length;

  // More than 20% non-Latin suggests non-English
  return ratio > 0.2;
}
