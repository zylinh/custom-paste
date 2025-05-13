export type ThemeSetting = 'light' | 'dark' | 'system';

export interface AppSettings {
  historyLimit?: number;
  globalShortcut?: string;
  autoLaunch?: boolean;
  theme?: ThemeSetting;
  deduplicateEnabled?: boolean;
  autoHideAfterPaste?: boolean;
}