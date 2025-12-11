/**
 * Language Detection Cache
 * Caches language detection results per element to avoid repeated calls
 */

interface CachedLanguage {
  elementId: string;
  language: string;
  confidence: number;
  detectedAt: number;
  textHash: number;
}

/**
 * Simple hash function for text comparison
 */
function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(text.length, 200); i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Cache for language detection results
 */
export class LanguageCache {
  private cache = new Map<string, CachedLanguage>();
  private defaultTTL: number;

  constructor(ttlMs = 300000) {
    // 5 minutes default
    this.defaultTTL = ttlMs;
  }

  /**
   * Get cached language for an element
   */
  get(elementId: string, currentText?: string): string | null {
    const cached = this.cache.get(elementId);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.detectedAt > this.defaultTTL) {
      this.cache.delete(elementId);
      return null;
    }

    // Check if text has changed significantly
    if (currentText) {
      const currentHash = hashText(currentText);
      if (currentHash !== cached.textHash) {
        this.cache.delete(elementId);
        return null;
      }
    }

    return cached.language;
  }

  /**
   * Get cached detection with confidence
   */
  getWithConfidence(
    elementId: string,
    currentText?: string,
  ): { language: string; confidence: number } | null {
    const cached = this.cache.get(elementId);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.detectedAt > this.defaultTTL) {
      this.cache.delete(elementId);
      return null;
    }

    // Check if text has changed
    if (currentText) {
      const currentHash = hashText(currentText);
      if (currentHash !== cached.textHash) {
        this.cache.delete(elementId);
        return null;
      }
    }

    return { language: cached.language, confidence: cached.confidence };
  }

  /**
   * Set cached language for an element
   */
  set(
    elementId: string,
    language: string,
    text: string,
    confidence = 1.0,
  ): void {
    this.cache.set(elementId, {
      elementId,
      language,
      confidence,
      detectedAt: Date.now(),
      textHash: hashText(text),
    });
  }

  /**
   * Invalidate cache for an element
   */
  invalidate(elementId: string): void {
    this.cache.delete(elementId);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.detectedAt > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const languageCache = new LanguageCache();
