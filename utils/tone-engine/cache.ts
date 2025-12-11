/**
 * Tone Detection Cache
 * Caching layer for tone detection results
 */
import {
  DEFAULT_TONE_CACHE_CONFIG,
  type ToneCacheConfig,
  type ToneCacheEntry,
  type ToneCacheKey,
  type ToneDetectionResult,
} from './types';

// ============================================================================
// Hash Function
// ============================================================================

/**
 * Generate a simple hash for cache keys
 * Uses djb2 algorithm for fast hashing
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// ============================================================================
// Tone Cache Class
// ============================================================================

/**
 * Prompt version identifier for cache invalidation
 * Increment when prompt format changes
 */
const PROMPT_VERSION = 'v1.0.0';

export class ToneCache {
  private cache: Map<string, ToneCacheEntry>;
  private config: ToneCacheConfig;

  constructor(config?: Partial<ToneCacheConfig>) {
    this.config = { ...DEFAULT_TONE_CACHE_CONFIG, ...config };
    this.cache = new Map();
  }

  /**
   * Generate cache key from text
   */
  key(text: string): ToneCacheKey {
    return {
      textHash: hashString(text),
      promptVersion: PROMPT_VERSION,
    };
  }

  /**
   * Convert cache key to string for Map storage
   */
  private keyToString(key: ToneCacheKey): string {
    return `${key.promptVersion}:${key.textHash}`;
  }

  /**
   * Get cached detection result
   */
  get(key: ToneCacheKey): ToneDetectionResult | null {
    const keyStr = this.keyToString(key);
    const entry = this.cache.get(keyStr);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(keyStr);
      return null;
    }

    return entry.result;
  }

  /**
   * Store detection result in cache
   */
  set(key: ToneCacheKey, result: ToneDetectionResult): void {
    // Enforce max entries limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const keyStr = this.keyToString(key);
    const now = Date.now();

    this.cache.set(keyStr, {
      result,
      timestamp: now,
      expiresAt: now + this.config.ttlMs,
    });
  }

  /**
   * Check if cache contains key (and it's not expired)
   */
  has(key: ToneCacheKey): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove entry from cache
   */
  delete(key: ToneCacheKey): boolean {
    return this.cache.delete(this.keyToString(key));
  }

  /**
   * Clear all cache entries
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
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [keyStr, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(keyStr);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Number.POSITIVE_INFINITY;

    for (const [keyStr, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = keyStr;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxEntries: number;
    ttlMs: number;
    promptVersion: string;
  } {
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      ttlMs: this.config.ttlMs,
      promptVersion: PROMPT_VERSION,
    };
  }
}

/**
 * Create a singleton cache instance
 */
let globalCache: ToneCache | null = null;

export function getGlobalToneCache(
  config?: Partial<ToneCacheConfig>,
): ToneCache {
  if (!globalCache) {
    globalCache = new ToneCache(config);
  }
  return globalCache;
}

/**
 * Reset global cache (for testing)
 */
export function resetGlobalToneCache(): void {
  globalCache?.clear();
  globalCache = null;
}
