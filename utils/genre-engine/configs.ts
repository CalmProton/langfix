/**
 * Genre Configurations
 * Built-in genre configurations for different writing contexts
 */
import type { GenreConfig } from './types';

// ============================================================================
// Academic Genre
// ============================================================================

export const ACADEMIC_GENRE: GenreConfig = {
  id: 'academic',
  name: 'Academic',
  description:
    'Formal writing for research papers, essays, and academic publications',
  icon: '🎓',
  formality: 'high',
  allowContractions: false,
  preferredPerson: 'third',
  vocabularyLevel: 'advanced',
  sentenceComplexity: 'high',
  passiveVoice: 'acceptable',
  jargonLevel: 'domain-specific',
  objectiveTone: true,
  systemPromptSuffix: `Apply academic writing standards:
- Use formal, scholarly tone
- Avoid contractions and colloquialisms
- Prefer third-person perspective
- Use precise, technical vocabulary
- Maintain objectivity and evidence-based claims
- Ensure logical flow and clear argumentation`,
  grammarCheckModifiers: [
    'Flag contractions',
    'Flag first-person usage unless quoting',
    'Flag colloquial expressions',
    'Verify consistent terminology',
  ],
  styleCheckModifiers: [
    'Check for clear thesis statements',
    'Verify logical transitions between paragraphs',
    'Flag informal language',
    'Check for hedging language appropriateness',
  ],
  rewriteInstructions:
    'Rewrite in formal academic style while maintaining clarity and precision.',
};

// ============================================================================
// Business Genre
// ============================================================================

export const BUSINESS_GENRE: GenreConfig = {
  id: 'business',
  name: 'Business',
  description:
    'Professional communication for emails, reports, and business documents',
  icon: '💼',
  formality: 'medium-high',
  allowContractions: false,
  preferredPerson: 'first',
  vocabularyLevel: 'professional',
  sentenceComplexity: 'medium',
  passiveVoice: 'avoid',
  jargonLevel: 'business-standard',
  systemPromptSuffix: `Apply business writing standards:
- Use clear, professional tone
- Be concise and action-oriented
- Focus on results and outcomes
- Use active voice
- Maintain respectful, diplomatic language
- Structure for easy scanning`,
  grammarCheckModifiers: [
    'Flag contractions',
    'Flag passive voice constructions',
    'Flag overly casual language',
    'Verify professional tone',
  ],
  styleCheckModifiers: [
    'Check for action-oriented language',
    'Flag unnecessary jargon',
    'Verify clear calls to action',
    'Flag unnecessarily complex sentences',
  ],
  rewriteInstructions:
    'Rewrite in clear, professional business style that is concise and action-oriented.',
};

// ============================================================================
// Creative Genre
// ============================================================================

export const CREATIVE_GENRE: GenreConfig = {
  id: 'creative',
  name: 'Creative',
  description: 'Expressive writing for stories, blogs, and creative content',
  icon: '✍️',
  formality: 'low',
  allowContractions: true,
  preferredPerson: 'flexible',
  vocabularyLevel: 'varied',
  sentenceComplexity: 'varied',
  passiveVoice: 'flexible',
  jargonLevel: 'avoid',
  allowedFragments: true,
  systemPromptSuffix: `Apply creative writing principles:
- Allow expressive, varied tone
- Encourage descriptive language and imagery
- Support varied sentence structures
- Allow intentional rule-breaking for style
- Focus on showing rather than telling
- Maintain character voice consistency`,
  grammarCheckModifiers: [
    'Allow intentional fragments',
    'Allow varied sentence structures',
    'Flag clichés',
    'Check for clichés',
  ],
  styleCheckModifiers: [
    'Check for overused words',
    'Suggest stronger verbs and vivid descriptions',
    'Flag telling instead of showing',
    'Verify varied sentence structure',
  ],
  rewriteInstructions:
    'Rewrite with creative flair while maintaining clarity and engagement.',
};

// ============================================================================
// Technical Genre
// ============================================================================

export const TECHNICAL_GENRE: GenreConfig = {
  id: 'technical',
  name: 'Technical',
  description: 'Clear documentation, manuals, and technical specifications',
  icon: '⚙️',
  formality: 'medium',
  allowContractions: false,
  preferredPerson: 'second',
  vocabularyLevel: 'technical',
  sentenceComplexity: 'low',
  passiveVoice: 'avoid',
  jargonLevel: 'technical-standard',
  consistentTerminology: true,
  systemPromptSuffix: `Apply technical writing standards:
- Use clear, unambiguous instructions
- Maintain consistent terminology
- Use active voice for procedures
- Keep sentences short and direct
- Structure as step-by-step when appropriate
- Define technical terms when first used`,
  grammarCheckModifiers: [
    'Flag inconsistent terminology',
    'Flag passive voice in instructions',
    'Verify numbered lists are sequential',
    'Flag overly complex sentences',
  ],
  styleCheckModifiers: [
    'Check for clear sequential steps',
    'Verify terminology consistency',
    'Flag ambiguous instructions',
    'Flag unnecessary complexity',
  ],
  rewriteInstructions:
    'Rewrite for maximum clarity and precision using consistent technical terminology.',
};

