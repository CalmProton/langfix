/**
 * Style Analysis Engine
 * Core engine for style, clarity, and conciseness analysis
 */
import type { AIProvider, AIRequest, ModelType } from '#utils/types';
import { StyleAnalysisCache } from './cache';
import { buildStyleAnalysisPrompt } from './prompts';
import type {
  IssueCategory,
  StyleAnalysisConfig,
  StyleAnalysisRequest,
  StyleAnalysisResponse,
  StyleIssue,
} from './types';
import { DEFAULT_STYLE_ANALYSIS_CONFIG } from './types';
import {
  safeParseStyleToon,
  sortAndDedupeIssues,
  validateIssues,
} from './validation';

// ============================================================================
// Engine Class
// ============================================================================

export class StyleAnalysisEngine {
  private cache: StyleAnalysisCache;
  private config: StyleAnalysisConfig;

  constructor(
    private provider: AIProvider,
    config?: Partial<StyleAnalysisConfig>,
  ) {
    this.config = { ...DEFAULT_STYLE_ANALYSIS_CONFIG, ...config };
    this.cache = new StyleAnalysisCache(this.config.cacheConfig);
  }

  /**
   * Analyze text for style, clarity, and conciseness issues
   */
  async analyze(request: StyleAnalysisRequest): Promise<StyleAnalysisResponse> {
    const start = performance.now();

    // Handle empty/trivial text
    const trimmed = request.text.trim();
    if (trimmed.length < 10) {
      return {
        issues: [],
        analyzedText: request.text,
        metadata: {
          duration: performance.now() - start,
          model: 'none',
          categories: request.categories || ['style', 'clarity', 'conciseness'],
          fromCache: false,
        },
      };
    }

    // Check cache first
    const cacheKey = this.cache.key({
      text: request.text,
      context: request.context,
      sensitivity: request.sensitivity,
      categories: request.categories,
    });

    const cachedIssues = this.cache.get(cacheKey);
    if (cachedIssues) {
      return {
        issues: cachedIssues,
        analyzedText: request.text,
        metadata: {
          duration: performance.now() - start,
          model: 'cached',
          categories: request.categories || ['style', 'clarity', 'conciseness'],
          fromCache: true,
        },
      };
    }

    // Always use main model for style analysis (needs nuanced understanding)
    const modelType: ModelType = 'main';

    try {
      const issues = await this.performAnalysis(request, modelType);

      // Cache the results
      this.cache.set(cacheKey, issues);

      return {
        issues,
        analyzedText: request.text,
        metadata: {
          duration: performance.now() - start,
          model: modelType,
          categories: request.categories || ['style', 'clarity', 'conciseness'],
          fromCache: false,
        },
      };
    } catch (error) {
      console.error('Style analysis failed:', error);
      throw new Error(`Failed to analyze text style: ${String(error)}`);
    }
  }

  /**
   * Perform the actual analysis via AI provider
   */
  private async performAnalysis(
    request: StyleAnalysisRequest,
    modelType: ModelType,
  ): Promise<StyleIssue[]> {
    const { systemPrompt, userPrompt } = buildStyleAnalysisPrompt(request);

    const aiRequest: AIRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      modelType,
      temperature: this.config.temperature,
    };

    const response = await this.provider.sendRequest(aiRequest);

    // Parse TOON response
    const { issues, warnings } = safeParseStyleToon(
      response.content,
      request.text,
    );

    if (warnings.length > 0) {
      console.warn('Style analysis warnings:', warnings);
    }

    // Validate and clean up issues
    const validatedIssues = validateIssues(issues, request.text);
    const dedupedIssues = sortAndDedupeIssues(validatedIssues);

    return dedupedIssues;
  }

  /**
   * Analyze text in chunks for long documents
   */
  async analyzeChunked(
    request: StyleAnalysisRequest,
  ): Promise<StyleAnalysisResponse> {
    const start = performance.now();
    const { text, ...options } = request;

    // Split into chunks if needed
    if (text.length <= this.config.maxChunkSize) {
      return this.analyze(request);
    }

    const chunks = this.splitIntoChunks(
      text,
      this.config.maxChunkSize,
      this.config.chunkOverlap,
    );
    const allIssues: StyleIssue[] = [];

    // Analyze each chunk
    for (const chunk of chunks) {
      const chunkResult = await this.analyze({
        text: chunk.text,
        ...options,
      });

      // Adjust indices for chunk offset
      const adjustedIssues = chunkResult.issues.map((issue) => ({
        ...issue,
        startIndex: issue.startIndex + chunk.offset,
        endIndex: issue.endIndex + chunk.offset,
      }));

      allIssues.push(...adjustedIssues);
    }

    // Dedupe across chunk boundaries
    const dedupedIssues = sortAndDedupeIssues(allIssues);

    return {
      issues: dedupedIssues,
      analyzedText: text,
      metadata: {
        duration: performance.now() - start,
        model: 'main',
        categories: options.categories || ['style', 'clarity', 'conciseness'],
        fromCache: false,
      },
    };
  }

  /**
   * Split text into overlapping chunks for analysis
   */
  private splitIntoChunks(
    text: string,
    maxLength: number,
    overlap: number,
  ): Array<{ text: string; offset: number }> {
    const chunks: Array<{ text: string; offset: number }> = [];
    let start = 0;

    while (start < text.length) {
      // Find a good break point (sentence boundary preferred)
      let end = Math.min(start + maxLength, text.length);

      if (end < text.length) {
        // Try to break at sentence boundary
        const sentenceEnd = text.lastIndexOf('.', end);
        if (sentenceEnd > start + maxLength / 2) {
          end = sentenceEnd + 1;
        } else {
          // Fall back to word boundary
          const wordEnd = text.lastIndexOf(' ', end);
          if (wordEnd > start + maxLength / 2) {
            end = wordEnd;
          }
        }
      }

      chunks.push({
        text: text.substring(start, end),
        offset: start,
      });

      // Move start, accounting for overlap
      start = end - overlap;
      if (start < 0) start = 0;

      // Avoid infinite loop
      if (start >= text.length) break;
      if (end === text.length) break;
    }

    return chunks;
  }

  /**
   * Get issues by category
   */
  filterByCategory(
    issues: StyleIssue[],
    categories: IssueCategory[],
  ): StyleIssue[] {
    const categorySet = new Set(categories);
    return issues.filter((issue) => categorySet.has(issue.category));
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new style analysis engine
 */
export function createStyleAnalysisEngine(
  provider: AIProvider,
  config?: Partial<StyleAnalysisConfig>,
): StyleAnalysisEngine {
  return new StyleAnalysisEngine(provider, config);
}
