/**
 * Grammar & Writing Analysis Types
 * TypeBox schemas for grammar checking and writing analysis results
 */
import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Grammar Error Types
// ============================================================================

export const GrammarErrorType = Type.Union([
  Type.Literal('grammar'),
  Type.Literal('spelling'),
  Type.Literal('punctuation'),
]);
export type GrammarErrorType = Static<typeof GrammarErrorType>;

export const GrammarError = Type.Object({
  type: GrammarErrorType,
  original: Type.String(),
  suggestion: Type.String(),
  startIndex: Type.Number(), // 0-based, UTF-16 index (matches JS string)
  endIndex: Type.Number(), // 0-based, exclusive
  explanation: Type.String(),
});
export type GrammarError = Static<typeof GrammarError>;

export const GrammarResult = Type.Object({
  errors: Type.Array(GrammarError),
});
export type GrammarResult = Static<typeof GrammarResult>;

// ============================================================================
// Style Analysis Types
// ============================================================================

export const StyleIssueType = Type.Union([
  Type.Literal('passive'),
  Type.Literal('wordiness'),
  Type.Literal('clarity'),
  Type.Literal('filler'),
  Type.Literal('adverb'),
]);
export type StyleIssueType = Static<typeof StyleIssueType>;

export const StyleSeverity = Type.Union([
  Type.Literal('info'),
  Type.Literal('warning'),
]);
export type StyleSeverity = Static<typeof StyleSeverity>;

export const StyleIssue = Type.Object({
  type: StyleIssueType,
  text: Type.String(),
  suggestion: Type.String(),
  startIndex: Type.Number(),
  endIndex: Type.Number(),
  severity: StyleSeverity,
});
export type StyleIssue = Static<typeof StyleIssue>;

export const ReadabilityScore = Type.Object({
  score: Type.Number(),
  grade: Type.String(),
});
export type ReadabilityScore = Static<typeof ReadabilityScore>;

export const StyleResult = Type.Object({
  issues: Type.Array(StyleIssue),
  readability: Type.Optional(ReadabilityScore),
});
export type StyleResult = Static<typeof StyleResult>;

// ============================================================================
// Rewrite Types
// ============================================================================

export const RewriteMode = Type.Union([
  Type.Literal('shorten'),
  Type.Literal('expand'),
  Type.Literal('simplify'),
  Type.Literal('professional'),
  Type.Literal('casual'),
]);
export type RewriteMode = Static<typeof RewriteMode>;

export const RewriteChange = Type.Object({
  from: Type.String(),
  to: Type.String(),
  reason: Type.String(),
});
export type RewriteChange = Static<typeof RewriteChange>;

export const RewriteResult = Type.Object({
  original: Type.String(),
  rewritten: Type.String(),
  changes: Type.Array(RewriteChange),
});
export type RewriteResult = Static<typeof RewriteResult>;

// ============================================================================
// Grammar Context (for providing context to AI)
// ============================================================================

export const FormalityLevel = Type.Union([
  Type.Literal('casual'),
  Type.Literal('neutral'),
  Type.Literal('formal'),
]);
export type FormalityLevel = Static<typeof FormalityLevel>;

export const GrammarContext = Type.Object({
  language: Type.String({ default: 'en' }),
  dialect: Type.Optional(Type.String()), // e.g., 'US', 'UK'
  formalityLevel: Type.Optional(FormalityLevel),
});
export type GrammarContext = Static<typeof GrammarContext>;

// ============================================================================
// Error Response (for AI failure cases)
// ============================================================================

export const ToonError = Type.Object({
  code: Type.String(),
  message: Type.String(),
});
export type ToonError = Static<typeof ToonError>;
