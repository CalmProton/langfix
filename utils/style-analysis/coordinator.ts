/**
 * Style Analysis Coordinator
 * Manages analysis queuing, debouncing, and result aggregation
 */
import type { AIProvider } from '../types';
import { StyleAnalysisEngine } from './engine';
import type {
  IssueCategory,
  StyleAnalysisConfig,
  StyleAnalysisRequest,
  StyleAnalysisResponse,
  StyleIssue,
} from './types';
import { DEFAULT_STYLE_ANALYSIS_CONFIG } from './types';

// ============================================================================
// Types
// ============================================================================

interface PendingAnalysis {
  promise: Promise<StyleAnalysisResponse>;
  request: StyleAnalysisRequest;
}

interface AnalysisQueueItem {
  request: StyleAnalysisRequest;
  resolve: (result: StyleAnalysisResponse) => void;
  reject: (error: Error) => void;
}

// ============================================================================
// Coordinator Class
// ============================================================================

export class StyleAnalysisCoordinator {
  private engine: StyleAnalysisEngine;
  private pendingAnalyses = new Map<string, PendingAnalysis>();
  private analysisQueue: AnalysisQueueItem[] = [];
  private isProcessing = false;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private config: StyleAnalysisConfig;

  /** Debounce delay in ms */
  private debounceDelay = 2000;

  constructor(provider: AIProvider, config?: Partial<StyleAnalysisConfig>) {
    this.config = { ...DEFAULT_STYLE_ANALYSIS_CONFIG, ...config };
    this.engine = new StyleAnalysisEngine(provider, config);
  }

  /**
   * Analyze text with debouncing (waits for user to stop typing)
   */
  analyzeDebounced(
    request: StyleAnalysisRequest,
    key: string,
  ): Promise<StyleAnalysisResponse> {
    return new Promise((resolve, reject) => {
      // Clear existing timer for this key
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new debounce timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          const result = await this.analyzeText(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.debounceDelay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Analyze text immediately (no debouncing)
   */
  async analyzeText(
    request: StyleAnalysisRequest,
  ): Promise<StyleAnalysisResponse> {
    const queueKey = this.getQueueKey(request);

    // Check if analysis already in progress for this text
    const pending = this.pendingAnalyses.get(queueKey);
    if (pending) {
      return pending.promise;
    }

    // Create new analysis
    const promise = this.performAnalysis(request);
    this.pendingAnalyses.set(queueKey, { promise, request });

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingAnalyses.delete(queueKey);
    }
  }

  /**
   * Queue analysis for batch processing
   */
  queueAnalysis(request: StyleAnalysisRequest): Promise<StyleAnalysisResponse> {
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued analyses
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.analysisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.analysisQueue.length > 0) {
      const item = this.analysisQueue.shift();
      if (!item) break;

      try {
        const result = await this.performAnalysis(item.request);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Perform analysis with chunking if needed
   */
  private async performAnalysis(
    request: StyleAnalysisRequest,
  ): Promise<StyleAnalysisResponse> {
    if (request.text.length > this.config.maxChunkSize) {
      return this.engine.analyzeChunked(request);
    }
    return this.engine.analyze(request);
  }

  /**
   * Cancel pending debounced analysis
   */
  cancelDebounced(key: string): void {
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  /**
   * Cancel all pending analyses
   */
  cancelAll(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear pending analyses
    this.pendingAnalyses.clear();

    // Clear queue
    for (const item of this.analysisQueue) {
      item.reject(new Error('Analysis cancelled'));
    }
    this.analysisQueue = [];
  }

  /**
   * Get issues grouped by category
   */
  groupByCategory(issues: StyleIssue[]): Record<IssueCategory, StyleIssue[]> {
    const grouped: Record<IssueCategory, StyleIssue[]> = {
      style: [],
      clarity: [],
      conciseness: [],
    };

    for (const issue of issues) {
      if (grouped[issue.category]) {
        grouped[issue.category].push(issue);
      }
    }

    return grouped;
  }

  /**
   * Get issue statistics
   */
  getStats(issues: StyleIssue[]): {
    total: number;
    byCategory: Record<IssueCategory, number>;
    bySeverity: Record<string, number>;
  } {
    const byCategory: Record<IssueCategory, number> = {
      style: 0,
      clarity: 0,
      conciseness: 0,
    };

    const bySeverity: Record<string, number> = {
      info: 0,
      warning: 0,
    };

    for (const issue of issues) {
      byCategory[issue.category]++;
      bySeverity[issue.severity]++;
    }

    return {
      total: issues.length,
      byCategory,
      bySeverity,
    };
  }

  /**
   * Set debounce delay
   */
  setDebounceDelay(ms: number): void {
    this.debounceDelay = ms;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.engine.clearCache();
  }

  /**
   * Generate queue key from request
   */
  private getQueueKey(request: StyleAnalysisRequest): string {
    return `${request.text.substring(0, 100)}-${request.context || 'default'}-${request.sensitivity || 'medium'}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new style analysis coordinator
 */
export function createStyleAnalysisCoordinator(
  provider: AIProvider,
  config?: Partial<StyleAnalysisConfig>,
): StyleAnalysisCoordinator {
  return new StyleAnalysisCoordinator(provider, config);
}
