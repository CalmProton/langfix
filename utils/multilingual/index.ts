/**
 * Multilingual Support
 * Language detection, translation, and multilingual grammar checking
 */

// Language cache
export { LanguageCache, languageCache } from './cache';
// Language detection
export {
  type DetectLanguageOptions,
  detectLanguage,
  detectLanguageAI,
  detectLanguageClient,
} from './detector';

// Grammar prompts
export {
  buildGenericGrammarPrompt,
  GRAMMAR_FAST_PROMPTS,
  GRAMMAR_MAIN_PROMPTS,
  getGrammarFastPrompt,
  getGrammarMainPrompt,
  getGrammarPrompt,
} from './prompts';

// Translation
export {
  estimateTranslatedLength,
  needsTranslation,
  quickTranslate,
  translateText,
  translateTextWithAlternatives,
} from './translator';

// Types
export {
  DEFAULT_LANGUAGE_SETTINGS,
  type DetectionMethod,
  getLanguageInfo,
  getLanguageName,
  getTier1Languages,
  getTier2Languages,
  hasGrammarSupport,
  isLanguageSupported,
  type LanguageDetection,
  type LanguageInfo,
  type LanguageSettings,
  SUPPORTED_LANGUAGES,
  type SupportedLanguageCode,
  type Tier1LanguageCode,
  type Tier2LanguageCode,
  type TranslationFormality,
  type TranslationOptions,
  type TranslationResult,
} from './types';
