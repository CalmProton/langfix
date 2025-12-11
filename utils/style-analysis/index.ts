/**
 * Style Analysis Module
 * AI-powered style, clarity, and conciseness analysis
 */

// Cache implementation
export { StyleAnalysisCache } from './cache';

// Coordinator for managing analysis
export {
  createStyleAnalysisCoordinator,
  StyleAnalysisCoordinator,
} from './coordinator';

// Main engine class and factory
export {
  createStyleAnalysisEngine,
  StyleAnalysisEngine,
} from './engine';

// Prompts
export {
  buildStyleAnalysisPrompt,
  buildStyleSystemPrompt,
  buildStyleUserPrompt,
  countWords,
  estimateTextComplexity,
} from './prompts';

// Types
export type {
  AnyIssueType,
  ClarityIssueType,
  ConcisenessIssueType,
  IssueCategory,
  IssueSeverity,
  SensitivityLevel,
  StyleAnalysisConfig,
  StyleAnalysisMetadata,
  StyleAnalysisRequest,
  StyleAnalysisResponse,
  StyleCacheConfig,
  StyleCacheEntry,
  StyleCacheKey,
  StyleIssue,
  StyleIssueType,
  WritingContext,
} from './types';

export {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DEFAULT_STYLE_ANALYSIS_CONFIG,
  STYLE_ISSUE_LABELS,
} from './types';
export type { StyleParseResult } from './validation';
// Validation utilities
export {
  filterIssuesByCategory,
  safeParseStyleToon,
  sortAndDedupeIssues,
  validateIssues,
} from './validation';
