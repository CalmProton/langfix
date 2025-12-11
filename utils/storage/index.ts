/**
 * Storage Layer
 * WXT storage definitions for settings, dictionary, and session data
 */
import { storage } from '#imports';
import type {
  CustomGenre,
  GenreHistoryEntry,
  UserGenrePreferences,
} from '../genre-engine/types';
import { DEFAULT_GENRE_PREFERENCES } from '../genre-engine/types';
import {
  DEFAULT_LANGUAGE_SETTINGS,
  type LanguageSettings,
} from '../multilingual/types';
import type {
  CustomRule,
  DictionaryContext,
  DictionaryEntry,
  DictionaryExport,
} from '../types';
import {
  type AppearanceSettings,
  type BehaviorSettings,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_BEHAVIOR_SETTINGS,
  DEFAULT_FEATURES,
  DEFAULT_PROVIDER_SETTINGS,
  DEFAULT_STYLE_ANALYSIS_SETTINGS,
  type FeatureSettings,
  type ProviderConfig,
  type ProviderSettings,
  type StyleAnalysisSettings,
} from '../types';
import {
  DEFAULT_CONTEXTS,
  DICTIONARY_EXPORT_VERSION,
  MAX_CUSTOM_RULES,
  MAX_DICTIONARY_ENTRIES,
} from '../types/dictionary';

// ============================================================================
// Provider Settings (local storage - contains sensitive data)
// ============================================================================

/**
 * API key storage - stored locally, never synced
 */
export const apiKeyStorage = storage.defineItem<string>('local:apiKey', {
  fallback: '',
});

/**
 * Provider configuration (without API key)
 */
export const providerSettingsStorage = storage.defineItem<ProviderSettings>(
  'local:providerSettings',
  {
    fallback: DEFAULT_PROVIDER_SETTINGS,
  },
);

// ============================================================================
// Feature & Behavior Settings (sync storage)
// ============================================================================

/**
 * Feature toggles - synced across devices
 */
export const featuresStorage = storage.defineItem<FeatureSettings>(
  'sync:features',
  {
    fallback: DEFAULT_FEATURES,
  },
);

/**
 * Behavior settings - synced across devices
 */
export const behaviorStorage = storage.defineItem<BehaviorSettings>(
  'sync:behavior',
  {
    fallback: DEFAULT_BEHAVIOR_SETTINGS,
  },
);

/**
 * Appearance settings - synced across devices
 */
export const appearanceStorage = storage.defineItem<AppearanceSettings>(
  'sync:appearance',
  {
    fallback: DEFAULT_APPEARANCE_SETTINGS,
  },
);

/**
 * Style analysis settings - synced across devices
 */
export const styleAnalysisSettingsStorage =
  storage.defineItem<StyleAnalysisSettings>('sync:styleAnalysis', {
    fallback: DEFAULT_STYLE_ANALYSIS_SETTINGS,
  });

// ============================================================================
// Genre Settings (sync & local storage)
// ============================================================================

/**
 * Genre user preferences - synced across devices
 */
export const genrePreferencesStorage = storage.defineItem<UserGenrePreferences>(
  'sync:genrePreferences',
  {
    fallback: DEFAULT_GENRE_PREFERENCES,
  },
);

/**
 * Custom genres - synced across devices
 */
export const customGenresStorage = storage.defineItem<CustomGenre[]>(
  'sync:customGenres',
  {
    fallback: [],
  },
);

/**
 * Current active genre ID - stored locally for quick access
 */
export const currentGenreStorage = storage.defineItem<string>(
  'local:currentGenre',
  {
    fallback: 'auto',
  },
);

/**
 * Genre history - stored locally (per-domain genre usage)
 */
export const genreHistoryStorage = storage.defineItem<GenreHistoryEntry[]>(
  'local:genreHistory',
  {
    fallback: [],
  },
);

// ============================================================================
// Dictionary & Rules (sync storage with limits)
// ============================================================================

/**
 * Personal dictionary - synced across devices (max 500 entries)
 */
export const dictionaryStorage = storage.defineItem<DictionaryEntry[]>(
  'sync:dictionary',
  {
    fallback: [],
  },
);

/**
 * Custom rules - synced across devices (max 200 rules)
 */
export const customRulesStorage = storage.defineItem<CustomRule[]>(
  'sync:customRules',
  {
    fallback: [],
  },
);

