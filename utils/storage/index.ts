/**
 * Storage Layer
 * WXT storage definitions for settings, dictionary, and session data
 */
import { storage } from 'wxt/storage';
import {
  type ProviderSettings,
  type FeatureSettings,
  type BehaviorSettings,
  type AppearanceSettings,
  type ProviderConfig,
  DEFAULT_PROVIDER_SETTINGS,
  DEFAULT_FEATURES,
  DEFAULT_BEHAVIOR_SETTINGS,
  DEFAULT_APPEARANCE_SETTINGS,
} from '../types';
import type { DictionaryEntry, CustomRule } from '../types';

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
export const featuresStorage = storage.defineItem<FeatureSettings>('sync:features', {
  fallback: DEFAULT_FEATURES,
});

/**
 * Behavior settings - synced across devices
 */
export const behaviorStorage = storage.defineItem<BehaviorSettings>('sync:behavior', {
  fallback: DEFAULT_BEHAVIOR_SETTINGS,
});

/**
 * Appearance settings - synced across devices
 */
export const appearanceStorage = storage.defineItem<AppearanceSettings>(
  'sync:appearance',
  {
    fallback: DEFAULT_APPEARANCE_SETTINGS,
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
export const customRulesStorage = storage.defineItem<CustomRule[]>('sync:customRules', {
  fallback: [],
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
export async function addToDictionary(word: string): Promise<void> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return;

  const current = await dictionaryStorage.getValue();

  // Check if already exists
  if (current.some((e: DictionaryEntry) => e.word.toLowerCase() === normalized)) {
    return;
  }

  // Add new entry, keeping max 500
  const newDictionary = [
    ...current,
    { word: normalized, addedAt: Date.now() },
  ].slice(-500);

  await dictionaryStorage.setValue(newDictionary);
}

/**
 * Remove word from personal dictionary
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
export async function isInDictionary(word: string): Promise<boolean> {
  const normalized = word.trim().toLowerCase();
  const dictionary = await dictionaryStorage.getValue();
  return dictionary.some((e: DictionaryEntry) => e.word.toLowerCase() === normalized);
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
): Promise<void> {
  const current = await customRulesStorage.getValue();

  const newRule: CustomRule = {
    ...rule,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  // Keep max 200 rules
  const newRules = [...current, newRule].slice(-200);
  await customRulesStorage.setValue(newRules);
}

/**
 * Remove custom rule by ID
 */
export async function removeCustomRule(ruleId: string): Promise<void> {
  const current = await customRulesStorage.getValue();
  await customRulesStorage.setValue(current.filter((r: CustomRule) => r.id !== ruleId));
}

/**
 * Toggle custom rule enabled state
 */
export async function toggleCustomRule(ruleId: string): Promise<void> {
  const current = await customRulesStorage.getValue();
  await customRulesStorage.setValue(
    current.map((r: CustomRule) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
  );
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
    customRulesStorage.removeValue(),
    sessionIgnoredWordsStorage.removeValue(),
  ]);
}
