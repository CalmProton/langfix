/**
 * Template Inserter
 * Utilities for inserting templates into text fields
 */
import { renderWithSystemVariables, validatePlaceholderValues } from './parser';
import type { Template } from './types';

// ============================================================================
// Insertion Modes
// ============================================================================

export type InsertionMode =
  /** Insert at current cursor position */
  | 'cursor'
  /** Replace current selection */
  | 'selection'
  /** Replace all content in field */
  | 'replace-all'
  /** Append to end of content */
  | 'append';

export interface InsertionOptions {
  /** How to insert the template */
  mode?: InsertionMode;
  /** Values for placeholders */
  values?: Record<string, string>;
  /** Whether to include system variables */
  includeSystemVariables?: boolean;
  /** Whether to select the inserted text */
  selectAfterInsert?: boolean;
}

export interface InsertionResult {
  success: boolean;
  error?: string;
  insertedText?: string;
  missingPlaceholders?: string[];
}

// ============================================================================
// Template Inserter Class
// ============================================================================

export class TemplateInserter {
  /**
   * Insert template content into an element
   */
  async insert(
    element: HTMLElement | HTMLInputElement | HTMLTextAreaElement,
    template: Template,
    options: InsertionOptions = {},
  ): Promise<InsertionResult> {
    const {
      mode = 'cursor',
      values = {},
      includeSystemVariables = true,
      selectAfterInsert = false,
    } = options;

    // Validate required placeholders
    const missingPlaceholders = validatePlaceholderValues(template, values);
    if (missingPlaceholders.length > 0) {
      // Filter to only truly required (non-system) placeholders
      const systemVars = [
        'date',
        'date_full',
        'date_short',
        'year',
        'month',
        'day',
        'time',
        'time_short',
        'weekday',
        'weekday_short',
      ];
      const trulyMissing = missingPlaceholders.filter(
        (p) => !systemVars.includes(p),
      );
      if (trulyMissing.length > 0 && !includeSystemVariables) {
        return {
          success: false,
          error: `Missing required placeholders: ${trulyMissing.join(', ')}`,
          missingPlaceholders: trulyMissing,
        };
      }
    }

    // Render template content
    const content = includeSystemVariables
      ? renderWithSystemVariables(template.content, values)
      : template.content.replace(
          /\{\{(\w+)\}\}/g,
          (_match, key: string) => values[key] || `{{${key}}}`,
        );

    // Insert based on element type
    if (this.isInputOrTextarea(element)) {
      return this.insertIntoInputTextarea(
        element as HTMLInputElement | HTMLTextAreaElement,
        content,
        mode,
        selectAfterInsert,
      );
    }

    if (element.isContentEditable || element.contentEditable === 'true') {
      return this.insertIntoContentEditable(
        element,
        content,
        mode,
        selectAfterInsert,
      );
    }

    return {
      success: false,
      error: 'Element is not editable',
    };
  }

  /**
   * Insert into input or textarea element
   */
  private insertIntoInputTextarea(
    element: HTMLInputElement | HTMLTextAreaElement,
    content: string,
    mode: InsertionMode,
    selectAfterInsert: boolean,
  ): InsertionResult {
    const { selectionStart, selectionEnd, value } = element;
    let newValue: string;
    let insertStart: number;
    let insertEnd: number;

    switch (mode) {
      case 'cursor':
        insertStart = selectionStart ?? value.length;
        newValue =
          value.slice(0, insertStart) + content + value.slice(insertStart);
        insertEnd = insertStart + content.length;
        break;

      case 'selection':
        insertStart = selectionStart ?? 0;
        insertEnd = insertStart + content.length;
        newValue =
          value.slice(0, insertStart) +
          content +
          value.slice(selectionEnd ?? value.length);
        break;

      case 'replace-all':
        insertStart = 0;
        insertEnd = content.length;
        newValue = content;
        break;

      case 'append':
        insertStart = value.length;
        insertEnd = insertStart + content.length;
        newValue = value + (value.endsWith('\n') ? '' : '\n') + content;
        break;
    }

    // Set value and dispatch events
    element.value = newValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Set selection
    if (selectAfterInsert) {
      element.setSelectionRange(insertStart, insertEnd);
    } else {
      element.setSelectionRange(insertEnd, insertEnd);
    }

    // Focus the element
    element.focus();

    return {
      success: true,
      insertedText: content,
    };
  }

  /**
   * Insert into contenteditable element
   */
  private insertIntoContentEditable(
    element: HTMLElement,
    content: string,
    mode: InsertionMode,
    selectAfterInsert: boolean,
  ): InsertionResult {
    const selection = window.getSelection();

    switch (mode) {
      case 'replace-all':
        element.textContent = content;
        break;

      case 'append': {
        const br = element.innerHTML.endsWith('<br>') ? '' : '\n';
        element.innerHTML += br + this.escapeHtml(content);
        break;
      }

      case 'cursor':
      case 'selection':
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          // Check if selection is within the element
          if (element.contains(range.commonAncestorContainer)) {
            if (mode === 'selection') {
              range.deleteContents();
            }

            // Create text node with content
            const textNode = document.createTextNode(content);
            range.insertNode(textNode);

            // Set cursor position
            if (selectAfterInsert) {
              range.selectNode(textNode);
            } else {
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
            }

            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // Selection not in element, append
            element.innerHTML += this.escapeHtml(content);
          }
        } else {
          // No selection, append
          element.innerHTML += this.escapeHtml(content);
        }
        break;
    }

    // Dispatch events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Focus the element
    element.focus();

    return {
      success: true,
      insertedText: content,
    };
  }

  /**
   * Check if element is input or textarea
   */
  private isInputOrTextarea(element: HTMLElement): boolean {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    );
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let inserterInstance: TemplateInserter | null = null;

/**
 * Get or create the template inserter singleton
 */
export function getTemplateInserter(): TemplateInserter {
  if (!inserterInstance) {
    inserterInstance = new TemplateInserter();
  }
  return inserterInstance;
}

/**
 * Create a new template inserter instance
 */
export function createTemplateInserter(): TemplateInserter {
  return new TemplateInserter();
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Insert template at cursor position
 */
export async function insertTemplateAtCursor(
  element: HTMLElement | HTMLInputElement | HTMLTextAreaElement,
  template: Template,
  values?: Record<string, string>,
): Promise<InsertionResult> {
  const inserter = getTemplateInserter();
  return inserter.insert(element, template, { mode: 'cursor', values });
}

/**
 * Replace selection with template
 */
export async function replaceSelectionWithTemplate(
  element: HTMLElement | HTMLInputElement | HTMLTextAreaElement,
  template: Template,
  values?: Record<string, string>,
): Promise<InsertionResult> {
  const inserter = getTemplateInserter();
  return inserter.insert(element, template, { mode: 'selection', values });
}
