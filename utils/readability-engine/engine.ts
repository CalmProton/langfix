/**
 * Readability Engine
 * Core engine for readability scoring and per-sentence analysis
 *
 * Computes readability metrics locally using Flesch Reading Ease and
 * secondary factors. Optionally refines results using AI model.
 */
import type { AIProvider } from '../types';
import { ReadabilityCache } from './cache';
import {
  calculateCompositeScore,
  calculateReadabilityMetrics,
  getGradeLevel,
  scoreToLevel,
} from './flesch';
import { detectLanguage } from './language';
import { hasPassiveVoice } from './passive-voice';
import {
  countTextSyllables,
  countWords,
  getAverageWordLength,
  getComplexWordRatio,
  splitIntoSentences,
} from './syllables';
import type {
  OverallScore,
  ReadabilityEngineConfig,
  ReadabilityRequest,
  ReadabilityResult,
  ReadabilitySource,
  SentenceScore,
} from './types';
import { DEFAULT_READABILITY_CONFIG } from './types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate stable ID for a sentence based on content and position
 */
function generateSentenceId(text: string, start: number, end: number): string {
  // Simple hash based on text and position
  let hash = 0;
  const combined = `${start}:${end}:${text.slice(0, 50)}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `s_${Math.abs(hash).toString(36)}`;
}

/**
 * Compute reasons why a sentence is hard/easy to read
 */
function computeReasons(
  score: number,
  wordCount: number,
  avgWordLength: number,
  complexRatio: number,
  hasPassive: boolean,
  config: ReadabilityEngineConfig,
): string[] {
  const reasons: string[] = [];

  // Long sentence
  if (wordCount > 25) {
    reasons.push('Long sentence');
  } else if (wordCount > 20) {
    reasons.push('Moderately long sentence');
  }

  // Complex words
  if (complexRatio > 0.25) {
    reasons.push('Many complex words');
  } else if (complexRatio > 0.15) {
    reasons.push('Some complex words');
  }

  // Long average word length
  if (avgWordLength > 7) {
    reasons.push('Long words');
  }

  // Passive voice
  if (hasPassive) {
    reasons.push('Passive voice');
  }

  // Easy indicators
  if (score >= config.easyThreshold) {
    if (wordCount <= 15) {
      reasons.push('Short, clear sentence');
    }
    if (complexRatio < 0.1) {
      reasons.push('Simple vocabulary');
    }
  }

  // Default reason if none found
  if (reasons.length === 0) {
    if (score >= config.easyThreshold) {
      reasons.push('Good readability');
    } else if (score <= config.hardThreshold) {
      reasons.push('Complex structure');
    } else {
      reasons.push('Average readability');
    }
  }

  return reasons;
}

// ============================================================================
// Readability Engine Class
// ============================================================================

export class ReadabilityEngine {
  private cache: ReadabilityCache;
  private config: ReadabilityEngineConfig;

  constructor(
    private provider?: AIProvider,
    config?: Partial<ReadabilityEngineConfig>,
  ) {
    this.config = { ...DEFAULT_READABILITY_CONFIG, ...config };
    this.cache = new ReadabilityCache(this.config.cacheConfig);
  }

  /**
   * Analyze text for readability
   *
   * @param request - Analysis request
   * @returns Readability result with overall and per-sentence scores
   */
  async analyze(request: ReadabilityRequest): Promise<ReadabilityResult> {
    const start = performance.now();

    // Check for empty text
    const trimmed = request.text.trim();
    if (trimmed.length < 5) {
      return this.createEmptyResult(request.text, start);
    }

    // Check language
    const language = detectLanguage(request.text);
    if (language === 'unknown') {
      return this.createUnknownLanguageResult(request.text, start);
    }

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = this.cache.key({
        text: request.text,
        useModelRefinement: request.useModelRefinement,
      });

      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          processingTime: performance.now() - start,
          fromCache: true,
        };
      }
    }

    // Compute local scores
    const sentences = request.sentenceBoundaries
      ? request.sentenceBoundaries.map((b) => ({
          ...b,
          text: request.text.slice(b.start, b.end).trim(),
        }))
      : splitIntoSentences(request.text);

    const sentenceScores = this.scoreSentences(sentences);
    const overall = this.computeOverallScore(request.text, sentenceScores);

    let source: ReadabilitySource = 'local';
    let finalSentences = sentenceScores;

    // Optional model refinement
    if (request.useModelRefinement && this.provider) {
      try {
        const refined = await this.refineWithModel(sentenceScores);
        if (refined) {
          finalSentences = refined;
          source = 'blended';
        }
      } catch (error) {
        console.warn('Model refinement failed, using local only:', error);
      }
    }

    const result: ReadabilityResult = {
      overall,
      sentences: finalSentences,
      language,
      computedAt: Date.now(),
      source,
      processingTime: performance.now() - start,
    };

    // Cache the result
    if (this.config.enableCache) {
      const cacheKey = this.cache.key({
        text: request.text,
        useModelRefinement: request.useModelRefinement,
      });
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Score individual sentences
   */
  private scoreSentences(
    sentences: Array<{ start: number; end: number; text: string }>,
  ): SentenceScore[] {
    return sentences.map((sentence) => {
      const text = sentence.text;
      const wordCount = countWords(text);
      const syllableCount = countTextSyllables(text);
      const tokenCount = text.split(/\s+/).length;

      // Calculate metrics
      const metrics = calculateReadabilityMetrics(
        wordCount,
        1, // Single sentence
        syllableCount,
        this.config.easyThreshold,
        this.config.hardThreshold,
      );

      const avgWordLength = getAverageWordLength(text);
      const complexRatio = getComplexWordRatio(text);
      const hasPassive = hasPassiveVoice(text);

      // Calculate composite score
      const compositeScore = calculateCompositeScore({
        fleschScore: metrics.fleschScore,
        complexWordRatio: complexRatio,
        avgSentenceLength: wordCount,
        hasPassiveVoice: hasPassive,
      });

      const level = scoreToLevel(
        compositeScore,
        this.config.easyThreshold,
        this.config.hardThreshold,
      );

      const reasons = computeReasons(
        compositeScore,
        wordCount,
        avgWordLength,
        complexRatio,
        hasPassive,
        this.config,
      );

      return {
        id: generateSentenceId(text, sentence.start, sentence.end),
        range: { start: sentence.start, end: sentence.end },
        score: Math.round(compositeScore),
        level,
        reasons,
        tokenCount,
        wordCount,
        syllableCount,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        complexWordRatio: Math.round(complexRatio * 100) / 100,
        hasPassiveVoice: hasPassive,
      };
    });
  }

  /**
   * Compute overall document score
   */
  private computeOverallScore(
    text: string,
    sentences: SentenceScore[],
  ): OverallScore {
    const wordCount = countWords(text);
    const syllableCount = countTextSyllables(text);
    const sentenceCount = sentences.length || 1;

    const metrics = calculateReadabilityMetrics(
      wordCount,
      sentenceCount,
      syllableCount,
      this.config.easyThreshold,
      this.config.hardThreshold,
    );

    // Aggregate reasons from sentences
    const reasonCounts = new Map<string, number>();
    for (const s of sentences) {
      for (const reason of s.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }
    }

    // Get top reasons
    const topReasons = [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason]) => reason);

    // Add overall-level reasons
    const overallReasons: string[] = [];
    if (metrics.avgWordsPerSentence > 20) {
      overallReasons.push('Long average sentence length');
    }
    if (metrics.avgSyllablesPerWord > 1.8) {
      overallReasons.push('Complex vocabulary');
    }

    return {
      score: Math.round(metrics.fleschScore),
      level: metrics.level,
      reasons: [...overallReasons, ...topReasons].slice(0, 5),
      gradeLevel: getGradeLevel(metrics.fleschScore),
      fleschScore: Math.round(metrics.fleschScore * 10) / 10,
      wordCount,
      sentenceCount,
      avgWordsPerSentence: Math.round(metrics.avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(metrics.avgSyllablesPerWord * 100) / 100,
    };
  }

  /**
   * Refine sentence scores using AI model
   */
  private async refineWithModel(
    sentences: SentenceScore[],
  ): Promise<SentenceScore[] | null> {
    if (!this.provider) {
      return null;
    }

    // Get top K hardest sentences
    const hardest = [...sentences]
      .filter((s) => s.level === 'hard' || s.level === 'moderate')
      .sort((a, b) => a.score - b.score)
      .slice(0, this.config.topKSentences);

    if (hardest.length === 0) {
      return sentences; // No hard sentences to refine
    }

    // TODO: Implement model refinement
    // Currently we skip model refinement as we need to store sentence text
    // in SentenceScore or pass it through separately.
    // The local scoring is sufficient for the initial implementation.

    return sentences;
  }

  /**
   * Create empty result for trivial text
   */
  private createEmptyResult(
    _text: string,
    startTime: number,
  ): ReadabilityResult {
    return {
      overall: {
        score: 100,
        level: 'easy',
        reasons: ['Text too short to analyze'],
        gradeLevel: 'N/A',
        fleschScore: 100,
        wordCount: 0,
        sentenceCount: 0,
        avgWordsPerSentence: 0,
        avgSyllablesPerWord: 0,
      },
      sentences: [],
      language: 'en',
      computedAt: Date.now(),
      source: 'local',
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Create result for unknown language
   */
  private createUnknownLanguageResult(
    _text: string,
    startTime: number,
  ): ReadabilityResult {
    return {
      overall: {
        score: 0,
        level: 'unknown',
        reasons: ['Language not supported'],
        gradeLevel: 'N/A',
        fleschScore: 0,
        wordCount: 0,
        sentenceCount: 0,
        avgWordsPerSentence: 0,
        avgSyllablesPerWord: 0,
      },
      sentences: [],
      language: 'unknown',
      computedAt: Date.now(),
      source: 'local',
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.stats();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReadabilityEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Quick readability check without engine instantiation
 * Uses local-only analysis
 *
 * @param text - Text to analyze
 * @returns Readability result
 */
export async function quickAnalyze(text: string): Promise<ReadabilityResult> {
  const engine = new ReadabilityEngine();
  return engine.analyze({ text });
}
