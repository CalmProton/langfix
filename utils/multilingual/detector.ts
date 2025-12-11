/**
 * Language Detection
 * Client-side and AI-based language detection for multilingual support
 * Uses franc-min for fast client-side detection
 */
import { franc } from 'franc-min';
import type { AIProvider } from '../types';
import type { LanguageDetection } from './types';

// ============================================================================
// ISO 639-3 to ISO 639-1 Mapping
// ============================================================================

/**
 * Map franc's ISO 639-3 codes to ISO 639-1 codes
 * franc-min returns ISO 639-3 (3-letter) codes
 */
const ISO_639_3_TO_1: Record<string, string> = {
  // Tier 1 languages
  eng: 'en', // English
  spa: 'es', // Spanish
  fra: 'fr', // French
  deu: 'de', // German
  ita: 'it', // Italian
  por: 'pt', // Portuguese
  nld: 'nl', // Dutch
  rus: 'ru', // Russian
  cmn: 'zh', // Chinese (Mandarin)
  zho: 'zh', // Chinese
  jpn: 'ja', // Japanese
  kor: 'ko', // Korean

  // Tier 2 languages
  ara: 'ar', // Arabic
  pol: 'pl', // Polish
  tur: 'tr', // Turkish
  hin: 'hi', // Hindi
  swe: 'sv', // Swedish
  dan: 'da', // Danish
  nor: 'no', // Norwegian
  nob: 'no', // Norwegian Bokmål
  nno: 'no', // Norwegian Nynorsk
  fin: 'fi', // Finnish
  ces: 'cs', // Czech
  ell: 'el', // Greek
  heb: 'he', // Hebrew
  tha: 'th', // Thai
  vie: 'vi', // Vietnamese
  ukr: 'uk', // Ukrainian

  // Additional common languages
  cat: 'ca', // Catalan
  ron: 'ro', // Romanian
  hun: 'hu', // Hungarian
  ind: 'id', // Indonesian
  msa: 'ms', // Malay
  tgl: 'tl', // Tagalog
  bul: 'bg', // Bulgarian
  hrv: 'hr', // Croatian
  slk: 'sk', // Slovak
  slv: 'sl', // Slovenian
  srp: 'sr', // Serbian
  lit: 'lt', // Lithuanian
  lav: 'lv', // Latvian
  est: 'et', // Estonian
  afr: 'af', // Afrikaans
  isl: 'is', // Icelandic
};

/**
 * Convert ISO 639-3 code to ISO 639-1
 */
function toISO639_1(code: string): string {
  return ISO_639_3_TO_1[code] || code.slice(0, 2);
}

// ============================================================================
// Client-side Detection using franc-min
// ============================================================================

/**
 * Fast client-side language detection using franc-min
 */
export function detectLanguageClient(text: string): LanguageDetection {
  const trimmed = text.trim();

  // Need enough text for reliable detection
  if (trimmed.length < 10) {
    return {
      language: 'en',
      confidence: 0.1,
      method: 'client',
    };
  }

  try {
    // franc returns ISO 639-3 code or 'und' for undetermined
    const detected = franc(trimmed);

    if (detected === 'und') {
      return {
        language: 'en',
        confidence: 0.2,
        method: 'client',
      };
    }

    const languageCode = toISO639_1(detected);

    // Calculate confidence based on text length
    // Longer text = higher confidence
    let confidence: number;
    if (trimmed.length < 20) {
      confidence = 0.4;
    } else if (trimmed.length < 50) {
      confidence = 0.6;
    } else if (trimmed.length < 100) {
      confidence = 0.75;
    } else if (trimmed.length < 200) {
      confidence = 0.85;
    } else {
      confidence = 0.9;
    }

    return {
      language: languageCode,
      confidence,
      method: 'client',
    };
  } catch (error) {
    console.error('[LangFix] franc detection failed:', error);
    return {
      language: 'en',
      confidence: 0.1,
      method: 'client',
    };
  }
}

// ============================================================================
// AI-based Detection
// ============================================================================

/**
 * AI-based language detection for ambiguous cases
 */
export async function detectLanguageAI(
  text: string,
  provider: AIProvider,
): Promise<LanguageDetection> {
  const sampleText = text.slice(0, 500); // Limit text for detection

  try {
    const response = await provider.sendRequest({
      messages: [
        {
          role: 'system',
          content: `You are a language detection system. Analyze the given text and return ONLY the ISO 639-1 language code (e.g., "en", "es", "fr", "de", "zh", "ja", "ko", "ru", etc.). Return nothing else but the 2-letter language code.`,
        },
        {
          role: 'user',
          content: `Detect the language of this text:\n\n"${sampleText}"`,
        },
      ],
      modelType: 'fast',
      maxTokens: 10,
      temperature: 0.1,
    });

    const detectedCode = response.content.trim().toLowerCase().slice(0, 2);

    return {
      language: detectedCode || 'en',
      confidence: 0.95,
      method: 'ai',
    };
  } catch (error) {
    console.error('[LangFix] AI language detection failed:', error);
    // Fall back to client detection
    return detectLanguageClient(text);
  }
}

// ============================================================================
// Hybrid Detection
// ============================================================================

export interface DetectLanguageOptions {
  provider?: AIProvider;
  minConfidence?: number;
  forceAI?: boolean;
  overrideLanguage?: string;
}

/**
 * Hybrid language detection strategy
 * Uses franc-min for client-side detection first, falls back to AI for ambiguous cases
 */
export async function detectLanguage(
  text: string,
  options?: DetectLanguageOptions,
): Promise<LanguageDetection> {
  // User override takes precedence
  if (options?.overrideLanguage) {
    return {
      language: options.overrideLanguage,
      confidence: 1.0,
      method: 'user-override',
    };
  }

  // Force AI detection if requested
  if (options?.forceAI && options.provider) {
    return detectLanguageAI(text, options.provider);
  }

  // Try client-side detection first (instant, no API call)
  const clientResult = detectLanguageClient(text);

  // If confident, return immediately
  const minConfidence = options?.minConfidence ?? 0.7;
  if (clientResult.confidence >= minConfidence) {
    return clientResult;
  }

  // Fall back to AI detection for ambiguous cases
  if (options?.provider) {
    try {
      const aiResult = await detectLanguageAI(text, options.provider);
      return {
        ...aiResult,
        alternativeLanguages: [
          {
            language: clientResult.language,
            confidence: clientResult.confidence,
          },
        ],
      };
    } catch {
      // If AI fails, use client result
      return clientResult;
    }
  }

  return clientResult;
}
