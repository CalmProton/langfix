/**
 * Style Analysis Cache
 * LRU cache with TTL for style analysis results
 */
import type {
  StyleCacheConfig,
  StyleCacheEntry,
  StyleCacheKey,
  StyleIssue,
} from './types';

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
 * Estimate size of a cache entry in bytes
 */
function estimateSize(entry: StyleCacheEntry): number {
  // Rough estimate: JSON string length * 2 (UTF-16)
  return JSON.stringify(entry).length * 2;
}

/**
 * LRU Cache for style analysis results
 */
export class StyleAnalysisCache {
  private cache = new Map<string, StyleCacheEntry>();
  private accessOrder: string[] = [];
  private currentBytes = 0;

  constructor(private config: StyleCacheConfig) {}

  /**
   * Generate cache key from parameters
   */
  key(params: StyleCacheKey): string {
    const keyData = {
      textHash: hashString(params.text),
      context: params.context || 'default',
      sensitivity: params.sensitivity || 'medium',
      categories: (params.categories || ['style', 'clarity', 'conciseness'])
        .sort()
        .join(','),
    };
    return hashString(JSON.stringify(keyData));
  }

  /**
   * Get cached result if valid
   */
  get(key: string): StyleIssue[] | null {
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

    return entry.issues;
  }

  /**
   * Store result in cache
   */
  set(key: string, issues: StyleIssue[]): void {
    const entry: StyleCacheEntry = {
      issues,
      timestamp: Date.now(),
      hash: key,
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

    // Evict entries until we have room
    while (
      this.cache.size >= this.config.maxEntries ||
      this.currentBytes + entrySize > this.config.maxBytes
    ) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.delete(oldest);
      } else {
        break;
      }
    }

    // Store the entry
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.currentBytes += entrySize;
  }

  /**
   * Delete an entry from cache
   */
  private delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= estimateSize(entry);
      this.cache.delete(key);

      // Remove from access order
      const idx = this.accessOrder.indexOf(key);
      if (idx >= 0) {
        this.accessOrder.splice(idx, 1);
      }
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx >= 0) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(key);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentBytes = 0;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    entries: number;
    bytes: number;
    maxEntries: number;
    maxBytes: number;
  } {
    return {
      entries: this.cache.size,
      bytes: this.currentBytes,
      maxEntries: this.config.maxEntries,
      maxBytes: this.config.maxBytes,
    };
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.delete(key);
      return false;
    }

    return true;
  }
}
