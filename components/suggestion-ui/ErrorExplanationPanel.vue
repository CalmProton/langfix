<script lang="ts" setup>
import { computed, ref } from 'vue';
import type {
  CorrectionOption,
  ErrorExplanation,
} from '#utils/error-explanations/types';
import AutoCorrectActions from '#components/suggestion-ui/AutoCorrectActions.vue';

const props = defineProps<{
  explanation: ErrorExplanation;
  loading?: boolean;
}>();

const emit = defineEmits<{
  apply: [correction: CorrectionOption];
  ignore: [];
  addToDictionary: [];
  loadDetails: [];
}>();

// State
const showDetails = ref(false);

// Computed
const severityClass = computed(() => {
  const classes: Record<string, string> = {
    critical: 'lf-explanation--critical',
    warning: 'lf-explanation--warning',
    suggestion: 'lf-explanation--suggestion',
  };
  return classes[props.explanation.severity] || classes.warning;
});

const categoryIcon = computed(() => {
  const icons: Record<string, string> = {
    spelling: '✏️',
    grammar: '📝',
    punctuation: '❗',
    style: '✨',
    clarity: '💡',
    conciseness: '📏',
    tone: '🎭',
    word_choice: '🔤',
  };
  return icons[props.explanation.category] || '📝';
});

const categoryLabel = computed(() => {
  const labels: Record<string, string> = {
    spelling: 'Spelling',
    grammar: 'Grammar',
    punctuation: 'Punctuation',
    style: 'Style',
    clarity: 'Clarity',
    conciseness: 'Conciseness',
    tone: 'Tone',
    word_choice: 'Word Choice',
  };
  return labels[props.explanation.category] || 'Issue';
});

const hasExamples = computed(() => {
  return (
    props.explanation.explanation.examples &&
    props.explanation.explanation.examples.length > 0
  );
});

const hasDetails = computed(() => {
  return (
    props.explanation.explanation.rule ||
    props.explanation.explanation.styleGuide ||
    hasExamples.value
  );
});

const showLoadDetailsButton = computed(() => {
  return !props.explanation.detailedLoaded && !showDetails.value;
});

// Handlers
function handleLoadDetails() {
  showDetails.value = true;
  emit('loadDetails');
}

function toggleDetails() {
  showDetails.value = !showDetails.value;
}
</script>

