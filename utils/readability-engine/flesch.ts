/**
 * Flesch Reading Ease Calculator
 * Implements the Flesch Reading Ease formula and related readability metrics
 *
 * Formula: Flesch Reading Ease Score = 206.835 − 1.015 × ( Total Words / Total Sentences ) − 84.6 × ( Total Syllables / Total Words )
 *
 *
 * Score interpretation:
 * - 90-100: Very Easy (5th grade)
 * - 80-89: Easy (6th grade)
 * - 70-79: Fairly Easy (7th grade)
 * - 60-69: Standard (8th-9th grade)
 * - 50-59: Fairly Difficult (10th-12th grade)
 * - 30-49: Difficult (College)
 * - 0-29: Very Difficult (College Graduate)
 */

import type { ReadabilityLevel } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Coefficient for average sentence length in Flesch formula */
const ASL_COEFFICIENT = 1.015;

/** Coefficient for average syllables per word in Flesch formula */
const ASW_COEFFICIENT = 84.6;

/** Base value for Flesch formula */
const FLESCH_BASE = 206.835;

/** Minimum score floor */
const MIN_SCORE = 0;

/** Maximum score ceiling */
const MAX_SCORE = 100;

// ============================================================================
// Flesch Reading Ease
// ============================================================================

/**
 * Calculate Flesch Reading Ease score
 *
 * @param wordCount - Total number of words
 * @param sentenceCount - Total number of sentences
 * @param syllableCount - Total number of syllables
 * @returns Flesch Reading Ease score (0-100, higher = easier)
 */
