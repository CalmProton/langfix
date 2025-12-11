/**
 * Explanation Cache
 * Cache for storing and retrieving error explanations
 */
import type {
  CachedExplanation,
  ErrorExplanation,
  ExplanationCacheConfig,
  ExplanationCacheKey,
} from './types';

// ============================================================================
// Cache Implementation
// ============================================================================

export class ExplanationCache {
  private cache = new Map<string, CachedExplanation>();
  private config: ExplanationCacheConfig;

  constructor(config?: Partial<ExplanationCacheConfig>) {
    this.config = {
      maxEntries: config?.maxEntries ?? 500,
      ttlMs: config?.ttlMs ?? 24 * 60 * 60 * 1000, // 24 hours
      enabled: config?.enabled ?? true,
    };
  }

  /**
   * Generate cache key from error characteristics
   */
  private getCacheKey(key: ExplanationCacheKey): string {
    const parts = [key.type, key.text.toLowerCase().trim()];
    if (key.rule) {
      parts.push(key.rule);
    }
    return parts.join(':');
  }

  /**
   * Check if a cached entry is still valid
   */
  private isValid(cached: CachedExplanation): boolean {
    return Date.now() < cached.expiresAt;
  }

  /**
   * Get cached explanation if available and fresh
   */
  get(key: ExplanationCacheKey): ErrorExplanation | null {
    if (!this.config.enabled) {
      return null;
    }

    const cacheKey = this.getCacheKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (!this.isValid(cached)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access count
    cached.accessCount++;
    return cached.explanation;
  }

  /**
   * Cache an explanation
   */
  set(key: ExplanationCacheKey, explanation: ErrorExplanation): void {
    if (!this.config.enabled) {
      return;
    }

    const cacheKey = this.getCacheKey(key);
    const now = Date.now();

    // Enforce size limit using LRU eviction
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(cacheKey, {
      explanation,
      cachedAt: now,
      expiresAt: now + this.config.ttlMs,
      accessCount: 1,
    });
  }

  /**
   * Check if an explanation is cached
   */
  has(key: ExplanationCacheKey): boolean {
    const cacheKey = this.getCacheKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return false;
    }

    if (!this.isValid(cached)) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Remove an entry from cache
   */
  delete(key: ExplanationCacheKey): boolean {
    const cacheKey = this.getCacheKey(key);
    return this.cache.delete(cacheKey);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number | null;
  } {
    let totalAccess = 0;
    let oldestEntry: number | null = null;

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      if (oldestEntry === null || entry.cachedAt < oldestEntry) {
        oldestEntry = entry.cachedAt;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxEntries,
      hitRate: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
      oldestEntry,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldest: { key: string; accessCount: number; cachedAt: number } | null =
      null;

    for (const [key, entry] of this.cache.entries()) {
      // First, remove any expired entries
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        continue;
      }

      // Track least accessed (and oldest if tie)
      if (
        oldest === null ||
        entry.accessCount < oldest.accessCount ||
        (entry.accessCount === oldest.accessCount &&
          entry.cachedAt < oldest.cachedAt)
      ) {
        oldest = {
          key,
          accessCount: entry.accessCount,
          cachedAt: entry.cachedAt,
        };
      }
    }

    // If we still need to evict and found a candidate
    if (this.cache.size >= this.config.maxEntries && oldest) {
      this.cache.delete(oldest.key);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExplanationCacheConfig>): void {
    this.config = { ...this.config, ...config };

    // If cache disabled, clear it
    if (!this.config.enabled) {
      this.clear();
    }

    // If max entries reduced, evict extras
    while (this.cache.size > this.config.maxEntries) {
      this.evictLRU();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cacheInstance: ExplanationCache | null = null;

/**
 * Get or create the explanation cache singleton
 */
export function getExplanationCache(
  config?: Partial<ExplanationCacheConfig>,
): ExplanationCache {
  if (!cacheInstance) {
    cacheInstance = new ExplanationCache(config);
  } else if (config) {
    cacheInstance.updateConfig(config);
  }
  return cacheInstance;
}

/**
 * Dispose of the cache singleton
 */
export function disposeExplanationCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
    cacheInstance = null;
  }
}
