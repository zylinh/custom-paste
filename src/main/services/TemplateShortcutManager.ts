import { globalShortcut, app } from 'electron';
import robot from 'robotjs'; // Using robotjs for paste simulation
import { StorageService } from '../db/StorageService';
import { SnippetResolver } from './SnippetResolver';
import { TemplateItem, TriggerType } from '../../shared/types/template';

export class TemplateShortcutManager {
  private storageService: StorageService;
  private snippetResolver: SnippetResolver;
  private registeredShortcuts: Set<string> = new Set(); // Keep track of registered shortcuts

  constructor(storageService: StorageService, snippetResolver: SnippetResolver) {
    this.storageService = storageService;
    this.snippetResolver = snippetResolver;
    console.log('TemplateShortcutManager initialized.');
  }

  /**
   * Registers global shortcuts for enabled templates with trigger_type 'shortcut'.
   */
  public async registerTemplateShortcuts(): Promise<void> {
    console.log('Registering template shortcuts...');
    let registeredCount = 0;
    let failedCount = 0;

    try {
      const templates = await this.storageService.getAllTemplates();
      const shortcutTemplates = templates.filter(
        (t) => t.enabled && t.trigger_type === TriggerType.SHORTCUT && t.shortcut
      );

      console.log(`Found ${shortcutTemplates.length} templates with shortcuts to register.`);

      shortcutTemplates.forEach((template) => {
        if (!template.shortcut) return; // Should not happen due to filter, but safety check

        // Prevent re-registering if already tracked (e.g., during initial load)
        if (this.registeredShortcuts.has(template.shortcut)) {
            console.warn(`Shortcut "${template.shortcut}" for template "${template.description}" is already registered. Skipping.`);
            return;
        }

        try {
          const success = globalShortcut.register(template.shortcut, async () => {
            console.log(`Shortcut "${template.shortcut}" triggered for template: ${template.description}`);
            try {
              const resolvedContent = await this.snippetResolver.resolveSnippet(template);
              this.pasteContent(resolvedContent);
            } catch (resolveError) {
              console.error(`Error resolving snippet for template ID ${template.id} triggered by shortcut ${template.shortcut}:`, resolveError);
              // Optionally notify the user via a dialog or notification
            }
          });

          if (success) {
            console.log(`Successfully registered shortcut: ${template.shortcut} for template: ${template.description}`);
            this.registeredShortcuts.add(template.shortcut);
            registeredCount++;
          } else {
            console.error(`Failed to register shortcut: ${template.shortcut} for template: ${template.description}. It might be already in use by another application.`);
            failedCount++;
            // Optionally notify the user about the conflict
          }
        } catch (registerError) {
            console.error(`Error during registration of shortcut ${template.shortcut}:`, registerError);
            failedCount++;
        }
      });

      console.log(`Template shortcut registration complete. Registered: ${registeredCount}, Failed/Skipped: ${failedCount}`);

    } catch (error) {
      console.error('Error fetching templates for shortcut registration:', error);
    }
  }

  /**
   * Unregisters all previously registered template shortcuts.
   */
  public unregisterTemplateShortcuts(): void {
    console.log('Unregistering all template shortcuts...');
    let unregisteredCount = 0;
    this.registeredShortcuts.forEach(shortcut => {
        try {
            globalShortcut.unregister(shortcut);
            unregisteredCount++;
        } catch (error) {
            console.error(`Error unregistering shortcut ${shortcut}:`, error);
        }
    });
    this.registeredShortcuts.clear(); // Clear the tracking set
    console.log(`Unregistered ${unregisteredCount} template shortcuts.`);
    // It's generally safe to call unregisterAll, but tracking allows for more granular control if needed later.
    // globalShortcut.unregisterAll();
    // console.log('Unregistered all global shortcuts managed by TemplateShortcutManager.');
  }

  /**
   * Updates shortcuts by unregistering all and re-registering based on current data.
   * Ensures consistency after template changes.
   */
  public async updateShortcuts(): Promise<void> {
    console.log('Updating template shortcuts...');
    this.unregisterTemplateShortcuts();
    await this.registerTemplateShortcuts();
    console.log('Template shortcuts updated.');
  }

  /**
   * Simulates pasting the given content.
   * TODO: Consider abstracting this into a shared utility/service if needed elsewhere.
   * @param content The string content to paste.
   */
  private pasteContent(content: string): void {
    // Implementation might depend on the OS and active window context.
    // Using robotjs for a basic cross-platform approach.
    // Note: This requires the application to potentially have accessibility permissions.
    // It also might interfere with user actions if not handled carefully.

    // 1. Store current clipboard content (optional, to restore later)
    // const originalClipboard = clipboard.readText(); // Requires electron's clipboard module

    // 2. Write the new content to the clipboard
    // clipboard.writeText(content); // Requires electron's clipboard module
    // For now, let's assume SnippetResolver puts it on the clipboard or we use robotjs typing

    // 3. Simulate paste command (Ctrl+V or Cmd+V)
    try {
        // Determine modifier key based on OS
        const modifier = process.platform === 'darwin' ? 'command' : 'control';
        console.log(`Simulating paste (${modifier}+v)`);

        // Temporarily hold modifier key
        // robot.keyToggle(modifier, 'down');
        // robot.keyTap('v');
        // robot.keyToggle(modifier, 'up');

        // Simpler approach using keyTap with modifier
        robot.keyTap('v', [modifier]);

        console.log('Paste simulation successful.');

        // 4. Restore original clipboard content (optional)
        // setTimeout(() => clipboard.writeText(originalClipboard), 100); // Delay restore slightly

    } catch (error) {
        console.error('Error simulating paste action:', error);
        // Notify user?
    }
  }

  /**
   * Cleans up resources, typically called before app quit.
   */
  public cleanup(): void {
    this.unregisterTemplateShortcuts();
    console.log('TemplateShortcutManager cleaned up.');
  }
}

// Example of how it might be instantiated in main/index.ts
// import { storageService } from './db/StorageService'; // Assuming singleton instance
// import { snippetResolver } from './services/SnippetResolver'; // Assuming singleton instance
// export const templateShortcutManager = new TemplateShortcutManager(storageServiceInstance, snippetResolverInstance);