/**
 * Passive Voice Detector
 * Heuristic-based detection of passive voice constructions
 *
 * Pattern: form of "to be" + past participle
 * Examples: "was written", "is being done", "has been completed"
 */

// ============================================================================
// "To Be" Verb Forms
// ============================================================================

const BE_FORMS = new Set([
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
]);

// Extended patterns including helpers
const PASSIVE_HELPERS = new Set([
  'has',
  'have',
  'had',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'shall',
]);

// ============================================================================
// Past Participle Detection
// ============================================================================

/**
 * Common irregular past participles
 * These don't follow the -ed pattern
 */
const IRREGULAR_PARTICIPLES = new Set([
  'been',
  'born',
  'broken',
  'brought',
  'built',
  'bought',
  'caught',
  'chosen',
  'come',
  'cut',
  'done',
  'drawn',
  'drunk',
  'driven',
  'eaten',
  'fallen',
  'felt',
  'found',
  'forgotten',
  'frozen',
  'given',
  'gone',
  'grown',
  'had',
  'heard',
  'held',
  'hidden',
  'hit',
  'hurt',
  'kept',
  'known',
  'laid',
  'led',
  'left',
  'lent',
  'let',
  'lost',
  'made',
  'meant',
  'met',
  'paid',
  'put',
  'read',
  'ridden',
  'risen',
  'run',
  'said',
  'seen',
  'sent',
  'set',
  'sewn',
  'shaken',
  'shown',
  'shut',
  'slept',
  'sold',
  'sought',
  'spoken',
  'spent',
  'spread',
  'stolen',
  'stood',
  'struck',
  'stuck',
  'sung',
  'sunk',
  'sworn',
  'swept',
  'swum',
  'taken',
  'taught',
  'thought',
  'thrown',
  'told',
  'torn',
  'understood',
  'woken',
  'won',
  'worn',
  'written',
]);

/**
 * Words that end in -ed but are NOT past participles (adjectives)
 */
const FALSE_PARTICIPLES = new Set([
  'excited',
  'interested',
  'bored',
  'tired',
  'surprised',
  'pleased',
  'worried',
  'concerned',
  'confused',
  'disappointed',
  'satisfied',
  'amazed',
  'frustrated',
  'relaxed',
  'stressed',
  'depressed',
  'scared',
  'terrified',
  'fascinated',
  'complicated',
  'dedicated',
  'educated',
  'experienced',
  'talented',
  'sophisticated',
]);

/**
 * Check if a word could be a past participle
 *
 * @param word - Word to check (lowercase)
 * @returns True if word appears to be a past participle
 */
function isPastParticiple(word: string): boolean {
  const lower = word.toLowerCase();

  // Skip false positives
  if (FALSE_PARTICIPLES.has(lower)) {
    return false;
  }

  // Check irregular participles
  if (IRREGULAR_PARTICIPLES.has(lower)) {
    return true;
  }

  // Regular participles end in -ed
  if (lower.endsWith('ed') && lower.length > 3) {
    return true;
  }

  // Some end in -en (e.g., "proven", "frozen" - but these are in irregulars)
  // We're conservative here to avoid false positives

  return false;
}

// ============================================================================
// Passive Voice Detection
// ============================================================================

export interface PassiveVoiceMatch {
  /** The matched passive construction */
  text: string;
  /** Start offset in the original text */
  start: number;
  /** End offset in the original text */
  end: number;
  /** The verb form that indicates passive */
  beVerb: string;
  /** The past participle */
  participle: string;
}

/**
 * Detect passive voice constructions in text
 *
 * Looks for patterns like:
 * - "is written"
 * - "was completed"
 * - "has been done"
 * - "will be reviewed"
 *
 * @param text - Text to analyze
 * @returns Array of passive voice matches
 */
export function detectPassiveVoice(text: string): PassiveVoiceMatch[] {
  const matches: PassiveVoiceMatch[] = [];

  // Tokenize into words with positions
  const wordRegex = /[a-zA-Z]+/g;
  const tokens: Array<{ word: string; start: number; end: number }> = [];

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
  while ((match = wordRegex.exec(text)) !== null) {
    tokens.push({
      word: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Scan for passive patterns
  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i];
    const next = tokens[i + 1];

    // Pattern 1: [be-verb] [participle]
    // e.g., "was written", "is done"
    if (BE_FORMS.has(current.word) && isPastParticiple(next.word)) {
      matches.push({
        text: text.slice(current.start, next.end),
        start: current.start,
        end: next.end,
        beVerb: current.word,
        participle: next.word,
      });
      continue;
    }

    // Pattern 2: [be-verb] being [participle]
    // e.g., "is being written"
    if (
      BE_FORMS.has(current.word) &&
      next.word === 'being' &&
      i + 2 < tokens.length
    ) {
      const participle = tokens[i + 2];
      if (isPastParticiple(participle.word)) {
        matches.push({
          text: text.slice(current.start, participle.end),
          start: current.start,
          end: participle.end,
          beVerb: `${current.word} being`,
          participle: participle.word,
        });
        i += 1; // Skip ahead
        continue;
      }
    }

    // Pattern 3: [helper] be [participle]
    // e.g., "will be reviewed", "could be done"
    if (
      PASSIVE_HELPERS.has(current.word) &&
      next.word === 'be' &&
      i + 2 < tokens.length
    ) {
      const participle = tokens[i + 2];
      if (isPastParticiple(participle.word)) {
        matches.push({
          text: text.slice(current.start, participle.end),
          start: current.start,
          end: participle.end,
          beVerb: `${current.word} be`,
          participle: participle.word,
        });
        i += 1;
        continue;
      }
    }

    // Pattern 4: [helper] been [participle]
    // e.g., "has been completed"
    if (
      PASSIVE_HELPERS.has(current.word) &&
      next.word === 'been' &&
      i + 2 < tokens.length
    ) {
      const participle = tokens[i + 2];
      if (isPastParticiple(participle.word)) {
        matches.push({
          text: text.slice(current.start, participle.end),
          start: current.start,
          end: participle.end,
          beVerb: `${current.word} been`,
          participle: participle.word,
        });
        i += 1;
      }
    }
  }

  return matches;
}

/**
 * Check if text contains any passive voice
 *
 * @param text - Text to check
 * @returns True if passive voice is detected
 */
export function hasPassiveVoice(text: string): boolean {
  return detectPassiveVoice(text).length > 0;
}

/**
 * Count passive voice constructions in text
 *
 * @param text - Text to analyze
 * @returns Number of passive voice instances
 */
export function countPassiveVoice(text: string): number {
  return detectPassiveVoice(text).length;
}
