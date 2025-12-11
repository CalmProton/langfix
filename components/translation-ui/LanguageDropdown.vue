<script lang="ts" setup>
import { computed } from 'vue';
import { SUPPORTED_LANGUAGES } from '#utils/multilingual/types';

const props = defineProps<{
  selectedLanguage: string;
  showNativeName?: boolean;
  disabled?: boolean;
  filterGrammarSupport?: boolean;
}>();

const emit = defineEmits<{
  'update:selectedLanguage': [language: string];
}>();

const languages = computed(() => {
  let list = SUPPORTED_LANGUAGES;

  if (props.filterGrammarSupport) {
    list = list.filter((lang) => lang.grammarSupport);
  }

  return list.map((lang) => ({
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
    displayName: props.showNativeName
      ? `${lang.name} (${lang.nativeName})`
      : lang.name,
  }));
});

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:selectedLanguage', target.value);
}
</script>

<template>
  <select
    class="lf-language-dropdown"
    :value="selectedLanguage"
    :disabled="disabled"
    @change="handleChange"
  >
    <option v-for="lang in languages" :key="lang.code" :value="lang.code">
      {{ lang.displayName }}
    </option>
  </select>
</template>

<style scoped>
.lf-language-dropdown {
  padding: 6px 10px;
  border: 1px solid var(--lf-border, #e2e8f0);
  border-radius: 6px;
  background: var(--lf-bg, #ffffff);
  color: var(--lf-text, #1a202c);
  font-size: 13px;
  cursor: pointer;
  min-width: 120px;
}

.lf-language-dropdown:focus {
  outline: none;
  border-color: var(--lf-primary, #3182ce);
  box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
}

.lf-language-dropdown:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .lf-language-dropdown {
    --lf-bg: #1a202c;
    --lf-border: #4a5568;
    --lf-text: #f7fafc;
    --lf-primary: #4299e1;
  }
}
</style>
