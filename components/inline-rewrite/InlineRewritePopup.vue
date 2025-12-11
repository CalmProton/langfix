<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { calculatePopupPosition } from '#utils/suggestion-ui/rect-helpers';
import {
  REWRITE_MODE_METADATA,
  type RewriteMode,
} from '#utils/rewrite-engine/types';
import type { InlineRewriteState } from '#utils/inline-rewrite/types';
import type { PopupAnchor } from '#utils/suggestion-ui/types';

const props = defineProps<{
  state: InlineRewriteState;
  rect: DOMRect | null;
}>();

const emit = defineEmits<{
  apply: [];
  retry: [];
  copy: [];
  close: [];
  modeChange: [mode: RewriteMode];
}>();

// Constants
const AVAILABLE_MODES: RewriteMode[] = [
  'improve',
  'shorten',
  'expand',
  'simplify',
  'professional',
  'casual',
  'academic',
];

// Refs
const popupRef = ref<HTMLDivElement | null>(null);
const popupWidth = ref(360);
const popupHeight = ref(280);
const position = ref({ x: 0, y: 0 });
const anchor = ref<PopupAnchor>('below');

// Computed
const isLoading = computed(
  () => props.state.status === 'loading' || props.state.status === 'streaming',
);

const isStreaming = computed(() => props.state.status === 'streaming');

const isDone = computed(() => props.state.status === 'done');

const isError = computed(() => props.state.status === 'error');

const hasResult = computed(() => props.state.resultText.length > 0);

const canApply = computed(() => isDone.value && hasResult.value);

const currentModeLabel = computed(
  () => REWRITE_MODE_METADATA[props.state.mode]?.label || props.state.mode,
);

const wordDelta = computed(() => {
  if (!props.state.stats) return null;
  const delta =
    props.state.stats.rewrittenWords - props.state.stats.originalWords;
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
});

const latencyDisplay = computed(() => {
  if (!props.state.processingTime) return null;
  const seconds = (props.state.processingTime / 1000).toFixed(1);
  return `${seconds}s`;
});

const popupStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}));

const popupClass = computed(() => ({
  'lf-popup': true,
  'lf-popup--above': anchor.value === 'above',
}));

// Position calculation
function updatePosition() {
  if (!props.rect) return;

  const pos = calculatePopupPosition(
    {
      x: props.rect.x,
      y: props.rect.y,
      width: props.rect.width,
      height: props.rect.height,
      viewportClamped: false,
      original: {
        x: props.rect.x,
        y: props.rect.y,
        width: props.rect.width,
        height: props.rect.height,
      },
    },
    popupWidth.value,
    popupHeight.value,
  );
  position.value = { x: pos.x, y: pos.y };
  anchor.value = pos.anchor;
}

// Measure popup after render
function measurePopup() {
  if (popupRef.value) {
    const rect = popupRef.value.getBoundingClientRect();
    popupWidth.value = rect.width;
    popupHeight.value = rect.height;
    updatePosition();
  }
}

// Event handlers
function handleApply() {
  emit('apply');
}

function handleRetry() {
  emit('retry');
}

function handleCopy() {
  emit('copy');
}

function handleClose() {
  emit('close');
}

function handleModeChange(mode: RewriteMode) {
  emit('modeChange', mode);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    handleClose();
  }
}

function handleClickOutside(event: MouseEvent) {
  if (popupRef.value && !popupRef.value.contains(event.target as Node)) {
    handleClose();
  }
}

// Watch for rect changes
watchEffect(() => {
  if (props.rect) {
    updatePosition();
  }
});

// Lifecycle
onMounted(() => {
  measurePopup();

  // Add event listeners with a delay to avoid immediate close
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside, { capture: true });
    document.addEventListener('keydown', handleKeydown, { capture: true });
  }, 0);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, { capture: true });
  document.removeEventListener('keydown', handleKeydown, { capture: true });
});
</script>

