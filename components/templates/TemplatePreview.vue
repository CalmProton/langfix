<script setup lang="ts">
import { computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Template } from '@/utils/templates';
import { TEMPLATE_CATEGORIES, generatePreview } from '@/utils/templates';

const props = defineProps<{
  /** Whether the dialog is open */
  open: boolean;
  /** The template to preview */
  template: Template | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'use', template: Template): void;
}>();

const category = computed(() => {
  if (!props.template) return null;
  return TEMPLATE_CATEGORIES.find((c) => c.id === props.template?.category);
});

const previewContent = computed(() => {
  if (!props.template) return '';
  return generatePreview(props.template);
});

const handleUse = () => {
  if (props.template) {
    emit('use', props.template);
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <div class="flex items-center gap-2">
          <span v-if="category" class="text-lg">{{ category.icon }}</span>
          <DialogTitle>{{ template?.name }}</DialogTitle>
        </div>
        <DialogDescription>
          {{ template?.description || 'No description' }}
        </DialogDescription>
      </DialogHeader>

      <!-- Tags -->
      <div
        v-if="template?.tags && template.tags.length > 0"
        class="flex flex-wrap gap-1.5"
      >
        <Badge
          v-for="tag in template.tags"
          :key="tag"
          variant="secondary"
          class="text-xs"
        >
          {{ tag }}
        </Badge>
      </div>

      <!-- Placeholders Info -->
      <div
        v-if="template?.placeholders && template.placeholders.length > 0"
        class="space-y-2"
      >
        <h4 class="text-sm font-medium">Placeholders to fill:</h4>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="placeholder in template.placeholders"
            :key="placeholder.key"
            class="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono"
          >
            {{ placeholder.label }}
            <span v-if="placeholder.required" class="text-destructive ml-1"
              >*</span
            >
          </span>
        </div>
      </div>

      <!-- Preview Content -->
      <ScrollArea class="flex-1 border rounded-md bg-muted/30">
        <pre
          class="p-4 text-sm whitespace-pre-wrap font-mono"
        >{{ previewContent }}</pre>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          Close
        </Button>
        <Button @click="handleUse">Use Template</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
