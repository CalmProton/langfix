<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import type { SentenceScore } from '#utils/readability-engine/types';
import { getScoreLabel } from '#utils/readability-engine/flesch';
import { calculatePopupPosition } from '#utils/suggestion-ui/rect-helpers';
import type {
  PopupAnchor,
  ViewportRect,
} from '#utils/suggestion-ui/types';

const props = defineProps<{
  sentence: SentenceScore;
  rect: ViewportRect;
}>();

const emit = defineEmits<{
  simplify: [];
  close: [];
}>();

// Refs
const tooltipRef = ref<HTMLDivElement | null>(null);
const tooltipWidth = ref(280);
const tooltipHeight = ref(150);
const position = ref({ x: 0, y: 0 });
const anchor = ref<PopupAnchor>('below');

// Computed
const scoreLabel = computed(() => getScoreLabel(props.sentence.score));

const levelClass = computed(
  () => `lf-readability-level--${props.sentence.level}`,
);

const tooltipStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}));

const tooltipClass = computed(() => ({
  'lf-readability-tooltip': true,
  'lf-readability-tooltip--above': anchor.value === 'above',
}));

const showSimplifyButton = computed(() => {
  return props.sentence.level === 'hard' || props.sentence.level === 'moderate';
});

// Position calculation
function updatePosition() {
  const pos = calculatePopupPosition(
    props.rect,
    tooltipWidth.value,
    tooltipHeight.value,
  );
  position.value = { x: pos.x, y: pos.y };
  anchor.value = pos.anchor;
}

function measureTooltip() {
  if (tooltipRef.value) {
    const rect = tooltipRef.value.getBoundingClientRect();
    tooltipWidth.value = rect.width;
    tooltipHeight.value = rect.height;
    updatePosition();
  }
}

function handleSimplify() {
  emit('simplify');
}

function handleClose() {
  emit('close');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    handleClose();
  }
}

// Lifecycle
onMounted(() => {
  measureTooltip();
  document.addEventListener('keydown', handleKeydown, { capture: true });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, { capture: true });
});

// Watch for rect changes
watchEffect(() => {
  if (props.rect) {
    updatePosition();
  }
});
</script>

<template>
  <div
    ref="tooltipRef"
    :class="tooltipClass"
    :style="tooltipStyle"
    role="tooltip"
    :aria-label="`Readability: ${scoreLabel}`"
  >
    <!-- Header with score -->
    <div class="lf-readability-tooltip-header">
      <span :class="['lf-readability-score', levelClass]">
        {{ sentence.score }}
      </span>
      <span class="lf-readability-label">{{ scoreLabel }}</span>
    </div>

    <!-- Stats -->
    <div class="lf-readability-stats">
      <span class="lf-readability-stat">
        <strong>{{ sentence.wordCount }}</strong>words
      </span>
      <span class="lf-readability-stat">
        <strong>{{ sentence.syllableCount }}</strong>syllables
      </span>
      <span
        v-if="sentence.hasPassiveVoice"
        class="lf-readability-stat lf-readability-stat--warning"
      >
        Passive voice
      </span>
    </div>

    <!-- Reasons -->
    <div v-if="sentence.reasons.length > 0" class="lf-readability-reasons">
      <span
        v-for="reason in sentence.reasons"
        :key="reason"
        class="lf-readability-reason"
      >
        {{ reason }}
      </span>
    </div>

    <!-- Simplify CTA -->
    <div v-if="showSimplifyButton" class="lf-readability-actions">
      <button
        type="button"
        class="lf-readability-btn lf-readability-btn--primary"
        @click="handleSimplify"
      >
        <svg
          class="lf-readability-icon"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M2.5 4.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
          />
        </svg>
        Simplify
      </button>
    </div>
  </div>
</template>

<style scoped>
.lf-readability-tooltip {
  position: fixed;
  z-index: 10001;
  min-width: 200px;
  max-width: 320px;
  padding: 12px;
  background: var(--lf-bg, #fff);
  border: 1px solid var(--lf-border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--lf-text, #374151);
}

.lf-readability-tooltip--above {
  transform: translateY(-8px);
}

.lf-readability-tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.lf-readability-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.lf-readability-level--easy {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(22, 163, 74);
}

.lf-readability-level--moderate {
  background: rgba(234, 179, 8, 0.15);
  color: rgb(161, 98, 7);
}

.lf-readability-level--hard {
  background: rgba(239, 68, 68, 0.15);
  color: rgb(220, 38, 38);
}

.lf-readability-label {
  font-weight: 500;
}

.lf-readability-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--lf-text-muted, #6b7280);
}

.lf-readability-stat--warning {
  color: rgb(234, 179, 8);
}

.lf-readability-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}

.lf-readability-reason {
  display: inline-block;
  padding: 2px 6px;
  background: var(--lf-bg-muted, #f3f4f6);
  border-radius: 4px;
  font-size: 11px;
  color: var(--lf-text-muted, #6b7280);
}

.lf-readability-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--lf-border, #e5e7eb);
}

.lf-readability-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.lf-readability-btn--primary {
  background: var(--lf-primary, #3b82f6);
  color: white;
}

.lf-readability-btn--primary:hover {
  background: var(--lf-primary-hover, #2563eb);
}

.lf-readability-icon {
  width: 14px;
  height: 14px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .lf-readability-tooltip {
    --lf-bg: #1f2937;
    --lf-border: #374151;
    --lf-text: #f9fafb;
    --lf-text-muted: #9ca3af;
    --lf-bg-muted: #374151;
  }
}
</style>
