<template>
  <div class="settings-view p-6 space-y-6"> <!-- Added padding and spacing -->
    <h1 class="text-2xl font-semibold tracking-tight">设置</h1> <!-- Shadcn-like heading -->

    <!-- Separator can be added between cards later if needed -->

    <Card>
      <CardHeader>
        <CardTitle>全局快捷键</CardTitle>
        <CardDescription>
          当前用于显示/隐藏主窗口的快捷键： <strong>{{ currentShortcutDisplay }}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
      <!-- Removed redundant paragraph, already in CardDescription -->
      <div class="shortcut-input-group flex items-center space-x-2">
        <Label for="shortcut-input" class="min-w-max">修改快捷键：</Label>
        <Input
          type="text"
          id="shortcut-input"
          v-model="newShortcutInput"
          placeholder="例如：Alt+C"
          @keydown="handleShortcutKeyDown"
          @focus="isRecording = true"
          @blur="isRecording = false"
        />
        <Button @click="saveNewShortcut" :disabled="!newShortcutInput.trim() || newShortcutInput === currentShortcut">保存快捷键</Button>
      </div>
      <p v-if="feedbackMessage" :class="{'feedback-success text-green-600': isSuccessFeedback, 'feedback-error text-red-600': !isSuccessFeedback, 'text-sm': true}">
        {{ feedbackMessage }}
      </p>
      <p v-if="isRecording" class="recording-indicator text-sm text-muted-foreground">正在录制快捷键... 按下组合键。</p>
      </CardContent>
    </Card>

    <Separator />

    <Card>
      <CardHeader>
        <CardTitle>历史记录上限</CardTitle>
        <CardDescription>当前历史记录最大数量：<strong>{{ currentHistoryLimitDisplay }}</strong></CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
      <div class="history-limit-input-group flex items-center space-x-2">
        <Label for="history-limit-input" class="min-w-max">修改上限：</Label>
        <Input
          type="number"
          id="history-limit-input"
          v-model.number="newHistoryLimitInput"
          min="1"
          placeholder="例如：500"
        />
        <Button @click="saveNewHistoryLimit" :disabled="!newHistoryLimitInput || newHistoryLimitInput === currentHistoryLimit || newHistoryLimitInput <= 0">保存上限</Button>
      </div>
      <p v-if="historyLimitFeedbackMessage" :class="{'feedback-success text-green-600': isHistoryLimitSuccessFeedback, 'feedback-error text-red-600': !isHistoryLimitSuccessFeedback, 'text-sm': true}">
        {{ historyLimitFeedbackMessage }}
      </p>
      </CardContent>
    </Card>

    <Separator />

    <Card>
      <CardHeader>
        <CardTitle>开机自启动</CardTitle>
        <CardDescription>当前状态：<strong>{{ autoLaunchStatusDisplay }}</strong></CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="auto-launch-group">
        <div class="flex items-center space-x-2">
          <Switch
            id="auto-launch-switch"
            v-model:checked="autoLaunchEnabled"
            @update:checked="saveAutoLaunchStatus"
          />
          <Label for="auto-launch-switch">开机时自动启动 CustomPaste</Label>
        </div>
      </div>
      <p v-if="autoLaunchFeedbackMessage" :class="{'feedback-success text-green-600': isAutoLaunchSuccessFeedback, 'feedback-error text-red-600': !isAutoLaunchSuccessFeedback, 'text-sm': true}">
        {{ autoLaunchFeedbackMessage }}
      </p>
      </CardContent>
    </Card>

    <Separator />

    <Card>
      <CardHeader>
        <CardTitle>数据管理</CardTitle>
        <CardDescription>此操作将永久删除所有剪贴板历史记录，包括已收藏的条目和关联的图片文件。此操作无法撤销。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="clear-history-group">
        <!-- Removed redundant paragraph, already in CardDescription -->
        <Button @click="confirmClearAllHistory" variant="destructive">清空所有历史记录</Button>
      </div>
      <p v-if="clearHistoryFeedbackMessage" :class="{'feedback-success text-green-600': isClearHistorySuccessFeedback, 'feedback-error text-red-600': !isClearHistorySuccessFeedback, 'text-sm': true}">
        {{ clearHistoryFeedbackMessage }}
      </p>
      </CardContent>
    </Card>

    <Separator />

    <Card>
      <CardHeader>
        <CardTitle>内容去重</CardTitle>
        <CardDescription>当前状态：<strong>{{ deduplicateStatusDisplay }}</strong></CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="deduplicate-group">
        <div class="flex items-center space-x-2">
          <Switch
            id="deduplicate-switch"
            v-model:checked="deduplicateEnabled"
            @update:checked="saveDeduplicateStatus"
          />
          <Label for="deduplicate-switch">启用内容去重功能</Label>
        </div>
      </div>
      <p v-if="deduplicateFeedbackMessage" :class="{'feedback-success text-green-600': isDeduplicateSuccessFeedback, 'feedback-error text-red-600': !isDeduplicateSuccessFeedback, 'text-sm': true}">
        {{ deduplicateFeedbackMessage }}
      </p>
      </CardContent>
    </Card>

    <Separator />

    <Card>
      <CardHeader>
        <CardTitle>外观主题</CardTitle>
        <CardDescription>当前选择：<strong>{{ themeDisplay }}</strong></CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="theme-selection-group flex items-center space-x-2">
        <Label for="theme-select" class="min-w-max">选择主题：</Label>
        <Select v-model="currentTheme" @update:modelValue="saveTheme">
          <SelectTrigger id="theme-select" class="w-[180px]">
            <SelectValue placeholder="选择主题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">跟随系统</SelectItem>
            <SelectItem value="light">亮色模式</SelectItem>
            <SelectItem value="dark">暗色模式</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p v-if="themeFeedbackMessage" :class="{'feedback-success text-green-600': isThemeSuccessFeedback, 'feedback-error text-red-600': !isThemeSuccessFeedback, 'text-sm': true}">
        {{ themeFeedbackMessage }}
      </p>
      </CardContent>
    </Card>

    <Separator />

    <Card>
      <CardHeader>
        <CardTitle>粘贴后行为</CardTitle>
        <CardDescription>当前状态：<strong>{{ autoHideAfterPasteStatusDisplay }}</strong></CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="auto-hide-group">
        <div class="flex items-center space-x-2">
          <Switch
            id="auto-hide-switch"
            v-model:checked="autoHideAfterPasteEnabled"
            @update:checked="saveAutoHideAfterPasteStatus"
          />
          <Label for="auto-hide-switch">粘贴后自动隐藏主窗口</Label>
        </div>
      </div>
      <p v-if="autoHideAfterPasteFeedbackMessage" :class="{'feedback-success text-green-600': isAutoHideAfterPasteSuccessFeedback, 'feedback-error text-red-600': !isAutoHideAfterPasteSuccessFeedback, 'text-sm': true}">
        {{ autoHideAfterPasteFeedbackMessage }}
      </p>
      </CardContent>
    </Card>

    <!-- 更多设置项可以后续添加 -->

  </div>
