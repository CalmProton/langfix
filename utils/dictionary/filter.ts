/**
 * Dictionary Filter
 * Filters grammar errors based on personal dictionary and custom rules
 */
import type { ExtendedGrammarError } from '../grammar-engine/types';
import {
  customRulesStorage,
  dictionaryStorage,
  markRuleUsed,
  sessionIgnoredWordsStorage,
} from '../storage';
import type { CustomRule, DictionaryEntry } from '../types';
import type {
  DictionaryCache,
  DictionaryFilterOptions,
  RuleApplicationResult,
} from './types';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Module-level cache
let cache: DictionaryCache | null = null;

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached data or refresh from storage
 */
async function getCachedData(): Promise<DictionaryCache> {
  const now = Date.now();

  if (cache && now - cache.lastUpdated < CACHE_TTL) {
    return cache;
  }

  const [dictionary, rules, sessionIgnored] = await Promise.all([
    dictionaryStorage.getValue(),
    customRulesStorage.getValue(),
    sessionIgnoredWordsStorage.getValue(),
  ]);

  cache = {
    dictionary,
    rules,
    sessionIgnored,
    lastUpdated: now,
  };

  return cache;
}

/**
 * Invalidate the cache (call when dictionary/rules change)
 */
export function invalidateDictionaryCache(): void {
  cache = null;
}

// ============================================================================
// Dictionary Filter
// ============================================================================

/**
 * Check if a word is in the personal dictionary
 */
export async function isWordInDictionary(
  word: string,
  options?: DictionaryFilterOptions,
): Promise<boolean> {
  const { dictionary } = await getCachedData();
  const normalizedWord = word.trim();

  return dictionary.some((entry) => {
    // Check word match
    const wordMatch = entry.caseSensitive
      ? entry.word === normalizedWord
      : entry.word.toLowerCase() === normalizedWord.toLowerCase();

    if (!wordMatch) return false;

    // Check context if specified
    if (options?.context && entry.context && entry.context.length > 0) {
      return entry.context.includes(options.context);
    }

    return true;
  });
}

/**
 * Check if a word is ignored for the current session
 */
export async function isWordSessionIgnored(word: string): Promise<boolean> {
  const { sessionIgnored } = await getCachedData();
  return sessionIgnored.includes(word.trim().toLowerCase());
}

/**
 * Filter errors based on personal dictionary
 */
export async function filterByDictionary(
  errors: ExtendedGrammarError[],
  options?: DictionaryFilterOptions,
): Promise<ExtendedGrammarError[]> {
  const { dictionary } = await getCachedData();

  if (dictionary.length === 0) {
    return errors;
  }

  // Build lookup set for faster matching
  const dictLookup = new Map<string, DictionaryEntry>();
  for (const entry of dictionary) {
    const key = entry.caseSensitive ? entry.word : entry.word.toLowerCase();
    dictLookup.set(key, entry);
  }

  return errors.filter((error) => {
    // Only filter spelling errors
    if (error.type !== 'spelling') return true;

    const word = error.original.trim();
    const normalizedWord = word.toLowerCase();

    // Check both case-sensitive and case-insensitive
    let entry = dictLookup.get(word) || dictLookup.get(normalizedWord);

    // Find matching entry considering context
    if (!entry) {
      entry = dictionary.find((e) => {
        const wordMatch = e.caseSensitive
          ? e.word === word
          : e.word.toLowerCase() === normalizedWord;
        return wordMatch;
      });
    }

    if (!entry) return true;

    // Check context if specified
    if (
      options?.context &&
      entry.context &&
      entry.context.length > 0 &&
      !entry.context.includes(options.context)
    ) {
      return true;
    }

    // Word is in dictionary, filter it out
    return false;
  });
}

/**
 * Filter errors based on session-ignored words
 */
export async function filterBySessionIgnore(
  errors: ExtendedGrammarError[],
): Promise<ExtendedGrammarError[]> {
  const { sessionIgnored } = await getCachedData();

  if (sessionIgnored.length === 0) {
    return errors;
  }

  const ignoredSet = new Set(sessionIgnored.map((w) => w.toLowerCase()));

  return errors.filter((error) => {
    if (error.type === 'spelling' || error.type === 'grammar') {
      return !ignoredSet.has(error.original.toLowerCase().trim());
    }
    return true;
  });
}

