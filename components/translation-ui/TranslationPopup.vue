<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { getProviderFromStorage } from '../../utils/ai-providers';
import {
  getLanguageSettings,
  getTranslationGlossary,
} from '../../utils/storage';
import { translateText } from '../../utils/multilingual/translator';
import {
  SUPPORTED_LANGUAGES,
  type TranslationFormality,
} from '../../utils/multilingual/types';

const props = defineProps<{
  text: string;
  sourceLanguage?: string;
}>();

const emit = defineEmits<{
  translated: [text: string];
  close: [];
}>();

// State
const isTranslating = ref(false);
const translatedText = ref('');
const targetLanguage = ref('en');
const formality = ref<TranslationFormality>('neutral');
const error = ref<string | null>(null);
const copied = ref(false);

// Available languages for translation
const availableLanguages = computed(() =>
  SUPPORTED_LANGUAGES.filter((lang) => lang.translationSupport).map((lang) => ({
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
  })),
);

const formalityOptions: { value: TranslationFormality; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'informal', label: 'Informal' },
];

// Load user's preferred target language
onMounted(async () => {
  try {
    const settings = await getLanguageSettings();
    targetLanguage.value = settings.preferredTargetLanguage || 'en';
  } catch {
    // Use default
  }
});

// Translate function
async function translate() {
  if (!props.text.trim() || isTranslating.value) return;

  isTranslating.value = true;
  error.value = null;
  translatedText.value = '';

  try {
    const provider = await getProviderFromStorage();
    if (!provider) {
      error.value = 'Please configure an AI provider in settings';
      return;
    }

    const glossary = await getTranslationGlossary();

    const result = await translateText(
      props.text,
      {
        sourceLanguage: props.sourceLanguage,
        targetLanguage: targetLanguage.value,
        formality: formality.value,
        glossary,
      },
      provider,
    );

    translatedText.value = result.translatedText;
  } catch (err) {
    console.error('[LangFix] Translation error:', err);
    error.value =
      err instanceof Error ? err.message : 'Translation failed. Please try again.';
  } finally {
    isTranslating.value = false;
  }
}

// Apply translation
function applyTranslation() {
  if (translatedText.value) {
    emit('translated', translatedText.value);
  }
}

