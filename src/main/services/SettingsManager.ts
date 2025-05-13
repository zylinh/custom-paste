import Store from 'electron-store';
import type { ThemeSetting } from '../../shared/types/settings'; // Import ThemeSetting type

const STORE_KEY_HISTORY_LIMIT = 'historyLimit';
const DEFAULT_HISTORY_LIMIT = 500; // Default to 500 items

const STORE_KEY_AUTO_LAUNCH = 'autoLaunch';
const DEFAULT_AUTO_LAUNCH = false; // Default to disabled

const STORE_KEY_THEME = 'theme';
const STORE_KEY_DEDUPLICATE = 'deduplicateEnabled';
const STORE_KEY_AUTO_HIDE_AFTER_PASTE = 'autoHideAfterPaste';
// export type ThemeSetting = 'light' | 'dark' | 'system'; // Moved to shared/types/settings.ts
const DEFAULT_THEME: ThemeSetting = 'system'; // Default to system preference
const DEFAULT_DEDUPLICATE = true; // Default to enabled
const DEFAULT_AUTO_HIDE_AFTER_PASTE = true; // Default to enabled

interface AppSettings {
  historyLimit?: number;
  globalShortcut?: string;
  autoLaunch?: boolean;
  theme?: ThemeSetting;
  deduplicateEnabled?: boolean;
  autoHideAfterPaste?: boolean;
}

class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>();
    // Ensure a default history limit is set if none exists
    if (this.store.get(STORE_KEY_HISTORY_LIMIT) === undefined) {
      this.store.set(STORE_KEY_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT);
    }
    // Ensure a default auto-launch setting is set if none exists
    if (this.store.get(STORE_KEY_AUTO_LAUNCH) === undefined) {
      this.store.set(STORE_KEY_AUTO_LAUNCH, DEFAULT_AUTO_LAUNCH);
    }
    // Ensure a default theme is set if none exists
    if (this.store.get(STORE_KEY_THEME) === undefined) {
      this.store.set(STORE_KEY_THEME, DEFAULT_THEME);
    }
    // Ensure a default deduplicate setting is set if none exists
    if (this.store.get(STORE_KEY_DEDUPLICATE) === undefined) {
      this.store.set(STORE_KEY_DEDUPLICATE, DEFAULT_DEDUPLICATE);
    }
  }

  public getHistoryLimit(): number {
    return this.store.get(STORE_KEY_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT);
  }

  public setHistoryLimit(limit: number): void {
    if (typeof limit === 'number' && limit > 0) {
      this.store.set(STORE_KEY_HISTORY_LIMIT, limit);
    } else {
      console.warn(`[SettingsManager] Invalid history limit value: ${limit}. Setting to default: ${DEFAULT_HISTORY_LIMIT}`);
      this.store.set(STORE_KEY_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT);
    }
    // Note: The auto-launch initialization was previously misplaced here and has been moved to the constructor.
  }

  public getGlobalShortcut(): string | undefined {
    return this.store.get('globalShortcut');
  }

  public setGlobalShortcut(shortcut: string): void {
    this.store.set('globalShortcut', shortcut);
  }

  public getAutoLaunchStatus(): boolean {
    return this.store.get(STORE_KEY_AUTO_LAUNCH, DEFAULT_AUTO_LAUNCH);
  }

  public setAutoLaunchStatus(isEnabled: boolean): void {
    if (typeof isEnabled === 'boolean') {
      this.store.set(STORE_KEY_AUTO_LAUNCH, isEnabled);
    } else {
      console.warn(`[SettingsManager] Invalid auto-launch value: ${isEnabled}. Setting to default: ${DEFAULT_AUTO_LAUNCH}`);
      this.store.set(STORE_KEY_AUTO_LAUNCH, DEFAULT_AUTO_LAUNCH);
    }
  }

  public getTheme(): ThemeSetting {
    return this.store.get(STORE_KEY_THEME, DEFAULT_THEME);
  }

  public setTheme(theme: ThemeSetting): void {
    if (['light', 'dark', 'system'].includes(theme)) {
      this.store.set(STORE_KEY_THEME, theme);
    } else {
      console.warn(`[SettingsManager] Invalid theme value: ${theme}. Setting to default: ${DEFAULT_THEME}`);
      this.store.set(STORE_KEY_THEME, DEFAULT_THEME);
    }
  }

  // Example of getting another setting
  // public getSomeOtherSetting(): boolean {
  //   return this.store.get('someOtherSettingKey', true); // Default to true
  // }

  // Example of setting another setting
  // public setSomeOtherSetting(value: boolean): void {
  //   this.store.set('someOtherSettingKey', value);
  // }

  public getDeduplicateEnabled(): boolean {
    return this.store.get(STORE_KEY_DEDUPLICATE, DEFAULT_DEDUPLICATE);
  }

  public setDeduplicateEnabled(isEnabled: boolean): void {
    if (typeof isEnabled === 'boolean') {
      this.store.set(STORE_KEY_DEDUPLICATE, isEnabled);
    } else {
      console.warn(`[SettingsManager] Invalid deduplicate value: ${isEnabled}. Setting to default: ${DEFAULT_DEDUPLICATE}`);
      this.store.set(STORE_KEY_DEDUPLICATE, DEFAULT_DEDUPLICATE);
    }
  }

  public getAutoHideAfterPaste(): boolean {
    return this.store.get(STORE_KEY_AUTO_HIDE_AFTER_PASTE, DEFAULT_AUTO_HIDE_AFTER_PASTE);
  }

  public setAutoHideAfterPaste(isEnabled: boolean): void {
    if (typeof isEnabled === 'boolean') {
      this.store.set(STORE_KEY_AUTO_HIDE_AFTER_PASTE, isEnabled);
    } else {
      console.warn(`[SettingsManager] Invalid autoHideAfterPaste value: ${isEnabled}. Setting to default: ${DEFAULT_AUTO_HIDE_AFTER_PASTE}`);
      this.store.set(STORE_KEY_AUTO_HIDE_AFTER_PASTE, DEFAULT_AUTO_HIDE_AFTER_PASTE);
    }
  }
}

// Export a singleton instance
export const settingsManager = new SettingsManager();