/**
 * Dictionary contexts - user-defined context labels
 */
export const dictionaryContextsStorage = storage.defineItem<
  DictionaryContext[]
>('sync:dictionaryContexts', {
  fallback: DEFAULT_CONTEXTS,
});

// ============================================================================
// Language Settings (sync storage)
// ============================================================================

/**
 * Language settings - synced across devices
 */
export const languageSettingsStorage = storage.defineItem<LanguageSettings>(
  'sync:languageSettings',
  {
    fallback: DEFAULT_LANGUAGE_SETTINGS,
  },
);

/**
 * Per-site language overrides - stored locally for quick access
 */
export const siteLanguageOverridesStorage = storage.defineItem<
  Record<string, string>
>('local:siteLanguageOverrides', {
  fallback: {},
});

/**
 * Translation glossary - synced across devices (max 500 terms)
 */
export const translationGlossaryStorage = storage.defineItem<
  Record<string, string>
>('sync:translationGlossary', {
  fallback: {},
});

// ============================================================================
// Session Storage (cleared on browser close)
// ============================================================================

/**
 * Session-ignored words - cleared when browser closes
 */
export const sessionIgnoredWordsStorage = storage.defineItem<string[]>(
  'session:ignoredWords',
  {
    fallback: [],
  },
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get full provider configuration including API key
 */
export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const [apiKey, settings] = await Promise.all([
    apiKeyStorage.getValue(),
    providerSettingsStorage.getValue(),
  ]);

  if (!apiKey) {
    return null;
  }

  // Combine into full config
  return {
    ...settings,
    apiKey,
  } as ProviderConfig;
}

/**
 * Save provider configuration
 */
export async function saveProviderConfig(
  config: Partial<ProviderSettings> & { apiKey?: string },
): Promise<void> {
  const { apiKey, ...settings } = config;

  const promises: Promise<void>[] = [];

  if (apiKey !== undefined) {
    promises.push(apiKeyStorage.setValue(apiKey));
  }

  if (Object.keys(settings).length > 0) {
    const currentSettings = await providerSettingsStorage.getValue();
    promises.push(
      providerSettingsStorage.setValue({
        ...currentSettings,
        ...settings,
      }),
    );
  }

  await Promise.all(promises);
}

/**
 * Add word to personal dictionary
 */
export async function addToDictionary(
  word: string,
  options?: {
    caseSensitive?: boolean;
    context?: string[];
    notes?: string;
  },
): Promise<void> {
  const normalized = options?.caseSensitive
    ? word.trim()
    : word.trim().toLowerCase();
  if (!normalized) return;

  const current = await dictionaryStorage.getValue();

  // Check if already exists
  const existingIndex = current.findIndex((e: DictionaryEntry) =>
    options?.caseSensitive
      ? e.word === normalized
      : e.word.toLowerCase() === normalized.toLowerCase(),
  );

  if (existingIndex !== -1) {
    // Update existing entry's usage count
    const updated = [...current];
    updated[existingIndex] = {
      ...updated[existingIndex],
      usageCount: (updated[existingIndex].usageCount || 0) + 1,
    };
    await dictionaryStorage.setValue(updated);
    return;
  }

  // Add new entry, keeping max entries
  const newEntry: DictionaryEntry = {
    id: crypto.randomUUID(),
    word: normalized,
    caseSensitive: options?.caseSensitive ?? false,
    context: options?.context,
    addedAt: Date.now(),
    usageCount: 0,
    notes: options?.notes,
  };

  const newDictionary = [...current, newEntry].slice(-MAX_DICTIONARY_ENTRIES);
  await dictionaryStorage.setValue(newDictionary);
}

/**
 * Add word to dictionary with full entry object
 */
export async function addDictionaryEntry(
  entry: Omit<DictionaryEntry, 'id' | 'addedAt'>,
): Promise<DictionaryEntry> {
  const current = await dictionaryStorage.getValue();

  const newEntry: DictionaryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    addedAt: Date.now(),
  };

  const newDictionary = [...current, newEntry].slice(-MAX_DICTIONARY_ENTRIES);
  await dictionaryStorage.setValue(newDictionary);

  return newEntry;
}

/**
 * Update an existing dictionary entry
 */
