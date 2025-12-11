<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { calculatePopupPosition } from '../../utils/suggestion-ui/rect-helpers';
import type {
  PopupAnchor,
  SuggestionError,
  ViewportRect,
} from '../../utils/suggestion-ui/types';

const props = defineProps<{
  error: SuggestionError;
  rect: ViewportRect;
}>();

const emit = defineEmits<{
  apply: [suggestion: string];
  ignore: [];
  addToDictionary: [];
  close: [];
}>();

// Refs
const popupRef = ref<HTMLDivElement | null>(null);
const popupWidth = ref(320);
const popupHeight = ref(200);
const position = ref({ x: 0, y: 0 });
const anchor = ref<PopupAnchor>('below');

// Computed
const suggestions = computed(() => {
  const main = props.error.suggestion;
  const alts = props.error.alternatives || [];
  return [main, ...alts].filter(Boolean);
});

const popupStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  maxWidth: '400px',
}));

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    grammar: 'Grammar',
    spelling: 'Spelling',
    punctuation: 'Punctuation',
    contextual: 'Context',
  };
  return labels[props.error.type] || props.error.type;
});

// Show "Add to Dictionary" only for spelling errors
const showDictionaryAction = computed(() => {
  return props.error.type === 'spelling';
});

// Position calculation
function updatePosition() {
  const pos = calculatePopupPosition(
    props.rect,
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
function handleApply(suggestion: string) {
  emit('apply', suggestion);
}

function handleIgnore() {
  emit('ignore');
}

function handleAddToDictionary() {
  emit('addToDictionary');
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

function handleClickOutside(event: MouseEvent) {
  if (popupRef.value && !popupRef.value.contains(event.target as Node)) {
    handleClose();
  }
}

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

// Watch for rect changes
watchEffect(() => {
  if (props.rect) {
    updatePosition();
  }
});
</script>

<template>
  <div
    ref="popupRef"
    class="lf-popup"
    :class="{ 'lf-popup--above': anchor === 'above' }"
    :style="popupStyle"
    role="dialog"
    aria-modal="true"
    :aria-label="`${typeLabel} suggestion for: ${error.original}`"
  >
    <!-- Header -->
    <div class="lf-popup-header">
      <span :class="`lf-popup-type lf-popup-type--${error.type}`">
        {{ typeLabel }}
      </span>
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

    <!-- Original text -->
    <div class="lf-popup-original">{{ error.original }}</div>

    <!-- Suggestions -->
    <div class="lf-popup-suggestions">
      <button
        v-for="(suggestion, index) in suggestions"
        :key="suggestion"
        type="button"
        :class="[
          'lf-suggestion-btn',
          { 'lf-suggestion-btn--primary': index === 0 }
        ]"
        @click="handleApply(suggestion)"
      >
        <svg
          v-if="index === 0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
          />
        </svg>
        {{ suggestion }}
      </button>
    </div>

    <!-- Explanation -->
    <div v-if="error.explanation" class="lf-popup-explanation">
      {{ error.explanation }}
    </div>

    <!-- Actions -->
    <div class="lf-popup-actions">
      <button type="button" class="lf-action-btn" @click="handleIgnore">
        Ignore
      </button>
      <button
        v-if="showDictionaryAction"
        type="button"
        class="lf-action-btn"
        @click="handleAddToDictionary"
      >
        Add to Dictionary
      </button>
    </div>
  </div>
</template>
