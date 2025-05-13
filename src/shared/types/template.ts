// SnippetType enum removed as part of placeholder refactoring

/**
 * Defines how a template is triggered.
 */
export enum TriggerType {
  SHORTCUT = 'shortcut',
  // KEYWORD_INPUT = 'keyword_input', // Future extension
  // TERMINAL_EXECUTION = 'terminal_execution', // Future extension
}

/**
 * Represents a single template/keyword item.
 */
export interface TemplateItem {
  /** Unique identifier for the template item. */
  id: string;

  /** User-defined description for the template. */
  description: string;

  /** Whether the template is currently active/enabled. */
  enabled: boolean;

  /** List of keywords that trigger this template. */
  keywords: string[];

  // snippet_type removed as part of placeholder refactoring

  /** The actual content snippet to be inserted or used. */
  snippet_content: string;

  /** How the template is triggered (e.g., 'shortcut', 'keyword'). */
  trigger_type: TriggerType;

  /** Timestamp (Unix epoch milliseconds) when the template was created. */
  created_at: number;

  /** Timestamp (Unix epoch milliseconds) when the template was last updated. */
  updated_at: number;

  /** Optional: The keyboard shortcut combination (e.g., 'Ctrl+Shift+V') if trigger_type is SHORTCUT. */
  shortcut?: string;

  // Optional: Add category ID if implementing categories
  // category_id?: string;
}

/**
 * Optional: Represents a category for organizing templates.
 */
// export interface TemplateCategory {
//   id: string;
//   name: string;
//   created_at: number;
//   updated_at: number;
// }