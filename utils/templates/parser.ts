/**
 * Template Parser
 * Utilities for parsing placeholders and rendering templates
 */
import { PLACEHOLDER_REGEX, type Placeholder, type Template } from './types';

// ============================================================================
// Placeholder Extraction
// ============================================================================

/**
 * Extract placeholder keys from template content
 * @param content Template content with {{placeholders}}
 * @returns Array of unique placeholder keys
 */
export function extractPlaceholderKeys(content: string): string[] {
  const matches: string[] = [];

  // Reset regex state
  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');

  for (const match of content.matchAll(regex)) {
    const key = match[1];
    if (!matches.includes(key)) {
      matches.push(key);
    }
  }

  return matches;
}

/**
 * Convert placeholder key to display label
 * e.g., "recipient_name" -> "Recipient Name"
 */
export function keyToLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse placeholders from template content
 * Creates Placeholder objects with inferred types and labels
 */
export function parsePlaceholders(content: string): Placeholder[] {
  const keys = extractPlaceholderKeys(content);

  return keys.map((key) => ({
    key,
    label: keyToLabel(key),
    type: inferPlaceholderType(key),
    required: !key.toLowerCase().includes('optional'),
  }));
}

/**
 * Infer placeholder type from key name
 */
function inferPlaceholderType(key: string): Placeholder['type'] {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('date') || lowerKey.includes('time')) {
    return 'date';
  }
  if (
    lowerKey.includes('count') ||
    lowerKey.includes('number') ||
    lowerKey.includes('amount')
  ) {
    return 'number';
  }

  return 'text';
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render template with provided values
 * @param template Template to render
 * @param values Key-value pairs for placeholders
 * @returns Rendered template content
 */
export function renderTemplate(
  template: Template,
  values: Record<string, string>,
): string {
  return renderContent(template.content, values);
}

/**
 * Render content string with placeholder values
 * @param content Content with {{placeholders}}
 * @param values Key-value pairs for placeholders
 * @returns Rendered content
 */
export function renderContent(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(PLACEHOLDER_REGEX, (_match, key: string) => {
    // Return value if provided, otherwise keep placeholder
    if (key in values && values[key] !== '') {
      return values[key];
    }
    return `{{${key}}}`;
  });
}

/**
 * Render template with system variables
 * Auto-fills common variables like date, time, etc.
 */
export function renderWithSystemVariables(
  content: string,
  values: Record<string, string> = {},
): string {
  const systemValues = getSystemVariables();
  const mergedValues = { ...systemValues, ...values };
  return renderContent(content, mergedValues);
}

/**
 * Get system variables for auto-fill
 */
export function getSystemVariables(): Record<string, string> {
  const now = new Date();

  return {
    // Date formats
    date: now.toLocaleDateString(),
    date_full: now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    date_short: now.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    year: now.getFullYear().toString(),
    month: now.toLocaleDateString(undefined, { month: 'long' }),
    day: now.getDate().toString(),

    // Time formats
    time: now.toLocaleTimeString(),
    time_short: now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),

    // Day of week
    weekday: now.toLocaleDateString(undefined, { weekday: 'long' }),
    weekday_short: now.toLocaleDateString(undefined, { weekday: 'short' }),
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that all required placeholders have values
 * @returns Array of missing required placeholder keys
 */
export function validatePlaceholderValues(
  template: Template,
  values: Record<string, string>,
): string[] {
  const missing: string[] = [];

  for (const placeholder of template.placeholders) {
    if (placeholder.required) {
      const value = values[placeholder.key];
      if (value === undefined || value === '') {
        missing.push(placeholder.key);
      }
    }
  }

  return missing;
}

/**
 * Check if template content has valid placeholder syntax
 */
export function validatePlaceholderSyntax(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unmatched braces
  const openBraces = (content.match(/\{\{/g) || []).length;
  const closeBraces = (content.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push('Mismatched placeholder braces {{ }}');
  }

  // Check for empty placeholders
  if (/\{\{\s*\}\}/.test(content)) {
    errors.push('Empty placeholder found: {{}}');
  }

  // Check for invalid characters in placeholder keys
  const invalidPlaceholders = content.match(
    /\{\{[^}]*[^a-zA-Z0-9_}][^}]*\}\}/g,
  );
  if (invalidPlaceholders) {
    errors.push(
      `Invalid placeholder keys (use only letters, numbers, underscore): ${invalidPlaceholders.join(', ')}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Preview Generation
// ============================================================================

/**
 * Generate preview content with sample values
 */
export function generatePreview(template: Template): string {
  const sampleValues: Record<string, string> = {};

  for (const placeholder of template.placeholders) {
    sampleValues[placeholder.key] =
      placeholder.defaultValue || `[${placeholder.label}]`;
  }

  return renderWithSystemVariables(template.content, sampleValues);
}

/**
 * Get preview text (truncated for display)
 */
export function getPreviewText(template: Template, maxLength = 150): string {
  const preview = generatePreview(template);
  if (preview.length <= maxLength) {
    return preview;
  }
  return `${preview.slice(0, maxLength)}...`;
}
