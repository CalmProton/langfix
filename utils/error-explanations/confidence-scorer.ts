/**
 * Confidence Scorer
 * Scores correction confidence based on various factors
 */
import type { ExtendedGrammarError } from '../grammar-engine/types';
import type { SuggestionError } from '../suggestion-ui/types';
import { mapErrorTypeToCategory } from './prompts';
import type {
  CorrectionOption,
  HistorySummary,
  UserPreferences,
} from './types';

// ============================================================================
// Scoring Weights
// ============================================================================

interface ScoringWeights {
  /** Weight for error type match */
  errorTypeMatch: number;
  /** Weight for suggestion length similarity */
  lengthSimilarity: number;
  /** Weight for preserving intent */
  preservesIntent: number;
  /** Weight for user history alignment */
  historyAlignment: number;
  /** Weight for simplicity preference */
  simplicityBonus: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  errorTypeMatch: 0.2,
  lengthSimilarity: 0.1,
  preservesIntent: 0.25,
  historyAlignment: 0.2,
  simplicityBonus: 0.05,
};

// ============================================================================
// Confidence Scorer Class
// ============================================================================

export class ConfidenceScorer {
  private weights: ScoringWeights;

  constructor(weights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Score a correction's confidence (0-1)
   */
  scoreCorrection(
    correction: CorrectionOption,
    error: ExtendedGrammarError | SuggestionError,
    context: {
      sentence: string;
      history?: HistorySummary;
      userPreferences?: UserPreferences;
    },
  ): number {
    let score = correction.confidence; // Start with AI-provided confidence

    // Apply various scoring factors
    score = this.applyErrorTypeBonus(score, error, correction);
    score = this.applyLengthSimilarityBonus(score, error, correction);
    score = this.applyPreservesIntentBonus(score, correction);
    score = this.applyHistoryBonus(score, context.history);
    score = this.applySimplicityBonus(score, correction);
    score = this.applyUserPreferencesBonus(
      score,
      error,
      context.userPreferences,
    );

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Apply bonus for errors where type-specific corrections are reliable
   */
  private applyErrorTypeBonus(
    score: number,
    error: ExtendedGrammarError | SuggestionError,
    correction: CorrectionOption,
  ): number {
    // Spelling corrections are usually very reliable
    if (error.type === 'spelling' && correction.type === 'replacement') {
      score += this.weights.errorTypeMatch;
    }

    // Punctuation corrections are reliable for insertions/deletions
    if (
      error.type === 'punctuation' &&
      (correction.type === 'insertion' || correction.type === 'deletion')
    ) {
      score += this.weights.errorTypeMatch * 0.8;
    }

    // Grammar corrections with direct replacements
    if (error.type === 'grammar' && correction.type === 'replacement') {
      score += this.weights.errorTypeMatch * 0.5;
    }

    return score;
  }

  /**
   * Apply bonus for corrections with similar length to original
   */
  private applyLengthSimilarityBonus(
    score: number,
    error: ExtendedGrammarError | SuggestionError,
    correction: CorrectionOption,
  ): number {
    const originalLength = error.original.length;
    const correctionLength = correction.text.length;

    if (originalLength === 0) {
      return score;
    }

    // Calculate length ratio (closer to 1 is better for preserving meaning)
    const ratio = Math.min(originalLength, correctionLength) /
      Math.max(originalLength, correctionLength);

    // Slight bonus for similar length (indicates minimal change)
    if (ratio > 0.7) {
      score += this.weights.lengthSimilarity * ratio;
    }

    return score;
  }

  /**
   * Apply bonus for corrections that preserve intent
   */
  private applyPreservesIntentBonus(
    score: number,
    correction: CorrectionOption,
  ): number {
    if (correction.metadata?.preservesIntent) {
      score += this.weights.preservesIntent;
    }

    return score;
  }

  /**
   * Apply bonus based on user correction history
   */
  private applyHistoryBonus(
    score: number,
    history?: HistorySummary,
  ): number {
    if (!history || history.total === 0) {
      return score;
    }

    // Boost if user typically accepts corrections for this type
    if (history.acceptanceRate > 0.7) {
      score += this.weights.historyAlignment * history.acceptanceRate;
    }

    // Slight penalty if user typically rejects
    if (history.acceptanceRate < 0.3) {
      score -= this.weights.historyAlignment * 0.5;
    }

    return score;
  }

  /**
   * Apply bonus for simpler corrections
   */
  private applySimplicityBonus(
    score: number,
    correction: CorrectionOption,
  ): number {
    // Single word corrections are generally safer
    const wordCount = correction.text.trim().split(/\s+/).length;

    if (wordCount === 1) {
      score += this.weights.simplicityBonus;
    } else if (wordCount <= 3) {
      score += this.weights.simplicityBonus * 0.5;
    }

    return score;
  }

  /**
   * Apply bonus based on user preferences
   */
  private applyUserPreferencesBonus(
    score: number,
    error: ExtendedGrammarError | SuggestionError,
    preferences?: UserPreferences,
  ): number {
    if (!preferences) {
      return score;
    }

    const category = mapErrorTypeToCategory(error.type);

    // Boost for categories user typically accepts
    if (preferences.acceptedCategories.includes(category)) {
      score += 0.1;
    }

    // Penalty for categories user typically rejects
    if (preferences.rejectedCategories.includes(category)) {
      score -= 0.15;
    }

    return score;
  }

  /**
   * Determine if correction should be auto-applied
   */
  shouldAutoCorrect(
    correction: CorrectionOption,
    threshold: number = 0.85,
  ): boolean {
    return (
      correction.confidence >= threshold &&
      // Only auto-correct simple replacements
      (correction.type === 'replacement' || correction.type === 'insertion') &&
      // Must preserve intent if metadata is available
      (correction.metadata?.preservesIntent !== false)
    );
  }

  /**
   * Rank corrections by confidence
   */
  rankCorrections(corrections: CorrectionOption[]): CorrectionOption[] {
    return [...corrections].sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get confidence label for display
   */
  getConfidenceLabel(confidence: number): {
    label: string;
    color: 'green' | 'yellow' | 'gray';
  } {
    if (confidence >= 0.85) {
      return { label: 'Recommended', color: 'green' };
    }
    if (confidence >= 0.5) {
      return { label: 'Suggested', color: 'yellow' };
    }
    return { label: 'Consider', color: 'gray' };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let scorerInstance: ConfidenceScorer | null = null;

/**
 * Get or create the confidence scorer singleton
 */
export function getConfidenceScorer(
  weights?: Partial<ScoringWeights>,
): ConfidenceScorer {
  if (!scorerInstance) {
    scorerInstance = new ConfidenceScorer(weights);
  }
  return scorerInstance;
}

/**
 * Create a new confidence scorer (for testing)
 */
export function createConfidenceScorer(
  weights?: Partial<ScoringWeights>,
): ConfidenceScorer {
  return new ConfidenceScorer(weights);
}
