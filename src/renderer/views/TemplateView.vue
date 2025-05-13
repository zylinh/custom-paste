<template>
  <div class="template-view h-full flex flex-col p-4">
    <!-- Top Bar -->
    <div class="top-bar flex items-center gap-4">
      <!-- Search Input -->
      <div class="relative flex-grow">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          v-model="searchTerm"
          placeholder="搜索关键字说明或关键字..."
          class="pl-10 w-full"
        />
      </div>
      <!-- Add Button Triggering Dialog -->
      <Dialog v-model:open="showModal">
        <DialogTrigger as-child>
          <Button @click="handleAddClick">
            <Plus class="-ml-1 mr-2 h-5 w-5" />
            添加模版
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{{ editingTemplate && editingTemplate.id ? '编辑模版' : '添加模版' }}</DialogTitle>
            <!-- <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription> -->
          </DialogHeader>
          <form @submit.prevent="handleSaveTemplate" class="grid gap-4 py-4">
             <div class="grid grid-cols-4 items-center gap-4">
               <Label for="description" class="text-right">关键字说明</Label>
               <Input id="description" v-model="editingTemplate.description" required class="col-span-3" />
             </div>
             <div class="grid grid-cols-4 items-center gap-4">
                <Label for="keywords" class="text-right">关键字</Label>
                <Input id="keywords" v-model="keywordsInput" required placeholder="逗号分隔" class="col-span-3" />
             </div>
             <div class="grid grid-cols-4 items-start gap-4">
                <Label for="snippet_content" class="text-right pt-2">文本片段</Label>
                <div class="col-span-3 space-y-2">
                   <div class="placeholder-buttons flex flex-wrap gap-1">
                     <Button type="button" variant="outline" size="sm" v-for="p in availablePlaceholders" :key="p.value" @click="insertPlaceholder(p.value)" class="h-auto py-1 px-2 text-xs">
                       {{ p.name }}
                     </Button>
                     <Button type="button" variant="outline" size="sm" @click="insertPlaceholder('{isodate:yyyy年MM月dd日}')" title="插入带格式的日期" class="h-auto py-1 px-2 text-xs">
                       日期(格式)
                     </Button>
                   </div>
                   <Textarea id="snippet_content" ref="snippetContentTextarea" v-model="editingTemplate.snippet_content" rows="5" class="resize-vertical" />
                </div>
             </div>
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="trigger_type" class="text-right">触发方式</Label>
                 <Select v-model="editingTemplate.trigger_type" required>
                    <SelectTrigger class="col-span-3">
                      <SelectValue placeholder="选择触发方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="TriggerType.SHORTCUT">快捷键</SelectItem>
                      <!-- <SelectItem :value="TriggerType.KEYWORD_INPUT">关键字 (未来)</SelectItem> -->
                    </SelectContent>
                  </Select>
              </div>
              <!-- Conditionally show shortcut input -->
              <div v-if="editingTemplate.trigger_type === TriggerType.SHORTCUT" class="grid grid-cols-4 items-center gap-4">
                <Label for="shortcut" class="text-right">快捷键</Label>
                <div class="col-span-3">
                    <Input id="shortcut" v-model="editingTemplate.shortcut" placeholder="例如: Ctrl+Shift+P" />
                    <small class="block mt-1 text-xs text-muted-foreground">请使用 Electron <a href="https://www.electronjs.org/docs/latest/api/accelerator" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Accelerator</a> 格式。</small>
                </div>
              </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">取消</Button>
            <Button type="submit" @click="handleSaveTemplate">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Tabs Section -->
     <Tabs default-value="all" class="w-full flex-grow flex flex-col overflow-hidden">
        <TabsList class="grid w-full grid-cols-[auto_1fr_auto] bg-secondary border-b border-border">
          <TabsTrigger value="all">全部</TabsTrigger>
          <div class="flex-grow border-b border-border"></div> <!-- Fills space and provides bottom border -->
           <Button variant="ghost" size="sm" class="ml-auto h-8 w-8 p-0" title="添加分类 (暂不可用)">
             <Plus class="h-4 w-4" />
           </Button>
        </TabsList>
        <TabsContent value="all" class="flex-grow">
            <!-- Loading and Error Display -->
            <div v-if="templateStore.isLoading" class="text-center py-4 text-muted-foreground">加载中...</div>
            <div v-if="templateStore.error" class="text-center py-4 text-destructive">
              错误: {{ templateStore.error }}
            </div>

            <!-- Table Area -->
            <div class="table-area flex-grow overflow-auto rounded-md border">
              <Table>
                <!-- <TableCaption>A list of your recent templates.</TableCaption> -->
                <TableHeader>
                  <TableRow>
                    <TableHead>关键字说明</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>关键字</TableHead>
                    <TableHead>文本片段</TableHead>
                    <TableHead class="text-center w-28">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-if="!templateStore.isLoading && filteredTemplates.length === 0">
                    <TableCell :colspan="5" class="h-24 text-center text-muted-foreground">
                      {{ searchTerm ? '未找到匹配的模版' : '暂无模版数据' }}
                    </TableCell>
                  </TableRow>
                  <TableRow v-for="template in filteredTemplates" :key="template.id">
                    <TableCell class="font-medium">{{ template.description }}</TableCell>
                    <TableCell>
                      <Switch
                        :checked="template.enabled"
                        @update:checked="() => toggleStatus(template.id)"
                        :aria-label="'Toggle Status for ' + template.description"
                      />
                    </TableCell>
                    <TableCell class="text-muted-foreground">{{ formatKeywords(template.keywords) }}</TableCell>
                    <TableCell class="text-muted-foreground max-w-xs truncate" :title="template.snippet_content">
                      {{ truncateSnippet(template.snippet_content) }}
                    </TableCell>
                    <TableCell class="text-center space-x-1 whitespace-nowrap">
                       <Button variant="ghost" size="icon" @click="handleEditClick(template)" title="编辑">
                         <Pencil class="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" @click="handleDeleteClick(template.id)" title="删除" class="text-destructive hover:text-destructive">
                         <Trash2 class="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
        </TabsContent>
        <!-- Add other TabsContent here later if needed -->
      </Tabs>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Search, Plus, Pencil, Trash2 } from 'lucide-vue-next'; // Import icons