<template>
  <div class="lf-explanation" :class="severityClass">
    <!-- Header -->
    <div class="lf-explanation-header">
      <span class="lf-explanation-icon">{{ categoryIcon }}</span>
      <span class="lf-explanation-category">{{ categoryLabel }}</span>
      <span v-if="loading" class="lf-explanation-loading">
        <span class="lf-spinner"/>
      </span>
    </div>

    <!-- Summary -->
    <div class="lf-explanation-summary">{{ explanation.summary }}</div>

    <!-- Reason -->
    <div v-if="explanation.explanation.reason" class="lf-explanation-reason">
      {{ explanation.explanation.reason }}
    </div>

    <!-- Corrections -->
    <AutoCorrectActions
      :corrections="explanation.corrections"
      :show-dictionary="explanation.category === 'spelling'"
      @apply="$emit('apply', $event)"
      @ignore="$emit('ignore')"
      @add-to-dictionary="$emit('addToDictionary')"
    />

    <!-- Details Section (expandable) -->
    <div
      v-if="hasDetails || showLoadDetailsButton"
      class="lf-explanation-details-section"
    >
      <!-- Load Details Button -->
      <button
        v-if="showLoadDetailsButton"
        type="button"
        class="lf-details-toggle"
        :disabled="loading"
        @click="handleLoadDetails"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM8 4a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 4zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
          />
        </svg>
        {{ loading ? 'Loading...' : 'Learn more' }}
      </button>

      <!-- Toggle Button (when details loaded) -->
      <button
        v-else-if="hasDetails"
        type="button"
        class="lf-details-toggle"
        @click="toggleDetails"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          :class="{ 'lf-rotate-90': showDetails }"
        >
          <path d="M6 12V4l4 4-4 4z"/>
        </svg>
        {{ showDetails ? 'Hide details' : 'Show details' }}
      </button>

      <!-- Details Content -->
      <div v-if="showDetails && hasDetails" class="lf-explanation-details">
        <!-- Rule -->
        <div v-if="explanation.explanation.rule" class="lf-detail-item">
          <strong>Rule:</strong>
          {{ explanation.explanation.rule }}
        </div>

        <!-- Style Guide -->
        <div v-if="explanation.explanation.styleGuide" class="lf-detail-item">
          <strong>Style Guide:</strong>
          {{ explanation.explanation.styleGuide }}
        </div>

        <!-- Examples -->
        <div v-if="hasExamples" class="lf-examples">
          <strong>Examples:</strong>
          <div
            v-for="(example, index) in explanation.explanation.examples"
            :key="index"
            class="lf-example"
          >
            <div class="lf-example-incorrect">
              <span class="lf-example-icon">❌</span>
              {{ example.incorrect }}
            </div>
            <div class="lf-example-correct">
              <span class="lf-example-icon">✓</span>
              {{ example.correct }}
            </div>
            <div v-if="example.note" class="lf-example-note">
              {{ example.note }}
            </div>
          </div>
        </div>

        <!-- Learn More Link -->
        <a
          v-if="explanation.explanation.learnMore"
          :href="explanation.explanation.learnMore"
          target="_blank"
          rel="noopener noreferrer"
          class="lf-learn-more"
        >
          Learn more ↗
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lf-explanation {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.lf-explanation--critical {
  border-left: 3px solid var(--lf-color-error, #ef4444);
}

.lf-explanation--warning {
  border-left: 3px solid var(--lf-color-warning, #f59e0b);
}

.lf-explanation--suggestion {
  border-left: 3px solid var(--lf-color-info, #3b82f6);
}

.lf-explanation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.lf-explanation-icon {
  font-size: 16px;
}

.lf-explanation-category {
  font-weight: 600;
  color: var(--lf-color-text-primary, #1f2937);
}

.lf-explanation-loading {
  margin-left: auto;
}

.lf-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--lf-color-border, #e5e7eb);
  border-radius: 50%;
  border-top-color: var(--lf-color-primary, #3b82f6);
  animation: lf-spin 0.8s linear infinite;
}

@keyframes lf-spin {
  to {
    transform: rotate(360deg);
  }
}

.lf-explanation-summary {
  font-weight: 500;
  color: var(--lf-color-text-primary, #1f2937);
  margin-bottom: 4px;
}

.lf-explanation-reason {
  color: var(--lf-color-text-secondary, #6b7280);
  margin-bottom: 12px;
}

.lf-explanation-details-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--lf-color-border, #e5e7eb);
}

.lf-details-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 4px 8px;
  margin: -4px -8px;
  color: var(--lf-color-primary, #3b82f6);
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.lf-details-toggle:hover {
  opacity: 0.8;
}

.lf-details-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-details-toggle svg {
  transition: transform 0.15s;
}

.lf-rotate-90 {
  transform: rotate(90deg);
}

.lf-explanation-details {
  margin-top: 12px;
}

.lf-detail-item {
  margin-bottom: 8px;
  color: var(--lf-color-text-secondary, #6b7280);
}

.lf-detail-item strong {
  color: var(--lf-color-text-primary, #1f2937);
}

.lf-examples {
  margin-top: 8px;
}

.lf-examples strong {
  display: block;
  margin-bottom: 8px;
  color: var(--lf-color-text-primary, #1f2937);
}

.lf-example {
  background: var(--lf-color-bg-subtle, #f9fafb);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
}

.lf-example-incorrect {
  color: var(--lf-color-error, #ef4444);
  text-decoration: line-through;
  margin-bottom: 4px;
}

.lf-example-correct {
  color: var(--lf-color-success, #10b981);
}

.lf-example-icon {
  margin-right: 4px;
}

.lf-example-note {
  font-size: 12px;
  color: var(--lf-color-text-tertiary, #9ca3af);
  margin-top: 4px;
  font-style: italic;
}

.lf-learn-more {
  display: inline-block;
  margin-top: 8px;
  color: var(--lf-color-primary, #3b82f6);
  text-decoration: none;
  font-size: 13px;
}

.lf-learn-more:hover {
  text-decoration: underline;
}
</style>