// ============================================================================
// Casual Genre
// ============================================================================

export const CASUAL_GENRE: GenreConfig = {
  id: 'casual',
  name: 'Casual',
  description:
    'Conversational writing for social media and personal communication',
  icon: '💬',
  formality: 'low',
  allowContractions: true,
  preferredPerson: 'first',
  vocabularyLevel: 'everyday',
  sentenceComplexity: 'low',
  passiveVoice: 'avoid',
  jargonLevel: 'avoid',
  allowedEmoticons: true,
  relaxedPunctuation: true,
  systemPromptSuffix: `Apply casual writing style:
- Use conversational, friendly tone
- Allow contractions and informal language
- Keep it simple and accessible
- Allow personal voice and opinions
- Focus on readability over formality
- Support emotive language`,
  grammarCheckModifiers: [
    'Allow contractions',
    'Allow informal expressions',
    'Flag overly formal language',
    'Allow relaxed punctuation',
  ],
  styleCheckModifiers: [
    'Check for overly formal language',
    'Flag stiff or robotic phrasing',
    'Flag unnecessarily complex words',
  ],
  rewriteInstructions:
    'Rewrite in a friendly, conversational style that feels natural and approachable.',
};

// ============================================================================
// Journalistic Genre
// ============================================================================

export const JOURNALISTIC_GENRE: GenreConfig = {
  id: 'journalistic',
  name: 'Journalistic',
  description: 'Clear, factual writing for news articles and blog posts',
  icon: '📰',
  formality: 'medium',
  allowContractions: false,
  preferredPerson: 'third',
  vocabularyLevel: 'everyday',
  sentenceComplexity: 'low',
  passiveVoice: 'avoid',
  jargonLevel: 'avoid',
  objectiveTone: true,
  systemPromptSuffix: `Apply journalistic writing standards:
- Use clear, factual, objective tone
- Follow inverted pyramid structure (most important info first)
- Use active voice
- Keep paragraphs short (1-3 sentences)
- Handle quotations properly
- Optimize lead/opening sentences`,
  grammarCheckModifiers: [
    'Flag passive voice',
    'Flag first-person statements',
    'Verify quote attribution',
    'Flag opinion as fact',
  ],
  styleCheckModifiers: [
    'Check for strong lead sentences',
    'Verify inverted pyramid structure',
    'Flag buried leads',
    'Check paragraph length',
  ],
  rewriteInstructions:
    'Rewrite in clear, factual journalistic style with strong leads and objective tone.',
};

// ============================================================================
// Legal Genre
// ============================================================================

export const LEGAL_GENRE: GenreConfig = {
  id: 'legal',
  name: 'Legal',
  description: 'Precise language for contracts, policies, and legal documents',
  icon: '⚖️',
  formality: 'very-high',
  allowContractions: false,
  preferredPerson: 'third',
  vocabularyLevel: 'legal',
  sentenceComplexity: 'high',
  passiveVoice: 'acceptable',
  jargonLevel: 'legal-standard',
  requireDefinedTerms: true,
  consistentTerminology: true,
  systemPromptSuffix: `Apply legal writing standards:
- Use extremely precise language
- Define all key terms
- Avoid ambiguity at all costs
- Maintain formal structure
- Use clause-based organization
- Reference defined terms consistently`,
  grammarCheckModifiers: [
    'Flag undefined terms',
    'Verify defined term consistency',
    'Flag ambiguous references',
    'Check parallel structure in lists',
  ],
  styleCheckModifiers: [
    'Verify term definitions',
    'Check for ambiguous pronouns',
    'Flag vague quantifiers',
    'Verify consistent clause structure',
  ],
  rewriteInstructions:
    'Rewrite with legal precision, ensuring all terms are defined and language is unambiguous.',
};

// ============================================================================
// All Built-in Genres
// ============================================================================

export const BUILT_IN_GENRES: GenreConfig[] = [
  ACADEMIC_GENRE,
  BUSINESS_GENRE,
  CREATIVE_GENRE,
  TECHNICAL_GENRE,
  CASUAL_GENRE,
  JOURNALISTIC_GENRE,
  LEGAL_GENRE,
];

/**
 * Get a built-in genre by ID
 */
export function getBuiltInGenre(id: string): GenreConfig | undefined {
  return BUILT_IN_GENRES.find((genre) => genre.id === id);
}

/**
 * Map of built-in genres by ID for quick lookup
 */
export const BUILT_IN_GENRES_MAP: Record<string, GenreConfig> = {
  academic: ACADEMIC_GENRE,
  business: BUSINESS_GENRE,
  creative: CREATIVE_GENRE,
  technical: TECHNICAL_GENRE,
  casual: CASUAL_GENRE,
  journalistic: JOURNALISTIC_GENRE,
  legal: LEGAL_GENRE,
};