</template>

<script lang="ts" setup>
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'; // Added onUnmounted and watch
import { useClipboardStore } from '../store/clipboardStore'; // Import the store
import type { ThemeSetting } from '../../shared/types/settings'; // Import ThemeSetting type from shared location

// Access Electron APIs exposed in preload.ts
// Make sure your preload script exposes ipcRenderer correctly.
// For example: contextBridge.exposeInMainWorld('ipcRenderer', { getGlobalShortcut: ..., setGlobalShortcut: ... });
const ipcApi = (window as any).ipcRenderer;
const nativeThemeUtils = (window as any).nativeThemeUtils; // Access nativeTheme utilities
const clipboardStore = useClipboardStore(); // Get store instance

const currentShortcut = ref<string>('');
const newShortcutInput = ref<string>('');
const feedbackMessage = ref<string>('');
const isSuccessFeedback = ref<boolean>(false);
const isRecording = ref<boolean>(false);

// History Limit States
const currentHistoryLimit = ref<number>(0);
const newHistoryLimitInput = ref<number>(0);
const historyLimitFeedbackMessage = ref<string>('');
const isHistoryLimitSuccessFeedback = ref<boolean>(false);

// Auto-launch States
const autoLaunchEnabled = ref<boolean>(false);
const autoLaunchFeedbackMessage = ref<string>('');
const isAutoLaunchSuccessFeedback = ref<boolean>(false);

// Clear History States
const clearHistoryFeedbackMessage = ref<string>('');
const isClearHistorySuccessFeedback = ref<boolean>(false);

