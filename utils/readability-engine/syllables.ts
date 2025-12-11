/**
 * Syllable Counter
 * Estimates syllable count for English words using heuristics
 *
 * Based on the Hyphenation algorithm patterns and English phonetics rules.
 * This is an approximation that works well for most common English words.
 */

// Regex patterns for syllable counting
const VOWELS = /[aeiouy]/gi;
const SILENT_E = /[^aeiou]e$/i;
const SILENT_ED = /[^aeiou]ed$/i;
const SILENT_ES = /[^aeiou]es$/i;
const TRIPLE_VOWEL = /[aeiou]{3}/gi;
const DOUBLE_VOWEL_DIPHTHONG = /[aeiou]{2}/gi;
const LE_ENDING = /[^aeiou]le$/i;
const ING_ENDING = /ing$/i;
const TION_SION = /(?:tion|sion)$/i;

// Common exceptions that don't follow rules
const SYLLABLE_OVERRIDES: Record<string, number> = {
  area: 3,
  being: 2,
  caramel: 3,
  chocolate: 3,
  comfortable: 4,
  create: 2,
  created: 3,
  creating: 3,
  different: 3,
  every: 3,
  favorite: 3,
  interesting: 4,
  minute: 2,
  people: 2,
  poem: 2,
  poet: 2,
  poetry: 3,
  quite: 1,
  real: 1,
  realize: 3,
  really: 2,
  recipe: 3,
  science: 2,
  someone: 2,
  something: 2,
  sometimes: 2,
  sure: 1,
  there: 1,
  toward: 2,
  where: 1,
  world: 1,
};

/**
 * Count syllables in a single word
 * Uses heuristic rules to estimate syllable count
 *
 * @param word - The word to count syllables for
 * @returns Estimated number of syllables (minimum 1)
 */
export function countSyllables(word: string): number {
  // Normalize word
  const normalized = word.toLowerCase().trim();

  // Skip empty or non-words
  if (!normalized || !/[a-z]/i.test(normalized)) {
    return 0;
  }

  // Check override table first
  if (normalized in SYLLABLE_OVERRIDES) {
    return SYLLABLE_OVERRIDES[normalized];
  }

  // Extract just letters
  const letters = normalized.replace(/[^a-z]/gi, '');

  if (letters.length === 0) {
    return 0;
  }

  // Very short words
  if (letters.length <= 3) {
    return 1;
  }

  let count = 0;

  // Count vowel groups (basic approach)
  const vowelMatches = letters.match(VOWELS);
  if (vowelMatches) {
    count = vowelMatches.length;
  }

  if (count === 0) {
    return 1; // Every word has at least one syllable
  }

  // Subtract for silent endings
  if (SILENT_E.test(letters)) {
    count--;
  }

  if (SILENT_ED.test(letters)) {
    count--;
  }

  if (SILENT_ES.test(letters)) {
    count--;
  }

  // Count diphthongs (two vowels making one sound) - subtract
  const diphthongs = letters.match(DOUBLE_VOWEL_DIPHTHONG);
  if (diphthongs) {
    count -= diphthongs.length;
  }

  // Triple vowels subtract additional
  const tripleVowels = letters.match(TRIPLE_VOWEL);
  if (tripleVowels) {
    count -= tripleVowels.length;
  }

  // Add back for "-le" endings that are syllabic (e.g., "table", "bottle")
  if (LE_ENDING.test(letters)) {
    count++;
  }

  // Add for "-ing" (usually a separate syllable)
  if (ING_ENDING.test(letters)) {
    count++;
  }

  // "-tion" and "-sion" are always one syllable
  if (TION_SION.test(letters)) {
    // These are already counted as one by the vowel count
  }

  // Ensure at least 1 syllable
  return Math.max(1, count);
}

/**
 * Count total syllables in a text string
 *
 * @param text - Text to count syllables in
 * @returns Total syllable count
 */
export function countTextSyllables(text: string): number {
  const words = extractWords(text);
  return words.reduce((sum, word) => sum + countSyllables(word), 0);
}

/**
 * Extract words from text (splits on whitespace and punctuation)
 *
 * @param text - Text to extract words from
 * @returns Array of words
 */
export function extractWords(text: string): string[] {
  // Split on whitespace and common punctuation
  return text
    .split(/[\s\-—–,;:!?.()[\]{}'"]+/)
    .filter((w) => w.length > 0 && /[a-z]/i.test(w));
}

/**
 * Count words in text
 *
 * @param text - Text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  return extractWords(text).length;
}

/**
 * Count sentences in text
 * Uses a simple heuristic based on sentence-ending punctuation
 *
 * @param text - Text to count sentences in
 * @returns Number of sentences
 */
export function countSentences(text: string): number {
  // Match sentence-ending punctuation followed by space or end
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  const count = matches ? matches.length : 0;

  // Ensure at least 1 sentence for non-empty text
  if (count === 0 && text.trim().length > 0) {
    return 1;
  }

  return count;
}

/**
 * Split text into sentence boundaries
 * Returns start/end offsets for each sentence
 *
 * @param text - Text to split into sentences
 * @returns Array of sentence boundaries with start/end offsets
 */
export function splitIntoSentences(
  text: string,
): Array<{ start: number; end: number; text: string }> {
  const sentences: Array<{ start: number; end: number; text: string }> = [];

  // Regex to match sentence endings, handling abbreviations and edge cases
  // This is a simplified approach - for production, consider using a proper NLP library
  const sentenceEndRegex = /[.!?]+(?:\s+|$)/g;

  let lastEnd = 0;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
  while ((match = sentenceEndRegex.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const sentenceText = text.slice(lastEnd, end).trim();

    if (sentenceText.length > 0) {
      sentences.push({
        start: lastEnd,
        end: end,
        text: sentenceText,
      });
    }

    lastEnd = end;
  }

  // Handle remaining text without ending punctuation
  if (lastEnd < text.length) {
    const remainingText = text.slice(lastEnd).trim();
    if (remainingText.length > 0) {
      sentences.push({
        start: lastEnd,
        end: text.length,
        text: remainingText,
      });
    }
  }

  // Handle empty text or no sentences found
  if (sentences.length === 0 && text.trim().length > 0) {
    sentences.push({
      start: 0,
      end: text.length,
      text: text.trim(),
    });
  }

  return sentences;
}

/**
 * Check if a word is "complex" (3+ syllables)
 *
 * @param word - Word to check
 * @returns True if word has 3 or more syllables
 */
export function isComplexWord(word: string): boolean {
  return countSyllables(word) >= 3;
}

/**
 * Calculate complex word ratio in text
 *
 * @param text - Text to analyze
 * @returns Ratio of complex words (0-1)
 */
export function getComplexWordRatio(text: string): number {
  const words = extractWords(text);
  if (words.length === 0) return 0;

  const complexCount = words.filter(isComplexWord).length;
  return complexCount / words.length;
}

/**
 * Calculate average word length
 *
 * @param text - Text to analyze
 * @returns Average number of characters per word
 */
export function getAverageWordLength(text: string): number {
  const words = extractWords(text);
  if (words.length === 0) return 0;

  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  return totalChars / words.length;
}
