<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Template } from '@/utils/templates';
import {
  TEMPLATE_CATEGORIES,
  parsePlaceholders,
  validatePlaceholderSyntax,
} from '@/utils/templates';
import type { TemplateCategory } from '@/utils/templates/types';

const props = defineProps<{
  /** Whether the dialog is open */
  open: boolean;
  /** Template to edit (null for create mode) */
  template: Template | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'save', template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn' | 'placeholders'>): void;
  (e: 'cancel'): void;
}>();

// Form fields
const name = ref('');
const description = ref('');
const content = ref('');
const category = ref<TemplateCategory>('custom');
const tagsInput = ref('');
const isFavorite = ref(false);

// Validation
const contentValidation = computed(() => {
  return validatePlaceholderSyntax(content.value);
});

const placeholders = computed(() => {
  return parsePlaceholders(content.value);
});

const isValid = computed(() => {
  return (
    name.value.trim() !== '' &&
    content.value.trim() !== '' &&
    contentValidation.value.valid
  );
});

const isEditMode = computed(() => props.template !== null && !props.template.isBuiltIn);

// Parse tags from comma-separated input
const tags = computed(() => {
  return tagsInput.value
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
});

// Initialize form when template changes
watch(
  () => props.template,
  (template) => {
    if (template) {
      name.value = template.name;
      description.value = template.description || '';
      content.value = template.content;
      category.value = template.category;
      tagsInput.value = template.tags.join(', ');
      isFavorite.value = template.isFavorite;
    } else {
      // Reset form
      name.value = '';
      description.value = '';
      content.value = '';
      category.value = 'custom';
      tagsInput.value = '';
      isFavorite.value = false;
    }
  },
  { immediate: true },
);

const handleSave = () => {
  if (isValid.value) {
    emit('save', {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      content: content.value,
      category: category.value,
      tags: tags.value,
      isFavorite: isFavorite.value,
    });
  }
};

const handleCancel = () => {
  emit('cancel');
  emit('update:open', false);
};

const insertPlaceholder = () => {
  const key = prompt('Enter placeholder name (e.g., recipient_name):');
  if (key && /^\w+$/.test(key)) {
    content.value += `{{${key}}}`;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? 'Edit Template' : 'Create New Template' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode
            ? 'Modify your template below.'
            : 'Create a reusable template with placeholders like {{variable_name}}.'
          }}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 pr-4">
        <div class="space-y-4 py-2">
          <!-- Name -->
          <div class="space-y-2">
            <Label for="template-name">
              Name <span class="text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              v-model="name"
              placeholder="e.g., Professional Email"
            />
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <Label for="template-description">Description</Label>
            <Input
              id="template-description"
              v-model="description"
              placeholder="Brief description of the template"
            />
          </div>

          <!-- Category -->
          <div class="space-y-2">
            <Label for="template-category">Category</Label>
            <Select v-model="category">
              <SelectTrigger id="template-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="cat in TEMPLATE_CATEGORIES"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.icon }} {{ cat.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Tags -->
          <div class="space-y-2">
            <Label for="template-tags">Tags (comma-separated)</Label>
            <Input
              id="template-tags"
              v-model="tagsInput"
              placeholder="e.g., formal, business, email"
            />
          </div>

          <!-- Content -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="template-content">
                Content <span class="text-destructive">*</span>
              </Label>
              <Button variant="ghost" size="sm" @click="insertPlaceholder">
                + Add Placeholder
              </Button>
            </div>
            <Textarea
              id="template-content"
              v-model="content"
              placeholder="Enter template content with {{placeholders}}..."
              rows="10"
              class="font-mono text-sm"
            />

            <!-- Validation errors -->
            <div v-if="!contentValidation.valid" class="text-sm text-destructive">
              <p v-for="error in contentValidation.errors" :key="error">
                {{ error }}
              </p>
            </div>
          </div>

          <!-- Detected Placeholders -->
          <div v-if="placeholders.length > 0" class="space-y-2">
            <Label>Detected Placeholders</Label>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="placeholder in placeholders"
                :key="placeholder.key"
                class="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-mono"
              >
                {{ '{{' }}{{ placeholder.key }}{{ '}}' }}
              </span>
            </div>
          </div>

          <!-- Favorite Toggle -->
          <div class="flex items-center gap-2">
            <input
              id="template-favorite"
              v-model="isFavorite"
              type="checkbox"
              class="rounded"
            />
            <Label for="template-favorite" class="font-normal cursor-pointer">
              Add to favorites
            </Label>
          </div>
        </div>
      </ScrollArea>

      <DialogFooter class="mt-4">
        <Button variant="outline" @click="handleCancel">Cancel</Button>
        <Button :disabled="!isValid" @click="handleSave">
          {{ isEditMode ? 'Save Changes' : 'Create Template' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
