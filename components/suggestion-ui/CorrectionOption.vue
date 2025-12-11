<script lang="ts" setup>
import { computed } from 'vue';
import type { CorrectionOption } from '../../utils/error-explanations/types';

const props = defineProps<{
  correction: CorrectionOption;
  isPrimary?: boolean;
}>();

defineEmits<{
  apply: [correction: CorrectionOption];
}>();

// Computed
const confidenceLabel = computed(() => {
  const confidence = props.correction.confidence;
  if (confidence >= 0.85) {
    return { text: 'Recommended', class: 'lf-confidence--high' };
  }
  if (confidence >= 0.5) {
    return { text: 'Suggested', class: 'lf-confidence--medium' };
  }
  return { text: 'Consider', class: 'lf-confidence--low' };
});

const buttonClass = computed(() => {
  return props.isPrimary
    ? 'lf-correction-btn lf-correction-btn--primary'
    : 'lf-correction-btn lf-correction-btn--secondary';
});
</script>

<template>
  <button
    type="button"
    :class="buttonClass"
    @click="$emit('apply', correction)"
  >
    <!-- Checkmark for primary -->
    <svg
      v-if="isPrimary"
      class="lf-correction-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path
        d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
      />
    </svg>

    <!-- Correction Text -->
    <span class="lf-correction-text">{{ correction.text }}</span>

    <!-- Confidence Badge (primary only) -->
    <span
      v-if="isPrimary"
      class="lf-confidence-badge"
      :class="confidenceLabel.class"
    >
      {{ confidenceLabel.text }}
    </span>
  </button>

  <!-- Description (shown below for primary) -->
  <div
    v-if="isPrimary && correction.description"
    class="lf-correction-description"
  >
    {{ correction.description }}
  </div>
</template>

<style scoped>
.lf-correction-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.lf-correction-btn--primary {
  background: var(--lf-color-primary, #3b82f6);
  border: none;
  color: white;
}

.lf-correction-btn--primary:hover {
  background: var(--lf-color-primary-hover, #2563eb);
}

.lf-correction-btn--secondary {
  background: var(--lf-color-bg-subtle, #f9fafb);
  border: 1px solid var(--lf-color-border, #e5e7eb);
  color: var(--lf-color-text-primary, #1f2937);
}

.lf-correction-btn--secondary:hover {
  background: var(--lf-color-bg-hover, #f3f4f6);
  border-color: var(--lf-color-border-hover, #d1d5db);
}

.lf-correction-icon {
  flex-shrink: 0;
}

.lf-correction-text {
  flex-grow: 1;
  font-weight: 500;
}

.lf-confidence-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.lf-confidence--high {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.lf-confidence--medium {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.lf-confidence--low {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.lf-correction-description {
  margin-top: 4px;
  padding-left: 24px;
  font-size: 12px;
  color: var(--lf-color-text-tertiary, #9ca3af);
}
</style>
