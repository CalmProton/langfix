<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import type { MetricsState, MetricsSettings } from '../../utils/metrics/types';
import { EMPTY_METRICS_STATE, DEFAULT_METRICS_SETTINGS } from '../../utils/metrics/types';
import MetricsPill from './MetricsPill.vue';
import MetricsPanel from './MetricsPanel.vue';

const props = withDefaults(
  defineProps<{
    metrics?: MetricsState;
    settings?: MetricsSettings;
  }>(),
  {
    metrics: () => EMPTY_METRICS_STATE,
    settings: () => DEFAULT_METRICS_SETTINGS,
  }
);

const emit = defineEmits<{
  'toggle-expanded': [expanded: boolean];
}>();

// State
const expanded = ref(false);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const customPosition = ref<{ x: number; y: number } | null>(null);

// Position classes based on settings
const positionClasses = computed(() => {
  if (customPosition.value) {
    return 'lf-metrics-display--custom';
  }
  return `lf-metrics-display--${props.settings.position}`;
});

// Position styles (for custom drag position)
const positionStyles = computed(() => {
  if (customPosition.value) {
    return {
      left: `${customPosition.value.x}px`,
      top: `${customPosition.value.y}px`,
      right: 'auto',
      bottom: 'auto',
    };
  }
  return {};
});

// Should show component
const isVisible = computed(() => {
  return props.settings.enabled && props.settings.displayMode !== 'hidden';
});

// Has content to show
const hasContent = computed(() => {
  return props.metrics.text.words > 0 || props.metrics.text.charactersWithSpaces > 0;
});

// Toggle expanded state
function toggleExpanded() {
  if (!isDragging.value) {
    expanded.value = !expanded.value;
    emit('toggle-expanded', expanded.value);
  }
}

// Close panel
function closePanel() {
  expanded.value = false;
  emit('toggle-expanded', false);
}

// Drag handlers
function onMouseDown(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('.lf-metrics-panel__close')) {
    return;
  }

  isDragging.value = false;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event: MouseEvent) {
  isDragging.value = true;

  const x = Math.max(0, Math.min(event.clientX - dragOffset.value.x, window.innerWidth - 200));
  const y = Math.max(0, Math.min(event.clientY - dragOffset.value.y, window.innerHeight - 50));

  customPosition.value = { x, y };
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);

  // Reset dragging after a short delay to prevent click events
  setTimeout(() => {
    isDragging.value = false;
  }, 50);
}

// Reset position when settings change
watch(
  () => props.settings.position,
  () => {
    customPosition.value = null;
  }
);

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="lf-metrics-fade">
      <div
        v-if="isVisible"
        :class="['lf-metrics-display', positionClasses, { 'lf-metrics-display--dragging': isDragging }]"
        :style="positionStyles"
        @mousedown="onMouseDown"
      >
        <!-- Compact Pill Mode -->
        <template v-if="!expanded && settings.displayMode === 'pill'">
          <MetricsPill
            :metrics="metrics"
            :show-reading-time="settings.showReadingTime"
            @click="toggleExpanded"
          />
        </template>

        <!-- Expanded Panel Mode -->
        <template v-if="expanded || settings.displayMode === 'panel'">
          <MetricsPanel
            :metrics="metrics"
            :show-reading-time="settings.showReadingTime"
            :show-speaking-time="settings.showSpeakingTime"
            :character-count-mode="settings.characterCountMode"
            @close="closePanel"
          />
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lf-metrics-display {
  position: fixed;
  z-index: 999999;
  user-select: none;
  transition: opacity 0.2s ease;
}

.lf-metrics-display--dragging {
  cursor: grabbing;
  opacity: 0.9;
}

/* Position variants */
.lf-metrics-display--top-right {
  top: 20px;
  right: 20px;
}

.lf-metrics-display--top-left {
  top: 20px;
  left: 20px;
}

.lf-metrics-display--bottom-right {
  bottom: 20px;
  right: 20px;
}

.lf-metrics-display--bottom-left {
  bottom: 20px;
  left: 20px;
}

.lf-metrics-display--custom {
  /* Custom position set via inline styles */
  position: fixed;
}

/* Transition animations */
.lf-metrics-fade-enter-active,
.lf-metrics-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.lf-metrics-fade-enter-from,
.lf-metrics-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
