import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TemplateItem } from '../../shared/types/template'; // Correct type name
import ipcService from '../services/ipcService'; // Correct import for default export

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<TemplateItem[]>([]); // Use correct type name
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function getAllTemplates() {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await ipcService.getAllTemplates();
      templates.value = result;
    } catch (err) {
      console.error('Failed to get templates:', err);
      error.value = '获取模版列表失败。';
      templates.value = []; // Clear templates on error
    } finally {
      isLoading.value = false;
    }
  }

  // Component likely provides data without id, timestamps, or enabled status
  async function addTemplate(newTemplateData: Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'>) { // Corrected type to include 'enabled'
    isLoading.value = true;
    error.value = null;
    try {
      // Convert potential reactive object to a plain JavaScript object
      const plainTemplateData = JSON.parse(JSON.stringify(newTemplateData));
      const result = await ipcService.addTemplate(plainTemplateData); // Pass the plain object
      if (result.success && result.template) {
        // Add the new template directly to the local state
        // Add to the beginning for newest first, or push() for end
        templates.value.unshift(result.template);
      } else {
        // If add failed on backend but didn't throw, throw now or handle error
        throw new Error(result.message || 'Failed to add template on backend.');
      }
      // Removed: await getAllTemplates(); // No longer needed, update locally
    } catch (err) {
      console.error('Failed to add template:', err);
      error.value = '添加模版失败。';
      // Optionally re-throw or handle specific errors
      throw err; // Re-throw to allow component to handle UI feedback
    } finally {
      isLoading.value = false;
    }
  }

  // Align with ipcService: pass ID and partial updates
  async function updateTemplate(templateId: string, updates: Partial<Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'>>) {
    isLoading.value = true;
    error.value = null;
    try {
      // --- FIX START ---
      // Convert potential reactive object to a plain JavaScript object
      const plainUpdates = JSON.parse(JSON.stringify(updates));
      // --- FIX END ---

      await ipcService.updateTemplate(templateId, plainUpdates); // Pass the plain object
      await getAllTemplates(); // Refresh list after updating
    } catch (err) {
      console.error('Failed to update template:', err);
      error.value = '更新模版失败。';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTemplate(id: string) { // ID is string
    isLoading.value = true;
    error.value = null;
    try {
      await ipcService.deleteTemplate(id); // Pass string ID
      await getAllTemplates(); // Refresh list after deleting
    } catch (err) {
      console.error('Failed to delete template:', err);
      error.value = '删除模版失败。';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function toggleTemplateStatus(id: string) { // ID is string
    // Optimistic update (optional, for better UX)
    const templateIndex = templates.value.findIndex(t => t.id === id);
    if (templateIndex !== -1) {
      templates.value[templateIndex].enabled = !templates.value[templateIndex].enabled;
    }

    // Call backend
    // Note: No isLoading here for faster UI feedback on toggle
    error.value = null;
    try {
      await ipcService.toggleTemplateStatus(id); // Pass string ID
      // Optional: Fetch all again to ensure consistency if optimistic update fails
      // await getAllTemplates();
    } catch (err) {
      console.error('Failed to toggle template status:', err);
      error.value = '切换模版状态失败。';
      // Revert optimistic update on error
      if (templateIndex !== -1) {
        templates.value[templateIndex].enabled = !templates.value[templateIndex].enabled;
      }
      throw err;
    }
    // No finally block needed if not using isLoading
  }


  return {
    templates,
    isLoading,
    error,
    getAllTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateStatus,
  };
});