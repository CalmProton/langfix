/**
 * Template Types
 * TypeBox schemas for writing templates
 */
import { type Static, Type } from '@sinclair/typebox';

// ============================================================================
// Template Categories
// ============================================================================

export const TemplateCategory = Type.Union([
  Type.Literal('email'),
  Type.Literal('social'),
  Type.Literal('business'),
  Type.Literal('academic'),
  Type.Literal('creative'),
  Type.Literal('technical'),
  Type.Literal('custom'),
]);
export type TemplateCategory = Static<typeof TemplateCategory>;

export const TEMPLATE_CATEGORIES: {
  id: TemplateCategory;
  label: string;
  icon: string;
}[] = [
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'social', label: 'Social', icon: '📱' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'academic', label: 'Academic', icon: '📚' },
  { id: 'creative', label: 'Creative', icon: '✨' },
  { id: 'technical', label: 'Technical', icon: '⚙️' },
  { id: 'custom', label: 'Custom', icon: '📝' },
];

// ============================================================================
// Placeholder Types
// ============================================================================

export const PlaceholderType = Type.Union([
  Type.Literal('text'),
  Type.Literal('date'),
  Type.Literal('number'),
  Type.Literal('select'),
  Type.Literal('ai-generated'),
]);
export type PlaceholderType = Static<typeof PlaceholderType>;

export const Placeholder = Type.Object({
  /** Placeholder key (e.g., "recipient_name") */
  key: Type.String(),
  /** Display label in UI */
  label: Type.String(),
  /** Optional default value */
  defaultValue: Type.Optional(Type.String()),
  /** Placeholder type */
  type: PlaceholderType,
  /** Options for select type */
  options: Type.Optional(Type.Array(Type.String())),
  /** Prompt for AI-generated type */
  aiPrompt: Type.Optional(Type.String()),
  /** Whether this placeholder is required */
  required: Type.Boolean({ default: true }),
});
export type Placeholder = Static<typeof Placeholder>;

// ============================================================================
// Template Metadata
// ============================================================================

export const TemplateMetadata = Type.Object({
  /** Original author */
  author: Type.Optional(Type.String()),
  /** Source of the template */
  source: Type.Optional(
    Type.Union([
      Type.Literal('built-in'),
      Type.Literal('custom'),
      Type.Literal('imported'),
    ]),
  ),
  /** How many times this template has been used */
  usageCount: Type.Optional(Type.Number()),
  /** Last time template was used */
  lastUsed: Type.Optional(Type.Number()),
  /** Language of the template content */
  language: Type.Optional(Type.String()),
});
export type TemplateMetadata = Static<typeof TemplateMetadata>;

// ============================================================================
// Template Definition
// ============================================================================

export const Template = Type.Object({
  /** Unique identifier (UUID) */
  id: Type.String(),
  /** Display name */
  name: Type.String(),
  /** Short description */
  description: Type.Optional(Type.String()),
  /** Template body with {{placeholders}} */
  content: Type.String(),
  /** Template category */
  category: TemplateCategory,
  /** Searchable tags */
  tags: Type.Array(Type.String()),
  /** List of placeholders extracted from content */
  placeholders: Type.Array(Placeholder),
  /** Whether this is a built-in template */
  isBuiltIn: Type.Boolean({ default: false }),
  /** Whether user marked as favorite */
  isFavorite: Type.Boolean({ default: false }),
  /** Creation timestamp */
  createdAt: Type.Number(),
  /** Last update timestamp */
  updatedAt: Type.Number(),
  /** Additional metadata */
  metadata: Type.Optional(TemplateMetadata),
});
export type Template = Static<typeof Template>;

// ============================================================================
// Template Storage
// ============================================================================

export const TemplateUsageEntry = Type.Object({
  id: Type.String(),
  usedAt: Type.Number(),
});
export type TemplateUsageEntry = Static<typeof TemplateUsageEntry>;

export const TemplateSettings = Type.Object({
  /** Show built-in templates */
  showBuiltIn: Type.Boolean({ default: true }),
  /** Default category for new templates */
  defaultCategory: TemplateCategory,
  /** Sort order */
  sortBy: Type.Union([
    Type.Literal('name'),
    Type.Literal('recent'),
    Type.Literal('usage'),
  ]),
});
export type TemplateSettings = Static<typeof TemplateSettings>;

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  showBuiltIn: true,
  defaultCategory: 'custom',
  sortBy: 'recent',
};

// ============================================================================
// Template Filters
// ============================================================================

export interface TemplateFilters {
  /** Filter by category */
  category?: TemplateCategory;
  /** Filter by tags */
  tags?: string[];
  /** Search query (searches name, description, tags) */
  query?: string;
  /** Show only favorites */
  favoritesOnly?: boolean;
  /** Show built-in templates */
  includeBuiltIn?: boolean;
  /** Show custom templates */
  includeCustom?: boolean;
}

// ============================================================================
// Template Input Types
// ============================================================================

export type CreateTemplateInput = Omit<
  Template,
  'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn' | 'placeholders'
>;

export type UpdateTemplateInput = Partial<
  Omit<Template, 'id' | 'createdAt' | 'isBuiltIn'>
>;

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of custom templates allowed */
export const MAX_CUSTOM_TEMPLATES = 200;

/** Maximum recently used templates to track */
export const MAX_RECENTLY_USED = 20;

/** Placeholder regex pattern */
export const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;