// Auto Hide After Paste States
const autoHideAfterPasteEnabled = ref<boolean>(false);
const autoHideAfterPasteFeedbackMessage = ref<string>('');
const isAutoHideAfterPasteSuccessFeedback = ref<boolean>(false);

// Theme States
const currentTheme = ref<ThemeSetting>('system');
const themeFeedbackMessage = ref<string>('');
const isThemeSuccessFeedback = ref<boolean>(false);

// Deduplicate States
const deduplicateEnabled = ref<boolean>(false);
const deduplicateFeedbackMessage = ref<string>('');
const isDeduplicateSuccessFeedback = ref<boolean>(false);

const autoHideAfterPasteStatusDisplay = computed(() => autoHideAfterPasteEnabled.value ? '已启用' : '已禁用');

const currentShortcutDisplay = computed(() => currentShortcut.value || '未设置或加载中...');
const deduplicateStatusDisplay = computed(() => deduplicateEnabled.value ? '已启用' : '已禁用');
const currentHistoryLimitDisplay = computed(() => currentHistoryLimit.value > 0 ? currentHistoryLimit.value : '未设置或加载中...');
const autoLaunchStatusDisplay = computed(() => autoLaunchEnabled.value ? '已启用' : '已禁用');
const themeDisplay = computed(() => {
  if (currentTheme.value === 'light') return '亮色模式';
  if (currentTheme.value === 'dark') return '暗色模式';
  return '跟随系统';
});