export async function updateDictionaryEntry(
  id: string,
  updates: Partial<Omit<DictionaryEntry, 'id' | 'addedAt'>>,
): Promise<void> {
  const current = await dictionaryStorage.getValue();
  const index = current.findIndex((e) => e.id === id);

  if (index === -1) return;

  const updated = [...current];
  updated[index] = { ...updated[index], ...updates };
  await dictionaryStorage.setValue(updated);
}

/**
 * Remove word from personal dictionary by ID
 */
export async function removeDictionaryEntry(id: string): Promise<void> {
  const current = await dictionaryStorage.getValue();
  await dictionaryStorage.setValue(current.filter((e) => e.id !== id));
}

/**
 * Remove word from personal dictionary by word string (legacy support)
 */
export async function removeFromDictionary(word: string): Promise<void> {
  const normalized = word.trim().toLowerCase();
  const current = await dictionaryStorage.getValue();

  await dictionaryStorage.setValue(
    current.filter((e: DictionaryEntry) => e.word.toLowerCase() !== normalized),
  );
}

/**
 * Check if word is in personal dictionary
 */
export async function isInDictionary(
  word: string,
  context?: string,
): Promise<boolean> {
  const normalized = word.trim().toLowerCase();
  const dictionary = await dictionaryStorage.getValue();

  return dictionary.some((entry: DictionaryEntry) => {
    // Check word match
    const wordMatch = entry.caseSensitive
      ? entry.word === word.trim()
      : entry.word.toLowerCase() === normalized;

    if (!wordMatch) return false;

    // Check context if specified
    if (context && entry.context && entry.context.length > 0) {
      return entry.context.includes(context);
    }

    return true;
  });
}

/**
 * Get all dictionary entries
 */
export async function getDictionary(): Promise<DictionaryEntry[]> {
  return dictionaryStorage.getValue();
}

/**
 * Get dictionary contexts
 */
export async function getDictionaryContexts(): Promise<DictionaryContext[]> {
  return dictionaryContextsStorage.getValue();
}

/**
 * Add a new dictionary context
 */
export async function addDictionaryContext(
  context: Omit<DictionaryContext, 'id'>,
): Promise<DictionaryContext> {
  const current = await dictionaryContextsStorage.getValue();

  const newContext: DictionaryContext = {
    ...context,
    id: crypto.randomUUID(),
  };

  await dictionaryContextsStorage.setValue([...current, newContext]);
  return newContext;
}

/**
 * Remove a dictionary context
 */
export async function removeDictionaryContext(id: string): Promise<void> {
  const current = await dictionaryContextsStorage.getValue();
  await dictionaryContextsStorage.setValue(current.filter((c) => c.id !== id));
}

/**
 * Add word to session ignored list
 */
export async function ignoreWordForSession(word: string): Promise<void> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return;

  const current = await sessionIgnoredWordsStorage.getValue();

  if (!current.includes(normalized)) {
    await sessionIgnoredWordsStorage.setValue([...current, normalized]);
  }
}

/**
 * Check if word is ignored for this session
 */
export async function isIgnoredForSession(word: string): Promise<boolean> {
  const normalized = word.trim().toLowerCase();
  const ignored = await sessionIgnoredWordsStorage.getValue();
  return ignored.includes(normalized);
}

/**
 * Add custom rule
 */
