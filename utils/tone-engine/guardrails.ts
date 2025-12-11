/**
 * Tone Engine Guardrails
 * Safety and constraint enforcement for tone detection and rewriting
 */

import { countWords } from './prompts';
import type { ToneLabel, ToneRewriteResult } from './types';
import {
  validateLengthConstraint,
  validatePreservedContent,
} from './validation';

// ============================================================================
// Safety Keywords
// ============================================================================

/**
 * Keywords that indicate legal/formal content that shouldn't be tone-rewritten
 */
const LEGAL_KEYWORDS = [
  'terms of service',
  'terms and conditions',
  'privacy policy',
  'end user license agreement',
  'eula',
  'hereby',
  'notwithstanding',
  'indemnify',
  'liability',
  'confidentiality agreement',
  'non-disclosure',
  'nda',
  'warranty',
  'disclaimer',
];

/**
 * Keywords that indicate potentially sensitive content
 */
const SAFETY_KEYWORDS = [
  'suicide',
  'self-harm',
  'emergency',
  '911',
  'crisis hotline',
  'domestic violence',
  'abuse report',
];

/**
 * PII patterns (basic detection)
 */
const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
  /\b[A-Z]{2}\d{6,9}\b/i, // Passport
];

// ============================================================================
// Tone Shift Validation
// ============================================================================

/**
 * Tone combinations that may be inappropriate
 * (source → target pairs that require confirmation)
 */
const RISKY_TONE_SHIFTS: Array<{
  from: ToneLabel[];
  to: ToneLabel[];
  reason: string;
}> = [
  {
    from: ['apologetic'],
    to: ['confident', 'direct'],
    reason:
      'Shifting from apologetic to confident may undermine the apology context',
  },
  {
    from: ['empathetic'],
    to: ['direct', 'professional'],
    reason:
      'Shifting from empathetic to direct may appear dismissive of concerns',
  },
];

/**
 * Check if a tone shift is risky
 */
export function isRiskyToneShift(
  sourceTone: ToneLabel | undefined,
  targetTone: ToneLabel,
): { risky: boolean; reason?: string } {
  if (!sourceTone) return { risky: false };

  for (const rule of RISKY_TONE_SHIFTS) {
    if (rule.from.includes(sourceTone) && rule.to.includes(targetTone)) {
      return { risky: true, reason: rule.reason };
    }
  }

  return { risky: false };
}

// ============================================================================
// Content Safety Checks
// ============================================================================

/**
 * Check if text contains legal boilerplate
 */
export function containsLegalContent(text: string): boolean {
  const lower = text.toLowerCase();
  return LEGAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Check if text contains safety-sensitive content
 */
export function containsSafetyKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SAFETY_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Check if text contains potential PII
 */
export function containsPII(text: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Comprehensive content safety check
 */
export function checkContentSafety(text: string): {
  safe: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (containsLegalContent(text)) {
    reasons.push('Contains legal/contractual content');
  }

  if (containsSafetyKeywords(text)) {
    reasons.push('Contains safety-sensitive content');
  }

  if (containsPII(text)) {
    reasons.push('May contain personally identifiable information');
  }

  return {
    safe: reasons.length === 0,
    reasons,
  };
}

// ============================================================================
// Rewrite Validation
// ============================================================================

export interface GuardrailResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Validate a rewrite against all guardrails
 */
export function validateRewrite(
  original: string,
  rewrite: ToneRewriteResult,
  maxLengthChangePercent: number = 15,
): GuardrailResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check preserved content
  const preservation = validatePreservedContent(original, rewrite.output);
  if (!preservation.valid) {
    violations.push(...preservation.violations);
  }

  // Check length constraint
  const lengthCheck = validateLengthConstraint(
    original,
    rewrite.output,
    maxLengthChangePercent,
  );
  if (!lengthCheck.valid) {
    violations.push(
      `Length changed by ${lengthCheck.changePercent}%, exceeds ${maxLengthChangePercent}% limit`,
    );
  }

  // Check for empty output
  if (!rewrite.output.trim()) {
    violations.push('Rewrite produced empty output');
  }

  // Warn if significantly shorter (might have lost content)
  const wordChange = Math.abs(
    ((countWords(rewrite.output) - countWords(original)) /
      countWords(original)) *
      100,
  );
  if (wordChange > 30) {
    warnings.push(`Word count changed by ${Math.round(wordChange)}%`);
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings,
  };
}

// ============================================================================
// Pre-Rewrite Checks
// ============================================================================

export interface PreRewriteCheckResult {
  canRewrite: boolean;
  blockReasons: string[];
  warnings: string[];
}

/**
 * Check if text can be safely rewritten
 */
export function checkPreRewrite(
  text: string,
  sourceTone: ToneLabel | undefined,
  targetTone: ToneLabel,
  maxWordCount: number = 800,
): PreRewriteCheckResult {
  const blockReasons: string[] = [];
  const warnings: string[] = [];

  // Check word count limit
  const words = countWords(text);
  if (words > maxWordCount) {
    blockReasons.push(
      `Text exceeds ${maxWordCount} word limit (has ${words} words)`,
    );
  }

  // Check content safety
  const safety = checkContentSafety(text);
  if (!safety.safe) {
    blockReasons.push(...safety.reasons);
  }

  // Check risky tone shift
  const toneShift = isRiskyToneShift(sourceTone, targetTone);
  if (toneShift.risky) {
    warnings.push(toneShift.reason || 'Risky tone shift detected');
  }

  // Check if text is too short for meaningful rewrite
  if (words < 3) {
    blockReasons.push('Text is too short for meaningful rewrite');
  }

  return {
    canRewrite: blockReasons.length === 0,
    blockReasons,
    warnings,
  };
}

// ============================================================================
// Export All Guardrail Functions
// ============================================================================

export const guardrails = {
  isRiskyToneShift,
  containsLegalContent,
  containsSafetyKeywords,
  containsPII,
  checkContentSafety,
  validateRewrite,
  checkPreRewrite,
};