const loadCurrentShortcut = async () => {
  if (!ipcApi || !ipcApi.getGlobalShortcut) {
    feedbackMessage.value = '错误：无法访问 IPC 功能 (getGlobalShortcut)。';
    isSuccessFeedback.value = false;
    console.error('ipcApi or getGlobalShortcut is not available on window.ipcRenderer');
    return;
  }
  try {
    feedbackMessage.value = '正在加载当前快捷键...';
    const shortcut = await ipcApi.getGlobalShortcut();
    if (shortcut) {
      currentShortcut.value = shortcut;
      newShortcutInput.value = shortcut; // Initialize input with current shortcut
      feedbackMessage.value = '当前快捷键已加载。';
      isSuccessFeedback.value = true;
    } else {
      currentShortcut.value = ''; // Explicitly set to empty if no shortcut is returned
      newShortcutInput.value = '';
      feedbackMessage.value = '未配置全局快捷键或加载失败。';
      isSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('加载全局快捷键失败:', error);
    currentShortcut.value = '';
    newShortcutInput.value = '';
    feedbackMessage.value = `加载快捷键失败: ${error.message || String(error)}`;
    isSuccessFeedback.value = false;
  }
};

const saveNewShortcut = async () => {
  if (!ipcApi || !ipcApi.setGlobalShortcut) {
    feedbackMessage.value = '错误：无法访问 IPC 功能 (setGlobalShortcut)。';
    isSuccessFeedback.value = false;
    console.error('ipcApi or setGlobalShortcut is not available on window.ipcRenderer');
    return;
  }
  if (!newShortcutInput.value.trim()) {
    feedbackMessage.value = '快捷键不能为空。';
    isSuccessFeedback.value = false;
    return;
  }
  if (newShortcutInput.value.trim() === currentShortcut.value) {
    feedbackMessage.value = '新快捷键与当前快捷键相同，无需更改。';
    isSuccessFeedback.value = true; // Or false if you want to indicate no action was taken
    return;
  }

  try {
    feedbackMessage.value = `正在尝试设置新快捷键: ${newShortcutInput.value}...`;
    const result = await ipcApi.setGlobalShortcut(newShortcutInput.value.trim());
    if (result.success && result.newShortcut) {
      currentShortcut.value = result.newShortcut;
      newShortcutInput.value = result.newShortcut; // Update input to reflect the actually set shortcut
      feedbackMessage.value = result.message || `快捷键已成功更新为: ${result.newShortcut}`;
      isSuccessFeedback.value = true;
    } else {
      // If setting failed, the main process might have reverted to an old/default shortcut.
      // result.newShortcut should contain the currently active shortcut.
      currentShortcut.value = result.newShortcut || getFallbackShortcut(); // Fallback if newShortcut is not in result
      newShortcutInput.value = currentShortcut.value; // Reset input to the now active shortcut
      feedbackMessage.value = result.message || '设置新快捷键失败。可能已被占用或格式无效。';
      isSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('设置全局快捷键失败:', error);
    // Attempt to reload the current shortcut to ensure UI consistency
    const fallbackShortcut = await ipcApi.getGlobalShortcut();
    currentShortcut.value = fallbackShortcut || getFallbackShortcut();
    newShortcutInput.value = currentShortcut.value;
    feedbackMessage.value = `设置快捷键时发生错误: ${error.message || String(error)}. 当前快捷键为: ${currentShortcut.value}`;
    isSuccessFeedback.value = false;
  }
};

// Helper to get a fallback shortcut string if IPC fails unexpectedly
const getFallbackShortcut = () => {
    // This could be a default known by the renderer or an empty string
    return 'Alt+C'; // Or some other sensible default / last known good
};


const handleShortcutKeyDown = (event: KeyboardEvent) => {
  if (!isRecording.value) return;
  
  event.preventDefault(); // Prevent default input behavior like typing the key
  
  const parts: string[] = []; // Explicitly type 'parts' as string[]
  if (event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push(process.platform === 'darwin' ? 'Command' : 'Super'); // Meta for Mac is Command, Super for Win/Linux

  // Normalize key names (e.g., "ArrowUp", "Spacebar")
  let key = event.key;
  if (key === ' ') key = 'Space'; // Electron expects "Space" not " " for spacebar
  // Add other normalizations if needed, e.g. Arrow keys, Media keys
  // Electron accelerator format: https://www.electronjs.org/docs/latest/api/accelerator
  
  // Only add the key if it's not a modifier key itself or if it's a printable character
  const isModifierOnly = ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
  const isActionKey = /^[a-zA-Z0-9]$/.test(key) || key.startsWith('F') || ['Space', 'Tab', 'Enter', 'Escape', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Insert', 'PrintScreen', 'ScrollLock', 'Pause', 'ContextMenu'].includes(key) || (key.length > 1 && key !== 'Dead');


  if (!isModifierOnly && isActionKey && parts.length > 0) { // Require at least one modifier for a typical global shortcut
    parts.push(key.toUpperCase()); // Common practice to uppercase the main key
    newShortcutInput.value = parts.join('+');
  } else if (isActionKey && parts.length === 0 && (key.startsWith('F') || ['PrintScreen', 'ScrollLock', 'Pause'].includes(key))) {
    // Allow single F-keys or special keys as shortcuts if no modifiers
     parts.push(key.toUpperCase());
     newShortcutInput.value = parts.join('+');
  } else if (parts.length > 0) {
    // If only modifiers are pressed, show them so user knows they are registered
    newShortcutInput.value = parts.join('+') + '+';
  } else {
    // If a single character key is pressed without modifiers, and it's not an F-key/special key,
    // it's usually not a good global shortcut. Clear or provide feedback.
    // For now, we'll just clear it if it doesn't form a valid start.
    // newShortcutInput.value = ''; // Or show "Waiting for more keys..."
  }
};


onMounted(() => {
  loadCurrentShortcut();
  loadCurrentHistoryLimit(); // Added
  loadCurrentAutoLaunchStatus(); // Added for auto-launch
  loadCurrentTheme(); // Added for theme
  loadCurrentDeduplicateStatus(); // Added for deduplicate
  loadCurrentAutoHideAfterPasteStatus(); // Added for auto-hide-after-paste

  // Watcher for currentTheme has been removed as applyTheme is called within saveTheme
  // and initial load is handled by loadCurrentTheme.
  // App.vue is now responsible for the primary theme application logic on startup
  // and for reacting to system theme changes if currentTheme is 'system'.
});

// unlistenNativeThemeUpdate and its onUnmounted cleanup are removed.
// App.vue is now responsible for managing the native theme listener.

// --- History Limit Methods ---
const loadCurrentHistoryLimit = async () => {
  if (!ipcApi || !ipcApi.getHistoryLimit) {
    historyLimitFeedbackMessage.value = '错误：无法访问 IPC 功能 (getHistoryLimit)。';
    isHistoryLimitSuccessFeedback.value = false;
    console.error('ipcApi or getHistoryLimit is not available on window.ipcRenderer');
    return;
  }
  try {
    historyLimitFeedbackMessage.value = '正在加载当前历史记录上限...';
    const limit = await ipcApi.getHistoryLimit();
    if (limit && typeof limit === 'number' && limit > 0) {
      currentHistoryLimit.value = limit;
      newHistoryLimitInput.value = limit;
      historyLimitFeedbackMessage.value = '当前历史记录上限已加载。';
      isHistoryLimitSuccessFeedback.value = true;
    } else {
      currentHistoryLimit.value = 0; // Or a default from settingsManager if that's preferred
      newHistoryLimitInput.value = 0; // Or default
      historyLimitFeedbackMessage.value = '未配置历史记录上限或加载失败。';
      isHistoryLimitSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('加载历史记录上限失败:', error);
    currentHistoryLimit.value = 0;
    newHistoryLimitInput.value = 0;
    historyLimitFeedbackMessage.value = `加载历史记录上限失败: ${error.message || String(error)}`;
    isHistoryLimitSuccessFeedback.value = false;
  }
};

const saveNewHistoryLimit = async () => {
  if (!ipcApi || !ipcApi.setHistoryLimit) {
    historyLimitFeedbackMessage.value = '错误：无法访问 IPC 功能 (setHistoryLimit)。';
    isHistoryLimitSuccessFeedback.value = false;
    console.error('ipcApi or setHistoryLimit is not available on window.ipcRenderer');
    return;
  }
  if (!newHistoryLimitInput.value || newHistoryLimitInput.value <= 0) {
    historyLimitFeedbackMessage.value = '历史记录上限必须是一个正数。';
    isHistoryLimitSuccessFeedback.value = false;
    return;
  }
  if (newHistoryLimitInput.value === currentHistoryLimit.value) {
    historyLimitFeedbackMessage.value = '新上限与当前上限相同，无需更改。';
    isHistoryLimitSuccessFeedback.value = true;
    return;
  }

  try {
    historyLimitFeedbackMessage.value = `正在尝试设置新上限: ${newHistoryLimitInput.value}...`;
    const result = await ipcApi.setHistoryLimit(newHistoryLimitInput.value);
    if (result.success && result.newLimit) {
      currentHistoryLimit.value = result.newLimit;
      newHistoryLimitInput.value = result.newLimit;
      historyLimitFeedbackMessage.value = result.message || `历史记录上限已成功更新为: ${result.newLimit}`;
      isHistoryLimitSuccessFeedback.value = true;
    } else {
      currentHistoryLimit.value = result.newLimit || 0; // Fallback
      newHistoryLimitInput.value = currentHistoryLimit.value;
      historyLimitFeedbackMessage.value = result.message || '设置新历史记录上限失败。';
      isHistoryLimitSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('设置历史记录上限失败:', error);
    const fallbackLimit = await ipcApi.getHistoryLimit(); // Re-fetch
    currentHistoryLimit.value = fallbackLimit || 0;
    newHistoryLimitInput.value = currentHistoryLimit.value;
    historyLimitFeedbackMessage.value = `设置历史记录上限时发生错误: ${error.message || String(error)}. 当前上限为: ${currentHistoryLimit.value}`;
    isHistoryLimitSuccessFeedback.value = false;
  }
};

// --- Auto-launch Methods ---
const loadCurrentAutoLaunchStatus = async () => {
  if (!ipcApi || !ipcApi.getAutoLaunchStatus) {
    autoLaunchFeedbackMessage.value = '错误：无法访问 IPC 功能 (getAutoLaunchStatus)。';
    isAutoLaunchSuccessFeedback.value = false;
    console.error('ipcApi or getAutoLaunchStatus is not available on window.ipcRenderer');
    return;
  }
  try {
    autoLaunchFeedbackMessage.value = '正在加载当前开机自启动状态...';
    const status = await ipcApi.getAutoLaunchStatus();
    autoLaunchEnabled.value = status;
    autoLaunchFeedbackMessage.value = '开机自启动状态已加载。';
    isAutoLaunchSuccessFeedback.value = true;
  } catch (error: any) {
    console.error('加载开机自启动状态失败:', error);
    autoLaunchEnabled.value = false; // Default to false on error
    autoLaunchFeedbackMessage.value = `加载开机自启动状态失败: ${error.message || String(error)}`;
    isAutoLaunchSuccessFeedback.value = false;
  }
};

const saveAutoLaunchStatus = async () => {
  if (!ipcApi || !ipcApi.setAutoLaunchStatus) {
    autoLaunchFeedbackMessage.value = '错误：无法访问 IPC 功能 (setAutoLaunchStatus)。';
    isAutoLaunchSuccessFeedback.value = false;
    console.error('ipcApi or setAutoLaunchStatus is not available on window.ipcRenderer');
    return;
  }
  try {
    autoLaunchFeedbackMessage.value = `正在尝试设置开机自启动状态为: ${autoLaunchEnabled.value ? '启用' : '禁用'}...`;
    const result = await ipcApi.setAutoLaunchStatus(autoLaunchEnabled.value);
    if (result.success) {
      autoLaunchEnabled.value = result.newStatus ?? autoLaunchEnabled.value;
      autoLaunchFeedbackMessage.value = result.message || `开机自启动状态已成功更新为: ${autoLaunchEnabled.value ? '启用' : '禁用'}`;
      isAutoLaunchSuccessFeedback.value = true;
    } else {
      // If setting failed, the main process might not have changed the setting or an error occurred.
      // Re-fetch the actual status to ensure UI consistency.
      const currentStatus = await ipcApi.getAutoLaunchStatus();
      autoLaunchEnabled.value = currentStatus;
      autoLaunchFeedbackMessage.value = result.message || '设置开机自启动状态失败。';
      isAutoLaunchSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('设置开机自启动状态失败:', error);
    // Attempt to reload the current status to ensure UI consistency
    const fallbackStatus = await ipcApi.getAutoLaunchStatus();
    autoLaunchEnabled.value = fallbackStatus;
    autoLaunchFeedbackMessage.value = `设置开机自启动状态时发生错误: ${error.message || String(error)}. 当前状态为: ${autoLaunchEnabled.value ? '启用' : '禁用'}`;
    isAutoLaunchSuccessFeedback.value = false;
  }
};

// --- Clear All History Methods ---
const confirmClearAllHistory = async () => {
  // Electron's dialog module is only available in the main process by default.
  // For a quick solution in renderer, window.confirm can be used.
  // For a native-looking dialog, an IPC call to main process to show dialog is better.
  // Let's use window.confirm for now as per instructions to use dialog.showMessageBox (which implies main process).
  // We'll make an IPC call for the dialog itself for better UX.

  // For simplicity in this step, we'll use window.confirm.
  // A more robust solution would be to invoke an IPC to the main process
  // to use dialog.showMessageBox for a native dialog.
  const userConfirmed = window.confirm(
    '您确定要清空所有历史记录吗？\n此操作将永久删除所有条目（包括已收藏的）和关联的图片文件，且无法撤销。'
  );

  if (userConfirmed) {
    if (!ipcApi || !ipcApi.clearAllHistory) {
      clearHistoryFeedbackMessage.value = '错误：无法访问 IPC 功能 (clearAllHistory)。';
      isClearHistorySuccessFeedback.value = false;
      console.error('ipcApi or clearAllHistory is not available on window.ipcRenderer');
      return;
    }
    try {
      clearHistoryFeedbackMessage.value = '正在清空所有历史记录...';
      isClearHistorySuccessFeedback.value = false; // Reset before operation
      const result = await ipcApi.clearAllHistory();
      if (result.success) {
        clearHistoryFeedbackMessage.value = result.message || '所有历史记录已成功清空。';
        isClearHistorySuccessFeedback.value = true;
        clipboardStore.clearAllLocalHistory(); // Clear local store
        // This will be handled when modifying clipboardStore.ts
      } else {
        clearHistoryFeedbackMessage.value = result.message || '清空历史记录失败。';
        if (result.errors) {
          console.error('Errors during clearAllHistory:', result.errors);
          clearHistoryFeedbackMessage.value += ` 详情请查看控制台。`;
        }
        isClearHistorySuccessFeedback.value = false;
      }
    } catch (error: any) {
      console.error('清空历史记录时发生错误:', error);
      clearHistoryFeedbackMessage.value = `清空历史记录时发生错误: ${error.message || String(error)}`;
      isClearHistorySuccessFeedback.value = false;
    }
  } else {
    clearHistoryFeedbackMessage.value = '操作已取消。';
    isClearHistorySuccessFeedback.value = true; // Or neutral
  }
};

// --- Theme Methods ---
// The applyTheme function has been removed from SettingsView.vue.
// App.vue is now the sole manager of applying themes globally and handling native theme updates.

const loadCurrentTheme = async () => {
  if (!ipcApi || !ipcApi.getTheme) {
    themeFeedbackMessage.value = '错误：无法访问 IPC 功能 (getTheme)。';
    isThemeSuccessFeedback.value = false;
    console.error('[SettingsView] ipcApi or getTheme is not available.');
    // App.vue handles fallback theme application on its side if IPC fails.
    // Here, we just log and ensure UI doesn't show stale data.
    currentTheme.value = 'system'; // Or a sensible default for the Select component
    return;
  }
  try {
    themeFeedbackMessage.value = '正在加载当前主题设置...';
    const themeSetting = await ipcApi.getTheme() as ThemeSetting;
    currentTheme.value = themeSetting || 'system'; // Default to system if undefined
    // applyTheme(currentTheme.value); // Removed: App.vue handles applying the theme.
    // SettingsView only needs to set its local currentTheme for the Select component.
    themeFeedbackMessage.value = '当前主题设置已加载。';
    isThemeSuccessFeedback.value = true;
  } catch (error: any) {
    console.error('[SettingsView] 加载主题设置失败:', error);
    currentTheme.value = 'system'; // Fallback
    // applyTheme(currentTheme.value); // Removed: App.vue handles applying the theme.
    themeFeedbackMessage.value = `加载主题设置失败: ${error.message || String(error)}`;
    isThemeSuccessFeedback.value = false;
  }
};

const saveTheme = async () => {
  if (!ipcApi || !ipcApi.setTheme) {
    themeFeedbackMessage.value = '错误：无法访问 IPC 功能 (setTheme)。';
    isThemeSuccessFeedback.value = false;
    console.error('[SettingsView] ipcApi or setTheme is not available.');
    return;
  }
  try {
    themeFeedbackMessage.value = `正在保存主题设置: ${currentTheme.value}...`;
    const result = await ipcApi.setTheme(currentTheme.value);
    if (result.success && result.newTheme) {
      // currentTheme.value = result.newTheme as ThemeSetting; // v-model already updated currentTheme.value
      // applyTheme(currentTheme.value); // Removed: App.vue will handle applying theme via IPC event.
      // The main process (ipcHandlers.ts) now sends 'theme-changed-event' after successful setTheme.
      // App.vue listens to this event and updates/applies the theme.
      themeFeedbackMessage.value = result.message || `主题已成功更新为: ${themeDisplay.value}`;
      isThemeSuccessFeedback.value = true;
    } else {
      themeFeedbackMessage.value = result.message || '保存主题设置失败。';
      isThemeSuccessFeedback.value = false;
      // Optionally, reload the theme from settings to revert UI if save failed
      // await loadCurrentTheme();
    }
  } catch (error: any) {
    console.error('[SettingsView] 保存主题设置失败:', error);
    themeFeedbackMessage.value = `保存主题设置时发生错误: ${error.message || String(error)}`;
    isThemeSuccessFeedback.value = false;
    // await loadCurrentTheme(); // Revert to last known good theme
  }
};

// --- Deduplicate Methods ---
const loadCurrentDeduplicateStatus = async () => {
  if (!ipcApi || !ipcApi.getDeduplicateStatus) {
    deduplicateFeedbackMessage.value = '错误：无法访问 IPC 功能 (getDeduplicateStatus)。';
    isDeduplicateSuccessFeedback.value = false;
    console.error('ipcApi or getDeduplicateStatus is not available on window.ipcRenderer');
    return;
  }
  try {
    deduplicateFeedbackMessage.value = '正在加载当前去重设置...';
    const status = await ipcApi.getDeduplicateStatus();
    deduplicateEnabled.value = status;
    deduplicateFeedbackMessage.value = '去重设置已加载。';
    isDeduplicateSuccessFeedback.value = true;
  } catch (error: any) {
    console.error('加载去重设置失败:', error);
    deduplicateEnabled.value = true; // Default to enabled on error
    deduplicateFeedbackMessage.value = `加载去重设置失败: ${error.message || String(error)}`;
    isDeduplicateSuccessFeedback.value = false;
  }
};

// --- Auto Hide After Paste Methods ---
const loadCurrentAutoHideAfterPasteStatus = async () => {
  if (!ipcApi || !ipcApi.getAutoHideAfterPaste) {
    autoHideAfterPasteFeedbackMessage.value = '错误：无法访问 IPC 功能 (getAutoHideAfterPaste)。';
    isAutoHideAfterPasteSuccessFeedback.value = false;
    console.error('ipcApi or getAutoHideAfterPaste is not available on window.ipcRenderer');
    return;
  }
  try {
    autoHideAfterPasteFeedbackMessage.value = '正在加载当前粘贴后行为设置...';
    const status = await ipcApi.getAutoHideAfterPaste();
    autoHideAfterPasteEnabled.value = status;
    autoHideAfterPasteFeedbackMessage.value = '粘贴后行为设置已加载。';
    isAutoHideAfterPasteSuccessFeedback.value = true;
  } catch (error: any) {
    console.error('加载粘贴后行为设置失败:', error);
    autoHideAfterPasteEnabled.value = true; // Default to enabled on error
    autoHideAfterPasteFeedbackMessage.value = `加载粘贴后行为设置失败: ${error.message || String(error)}`;
    isAutoHideAfterPasteSuccessFeedback.value = false;
  }
};

const saveAutoHideAfterPasteStatus = async () => {
  if (!ipcApi || !ipcApi.setAutoHideAfterPaste) {
    autoHideAfterPasteFeedbackMessage.value = '错误：无法访问 IPC 功能 (setAutoHideAfterPaste)。';
    isAutoHideAfterPasteSuccessFeedback.value = false;
    console.error('ipcApi or setAutoHideAfterPaste is not available on window.ipcRenderer');
    return;
  }
  try {
    autoHideAfterPasteFeedbackMessage.value = `正在尝试设置粘贴后行为为: ${autoHideAfterPasteEnabled.value ? '自动隐藏' : '不自动隐藏'}...`;
    const result = await ipcApi.setAutoHideAfterPaste(autoHideAfterPasteEnabled.value);
    if (result.success) {
      autoHideAfterPasteEnabled.value = result.newStatus ?? autoHideAfterPasteEnabled.value;
      autoHideAfterPasteFeedbackMessage.value = result.message || `粘贴后行为已成功更新为: ${autoHideAfterPasteEnabled.value ? '自动隐藏' : '不自动隐藏'}`;
      isAutoHideAfterPasteSuccessFeedback.value = true;
    } else {
      const currentStatus = await ipcApi.getAutoHideAfterPaste();
      autoHideAfterPasteEnabled.value = currentStatus;
      autoHideAfterPasteFeedbackMessage.value = result.message || '设置粘贴后行为失败。';
      isAutoHideAfterPasteSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('设置粘贴后行为失败:', error);
    const fallbackStatus = await ipcApi.getAutoHideAfterPaste();
    autoHideAfterPasteEnabled.value = fallbackStatus;
    autoHideAfterPasteFeedbackMessage.value = `设置粘贴后行为时发生错误: ${error.message || String(error)}. 当前状态为: ${autoHideAfterPasteEnabled.value ? '自动隐藏' : '不自动隐藏'}`;
    isAutoHideAfterPasteSuccessFeedback.value = false;
  }
};

const saveDeduplicateStatus = async () => {
  if (!ipcApi || !ipcApi.setDeduplicateStatus) {
    deduplicateFeedbackMessage.value = '错误：无法访问 IPC 功能 (setDeduplicateStatus)。';
    isDeduplicateSuccessFeedback.value = false;
    console.error('ipcApi or setDeduplicateStatus is not available on window.ipcRenderer');
    return;
  }
  try {
    deduplicateFeedbackMessage.value = `正在尝试设置去重状态为: ${deduplicateEnabled.value ? '启用' : '禁用'}...`;
    const result = await ipcApi.setDeduplicateStatus(deduplicateEnabled.value);
    if (result.success) {
      deduplicateEnabled.value = result.newStatus ?? deduplicateEnabled.value;
      deduplicateFeedbackMessage.value = result.message || `去重状态已成功更新为: ${deduplicateEnabled.value ? '启用' : '禁用'}`;
      isDeduplicateSuccessFeedback.value = true;
    } else {
      const currentStatus = await ipcApi.getDeduplicateStatus();
      deduplicateEnabled.value = currentStatus;
      deduplicateFeedbackMessage.value = result.message || '设置去重状态失败。';
      isDeduplicateSuccessFeedback.value = false;
    }
  } catch (error: any) {
    console.error('设置去重状态失败:', error);
    const fallbackStatus = await ipcApi.getDeduplicateStatus();
    deduplicateEnabled.value = fallbackStatus;
    deduplicateFeedbackMessage.value = `设置去重状态时发生错误: ${error.message || String(error)}. 当前状态为: ${deduplicateEnabled.value ? '启用' : '禁用'}`;
    isDeduplicateSuccessFeedback.value = false;
  }
};

</script>
