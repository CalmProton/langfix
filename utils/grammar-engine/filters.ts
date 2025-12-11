/**
 * Grammar Engine Filters
 * Dictionary and session-based error filtering
 */
import { dictionaryStorage, sessionIgnoredWordsStorage } from '../storage';
import type { ExtendedGrammarError } from './types';

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
 * Order: dictionary filter → session ignore filter
 */
export async function applyFilters(
  errors: ExtendedGrammarError[],
): Promise<ExtendedGrammarError[]> {
  let filtered = errors;

  // Apply dictionary filter
  filtered = await filterByDictionary(filtered);

  // Apply session ignore filter
  filtered = await filterBySessionIgnore(filtered);

  return filtered;
}
