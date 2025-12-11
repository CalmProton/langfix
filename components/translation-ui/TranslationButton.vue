<script lang="ts" setup>
import { ref } from 'vue';
import { detectLanguageClient } from '../../utils/multilingual/detector';
import { getLanguageName } from '../../utils/multilingual/types';

const props = defineProps<{
  text: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const detectedLanguage = ref<string | null>(null);

// Detect language on mount
if (props.text && props.text.length > 10) {
  const detection = detectLanguageClient(props.text);
  if (detection.confidence > 0.5) {
    detectedLanguage.value = detection.language;
  }
}

function handleClick() {
  emit('click');
}
</script>

<template>
  <button
    type="button"
    class="lf-translate-icon-btn"
    :disabled="disabled || !text.trim()"
    :title="detectedLanguage ? `Translate from ${getLanguageName(detectedLanguage)}` : 'Translate'"
    @click="handleClick"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m5 8 6 6"/>
      <path d="m4 14 6-6 2-3"/>
      <path d="M2 5h12"/>
      <path d="M7 2h1"/>
      <path d="m22 22-5-10-5 10"/>
      <path d="M14 18h6"/>
    </svg>
    <span v-if="detectedLanguage" class="lf-lang-badge">
      {{ detectedLanguage.toUpperCase() }}
    </span>
  </button>
</template>

<style scoped>
.lf-translate-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--lf-bg, #ffffff);
  border: 1px solid var(--lf-border, #e2e8f0);
  border-radius: 6px;
  color: var(--lf-text-muted, #718096);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.lf-translate-icon-btn:hover:not(:disabled) {
  background: var(--lf-hover, #f7fafc);
  color: var(--lf-primary, #3182ce);
  border-color: var(--lf-primary, #3182ce);
}

.lf-translate-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-lang-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  background: var(--lf-primary, #3182ce);
  color: white;
  border-radius: 3px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .lf-translate-icon-btn {
    --lf-bg: #1a202c;
    --lf-border: #4a5568;
    --lf-text-muted: #a0aec0;
    --lf-hover: #2d3748;
    --lf-primary: #4299e1;
  }
}
</style>