export async function addCustomRule(
  rule: Omit<CustomRule, 'id' | 'createdAt'>,
): Promise<CustomRule> {
  const current = await customRulesStorage.getValue();

  const newRule: CustomRule = {
    ...rule,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  // Keep max rules
  const newRules = [...current, newRule].slice(-MAX_CUSTOM_RULES);
  await customRulesStorage.setValue(newRules);

  return newRule;
}

/**
 * Update a custom rule
 */
export async function updateCustomRule(
  id: string,
  updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>,
): Promise<void> {
  const current = await customRulesStorage.getValue();
  const index = current.findIndex((r) => r.id === id);

  if (index === -1) return;

  const updated = [...current];
  updated[index] = { ...updated[index], ...updates };
  await customRulesStorage.setValue(updated);
}

/**
 * Remove custom rule by ID
 */
export async function removeCustomRule(ruleId: string): Promise<void> {
  const current = await customRulesStorage.getValue();
  await customRulesStorage.setValue(
    current.filter((r: CustomRule) => r.id !== ruleId),
  );
}

/**
 * Toggle custom rule enabled state
 */
export async function toggleCustomRule(ruleId: string): Promise<void> {
  const current = await customRulesStorage.getValue();
  await customRulesStorage.setValue(
    current.map((r: CustomRule) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r,
    ),
  );
}

/**
 * Get all custom rules
 */
export async function getCustomRules(): Promise<CustomRule[]> {
  return customRulesStorage.getValue();
}

/**
 * Mark a custom rule as recently used
 */
export async function markRuleUsed(ruleId: string): Promise<void> {
  const current = await customRulesStorage.getValue();
  await customRulesStorage.setValue(
    current.map((r: CustomRule) =>
      r.id === ruleId ? { ...r, lastUsed: Date.now() } : r,
    ),
  );
}

/**
 * Export dictionary and rules data
 */
export async function exportDictionaryData(): Promise<DictionaryExport> {
  const [dictionary, rules, contexts] = await Promise.all([
    dictionaryStorage.getValue(),
    customRulesStorage.getValue(),
    dictionaryContextsStorage.getValue(),
  ]);

  return {
    version: DICTIONARY_EXPORT_VERSION,
    exportedAt: Date.now(),
    dictionary,
    rules,
    contexts,
  };
}

/**
 * Import dictionary and rules data
 */
export async function importDictionaryData(
  data: DictionaryExport,
  options?: {
    merge?: boolean; // If true, merge with existing data; if false, replace
  },
): Promise<{ imported: number; skipped: number }> {
  const merge = options?.merge ?? true;
  let imported = 0;
  let skipped = 0;

  if (merge) {
    // Merge with existing data
    const [currentDict, currentRules, currentContexts] = await Promise.all([
      dictionaryStorage.getValue(),
      customRulesStorage.getValue(),
      dictionaryContextsStorage.getValue(),
    ]);

    // Merge dictionary
    const existingWords = new Set(currentDict.map((e) => e.word.toLowerCase()));
    const newDictEntries = data.dictionary.filter((e) => {
      if (existingWords.has(e.word.toLowerCase())) {
        skipped++;
        return false;
      }
      imported++;
      return true;
    });
    await dictionaryStorage.setValue(
      [...currentDict, ...newDictEntries].slice(-MAX_DICTIONARY_ENTRIES),
    );

    // Merge rules
    const existingPatterns = new Set(
      currentRules.map((r) => `${r.type}:${r.pattern.toLowerCase()}`),
    );
    const newRules = data.rules.filter((r) => {
      const key = `${r.type}:${r.pattern.toLowerCase()}`;
      if (existingPatterns.has(key)) {
        skipped++;
        return false;
      }
      imported++;
      return true;
    });
    await customRulesStorage.setValue(
      [...currentRules, ...newRules].slice(-MAX_CUSTOM_RULES),
    );

    // Merge contexts
    if (data.contexts) {
      const existingContextNames = new Set(
        currentContexts.map((c) => c.name.toLowerCase()),
      );
      const newContexts = data.contexts.filter(
        (c) => !existingContextNames.has(c.name.toLowerCase()),
      );
      await dictionaryContextsStorage.setValue([
        ...currentContexts,
        ...newContexts,
      ]);
    }
  } else {
    // Replace existing data
    await Promise.all(
      [
        dictionaryStorage.setValue(
          data.dictionary.slice(-MAX_DICTIONARY_ENTRIES),
        ),
        customRulesStorage.setValue(data.rules.slice(-MAX_CUSTOM_RULES)),
        data.contexts && dictionaryContextsStorage.setValue(data.contexts),
      ].filter(Boolean) as Promise<void>[],
    );
    imported = data.dictionary.length + data.rules.length;
  }

  return { imported, skipped };
}

/**
 * Clear all storage (for testing/reset)
 */
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    apiKeyStorage.removeValue(),
    providerSettingsStorage.removeValue(),
    featuresStorage.removeValue(),
    behaviorStorage.removeValue(),
    appearanceStorage.removeValue(),
    dictionaryStorage.removeValue(),
    dictionaryContextsStorage.removeValue(),
    customRulesStorage.removeValue(),
    sessionIgnoredWordsStorage.removeValue(),
    genrePreferencesStorage.removeValue(),
    customGenresStorage.removeValue(),
    currentGenreStorage.removeValue(),
    genreHistoryStorage.removeValue(),
    languageSettingsStorage.removeValue(),
    siteLanguageOverridesStorage.removeValue(),
    translationGlossaryStorage.removeValue(),
  ]);
}