import { useTemplateStore } from '../store/templateStore';
import { TemplateItem, TriggerType } from '../../shared/types/template';
import { cn } from '../../lib/utils'; // Import cn utility

// Import Shadcn Vue components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';


const templateStore = useTemplateStore();
const searchTerm = ref('');
const showModal = ref(false);
const editingTemplate = ref<Partial<TemplateItem>>({ trigger_type: TriggerType.SHORTCUT, enabled: true }); // Default to SHORTCUT and enabled
const keywordsInput = ref(''); // Separate ref for comma-separated keywords input
const snippetContentTextarea = ref<HTMLTextAreaElement | null>(null); // Ref for the textarea (still needed for insertPlaceholder)

// Define available placeholders
const availablePlaceholders = [
  { name: '当前日期', value: '{isodate}' },
  { name: '当前时间', value: '{isotime}' },
  { name: '完整时间', value: '{now}' },
  { name: '时间戳', value: '{timestamp}' },
  { name: '剪贴板', value: '{clipboard}' },
];

// Fetch templates when component is mounted
onMounted(() => {
  templateStore.getAllTemplates();
});

// Computed property for filtering templates based on search term
const filteredTemplates = computed(() => {
  if (!searchTerm.value) {
    return templateStore.templates;
  }
  const lowerSearchTerm = searchTerm.value.toLowerCase();
  return templateStore.templates.filter(template =>
    template.description.toLowerCase().includes(lowerSearchTerm) ||
    template.keywords.some(kw => kw.toLowerCase().includes(lowerSearchTerm))
  );
});

// Format keywords array into a string for display
const formatKeywords = (keywords: string[]) => {
  return keywords.join(', ');
};

// Truncate long snippets for display in table
const truncateSnippet = (snippet: string, maxLength = 50) => {
  if (!snippet) return ''; // Handle null/undefined case
  if (snippet.length <= maxLength) {
    return snippet;
  }
  return snippet.substring(0, maxLength) + '...';
};

// --- CRUD Handlers ---

const handleAddClick = () => {
  editingTemplate.value = { // Reset for new template
    description: '',
    enabled: true, // Default to enabled
    keywords: [],
    snippet_content: '',
    trigger_type: TriggerType.SHORTCUT, // Default to SHORTCUT
    shortcut: '', // Initialize shortcut
  };
  keywordsInput.value = ''; // Clear keywords input
  // showModal will be handled by Dialog v-model:open
};

const handleEditClick = (template: TemplateItem) => {
  // Clone the object to avoid modifying the store state directly
  editingTemplate.value = { ...template };
  keywordsInput.value = template.keywords.join(', '); // Populate keywords input
  showModal.value = true; // Open the dialog programmatically if needed, or rely on trigger
};