<template>
  <div
    ref="popupRef"
    :class="popupClass"
    :style="popupStyle"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lf-rewrite-title"
  >
    <!-- Header with mode selector -->
    <div class="lf-rewrite-header">
      <h3 id="lf-rewrite-title" class="lf-sr-only">Rewrite Text</h3>

      <!-- Mode pills -->
      <div class="lf-mode-pills" role="tablist" aria-label="Rewrite modes">
        <button
          v-for="mode in AVAILABLE_MODES"
          :key="mode"
          type="button"
          role="tab"
          :aria-selected="state.mode === mode"
          :class="[
            'lf-mode-pill',
            state.mode === mode && 'lf-mode-pill--active'
          ]"
          :disabled="isLoading"
          @click="handleModeChange(mode)"
        >
          {{ REWRITE_MODE_METADATA[mode]?.label || mode }}
        </button>
      </div>

      <!-- Close button -->
      <button
        type="button"
        class="lf-popup-close"
        aria-label="Close"
        @click="handleClose"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Original text (optional display) -->
    <div v-if="state.originalText" class="lf-rewrite-original">
      <span class="lf-rewrite-label">Original:</span>
      <div class="lf-rewrite-text lf-rewrite-text--original">
        {{ state.originalText }}
      </div>
    </div>

    <!-- Result area -->
    <div class="lf-rewrite-result">
      <div class="lf-rewrite-result-header">
        <span class="lf-rewrite-label">{{ currentModeLabel }}:</span>
        <div v-if="isDone" class="lf-rewrite-badges">
          <span v-if="wordDelta" class="lf-badge lf-badge--delta">
            {{ wordDelta }}words
          </span>
          <span v-if="latencyDisplay" class="lf-badge lf-badge--time">
            {{ latencyDisplay }}
          </span>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading && !hasResult" class="lf-rewrite-loading">
        <div class="lf-skeleton"/>
        <div class="lf-skeleton lf-skeleton--short"/>
      </div>

      <!-- Streaming/Result text -->
      <div
        v-else-if="hasResult"
        class="lf-rewrite-text lf-rewrite-text--result"
        :class="{ 'lf-rewrite-text--streaming': isStreaming }"
        aria-live="polite"
      >
        {{ state.resultText }}
        <span v-if="isStreaming" class="lf-cursor"/>
      </div>

      <!-- Error state -->
      <div v-else-if="isError && state.error" class="lf-rewrite-error">
        <div class="lf-error-message">{{ state.error.message }}</div>
        <button
          v-if="state.error.retryable"
          type="button"
          class="lf-btn lf-btn--link"
          @click="handleRetry"
        >
          Try again
        </button>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="lf-rewrite-actions">
      <button
        type="button"
        class="lf-btn lf-btn--primary"
        :disabled="!canApply"
        @click="handleApply"
      >
        Apply
      </button>
      <button
        type="button"
        class="lf-btn lf-btn--secondary"
        :disabled="isLoading"
        @click="handleRetry"
      >
        Retry
      </button>
      <button
        type="button"
        class="lf-btn lf-btn--ghost"
        :disabled="!hasResult"
        @click="handleCopy"
      >
        Copy
      </button>
      <button type="button" class="lf-btn lf-btn--ghost" @click="handleClose">
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Rewrite popup specific styles */
.lf-rewrite-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.lf-mode-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.lf-mode-pill {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 12px;
  border: 1px solid var(--lf-border);
  background: var(--lf-surface);
  color: var(--lf-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.lf-mode-pill:hover:not(:disabled) {
  background: var(--lf-border);
  color: var(--lf-text);
}

.lf-mode-pill--active {
  background: var(--lf-primary);
  border-color: var(--lf-primary);
  color: white;
}

.lf-mode-pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-rewrite-original {
  margin-bottom: 12px;
}

.lf-rewrite-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--lf-text-secondary);
  margin-bottom: 4px;
}

.lf-rewrite-text {
  font-size: 14px;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--lf-surface);
  max-height: 100px;
  overflow-y: auto;
}

.lf-rewrite-text--original {
  color: var(--lf-text-secondary);
  text-decoration: line-through;
  text-decoration-color: var(--lf-danger);
}

.lf-rewrite-text--result {
  color: var(--lf-text);
}

.lf-rewrite-text--streaming {
  border: 1px solid var(--lf-primary);
}

.lf-rewrite-result {
  margin-bottom: 12px;
}

.lf-rewrite-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.lf-rewrite-badges {
  display: flex;
  gap: 6px;
}

.lf-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--lf-surface);
  color: var(--lf-text-secondary);
}

.lf-badge--delta {
  color: var(--lf-primary);
}

.lf-badge--time {
  color: var(--lf-success);
}

.lf-rewrite-loading {
  padding: 12px;
}

.lf-skeleton {
  height: 14px;
  background: linear-gradient(
    90deg,
    var(--lf-surface) 25%,
    var(--lf-border) 50%,
    var(--lf-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.lf-skeleton--short {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.lf-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: var(--lf-primary);
  animation: blink 1s infinite;
  margin-left: 2px;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.lf-rewrite-error {
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  text-align: center;
}

.lf-error-message {
  font-size: 13px;
  color: var(--lf-danger);
  margin-bottom: 8px;
}

.lf-rewrite-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--lf-border);
}

.lf-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.lf-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-btn--primary {
  background: var(--lf-primary);
  color: white;
}

.lf-btn--primary:hover:not(:disabled) {
  background: var(--lf-primary-hover);
}

.lf-btn--secondary {
  background: var(--lf-surface);
  color: var(--lf-text);
  border: 1px solid var(--lf-border);
}

.lf-btn--secondary:hover:not(:disabled) {
  background: var(--lf-border);
}

.lf-btn--ghost {
  background: transparent;
  color: var(--lf-text-secondary);
}

.lf-btn--ghost:hover:not(:disabled) {
  background: var(--lf-surface);
  color: var(--lf-text);
}

.lf-btn--link {
  background: none;
  border: none;
  color: var(--lf-primary);
  padding: 4px;
  font-size: 13px;
}

.lf-btn--link:hover {
  text-decoration: underline;
}
</style>
