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
import type { Template, Placeholder } from '@/utils/templates';
import { getSystemVariables, renderContent } from '@/utils/templates';

const props = defineProps<{
  /** Whether the dialog is open */
  open: boolean;
  /** The template to fill */
  template: Template | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', values: Record<string, string>): void;
  (e: 'cancel'): void;
}>();

// Form values
const values = ref<Record<string, string>>({});

// System variable keys that are auto-filled
const systemVariableKeys = computed(() => {
  return Object.keys(getSystemVariables());
});

// Filter out system variables from placeholders
const userPlaceholders = computed(() => {
  if (!props.template) return [];
  return props.template.placeholders.filter(
    (p) => !systemVariableKeys.value.includes(p.key),
  );
});

// Preview content with current values
const previewContent = computed(() => {
  if (!props.template) return '';
  const systemVars = getSystemVariables();
  return renderContent(props.template.content, { ...systemVars, ...values.value });
});

// Check if all required fields are filled
const isValid = computed(() => {
  for (const placeholder of userPlaceholders.value) {
    if (placeholder.required) {
      const value = values.value[placeholder.key];
      if (!value || value.trim() === '') {
        return false;
      }
    }
  }
  return true;
});

// Initialize values when template changes
watch(
  () => props.template,
  (template) => {
    if (template) {
      const newValues: Record<string, string> = {};
      for (const placeholder of template.placeholders) {
        newValues[placeholder.key] = placeholder.defaultValue || '';
      }
      values.value = newValues;
    }
  },
  { immediate: true },
);

const handleSubmit = () => {
  if (isValid.value) {
    emit('submit', values.value);
  }
};

const handleCancel = () => {
  emit('cancel');
  emit('update:open', false);
};

const getInputType = (placeholder: Placeholder): string => {
  switch (placeholder.type) {
    case 'date':
      return 'date';
    case 'number':
      return 'number';
    default:
      return 'text';
  }
};

const isLongField = (placeholder: Placeholder): boolean => {
  const key = placeholder.key.toLowerCase();
  return (
    key.includes('body') ||
    key.includes('content') ||
    key.includes('description') ||
    key.includes('message') ||
    key.includes('summary') ||
    key.includes('notes') ||
    key.includes('text')
  );
};
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Fill Template: {{ template?.name }}</DialogTitle>
        <DialogDescription>
          Fill in the placeholders below to customize your template.
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-hidden flex gap-4">
        <!-- Form Fields -->
        <ScrollArea class="flex-1 pr-4">
          <div class="space-y-4 py-2">
            <div
              v-for="placeholder in userPlaceholders"
              :key="placeholder.key"
              class="space-y-2"
            >
              <Label :for="`field-${placeholder.key}`">
                {{ placeholder.label }}
                <span v-if="placeholder.required" class="text-destructive">*</span>
              </Label>

              <!-- Textarea for long fields -->
              <Textarea
                v-if="isLongField(placeholder)"
                :id="`field-${placeholder.key}`"
                v-model="values[placeholder.key]"
                :placeholder="`Enter ${placeholder.label.toLowerCase()}...`"
                rows="3"
              />

              <!-- Regular input for short fields -->
              <Input
                v-else
                :id="`field-${placeholder.key}`"
                v-model="values[placeholder.key]"
                :type="getInputType(placeholder)"
                :placeholder="`Enter ${placeholder.label.toLowerCase()}...`"
              />
            </div>

            <!-- No placeholders message -->
            <div
              v-if="userPlaceholders.length === 0"
              class="text-center py-4 text-muted-foreground"
            >
              <p>This template has no placeholders to fill.</p>
              <p class="text-sm">Click "Insert" to use the template as-is.</p>
            </div>
          </div>
        </ScrollArea>

        <!-- Preview Panel -->
        <div class="w-64 border-l pl-4 flex flex-col">
          <h4 class="text-sm font-medium mb-2">Preview</h4>
          <ScrollArea class="flex-1 bg-muted/50 rounded-md p-3">
            <pre class="text-xs whitespace-pre-wrap font-mono">{{ previewContent }}</pre>
          </ScrollArea>
        </div>
      </div>

      <DialogFooter class="mt-4">
        <Button variant="outline" @click="handleCancel">Cancel</Button>
        <Button :disabled="!isValid" @click="handleSubmit">
          Insert Template
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
