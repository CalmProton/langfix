<script lang="ts" setup>
import { computed } from 'vue';
import type { CorrectionOption } from '#utils/error-explanations/types';
import CorrectionOptionComponent from '#components/suggestion-ui/CorrectionOption.vue';

const props = defineProps<{
  corrections: CorrectionOption[];
  showDictionary?: boolean;
}>();

defineEmits<{
  apply: [correction: CorrectionOption];
  ignore: [];
  addToDictionary: [];
}>();

// Computed
const topCorrection = computed(() => {
  if (props.corrections.length === 0) return null;
  return props.corrections.reduce((best, current) =>
    current.confidence > best.confidence ? current : best,
  );
});

const alternativeCorrections = computed(() => {
  if (!topCorrection.value) return [];
  return props.corrections.filter((c) => c.id !== topCorrection.value?.id);
});
</script>

<template>
  <div class="lf-auto-correct">
    <!-- Primary Correction -->
    <div v-if="topCorrection" class="lf-primary-correction">
      <CorrectionOptionComponent
        :correction="topCorrection"
        :is-primary="true"
        @apply="$emit('apply', $event)"
      />
    </div>

    <!-- Alternative Corrections -->
    <div v-if="alternativeCorrections.length > 0" class="lf-alternatives">
      <div class="lf-alternatives-label">Other options:</div>
      <div class="lf-alternatives-list">
        <CorrectionOptionComponent
          v-for="correction in alternativeCorrections"
          :key="correction.id"
          :correction="correction"
          :is-primary="false"
          @apply="$emit('apply', $event)"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="lf-correction-actions">
      <button type="button" class="lf-action-btn" @click="$emit('ignore')">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
          />
        </svg>
        Ignore
      </button>
      <button
        v-if="showDictionary"
        type="button"
        class="lf-action-btn"
        @click="$emit('addToDictionary')"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"
          />
        </svg>
        Add to Dictionary
      </button>
    </div>
  </div>
</template>

<style scoped>
.lf-auto-correct {
  margin-top: 12px;
}

.lf-primary-correction {
  margin-bottom: 8px;
}

.lf-alternatives {
  margin-bottom: 12px;
}

.lf-alternatives-label {
  font-size: 12px;
  color: var(--lf-color-text-tertiary, #9ca3af);
  margin-bottom: 6px;
}

.lf-alternatives-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lf-correction-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--lf-color-border, #e5e7eb);
}

.lf-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--lf-color-border, #e5e7eb);
  border-radius: 6px;
  font-size: 13px;
  color: var(--lf-color-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.15s;
}

.lf-action-btn:hover {
  background: var(--lf-color-bg-subtle, #f9fafb);
  color: var(--lf-color-text-primary, #1f2937);
}

.lf-action-btn svg {
  opacity: 0.7;
}
</style>
