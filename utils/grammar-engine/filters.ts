/**
 * Grammar Engine Filters
 * Dictionary and session-based error filtering
 *
 * Note: This module provides basic filters that are used by the grammar engine.
 * For more advanced filtering with custom rules and context support,
 * use the dictionary module: @/utils/dictionary
 */
import {
  applyAllFilters,
  invalidateDictionaryCache,
} from '../dictionary/filter';
import { dictionaryStorage, sessionIgnoredWordsStorage } from '../storage';
import type { ExtendedGrammarError } from './types';

// Re-export for external use
export { invalidateDictionaryCache };

// ============================================================================
// Dictionary Filter
// ============================================================================

/**
 * Filter out errors where the word is in the personal dictionary
 */
export async function filterByDictionary(
  errors: ExtendedGrammarError[],
): Promise<ExtendedGrammarError[]> {
  const dictionary = await dictionaryStorage.getValue();
  const dictWords = new Set(dictionary.map((d) => d.word.toLowerCase()));

  if (dictWords.size === 0) {
    return errors;
  }

  return errors.filter((error) => {
    // Only filter spelling errors
    if (error.type === 'spelling') {
      const original = error.original.toLowerCase().trim();
      return !dictWords.has(original);
    }
    return true;
  });
}

// ============================================================================
// Session Ignore Filter
// ============================================================================

/**
 * Filter out errors where the word is ignored for this session
 */
export async function filterBySessionIgnore(
  errors: ExtendedGrammarError[],
): Promise<ExtendedGrammarError[]> {
  const ignoredWords = await sessionIgnoredWordsStorage.getValue();

  if (ignoredWords.length === 0) {
    return errors;
  }

  const ignoredSet = new Set(ignoredWords.map((w) => w.toLowerCase()));

  return errors.filter((error) => {
    // Filter spelling and grammar errors with specific words
    if (error.type === 'spelling' || error.type === 'grammar') {
      const original = error.original.toLowerCase().trim();
      return !ignoredSet.has(original);
    }
    return true;
  });
}

// ============================================================================
// Combined Filter Pipeline
// ============================================================================

/**
 * Apply all filters to errors
 * Order: dictionary filter → session ignore filter → custom rules
 */
export async function applyFilters(
  errors: ExtendedGrammarError[],
  options?: { context?: string },
): Promise<ExtendedGrammarError[]> {
  // Use the advanced filter from dictionary module
  return applyAllFilters(errors, options);
}

/**
 * Apply only basic filters (dictionary + session ignore, no custom rules)
 * Use this for performance-critical paths where custom rules aren't needed
 */
export async function applyBasicFilters(
  errors: ExtendedGrammarError[],
): Promise<ExtendedGrammarError[]> {
  let filtered = errors;

  // Apply dictionary filter
  filtered = await filterByDictionary(filtered);

  // Apply session ignore filter
  filtered = await filterBySessionIgnore(filtered);

  return filtered;
}