export function calculateFleschScore(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number,
): number {
  // Guard against division by zero
  if (wordCount === 0 || sentenceCount === 0) {
    return MAX_SCORE; // No text = easy to read
  }

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const score =
    FLESCH_BASE -
    ASL_COEFFICIENT * avgSentenceLength -
    ASW_COEFFICIENT * avgSyllablesPerWord;

  // Clamp to valid range
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

/**
 * Get human-readable grade level from Flesch score
 *
 * @param score - Flesch Reading Ease score (0-100)
 * @returns Human-readable grade level string
 */
export function getGradeLevel(score: number): string {
  if (score >= 90) return '5th grade';
  if (score >= 80) return '6th grade';
  if (score >= 70) return '7th grade';
  if (score >= 60) return '8th-9th grade';
  if (score >= 50) return '10th-12th grade';
  if (score >= 30) return 'College';
  return 'College Graduate';
}

/**
 * Get short label for Flesch score
 *
 * @param score - Flesch Reading Ease score (0-100)
 * @returns Short label (e.g., "Easy", "Hard")
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

/**
 * Map Flesch score to ReadabilityLevel
 *
 * @param score - Flesch Reading Ease score (0-100)
 * @param easyThreshold - Score at or above which text is "easy" (default: 70)
 * @param hardThreshold - Score at or below which text is "hard" (default: 40)
 * @returns ReadabilityLevel category
 */
export function scoreToLevel(
  score: number,
  easyThreshold = 70,
  hardThreshold = 40,
): ReadabilityLevel {
  if (score >= easyThreshold) return 'easy';
  if (score <= hardThreshold) return 'hard';
  return 'moderate';
}

// ============================================================================
// Flesch-Kincaid Grade Level (alternative metric)
// ============================================================================

/**
 * Calculate Flesch-Kincaid Grade Level
 * Returns the US grade level required to understand the text
 *
 * Formula: 0.39 × (words/sentences) + 11.8 × (syllables/words) - 15.59
 *
 * @param wordCount - Total number of words
 * @param sentenceCount - Total number of sentences
 * @param syllableCount - Total number of syllables
 * @returns Grade level (e.g., 8.0 = 8th grade)
 */
export function calculateFleschKincaidGrade(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number,
): number {
  if (wordCount === 0 || sentenceCount === 0) {
    return 0;
  }

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const grade =
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  // Clamp to reasonable range (0-20)
  return Math.max(0, Math.min(20, grade));
}

// ============================================================================
// Combined Scoring
// ============================================================================

export interface ReadabilityMetrics {
  /** Flesch Reading Ease score (0-100) */
  fleschScore: number;
  /** Flesch-Kincaid grade level */
  gradeLevel: number;
  /** Human-readable grade level string */
  gradeLevelLabel: string;
  /** Short score label (e.g., "Easy") */
  scoreLabel: string;
  /** Readability level category */
  level: ReadabilityLevel;
  /** Average words per sentence */
  avgWordsPerSentence: number;
  /** Average syllables per word */
  avgSyllablesPerWord: number;
}

/**
 * Calculate all readability metrics at once
 *
 * @param wordCount - Total number of words
 * @param sentenceCount - Total number of sentences
 * @param syllableCount - Total number of syllables
 * @param easyThreshold - Score threshold for "easy" (default: 70)
 * @param hardThreshold - Score threshold for "hard" (default: 40)
 * @returns Complete readability metrics
 */
export function calculateReadabilityMetrics(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number,
  easyThreshold = 70,
  hardThreshold = 40,
): ReadabilityMetrics {
  const avgWordsPerSentence =
    sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;

  const fleschScore = calculateFleschScore(
    wordCount,
    sentenceCount,
    syllableCount,
  );
  const gradeLevel = calculateFleschKincaidGrade(
    wordCount,
    sentenceCount,
    syllableCount,
  );

  return {
    fleschScore,
    gradeLevel,
    gradeLevelLabel: getGradeLevel(fleschScore),
    scoreLabel: getScoreLabel(fleschScore),
    level: scoreToLevel(fleschScore, easyThreshold, hardThreshold),
    avgWordsPerSentence,
    avgSyllablesPerWord,
  };
}

// ============================================================================
// Composite Score with Secondary Factors
// ============================================================================

export interface CompositeScoreOptions {
  /** Weight for primary Flesch score (default: 0.7) */
  primaryWeight?: number;
  /** Weight for secondary factors (default: 0.3) */
  secondaryWeight?: number;
  /** Complex word ratio penalty multiplier */
  complexWordPenalty?: number;
  /** Long sentence penalty multiplier */
  longSentencePenalty?: number;
  /** Passive voice penalty multiplier */
  passiveVoicePenalty?: number;
}

export interface CompositeScoreInputs {
  /** Flesch Reading Ease score */
  fleschScore: number;
  /** Complex word ratio (0-1) */
  complexWordRatio: number;
  /** Average sentence length in words */
  avgSentenceLength: number;
  /** Whether passive voice is present */
  hasPassiveVoice: boolean;
  /** Punctuation density (punctuation chars / total chars) */
  punctuationDensity?: number;
}

/**
 * Calculate composite readability score
 * Blends primary Flesch score with secondary factors
 *
 * @param inputs - Score inputs
 * @param options - Weighting options
 * @returns Composite score (0-100, higher = easier)
 */
export function calculateCompositeScore(
  inputs: CompositeScoreInputs,
  options: CompositeScoreOptions = {},
): number {
  const {
    primaryWeight = 0.7,
    secondaryWeight = 0.3,
    complexWordPenalty = 30,
    longSentencePenalty = 20,
    passiveVoicePenalty = 5,
  } = options;

  // Primary score
  const primaryScore = inputs.fleschScore;

  // Secondary penalties (higher = worse readability)
  let penalties = 0;

  // Complex word penalty: 20%+ complex words = max penalty
  penalties += Math.min(1, inputs.complexWordRatio / 0.2) * complexWordPenalty;

  // Long sentence penalty: >25 words average = max penalty
  const sentenceLengthRatio = Math.min(1, inputs.avgSentenceLength / 25);
  penalties += sentenceLengthRatio * longSentencePenalty;

  // Passive voice penalty
  if (inputs.hasPassiveVoice) {
    penalties += passiveVoicePenalty;
  }

  // Calculate secondary score (100 - penalties, clamped)
  const secondaryScore = Math.max(0, 100 - penalties);

  // Blend scores
  const composite =
    primaryScore * primaryWeight + secondaryScore * secondaryWeight;

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, composite));
}