// Copy to clipboard
async function copyToClipboard() {
  if (!translatedText.value) return;

  try {
    await navigator.clipboard.writeText(translatedText.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = translatedText.value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}

// Close popup
function handleClose() {
  emit('close');
}

// Watch for language changes to clear translation
watch(targetLanguage, () => {
  translatedText.value = '';
  error.value = null;
});

watch(formality, () => {
  translatedText.value = '';
  error.value = null;
});
</script>

<template>
  <div class="lf-translation-popup">
    <!-- Header -->
    <div class="lf-translation-header">
      <span class="lf-translation-title">Translate</span>
      <button
        type="button"
        class="lf-popup-close"
        aria-label="Close"
        @click="handleClose"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
          />
        </svg>
      </button>
    </div>

    <!-- Original text preview -->
    <div class="lf-translation-original">
      <div class="lf-translation-label">Original:</div>
      <div class="lf-translation-text">{{ text }}</div>
    </div>

    <!-- Controls -->
    <div class="lf-translation-controls">
      <div class="lf-control-group">
        <label for="lf-target-lang" class="lf-control-label">To:</label>
        <select
          id="lf-target-lang"
          v-model="targetLanguage"
          class="lf-language-select"
        >
          <option
            v-for="lang in availableLanguages"
            :key="lang.code"
            :value="lang.code"
          >
            {{ lang.name }} ({{ lang.nativeName }})
          </option>
        </select>
      </div>

      <div class="lf-control-group">
        <label for="lf-formality" class="lf-control-label">Tone:</label>
        <select
          id="lf-formality"
          v-model="formality"
          class="lf-formality-select"
        >
          <option
            v-for="opt in formalityOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <button
        type="button"
        class="lf-translate-btn"
        :disabled="isTranslating || !text.trim()"
        @click="translate"
      >
        <svg
          v-if="isTranslating"
          class="lf-spinner"
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray="30"
            stroke-dashoffset="10"
          />
        </svg>
        <span v-else>Translate</span>
      </button>
    </div>

    <!-- Error message -->
    <div v-if="error" class="lf-translation-error">
      {{ error }}
    </div>

    <!-- Translation result -->
    <div v-if="translatedText" class="lf-translation-result">
      <div class="lf-translation-label">Translation:</div>
      <div class="lf-translation-output">{{ translatedText }}</div>

      <div class="lf-translation-actions">
        <button
          type="button"
          class="lf-action-btn lf-action-btn--primary"
          @click="applyTranslation"
        >
          Replace Text
        </button>
        <button
          type="button"
          class="lf-action-btn"
          @click="copyToClipboard"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lf-translation-popup {
  position: absolute;
  z-index: 2147483647;
  background: var(--lf-bg, #ffffff);
  border: 1px solid var(--lf-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  min-width: 320px;
  max-width: 480px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: var(--lf-text, #1a202c);
}

.lf-translation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.lf-translation-title {
  font-weight: 600;
  font-size: 15px;
}

.lf-popup-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--lf-text-muted, #718096);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lf-popup-close:hover {
  background: var(--lf-hover, #f7fafc);
  color: var(--lf-text, #1a202c);
}

.lf-translation-original {
  background: var(--lf-bg-muted, #f7fafc);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.lf-translation-label {
  font-size: 12px;
  color: var(--lf-text-muted, #718096);
  margin-bottom: 4px;
}

.lf-translation-text {
  max-height: 80px;
  overflow-y: auto;
  line-height: 1.5;
}

.lf-translation-controls {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.lf-control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lf-control-label {
  font-size: 12px;
  color: var(--lf-text-muted, #718096);
}

.lf-language-select,
.lf-formality-select {
  padding: 6px 10px;
  border: 1px solid var(--lf-border, #e2e8f0);
  border-radius: 6px;
  background: var(--lf-bg, #ffffff);
  color: var(--lf-text, #1a202c);
  font-size: 13px;
  cursor: pointer;
  min-width: 100px;
}

.lf-language-select:focus,
.lf-formality-select:focus {
  outline: none;
  border-color: var(--lf-primary, #3182ce);
  box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
}

.lf-translate-btn {
  padding: 6px 16px;
  background: var(--lf-primary, #3182ce);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
  height: 34px;
}

.lf-translate-btn:hover:not(:disabled) {
  background: var(--lf-primary-hover, #2c5282);
}

.lf-translate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-spinner {
  animation: lf-spin 1s linear infinite;
}

@keyframes lf-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.lf-translation-error {
  color: var(--lf-error, #e53e3e);
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(229, 62, 62, 0.1);
  border-radius: 6px;
  margin-bottom: 12px;
}

.lf-translation-result {
  background: var(--lf-bg-success, #f0fff4);
  border: 1px solid var(--lf-border-success, #9ae6b4);
  border-radius: 6px;
  padding: 12px;
}

.lf-translation-output {
  line-height: 1.5;
  margin-bottom: 12px;
  max-height: 120px;
  overflow-y: auto;
}

.lf-translation-actions {
  display: flex;
  gap: 8px;
}

.lf-action-btn {
  padding: 6px 12px;
  border: 1px solid var(--lf-border, #e2e8f0);
  border-radius: 6px;
  background: var(--lf-bg, #ffffff);
  color: var(--lf-text, #1a202c);
  font-size: 13px;
  cursor: pointer;
}

.lf-action-btn:hover {
  background: var(--lf-hover, #f7fafc);
}

.lf-action-btn--primary {
  background: var(--lf-primary, #3182ce);
  color: white;
  border-color: var(--lf-primary, #3182ce);
}

.lf-action-btn--primary:hover {
  background: var(--lf-primary-hover, #2c5282);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .lf-translation-popup {
    --lf-bg: #1a202c;
    --lf-bg-muted: #2d3748;
    --lf-bg-success: #1c4532;
    --lf-text: #f7fafc;
    --lf-text-muted: #a0aec0;
    --lf-border: #4a5568;
    --lf-border-success: #276749;
    --lf-hover: #2d3748;
    --lf-primary: #4299e1;
    --lf-primary-hover: #3182ce;
  }
}
</style>
