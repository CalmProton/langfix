/**
 * Dictionary Filter Types
 * Types for dictionary and custom rule filtering
 */
import type { CustomRule, DictionaryEntry } from '../types';

/**
 * Filter options for dictionary operations
 */
export interface DictionaryFilterOptions {
  /** Current context (e.g., 'work', 'technical') */
  context?: string;
  /** Whether to filter case-sensitively by default */
  caseSensitive?: boolean;
}

/**
 * Result of applying a custom rule
 */
export interface RuleApplicationResult {
  /** Whether the rule matched */
  matched: boolean;
  /** The matched rule (if any) */
  rule?: CustomRule;
  /** Action to take: 'ignore' removes error, 'replace' modifies it */
  action?: 'ignore' | 'replace' | 'prefer';
  /** Replacement text (for replace/prefer actions) */
  replacement?: string;
  /** Message to show (for prefer action) */
  message?: string;
}

/**
 * Cache for dictionary/rules to avoid repeated storage reads
 */
export interface DictionaryCache {
  dictionary: DictionaryEntry[];
  rules: CustomRule[];
  sessionIgnored: string[];
  lastUpdated: number;
}
