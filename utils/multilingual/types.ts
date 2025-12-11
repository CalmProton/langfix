/**
 * Multilingual Types
 * TypeBox schemas for language detection, translation, and multilingual support
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Language Codes (ISO 639-1)
// ============================================================================

/**
 * Tier 1 languages: Full grammar + translation support
 */
export const Tier1LanguageCode = Type.Union([
  Type.Literal('en'), // English
  Type.Literal('es'), // Spanish
  Type.Literal('fr'), // French
  Type.Literal('de'), // German
  Type.Literal('it'), // Italian
  Type.Literal('pt'), // Portuguese
  Type.Literal('nl'), // Dutch
  Type.Literal('ru'), // Russian
  Type.Literal('zh'), // Chinese (Simplified)
  Type.Literal('ja'), // Japanese
  Type.Literal('ko'), // Korean
]);
export type Tier1LanguageCode = Static<typeof Tier1LanguageCode>;

/**
 * Tier 2 languages: Translation only, basic grammar
 */
export const Tier2LanguageCode = Type.Union([
  Type.Literal('ar'), // Arabic
  Type.Literal('pl'), // Polish
  Type.Literal('tr'), // Turkish
  Type.Literal('hi'), // Hindi
  Type.Literal('sv'), // Swedish
  Type.Literal('da'), // Danish
  Type.Literal('no'), // Norwegian
  Type.Literal('fi'), // Finnish
  Type.Literal('cs'), // Czech
  Type.Literal('el'), // Greek
  Type.Literal('he'), // Hebrew
  Type.Literal('th'), // Thai
  Type.Literal('vi'), // Vietnamese
  Type.Literal('uk'), // Ukrainian
]);
export type Tier2LanguageCode = Static<typeof Tier2LanguageCode>;

export const SupportedLanguageCode = Type.Union([
  Tier1LanguageCode,
  Tier2LanguageCode,
]);
export type SupportedLanguageCode = Static<typeof SupportedLanguageCode>;

// ============================================================================
// Language Detection Types
// ============================================================================

export const DetectionMethod = Type.Union([
  Type.Literal('client'),
  Type.Literal('ai'),
  Type.Literal('user-override'),
]);
export type DetectionMethod = Static<typeof DetectionMethod>;

export const LanguageDetection = Type.Object({
  language: Type.String(),
  confidence: Type.Number(), // 0 to 1
  method: DetectionMethod,
  alternativeLanguages: Type.Optional(
    Type.Array(
      Type.Object({
        language: Type.String(),
        confidence: Type.Number(),
      }),
    ),
  ),
});
export type LanguageDetection = Static<typeof LanguageDetection>;

// ============================================================================
// Translation Types
// ============================================================================

export const TranslationFormality = Type.Union([
  Type.Literal('formal'),
  Type.Literal('informal'),
  Type.Literal('neutral'),
]);
export type TranslationFormality = Static<typeof TranslationFormality>;

export const TranslationOptions = Type.Object({
  sourceLanguage: Type.Optional(Type.String()), // Auto-detect if not provided
  targetLanguage: Type.String(),
  formality: Type.Optional(TranslationFormality),
  preserveFormatting: Type.Optional(Type.Boolean()),
  glossary: Type.Optional(Type.Record(Type.String(), Type.String())), // Custom term translations
  context: Type.Optional(Type.String()), // Additional context for better translation
});
export type TranslationOptions = Static<typeof TranslationOptions>;

export const TranslationResult = Type.Object({
  translatedText: Type.String(),
  sourceLanguage: Type.String(),
  targetLanguage: Type.String(),
  confidence: Type.Number(),
  alternatives: Type.Optional(Type.Array(Type.String())), // Alternative translations
  formality: Type.Optional(TranslationFormality),
});
export type TranslationResult = Static<typeof TranslationResult>;

// ============================================================================
// Language Settings Types
// ============================================================================

export const LanguageSettings = Type.Object({
  defaultLanguage: Type.String(), // User's primary language
  autoDetect: Type.Boolean(), // Enable auto-detection
  preferredTargetLanguage: Type.String(), // Default translation target
  perSiteOverrides: Type.Record(Type.String(), Type.String()), // domain -> language
  enabledLanguages: Type.Array(Type.String()), // Languages to check
  translationGlossary: Type.Record(Type.String(), Type.String()), // Custom term translations
});
export type LanguageSettings = Static<typeof LanguageSettings>;

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  defaultLanguage: 'en',
  autoDetect: true,
  preferredTargetLanguage: 'en',
  perSiteOverrides: {},
  enabledLanguages: ['en'],
  translationGlossary: {},
};

// ============================================================================
// Language Metadata
// ============================================================================

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  tier: 1 | 2;
  rtl: boolean; // Right-to-left
  grammarSupport: boolean;
  translationSupport: boolean;
  styleAnalysisSupport: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  // Tier 1 Languages
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: true,
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    tier: 1,
    rtl: false,
    grammarSupport: true,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  // Tier 2 Languages
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    tier: 2,
    rtl: true,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'no',
    name: 'Norwegian',
    nativeName: 'Norsk',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'fi',
    name: 'Finnish',
    nativeName: 'Suomi',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Čeština',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'el',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    tier: 2,
    rtl: true,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    tier: 2,
    rtl: false,
    grammarSupport: false,
    translationSupport: true,
    styleAnalysisSupport: false,
  },
];

/**
 * Get language info by code
 */
export function getLanguageInfo(code: string): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string {
  const info = getLanguageInfo(code);
  return info?.name ?? code.toUpperCase();
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Check if a language has grammar support
 */
export function hasGrammarSupport(code: string): boolean {
  const info = getLanguageInfo(code);
  return info?.grammarSupport ?? false;
}

/**
 * Get all Tier 1 languages
 */
export function getTier1Languages(): LanguageInfo[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.tier === 1);
}

/**
 * Get all Tier 2 languages
 */
export function getTier2Languages(): LanguageInfo[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.tier === 2);
}
