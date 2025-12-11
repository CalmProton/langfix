/**
 * Readability Cache
 * LRU cache with TTL for readability analysis results
 */
import type { ReadabilityCacheConfig, ReadabilityResult } from './types';

/**
 * Simple hash function for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

/**
 * Cache key parameters
 */
export interface CacheKeyParams {
  text: string;
  useModelRefinement?: boolean;
}

/**
 * Cache entry with timestamp
 */
interface CacheEntry {
  result: ReadabilityResult;
  timestamp: number;
}

/**
 * Estimate size of a cache entry in bytes
 */
function estimateSize(entry: CacheEntry): number {
  // Rough estimate: JSON string length * 2 (UTF-16)
  return JSON.stringify(entry).length * 2;
}

/**
 * LRU Cache for readability analysis results
 */
export class ReadabilityCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private currentBytes = 0;

  /** Current version for cache invalidation */
  static readonly VERSION = '1.0.0';

  constructor(private config: ReadabilityCacheConfig) {}

  /**
   * Generate cache key from parameters
   */
  key(params: CacheKeyParams): string {
    const keyData = {
      textHash: hashString(params.text),
      model: params.useModelRefinement ?? false,
      version: ReadabilityCache.VERSION,
    };
    return hashString(JSON.stringify(keyData));
  }

  /**
   * Get cached result if valid
   */
  get(key: string): ReadabilityResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    return entry.result;
  }

  /**
   * Store result in cache
   */
  set(key: string, result: ReadabilityResult): void {
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
    };

    const entrySize = estimateSize(entry);

    // If this single entry exceeds max bytes, don't cache
    if (entrySize > this.config.maxBytes) {
      return;
    }

    // Remove existing entry if updating
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict entries if needed to stay under limits
    while (
      (this.cache.size >= this.config.maxEntries ||
        this.currentBytes + entrySize > this.config.maxBytes) &&
      this.accessOrder.length > 0
    ) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }

    // Store entry
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.currentBytes += entrySize;
  }

  /**
   * Delete entry from cache
   */
  private delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= estimateSize(entry);
      this.cache.delete(key);
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
      }
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(key);
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentBytes = 0;
  }

  /**
   * Get cache statistics
   */
  stats(): { entries: number; bytes: number; maxEntries: number; maxBytes: number } {
    return {
      entries: this.cache.size,
      bytes: this.currentBytes,
      maxEntries: this.config.maxEntries,
      maxBytes: this.config.maxBytes,
    };
  }
}
