/**
 * Reading Time Calculator
 * Calculates estimated reading and speaking times based on word count
 */
import type { TimeMetrics, TimeValue } from './types';

/**
 * Options for time calculations
 */
export interface TimeCalculatorOptions {
  /** Reading speed in words per minute (default: 238) */
  wordsPerMinute?: number;
  /** Speaking speed in words per minute (default: 140) */
  speakingWordsPerMinute?: number;
}

// Default reading speeds
export const DEFAULT_READING_WPM = 238; // Average adult reading speed
export const DEFAULT_SPEAKING_WPM = 140; // Average presentation speaking speed

// Speed presets for user selection
export const READING_SPEED_PRESETS = {
  slow: 150,
  average: 238,
  fast: 300,
} as const;

export const SPEAKING_SPEED_PRESETS = {
  slow: 100,
  average: 140,
  fast: 180,
} as const;

/**
 * ReadingTimeCalculator class
 * Provides methods to calculate reading and speaking times
 */
export class ReadingTimeCalculator {
  private wpm: number;
  private speakingWpm: number;

  constructor(options: TimeCalculatorOptions = {}) {
    this.wpm = options.wordsPerMinute ?? DEFAULT_READING_WPM;
    this.speakingWpm = options.speakingWordsPerMinute ?? DEFAULT_SPEAKING_WPM;
  }

  /**
   * Update reading speed
   */
  public setReadingSpeed(wpm: number): void {
    this.wpm = Math.max(50, Math.min(500, wpm));
  }

  /**
   * Update speaking speed
   */
  public setSpeakingSpeed(wpm: number): void {
    this.speakingWpm = Math.max(50, Math.min(300, wpm));
  }

  /**
   * Calculate reading time from word count
   *
   * @param wordCount - Number of words
   * @returns TimeValue with minutes and seconds
   */
  public calculateReadingTime(wordCount: number): TimeValue {
    const totalMinutes = wordCount / this.wpm;
    return this.formatTime(totalMinutes);
  }

  /**
   * Calculate speaking time from word count
   *
   * @param wordCount - Number of words
   * @returns TimeValue with minutes and seconds
   */
  public calculateSpeakingTime(wordCount: number): TimeValue {
    const totalMinutes = wordCount / this.speakingWpm;
    return this.formatTime(totalMinutes);
  }

  /**
   * Calculate both reading and speaking times
   *
   * @param wordCount - Number of words
   * @returns TimeMetrics with both times
   */
  public calculateTimes(wordCount: number): TimeMetrics {
    return {
      readingTime: this.calculateReadingTime(wordCount),
      speakingTime: this.calculateSpeakingTime(wordCount),
    };
  }

  /**
   * Format total minutes into minutes and seconds
   */
  private formatTime(totalMinutes: number): TimeValue {
    const minutes = Math.floor(totalMinutes);
    const seconds = Math.round((totalMinutes - minutes) * 60);

    // Handle edge case where seconds rounds to 60
    if (seconds === 60) {
      return { minutes: minutes + 1, seconds: 0 };
    }

    return { minutes, seconds };
  }
}

// Singleton instance for convenience
let calculatorInstance: ReadingTimeCalculator | null = null;

/**
 * Get the singleton ReadingTimeCalculator instance
 */
export function getReadingTimeCalculator(): ReadingTimeCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new ReadingTimeCalculator();
  }
  return calculatorInstance;
}

/**
 * Create a new calculator with custom options
 */
export function createReadingTimeCalculator(
  options: TimeCalculatorOptions,
): ReadingTimeCalculator {
  return new ReadingTimeCalculator(options);
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format TimeValue to a human-readable string
 *
 * @param time - TimeValue object
 * @param suffix - Optional suffix (e.g., "read", "speak")
 * @returns Formatted string like "1m 30s read" or "< 1 min"
 */
export function formatTimeValue(time: TimeValue, suffix?: string): string {
  const { minutes, seconds } = time;

  let formatted: string;

  if (minutes === 0 && seconds === 0) {
    formatted = '< 1 sec';
  } else if (minutes === 0) {
    formatted = `${seconds}s`;
  } else if (seconds === 0) {
    formatted = `${minutes}m`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  return suffix ? `${formatted} ${suffix}` : formatted;
}

/**
 * Format reading time specifically
 */
export function formatReadingTime(wordCount: number, wpm?: number): string {
  const calculator = wpm
    ? new ReadingTimeCalculator({ wordsPerMinute: wpm })
    : getReadingTimeCalculator();
  const time = calculator.calculateReadingTime(wordCount);
  return formatTimeValue(time, 'read');
}

/**
 * Format speaking time specifically
 */
export function formatSpeakingTime(wordCount: number, wpm?: number): string {
  const calculator = wpm
    ? new ReadingTimeCalculator({ speakingWordsPerMinute: wpm })
    : getReadingTimeCalculator();
  const time = calculator.calculateSpeakingTime(wordCount);
  return formatTimeValue(time, 'speak');
}

/**
 * Get estimated page count based on word count
 * Standard: 250 words per page (single-spaced)
 *
 * @param wordCount - Number of words
 * @param wordsPerPage - Words per page (default: 250)
 * @returns Estimated page count
 */
export function estimatePages(
  wordCount: number,
  wordsPerPage: number = 250,
): number {
  return Math.ceil(wordCount / wordsPerPage);
}
