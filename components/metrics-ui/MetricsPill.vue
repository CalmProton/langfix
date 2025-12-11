<script lang="ts" setup>
import { computed } from 'vue';
import type { MetricsState } from '../../utils/metrics/types';
import { formatTimeValue } from '../../utils/metrics/calculator';

const props = defineProps<{
  metrics: MetricsState;
  showReadingTime?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const wordCountFormatted = computed(() => {
  const count = props.metrics.text.words;
  return count.toLocaleString();
});

const readingTimeFormatted = computed(() => {
  return formatTimeValue(props.metrics.time.readingTime, 'read');
});

function handleClick() {
  emit('click');
}
</script>

<template>
  <button
    class="lf-metrics-pill"
    type="button"
    :aria-label="`${metrics.text.words} words, ${readingTimeFormatted}`"
    @click="handleClick"
  >
    <span class="lf-metrics-pill__icon" aria-hidden="true">📊</span>
    <span class="lf-metrics-pill__metric">
      {{ wordCountFormatted }}
      {{ metrics.text.words === 1 ? 'word' : 'words' }}
    </span>
    <template v-if="showReadingTime !== false">
      <span class="lf-metrics-pill__separator" aria-hidden="true">•</span>
      <span class="lf-metrics-pill__metric">{{ readingTimeFormatted }}</span>
    </template>
  </button>
</template>

<style scoped>
.lf-metrics-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border: none;
  border-radius: 20px;
  font-family:
    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition:
    background-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
  white-space: nowrap;
}

.lf-metrics-pill:hover {
  background: rgba(0, 0, 0, 0.95);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.lf-metrics-pill:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.lf-metrics-pill:active {
  transform: scale(0.98);
}

.lf-metrics-pill__icon {
  font-size: 14px;
  line-height: 1;
}

.lf-metrics-pill__metric {
  color: rgba(255, 255, 255, 0.95);
}

.lf-metrics-pill__separator {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

/* Light mode variant */
@media (prefers-color-scheme: light) {
  .lf-metrics-pill {
    background: rgba(255, 255, 255, 0.95);
    color: #1f2937;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(0, 0, 0, 0.05);
  }

  .lf-metrics-pill:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(0, 0, 0, 0.08);
  }

  .lf-metrics-pill__metric {
    color: #374151;
  }

  .lf-metrics-pill__separator {
    color: #9ca3af;
  }
}
</style>
