<script lang="ts" setup>
import { computed } from 'vue';
import type { OverallScore } from '#utils/readability-engine/types';
import { HEATMAP_COLORS } from '#utils/readability-engine/types';
import { getScoreLabel } from '#utils/readability-engine/flesch';

const props = defineProps<{
  overall: OverallScore;
}>();

const emit = defineEmits<{
  close: [];
  toggle: [];
}>();

const scoreLabel = computed(() => getScoreLabel(props.overall.score));

const levelClass = computed(() => `lf-legend-score--${props.overall.level}`);

const levelColors = [
  { level: 'easy' as const, label: 'Easy', description: 'Score 70+' },
  { level: 'moderate' as const, label: 'Moderate', description: 'Score 41-69' },
  { level: 'hard' as const, label: 'Hard', description: 'Score ≤40' },
];

function handleClose() {
  emit('close');
}

function handleToggle() {
  emit('toggle');
}
</script>

<template>
  <div class="lf-readability-legend">
    <!-- Overall Score -->
    <div class="lf-legend-header">
      <div class="lf-legend-score-container">
        <span :class="['lf-legend-score', levelClass]">
          {{ overall.score }}
        </span>
        <div class="lf-legend-score-info">
          <span class="lf-legend-label">{{ scoreLabel }}</span>
          <span class="lf-legend-grade">{{ overall.gradeLevel }}</span>
        </div>
      </div>
      <button
        type="button"
        class="lf-legend-close"
        aria-label="Close legend"
        @click="handleClose"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
          />
        </svg>
      </button>
    </div>

    <!-- Stats -->
    <div class="lf-legend-stats">
      <div class="lf-legend-stat">
        <span class="lf-legend-stat-value">{{ overall.wordCount }}</span>
        <span class="lf-legend-stat-label">words</span>
      </div>
      <div class="lf-legend-stat">
        <span class="lf-legend-stat-value">{{ overall.sentenceCount }}</span>
        <span class="lf-legend-stat-label">sentences</span>
      </div>
      <div class="lf-legend-stat">
        <span class="lf-legend-stat-value"
          >{{ overall.avgWordsPerSentence }}</span
        >
        <span class="lf-legend-stat-label">avg words/sent</span>
      </div>
    </div>

    <!-- Color Legend -->
    <div class="lf-legend-colors">
      <div
        v-for="item in levelColors"
        :key="item.level"
        class="lf-legend-color-item"
      >
        <span
          class="lf-legend-color-swatch"
          :style="{ backgroundColor: HEATMAP_COLORS[item.level].background }"
        />
        <span class="lf-legend-color-label">{{ item.label }}</span>
        <span class="lf-legend-color-desc">{{ item.description }}</span>
      </div>
    </div>

    <!-- Toggle Button -->
    <div class="lf-legend-actions">
      <button type="button" class="lf-legend-toggle" @click="handleToggle">
        <svg class="lf-legend-icon" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"
          />
        </svg>
        Hide Heatmap
      </button>
    </div>

    <!-- Reasons -->
    <div v-if="overall.reasons.length > 0" class="lf-legend-reasons">
      <span class="lf-legend-reasons-title">Key factors:</span>
      <span
        v-for="reason in overall.reasons"
        :key="reason"
        class="lf-legend-reason"
      >
        {{ reason }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.lf-readability-legend {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 10002;
  min-width: 240px;
  max-width: 320px;
  padding: 12px;
  background: var(--lf-bg, #fff);
  border: 1px solid var(--lf-border, #e5e7eb);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--lf-text, #374151);
}

.lf-legend-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.lf-legend-score-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lf-legend-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 18px;
}

.lf-legend-score--easy {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(22, 163, 74);
}

.lf-legend-score--moderate {
  background: rgba(234, 179, 8, 0.15);
  color: rgb(161, 98, 7);
}

.lf-legend-score--hard {
  background: rgba(239, 68, 68, 0.15);
  color: rgb(220, 38, 38);
}

.lf-legend-score--unknown {
  background: rgba(107, 114, 128, 0.15);
  color: rgb(107, 114, 128);
}

.lf-legend-score-info {
  display: flex;
  flex-direction: column;
}

.lf-legend-label {
  font-weight: 600;
  font-size: 14px;
}

.lf-legend-grade {
  font-size: 12px;
  color: var(--lf-text-muted, #6b7280);
}

.lf-legend-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--lf-text-muted, #6b7280);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.lf-legend-close:hover {
  background: var(--lf-bg-muted, #f3f4f6);
}

.lf-legend-close svg {
  width: 14px;
  height: 14px;
}

.lf-legend-stats {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--lf-border, #e5e7eb);
  border-bottom: 1px solid var(--lf-border, #e5e7eb);
  margin-bottom: 10px;
}

.lf-legend-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.lf-legend-stat-value {
  font-weight: 600;
  font-size: 15px;
}

.lf-legend-stat-label {
  font-size: 10px;
  color: var(--lf-text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lf-legend-colors {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.lf-legend-color-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lf-legend-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.lf-legend-color-label {
  font-weight: 500;
  min-width: 60px;
}

.lf-legend-color-desc {
  font-size: 11px;
  color: var(--lf-text-muted, #6b7280);
}

.lf-legend-actions {
  margin-bottom: 8px;
}

.lf-legend-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--lf-border, #e5e7eb);
  border-radius: 6px;
  background: var(--lf-bg, #fff);
  color: var(--lf-text, #374151);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.lf-legend-toggle:hover {
  background: var(--lf-bg-muted, #f3f4f6);
}

.lf-legend-icon {
  width: 14px;
  height: 14px;
}

.lf-legend-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--lf-border, #e5e7eb);
}

.lf-legend-reasons-title {
  width: 100%;
  font-size: 11px;
  font-weight: 500;
  color: var(--lf-text-muted, #6b7280);
  margin-bottom: 4px;
}

.lf-legend-reason {
  display: inline-block;
  padding: 2px 6px;
  background: var(--lf-bg-muted, #f3f4f6);
  border-radius: 4px;
  font-size: 11px;
  color: var(--lf-text-muted, #6b7280);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .lf-readability-legend {
    --lf-bg: #1f2937;
    --lf-border: #374151;
    --lf-text: #f9fafb;
    --lf-text-muted: #9ca3af;
    --lf-bg-muted: #374151;
  }
}
</style>
