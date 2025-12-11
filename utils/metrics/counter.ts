/**
 * Metrics Counter
 * Core counting logic for text statistics
 */
import type { TextMetrics } from './types';
import { EMPTY_TEXT_METRICS } from './types';

// Regex patterns (pre-compiled for performance)
const WORD_REGEX = /\S+/g;
const SENTENCE_REGEX = /[.!?]+(\s|$)/g;
const WHITESPACE_REGEX = /\s/g;
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n+/;

/**
 * MetricsCounter class
 * Provides methods to count words, characters, sentences, and paragraphs
 */
export class MetricsCounter {
  /**
   * Calculate all text metrics for a given string
   *
   * @param text - The text to analyze
   * @returns TextMetrics object with all counts
   */
  public calculate(text: string): TextMetrics {
    // Handle empty or whitespace-only text
    if (!text || !text.trim()) {
      return EMPTY_TEXT_METRICS;
    }

    const words = this.countWords(text);
    const charactersWithSpaces = text.length;
    const charactersWithoutSpaces = text.replace(WHITESPACE_REGEX, '').length;
    const sentences = this.countSentences(text);
    const paragraphs = this.countParagraphs(text);

    // Calculate averages (avoid division by zero)
    const averageWordLength = words > 0 ? charactersWithoutSpaces / words : 0;
    const averageSentenceLength = sentences > 0 ? words / sentences : 0;

    return {
      words,
      charactersWithSpaces,
      charactersWithoutSpaces,
      sentences,
      paragraphs,
      averageWordLength: Math.round(averageWordLength * 10) / 10,
      averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    };
  }

  /**
   * Count words in text
   * Words are defined as sequences of non-whitespace characters
   *
   * @param text - The text to count words in
   * @returns Number of words
   */
  public countWords(text: string): number {
    const matches = text.match(WORD_REGEX);
    return matches ? matches.length : 0;
  }

  /**
   * Count sentences in text
   * Sentences are defined by `.`, `!`, or `?` followed by whitespace or end
   *
   * @param text - The text to count sentences in
   * @returns Number of sentences
   */
  public countSentences(text: string): number {
    // If there's text but no sentence endings, count as 1 sentence
    const trimmed = text.trim();
    if (!trimmed) return 0;

    const matches = trimmed.match(SENTENCE_REGEX);
    const count = matches ? matches.length : 0;

    // If there's text but no sentence endings, count as at least 1
    if (count === 0 && trimmed.length > 0) {
      return 1;
    }

    return count;
  }

  /**
   * Count paragraphs in text
   * Paragraphs are separated by double line breaks
   *
   * @param text - The text to count paragraphs in
   * @returns Number of paragraphs
   */
  public countParagraphs(text: string): number {
    const paragraphs = text
      .split(PARAGRAPH_SPLIT_REGEX)
      .filter((para) => para.trim().length > 0);

    return Math.max(paragraphs.length, text.trim() ? 1 : 0);
  }
}

// Singleton instance for convenience
let counterInstance: MetricsCounter | null = null;

/**
 * Get the singleton MetricsCounter instance
 */
export function getMetricsCounter(): MetricsCounter {
  if (!counterInstance) {
    counterInstance = new MetricsCounter();
  }
  return counterInstance;
}

/**
 * Convenience function to calculate metrics without creating an instance
 *
 * @param text - The text to analyze
 * @returns TextMetrics object
 */
export function calculateTextMetrics(text: string): TextMetrics {
  return getMetricsCounter().calculate(text);
}

/**
 * Convenience function to count words
 *
 * @param text - The text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  return getMetricsCounter().countWords(text);
}

/**
 * Convenience function to count sentences
 *
 * @param text - The text to count sentences in
 * @returns Number of sentences
 */
export function countSentences(text: string): number {
  return getMetricsCounter().countSentences(text);
}

/**
 * Convenience function to count paragraphs
 *
 * @param text - The text to count paragraphs in
 * @returns Number of paragraphs
 */
export function countParagraphs(text: string): number {
  return getMetricsCounter().countParagraphs(text);
}