// ============================================================================
// Language Settings Helper Functions
// ============================================================================

/**
 * Get language settings
 */
export async function getLanguageSettings(): Promise<LanguageSettings> {
  return languageSettingsStorage.getValue();
}

/**
 * Save language settings
 */
export async function saveLanguageSettings(
  settings: Partial<LanguageSettings>,
): Promise<void> {
  const current = await languageSettingsStorage.getValue();
  await languageSettingsStorage.setValue({
    ...current,
    ...settings,
  });
}

/**
 * Get language override for a specific site
 */
export async function getLanguageForSite(
  domain: string,
): Promise<string | null> {
  const settings = await languageSettingsStorage.getValue();

  // Check per-site overrides first
  if (settings.perSiteOverrides[domain]) {
    return settings.perSiteOverrides[domain];
  }

  // Check local overrides (for quick access)
  const localOverrides = await siteLanguageOverridesStorage.getValue();
  return localOverrides[domain] || null;
}

/**
 * Set language override for a specific site
 */
export async function setLanguageForSite(
  domain: string,
  language: string,
): Promise<void> {
  const current = await languageSettingsStorage.getValue();
  await languageSettingsStorage.setValue({
    ...current,
    perSiteOverrides: {
      ...current.perSiteOverrides,
      [domain]: language,
    },
  });

  // Also update local storage for quick access
  const localOverrides = await siteLanguageOverridesStorage.getValue();
  await siteLanguageOverridesStorage.setValue({
    ...localOverrides,
    [domain]: language,
  });
}

/**
 * Remove language override for a specific site
 */
export async function removeLanguageForSite(domain: string): Promise<void> {
  const current = await languageSettingsStorage.getValue();
  const { [domain]: _, ...rest } = current.perSiteOverrides;
  await languageSettingsStorage.setValue({
    ...current,
    perSiteOverrides: rest,
  });

  // Also update local storage
  const localOverrides = await siteLanguageOverridesStorage.getValue();
  const { [domain]: __, ...localRest } = localOverrides;
  await siteLanguageOverridesStorage.setValue(localRest);
}

/**
 * Add term to translation glossary
 */
export async function addGlossaryTerm(
  term: string,
  translation: string,
): Promise<void> {
  const normalized = term.trim().toLowerCase();
  if (!normalized || !translation.trim()) return;

  const current = await translationGlossaryStorage.getValue();

  // Keep max 500 terms
  const entries = Object.entries(current);
  if (entries.length >= 500 && !current[normalized]) {
    // Remove oldest entry (first in object)
    const [firstKey] = entries[0];
    delete current[firstKey];
  }

  await translationGlossaryStorage.setValue({
    ...current,
    [normalized]: translation.trim(),
  });
}

/**
 * Remove term from translation glossary
 */
export async function removeGlossaryTerm(term: string): Promise<void> {
  const normalized = term.trim().toLowerCase();
  const current = await translationGlossaryStorage.getValue();
  const { [normalized]: _, ...rest } = current;
  await translationGlossaryStorage.setValue(rest);
}

/**
 * Get translation glossary
 */
export async function getTranslationGlossary(): Promise<
  Record<string, string>
> {
  return translationGlossaryStorage.getValue();
}

/**
 * Check if a language is enabled for grammar checking
 */
export async function isLanguageEnabled(language: string): Promise<boolean> {
  const settings = await languageSettingsStorage.getValue();
  return settings.enabledLanguages.includes(language);
}

/**
 * Enable a language for grammar checking
 */
export async function enableLanguage(language: string): Promise<void> {
  const current = await languageSettingsStorage.getValue();
  if (!current.enabledLanguages.includes(language)) {
    await languageSettingsStorage.setValue({
      ...current,
      enabledLanguages: [...current.enabledLanguages, language],
    });
  }
}

/**
 * Disable a language for grammar checking
 */
export async function disableLanguage(language: string): Promise<void> {
  const current = await languageSettingsStorage.getValue();
  await languageSettingsStorage.setValue({
    ...current,
    enabledLanguages: current.enabledLanguages.filter((l) => l !== language),
  });
}
