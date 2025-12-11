/**
 * Correction History
 * Track user correction actions for learning and preferences
 */
import { storage } from '#imports';
import type {
  CorrectionAction,
  CorrectionRecord,
  ErrorCategory,
  HistorySummary,
  UserPreferences,
} from './types';

// ============================================================================
// Storage Definition
// ============================================================================

const MAX_HISTORY_ENTRIES = 1000;

/**
 * Correction history storage - local only for privacy
 */
const correctionHistoryStorage = storage.defineItem<CorrectionRecord[]>(
  'local:correctionHistory',
  {
    fallback: [],
  },
);

// ============================================================================
// Correction History Class
// ============================================================================

export class CorrectionHistory {
  private cache: CorrectionRecord[] | null = null;
  private privacyMode: boolean;

  constructor(privacyMode: boolean = false) {
    this.privacyMode = privacyMode;
  }

  /**
   * Enable/disable privacy mode
   */
  setPrivacyMode(enabled: boolean): void {
    this.privacyMode = enabled;
    if (enabled) {
      this.cache = null;
    }
  }

  /**
   * Record a correction action
   */
  async record(record: Omit<CorrectionRecord, 'timestamp'>): Promise<void> {
    if (this.privacyMode) {
      return;
    }

    const fullRecord: CorrectionRecord = {
      ...record,
      timestamp: Date.now(),
    };

    const history = await this.getHistory();
    history.push(fullRecord);

    // Keep only the most recent entries
    const trimmed = history.slice(-MAX_HISTORY_ENTRIES);

    await correctionHistoryStorage.setValue(trimmed);
    this.cache = trimmed;
  }

  /**
   * Record an accepted correction
   */
  async recordAccepted(
    errorType: string,
    category: ErrorCategory,
    original: string,
    suggestion: string,
    confidence: number,
  ): Promise<void> {
    await this.record({
      errorType,
      category,
      original,
      suggestion,
      action: 'accepted',
      confidence,
    });
  }

  /**
   * Record a rejected correction
   */
  async recordRejected(
    errorType: string,
    category: ErrorCategory,
    original: string,
    suggestion: string,
    confidence: number,
  ): Promise<void> {
    await this.record({
      errorType,
      category,
      original,
      suggestion,
      action: 'rejected',
      confidence,
    });
  }

  /**
   * Record a modified correction (user edited the suggestion)
   */
  async recordModified(
    errorType: string,
    category: ErrorCategory,
    original: string,
    suggestion: string,
    appliedText: string,
    confidence: number,
  ): Promise<void> {
    await this.record({
      errorType,
      category,
      original,
      suggestion,
      action: 'modified',
      appliedText,
      confidence,
    });
  }

  /**
   * Get history for similar errors
   */
  async getSimilar(
    errorType: string,
    category: ErrorCategory,
  ): Promise<HistorySummary> {
    const history = await this.getHistory();

    const similar = history.filter(
      (r) => r.errorType === errorType || r.category === category,
    );

    if (similar.length === 0) {
      return {
        total: 0,
        acceptanceRate: 0.5, // Neutral default
        preferredAction: 'accepted',
      };
    }

    const accepted = similar.filter((r) => r.action === 'accepted').length;
    const acceptanceRate = accepted / similar.length;

    // Determine preferred action
    const actionCounts: Record<CorrectionAction, number> = {
      accepted: 0,
      rejected: 0,
      modified: 0,
    };
    for (const record of similar) {
      actionCounts[record.action]++;
    }

    const preferredAction = (
      Object.entries(actionCounts) as [CorrectionAction, number][]
    ).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    return {
      total: similar.length,
      acceptanceRate,
      preferredAction,
    };
  }

  /**
   * Get user's correction preferences based on history
   */
  async getPreferences(): Promise<UserPreferences> {
    const history = await this.getHistory();

    if (history.length === 0) {
      return {
        preferredConfidence: 0.85,
        acceptedCategories: [],
        rejectedCategories: [],
      };
    }

    // Group by category
    const categoryStats = new Map<
      ErrorCategory,
      { accepted: number; total: number }
    >();

    for (const record of history) {
      const stats = categoryStats.get(record.category) || {
        accepted: 0,
        total: 0,
      };
      stats.total++;
      if (record.action === 'accepted' || record.action === 'modified') {
        stats.accepted++;
      }
      categoryStats.set(record.category, stats);
    }

    // Determine accepted and rejected categories
    const acceptedCategories: ErrorCategory[] = [];
    const rejectedCategories: ErrorCategory[] = [];

    for (const [category, stats] of categoryStats.entries()) {
      const rate = stats.accepted / stats.total;
      if (rate >= 0.7) {
        acceptedCategories.push(category);
      } else if (rate <= 0.3 && stats.total >= 5) {
        rejectedCategories.push(category);
      }
    }

    // Calculate preferred confidence from accepted corrections
    const acceptedConfidences = history
      .filter((r) => r.action === 'accepted')
      .map((r) => r.confidence);

    const preferredConfidence =
      acceptedConfidences.length > 0
        ? acceptedConfidences.reduce((a, b) => a + b, 0) /
          acceptedConfidences.length
        : 0.85;

    return {
      preferredConfidence: Math.max(0.5, Math.min(0.95, preferredConfidence)),
      acceptedCategories,
      rejectedCategories,
    };
  }

  /**
   * Get recent history entries
   */
  async getRecent(limit: number = 50): Promise<CorrectionRecord[]> {
    const history = await this.getHistory();
    return history.slice(-limit).reverse();
  }

  /**
   * Get statistics summary
   */
  async getStatistics(): Promise<{
    total: number;
    accepted: number;
    rejected: number;
    modified: number;
    acceptanceRate: number;
    byCategory: Record<ErrorCategory, number>;
  }> {
    const history = await this.getHistory();

    const stats = {
      total: history.length,
      accepted: 0,
      rejected: 0,
      modified: 0,
      acceptanceRate: 0,
      byCategory: {} as Record<ErrorCategory, number>,
    };

    for (const record of history) {
      stats[record.action]++;
      stats.byCategory[record.category] =
        (stats.byCategory[record.category] || 0) + 1;
    }

    stats.acceptanceRate =
      stats.total > 0 ? (stats.accepted + stats.modified) / stats.total : 0;

    return stats;
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    await correctionHistoryStorage.setValue([]);
    this.cache = null;
  }

  /**
   * Get all history (with caching)
   */
  private async getHistory(): Promise<CorrectionRecord[]> {
    if (this.privacyMode) {
      return [];
    }

    if (this.cache === null) {
      this.cache = await correctionHistoryStorage.getValue();
    }
    return this.cache;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let historyInstance: CorrectionHistory | null = null;

/**
 * Get or create the correction history singleton
 */
export function getCorrectionHistory(privacyMode?: boolean): CorrectionHistory {
  if (!historyInstance) {
    historyInstance = new CorrectionHistory(privacyMode);
  } else if (privacyMode !== undefined) {
    historyInstance.setPrivacyMode(privacyMode);
  }
  return historyInstance;
}

/**
 * Create a new correction history instance (for testing)
 */
export function createCorrectionHistory(
  privacyMode?: boolean,
): CorrectionHistory {
  return new CorrectionHistory(privacyMode);
}

/**
 * Dispose of the correction history singleton
 */
export function disposeCorrectionHistory(): void {
  historyInstance = null;
}
