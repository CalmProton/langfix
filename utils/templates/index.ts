/**
 * Templates Module
 * Writing templates for common writing tasks
 */

// Built-in templates
export {
  BUILT_IN_TEMPLATES,
  getBuiltInTemplate,
  getBuiltInTemplatesByCategory,
} from './built-in';
// Inserter
export {
  createTemplateInserter,
  getTemplateInserter,
  type InsertionMode,
  type InsertionOptions,
  type InsertionResult,
  insertTemplateAtCursor,
  replaceSelectionWithTemplate,
  TemplateInserter,
} from './inserter';
// Template manager
export {
  createTemplateManager,
  getTemplateManager,
  TemplateManager,
} from './manager';
// Parser utilities
export {
  extractPlaceholderKeys,
  generatePreview,
  getPreviewText,
  getSystemVariables,
  keyToLabel,
  parsePlaceholders,
  renderContent,
  renderTemplate,
  renderWithSystemVariables,
  validatePlaceholderSyntax,
  validatePlaceholderValues,
} from './parser';
// Types
export {
  type CreateTemplateInput,
  DEFAULT_TEMPLATE_SETTINGS,
  MAX_CUSTOM_TEMPLATES,
  MAX_RECENTLY_USED,
  PLACEHOLDER_REGEX,
  type Placeholder,
  type PlaceholderType,
  TEMPLATE_CATEGORIES,
  type Template,
  type TemplateCategory,
  type TemplateFilters,
  type TemplateMetadata,
  type TemplateSettings,
  type TemplateUsageEntry,
  type UpdateTemplateInput,
} from './types';