const handleDeleteClick = async (id: string) => {
  if (confirm('确定要删除这个模版吗？')) {
    try {
      await templateStore.deleteTemplate(id);
      // Optional: Show success message (e.g., using a Toast component)
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('删除失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
};

const toggleStatus = async (id: string) => {
  try {
    await templateStore.toggleTemplateStatus(id);
  } catch (error) {
    console.error('Failed to toggle status:', error);
    alert('切换状态失败: ' + (error instanceof Error ? error.message : String(error)));
    // Re-fetch might be needed if optimistic update failed badly
    // templateStore.getAllTemplates();
  }
};

const handleSaveTemplate = async () => {
  if (!editingTemplate.value) return;

  // Parse keywords from input string
  const keywords = keywordsInput.value.split(',').map(kw => kw.trim()).filter(kw => kw !== '');
  if (keywords.length === 0) {
      alert('请至少输入一个关键字。');
      return;
  }
  editingTemplate.value.keywords = keywords;

  // Ensure content is at least an empty string if somehow null/undefined
  if (editingTemplate.value.snippet_content === undefined || editingTemplate.value.snippet_content === null) {
      editingTemplate.value.snippet_content = '';
  }
  // Ensure trigger_type is set, default if necessary
  if (!editingTemplate.value.trigger_type) {
      editingTemplate.value.trigger_type = TriggerType.SHORTCUT;
  }
  // Ensure shortcut is handled correctly based on trigger type
   if (editingTemplate.value.trigger_type !== TriggerType.SHORTCUT) {
       editingTemplate.value.shortcut = undefined; // Clear shortcut if not applicable
   } else if (editingTemplate.value.shortcut === '') {
       editingTemplate.value.shortcut = undefined; // Treat empty string as undefined
   }


  try {
    // Create a plain object copy for sending via IPC
    const plainEditingTemplate = { ...editingTemplate.value };

    if (plainEditingTemplate.id) {
      // Update existing template
      const { id, created_at, updated_at, ...updateData } = plainEditingTemplate as TemplateItem; // Cast to ensure type
      await templateStore.updateTemplate(id, updateData);
    } else {
      // Add new template
      const { description, enabled, keywords, snippet_content, trigger_type, shortcut } = plainEditingTemplate;

      // Ensure required fields are present
      if (description !== undefined && keywords !== undefined && snippet_content !== undefined && trigger_type !== undefined) {
          const addData: Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'> = {
              description,
              enabled: enabled ?? true, // Default to true if undefined
              keywords,
              snippet_content,
              trigger_type: trigger_type as TriggerType,
              shortcut: shortcut || undefined // Ensure it's string or undefined
          };
          await templateStore.addTemplate(addData);
      } else {
          console.error("Missing required fields in editingTemplate for add operation", plainEditingTemplate);
          alert("添加失败：缺少必要信息。");
          return; // Prevent closing modal on error
      }
    }
    closeModal();
    // Optional: Show success message
  } catch (error) {
    console.error('Failed to save template:', error);
    alert('保存失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

const closeModal = () => {
  showModal.value = false;
  // Resetting editingTemplate might not be needed if Dialog handles state internally on close,
  // but doing it explicitly ensures clean state for next 'Add' click.
  editingTemplate.value = { trigger_type: TriggerType.SHORTCUT, enabled: true };
  keywordsInput.value = '';
};

// Function to insert placeholder at cursor position
// NOTE: Direct DOM manipulation might be less reliable with component libraries.
// Consider alternative approaches if this causes issues.
const insertPlaceholder = (placeholder: string) => {
  const textarea = snippetContentTextarea.value; // Access the underlying textarea element if possible
  // This assumes Shadcn's Textarea exposes the native element or a ref to it.
  // If Textarea uses a different internal structure, this might need adjustment.
  // A more robust way might involve updating the v-model and calculating cursor position,
  // but that's more complex.

  // Find the actual textarea element if Textarea component wraps it
  let actualTextarea: HTMLTextAreaElement | null = null;
  if (textarea) {
      if (textarea instanceof HTMLTextAreaElement) {
          actualTextarea = textarea;
      } else if ((textarea as any).$el instanceof HTMLTextAreaElement) {
          // Common pattern for Vue components wrapping native elements
          actualTextarea = (textarea as any).$el;
      } else {
          // Try finding the textarea within the component's element
          actualTextarea = (textarea as any as HTMLElement).querySelector('textarea');
      }
  }


  if (actualTextarea && editingTemplate.value) {
    const start = actualTextarea.selectionStart;
    const end = actualTextarea.selectionEnd;
    const currentContent = editingTemplate.value.snippet_content || '';

    // Insert the placeholder
    const newContent = currentContent.substring(0, start) + placeholder + currentContent.substring(end);
    editingTemplate.value.snippet_content = newContent;

    // Move cursor to after the inserted placeholder
    actualTextarea.focus(); // Ensure textarea has focus
    // Use nextTick to wait for Vue's reactivity update
    import('vue').then(({ nextTick }) => {
        nextTick(() => {
            const newCursorPos = start + placeholder.length;
            actualTextarea!.setSelectionRange(newCursorPos, newCursorPos);
        });
    });
  } else {
      console.warn("Could not find textarea element to insert placeholder.");
      // Fallback: Append to the end if cursor logic fails
      if (editingTemplate.value) {
          editingTemplate.value.snippet_content = (editingTemplate.value.snippet_content || '') + placeholder;
      }
  }
};

// Watch to keep keywordsInput synced with editingTemplate.keywords when editing
watch(() => editingTemplate.value?.id, (newId) => {
    if (newId && editingTemplate.value?.keywords) {
        keywordsInput.value = editingTemplate.value.keywords.join(', ');
    } else if (!newId) {
        keywordsInput.value = ''; // Clear for new template
    }
}, { immediate: true }); // Run immediately to set initial value if editing

</script>
