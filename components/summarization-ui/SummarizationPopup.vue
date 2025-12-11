<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { SummarizationState } from '../../utils/summarization/types';
import type { PopupAnchor } from '../../utils/suggestion-ui/types';

const props = defineProps<{
  state: SummarizationState;
  position: { x: number; y: number };
  anchor: PopupAnchor;
  onClose: () => void;
  onCopy: () => void;
  onRetry: () => void;
}>();

// Refs
const popupRef = ref<HTMLDivElement | null>(null);
const copied = ref(false);

// Computed
const isLoading = computed(() => props.state.status === 'loading');

const isStreaming = computed(() => props.state.status === 'streaming');

const isDone = computed(() => props.state.status === 'done');

const isError = computed(() => props.state.status === 'error');

const hasBullets = computed(() => props.state.bullets.length > 0);

const latencyDisplay = computed(() => {
  if (!props.state.processingTime) return null;
  const seconds = (props.state.processingTime / 1000).toFixed(1);
  return `${seconds}s`;
});

const popupStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}));

const popupClass = computed(() => ({
  'lf-popup': true,
  'lf-popup--above': props.anchor === 'above',
}));

// Event handlers
function handleCopy() {
  props.onCopy();
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function handleRetry() {
  props.onRetry();
}

function handleClose() {
  props.onClose();
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

// Lifecycle
onMounted(() => {
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
    aria-labelledby="lf-summary-title"
  >
    <!-- Header -->
    <div class="lf-summary-header">
      <h3 id="lf-summary-title" class="lf-summary-title">
        <svg
          class="lf-summary-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Summary
      </h3>

      <div class="lf-summary-badges">
        <span v-if="isDone && state.cached" class="lf-badge lf-badge--cached">
          Cached
        </span>
        <span v-if="latencyDisplay" class="lf-badge lf-badge--time">
          {{ latencyDisplay }}
        </span>
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

    <!-- Content area -->
    <div class="lf-summary-content">
      <!-- Loading state -->
      <div v-if="isLoading || isStreaming" class="lf-summary-loading">
        <div class="lf-spinner"/>
        <span class="lf-loading-text">Generating summary...</span>
      </div>

      <!-- Key Takeaway -->
      <div v-else-if="isDone && state.keyTakeaway" class="lf-summary-takeaway">
        <p class="lf-takeaway-text">{{ state.keyTakeaway }}</p>
      </div>

      <!-- Bullet Points -->
      <ul v-if="isDone && hasBullets" class="lf-summary-bullets">
        <li
          v-for="(bullet, index) in state.bullets"
          :key="index"
          class="lf-bullet-item"
        >
          <span class="lf-bullet-dot">•</span>
          <span class="lf-bullet-text">{{ bullet }}</span>
        </li>
      </ul>

      <!-- Error state -->
      <div v-else-if="isError && state.error" class="lf-summary-error">
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
    <div class="lf-summary-actions">
      <button
        type="button"
        class="lf-btn lf-btn--primary"
        :disabled="!hasBullets || copied"
        @click="handleCopy"
      >
        <svg
          v-if="!copied"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg
          v-else
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
      <button
        type="button"
        class="lf-btn lf-btn--ghost"
        :disabled="isLoading"
        @click="handleRetry"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Retry
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Summarization popup specific styles */
.lf-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.lf-summary-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--lf-text);
  margin: 0;
  flex: 1;
}

.lf-summary-icon {
  color: var(--lf-primary);
}

.lf-summary-badges {
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

.lf-badge--cached {
  color: var(--lf-success);
  background: rgba(16, 185, 129, 0.1);
}

.lf-badge--time {
  color: var(--lf-text-secondary);
}

.lf-summary-content {
  min-height: 80px;
}

.lf-summary-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 12px;
}

.lf-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--lf-border);
  border-top-color: var(--lf-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.lf-loading-text {
  font-size: 13px;
  color: var(--lf-text-secondary);
}

.lf-summary-takeaway {
  padding: 10px 12px;
  background: var(--lf-surface);
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 3px solid var(--lf-primary);
}

.lf-takeaway-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--lf-text);
  margin: 0;
  line-height: 1.5;
}

.lf-summary-bullets {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lf-bullet-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.lf-bullet-item:not(:last-child) {
  border-bottom: 1px solid var(--lf-border);
}

.lf-bullet-dot {
  color: var(--lf-primary);
  font-weight: bold;
  line-height: 1.5;
  flex-shrink: 0;
}

.lf-bullet-text {
  font-size: 13px;
  color: var(--lf-text);
  line-height: 1.5;
}

.lf-summary-error {
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  text-align: center;
}

.lf-error-message {
  font-size: 13px;
  color: var(--lf-danger);
  margin-bottom: 8px;
}

.lf-summary-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--lf-border);
}

.lf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
  flex: none;
}

.lf-btn--link:hover {
  text-decoration: underline;
}

/* Popup base styles - using existing shadow container vars */
.lf-popup {
  position: fixed;
  width: 320px;
  padding: 12px;
  background: var(--lf-bg);
  border: 1px solid var(--lf-border);
  border-radius: 10px;
  box-shadow: var(--lf-shadow-lg);
  pointer-events: auto;
  z-index: 2147483645;
}

.lf-popup--above {
  transform: translateY(-100%);
  margin-top: -8px;
}

.lf-popup-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--lf-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.lf-popup-close:hover {
  background: var(--lf-surface);
  color: var(--lf-text);
}
</style>
