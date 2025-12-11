/**
 * Style Analysis Types
 * Types for style, clarity, and conciseness analysis
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Issue Types
// ============================================================================

export const StyleIssueType = Type.Union([
  Type.Literal('passive-voice'),
  Type.Literal('weak-verb'),
  Type.Literal('overused-word'),
  Type.Literal('cliche'),
  Type.Literal('nominalization'),
  Type.Literal('hedge-word'),
]);
export type StyleIssueType = Static<typeof StyleIssueType>;

export const ClarityIssueType = Type.Union([
  Type.Literal('vague-language'),
  Type.Literal('complex-sentence'),
  Type.Literal('ambiguous-pronoun'),
  Type.Literal('jargon'),
  Type.Literal('double-negative'),
  Type.Literal('abstract-language'),
]);
export type ClarityIssueType = Static<typeof ClarityIssueType>;

export const ConcisenessIssueType = Type.Union([
  Type.Literal('redundancy'),
  Type.Literal('filler-word'),
  Type.Literal('wordy-phrase'),
  Type.Literal('excessive-qualifier'),
  Type.Literal('needless-adverb'),
]);
export type ConcisenessIssueType = Static<typeof ConcisenessIssueType>;

export const IssueCategory = Type.Union([
  Type.Literal('style'),
  Type.Literal('clarity'),
  Type.Literal('conciseness'),
]);
export type IssueCategory = Static<typeof IssueCategory>;

export const IssueSeverity = Type.Union([
  Type.Literal('info'),
  Type.Literal('warning'),
]);
export type IssueSeverity = Static<typeof IssueSeverity>;

// Combined issue type
export type AnyIssueType = StyleIssueType | ClarityIssueType | ConcisenessIssueType;

// ============================================================================
// Writing Context
// ============================================================================

export const WritingContext = Type.Union([
  Type.Literal('formal'),
  Type.Literal('casual'),
  Type.Literal('technical'),
  Type.Literal('creative'),
]);
export type WritingContext = Static<typeof WritingContext>;

export const SensitivityLevel = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
]);
export type SensitivityLevel = Static<typeof SensitivityLevel>;

// ============================================================================
// Style Issue Schema
// ============================================================================

export const StyleIssueSchema = Type.Object({
  id: Type.String(),
  category: IssueCategory,
  type: Type.String(), // AnyIssueType as string for flexibility
  severity: IssueSeverity,
  startIndex: Type.Number(),
  endIndex: Type.Number(),
  originalText: Type.String(),
  message: Type.String(),
  explanation: Type.String(),
  suggestions: Type.Array(Type.String()),
  context: Type.Optional(Type.String()),
});
export type StyleIssue = Static<typeof StyleIssueSchema>;

// ============================================================================
// Request/Response Types
// ============================================================================

export interface StyleAnalysisRequest {
  /** The text to analyze */
  text: string;
  /** Writing context for analysis */
  context?: WritingContext;
  /** Sensitivity level for detection */
  sensitivity?: SensitivityLevel;
  /** Categories to analyze */
  categories?: IssueCategory[];
}

export interface StyleAnalysisResponse {
  /** Detected issues */
  issues: StyleIssue[];
  /** The text that was analyzed */
  analyzedText: string;
  /** Analysis metadata */
  metadata: StyleAnalysisMetadata;
}

export interface StyleAnalysisMetadata {
  /** Time taken in milliseconds */
  duration: number;
  /** Model used for analysis */
  model: string;
  /** Categories that were analyzed */
  categories: IssueCategory[];
  /** Whether results came from cache */
  fromCache?: boolean;
}

// ============================================================================
// Engine Configuration
// ============================================================================

export interface StyleAnalysisConfig {
  /** Maximum text length before chunking */
  maxChunkSize: number;
  /** Overlap between chunks for context */
  chunkOverlap: number;
  /** Temperature for AI generation (lower = more deterministic) */
  temperature: number;
  /** Cache configuration */
  cacheConfig: StyleCacheConfig;
}

export interface StyleCacheConfig {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Maximum cache entries */
  maxEntries: number;
  /** Maximum bytes for cache */
  maxBytes: number;
}

export const DEFAULT_STYLE_ANALYSIS_CONFIG: StyleAnalysisConfig = {
  maxChunkSize: 2000,
  chunkOverlap: 200,
  temperature: 0.3,
  cacheConfig: {
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
    maxBytes: 2 * 1024 * 1024, // 2MB
  },
};

// ============================================================================
// Cache Types
// ============================================================================

export interface StyleCacheEntry {
  issues: StyleIssue[];
  timestamp: number;
  hash: string;
}

export interface StyleCacheKey {
  text: string;
  context?: WritingContext;
  sensitivity?: SensitivityLevel;
  categories?: IssueCategory[];
}

// ============================================================================
// Issue Type Descriptions (for UI)
// ============================================================================

export const STYLE_ISSUE_LABELS: Record<string, string> = {
  // Style
  'passive-voice': 'Passive Voice',
  'weak-verb': 'Weak Verb',
  'overused-word': 'Overused Word',
  cliche: 'Cliché',
  nominalization: 'Nominalization',
  'hedge-word': 'Hedge Word',
  // Clarity
  'vague-language': 'Vague Language',
  'complex-sentence': 'Complex Sentence',
  'ambiguous-pronoun': 'Ambiguous Pronoun',
  jargon: 'Jargon',
  'double-negative': 'Double Negative',
  'abstract-language': 'Abstract Language',
  // Conciseness
  redundancy: 'Redundancy',
  'filler-word': 'Filler Word',
  'wordy-phrase': 'Wordy Phrase',
  'excessive-qualifier': 'Excessive Qualifier',
  'needless-adverb': 'Needless Adverb',
};

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  style: 'Style',
  clarity: 'Clarity',
  conciseness: 'Conciseness',
};

export const CATEGORY_COLORS: Record<IssueCategory, string> = {
  style: '#3b82f6', // Blue
  clarity: '#f59e0b', // Amber
  conciseness: '#8b5cf6', // Purple
};
