import { TemplateItem } from '../../shared/types/template';
import { format } from 'date-fns';
import { clipboard } from 'electron';

/**
 * Service for resolving the final content of a template snippet by parsing placeholders.
 */
export class SnippetResolver {
  /**
   * Resolves the content of a template item by replacing placeholders.
   * @param template The template item to resolve.
   * @returns A promise that resolves to the final string content.
   */
  async resolveSnippet(template: TemplateItem): Promise<string> {
    let content = template.snippet_content || '';
    const now = new Date();

    // Regex to find placeholders like {name} or {name:format}
    const placeholderRegex = /{([a-zA-Z0-9_]+)(?::([^}]+))?}/g;

    // Use replace with a replacer function to handle each match
    content = content.replace(placeholderRegex, (match, placeholderName: string, formatString?: string) => {
      try {
        switch (placeholderName.toLowerCase()) {
          case 'now':
            // Default format: 'yyyy-MM-dd HH:mm:ss'
            return format(now, formatString || 'yyyy-MM-dd HH:mm:ss');
          case 'isodate':
            // Default format: 'yyyy-MM-dd'
            return format(now, formatString || 'yyyy-MM-dd');
          case 'isotime':
            // Default format: 'HH:mm:ss'
            return format(now, formatString || 'HH:mm:ss');
          case 'timestamp':
            // Returns Unix timestamp in milliseconds
            return now.getTime().toString();
          case 'clipboard':
            // Reads text content from the system clipboard
            return clipboard.readText();
          // --- Add more placeholders here ---
          // case 'uuid':
          //   return crypto.randomUUID();
          default:
            console.warn(`SnippetResolver: Unsupported placeholder found: ${match}`);
            return match; // Return the original placeholder if unsupported
        }
      } catch (error: any) {
        console.error(`SnippetResolver: Error processing placeholder ${match}:`, error);
        // Handle errors, e.g., invalid date format string
        if (error instanceof RangeError && (placeholderName === 'isodate' || placeholderName === 'isotime' || placeholderName === 'now')) {
            console.warn(`SnippetResolver: Invalid date format string "${formatString}". Using default format.`);
            // Attempt to use default format on error
            if (placeholderName === 'isodate') return format(now, 'yyyy-MM-dd');
            if (placeholderName === 'isotime') return format(now, 'HH:mm:ss');
            if (placeholderName === 'now') return format(now, 'yyyy-MM-dd HH:mm:ss');
        }
        return `[Error: ${placeholderName}]`; // Return an error indicator
      }
    });

    return content;
  }
}