// ============================================================================
// Custom Rules Filter
// ============================================================================

/**
 * Check if text matches a custom rule pattern
 */
function matchesPattern(text: string, rule: CustomRule): boolean {
  try {
    if (rule.isRegex) {
      const flags = rule.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(rule.pattern, flags);
      return regex.test(text);
    }
    // Literal match
    if (rule.caseSensitive) {
      return text === rule.pattern;
    }
    return text.toLowerCase() === rule.pattern.toLowerCase();
  } catch (e) {
    // Invalid regex pattern
    console.warn(
      `[LangFix] Invalid regex pattern in rule "${rule.name || rule.id}":`,
      e,
    );
    return false;
  }
}

/**
 * Apply a single custom rule to text
 */
function applyRule(
  text: string,
  rule: CustomRule,
  options?: DictionaryFilterOptions,
): RuleApplicationResult {
  // Check if rule is enabled
  if (!rule.enabled) {
    return { matched: false };
  }

  // Check context if specified
  if (
    options?.context &&
    rule.context &&
    rule.context.length > 0 &&
    !rule.context.includes(options.context)
  ) {
    return { matched: false };
  }

  // Check if pattern matches
  if (!matchesPattern(text, rule)) {
    return { matched: false };
  }

  return {
    matched: true,
    rule,
    action: rule.type,
    replacement: rule.replacement,
    message: rule.message,
  };
}

/**
 * Apply all custom rules to errors
 */
export async function filterByCustomRules(
  errors: ExtendedGrammarError[],
  options?: DictionaryFilterOptions,
): Promise<ExtendedGrammarError[]> {
  const { rules } = await getCachedData();

  if (rules.length === 0) {
    return errors;
  }

  // Get only enabled rules
  const activeRules = rules.filter((rule) => {
    if (!rule.enabled) return false;
    if (
      options?.context &&
      rule.context &&
      rule.context.length > 0 &&
      !rule.context.includes(options.context)
    ) {
      return false;
    }
    return true;
  });

  if (activeRules.length === 0) {
    return errors;
  }

  const filteredErrors: ExtendedGrammarError[] = [];

  for (const error of errors) {
    let shouldInclude = true;
    let modifiedError = error;

    for (const rule of activeRules) {
      const result = applyRule(error.original, rule, options);

      if (result.matched) {
        // Mark rule as used (async, don't await)
        markRuleUsed(rule.id).catch(() => {});

        switch (result.action) {
          case 'ignore':
            // Don't include this error
            shouldInclude = false;
            break;

          case 'replace':
            // Modify the suggestion to use the rule's replacement
            if (result.replacement) {
              modifiedError = {
                ...error,
                suggestion: result.replacement,
                explanation:
                  result.message ||
                  `Custom rule: Replace with "${result.replacement}"`,
              };
            }
            break;

          case 'prefer':
            // Add the preferred option as the primary suggestion
            if (result.replacement) {
              modifiedError = {
                ...error,
                suggestion: result.replacement,
                alternatives: [error.suggestion, ...(error.alternatives || [])],
                explanation:
                  result.message || `Preferred: "${result.replacement}"`,
              };
            }
            break;
        }

        // Stop processing rules for this error after first match
        break;
      }
    }

    if (shouldInclude) {
      filteredErrors.push(modifiedError);
    }
  }

  return filteredErrors;
}

// ============================================================================
// Combined Filter Pipeline
// ============================================================================

/**
 * Apply all dictionary and rule filters to errors
 */
export async function applyAllFilters(
  errors: ExtendedGrammarError[],
  options?: DictionaryFilterOptions,
): Promise<ExtendedGrammarError[]> {
  let filtered = errors;

  // Apply dictionary filter
  filtered = await filterByDictionary(filtered, options);

  // Apply session ignore filter
  filtered = await filterBySessionIgnore(filtered);

  // Apply custom rules
  filtered = await filterByCustomRules(filtered, options);

  return filtered;
}

/**
 * Create a filter function with cached data for performance
 */
export async function createFilterPipeline(
  options?: DictionaryFilterOptions,
): Promise<
  (errors: ExtendedGrammarError[]) => Promise<ExtendedGrammarError[]>
> {
  // Pre-load cache
  await getCachedData();

  return async (errors: ExtendedGrammarError[]) => {
    return applyAllFilters(errors, options);
  };
}
