<script lang="ts" setup>
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { BarChart3, EyeOff, Power, X } from 'lucide-vue-next';
import type {
  MetricsState,
  CharacterCountMode,
} from '#utils/metrics/types';
import { formatTimeValue } from '#utils/metrics/calculator';

const props = defineProps<{
  metrics: MetricsState;
  showReadingTime?: boolean;
  showSpeakingTime?: boolean;
  characterCountMode?: CharacterCountMode;
}>();

const emit = defineEmits<{
  close: [];
  'hide-on-site': [];
  'disable-completely': [];
}>();

// Computed values
const characterCount = computed(() => {
  return props.characterCountMode === 'without-spaces'
    ? props.metrics.text.charactersWithoutSpaces
    : props.metrics.text.charactersWithSpaces;
});

const characterCountLabel = computed(() => {
  return props.characterCountMode === 'without-spaces'
    ? '(no spaces)'
    : '(with spaces)';
});

const readingTimeFormatted = computed(() => {
  return formatTimeValue(props.metrics.time.readingTime);
});

const speakingTimeFormatted = computed(() => {
  return formatTimeValue(props.metrics.time.speakingTime);
});

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function handleClose() {
  emit('close');
}

function handleHideOnSite() {
  emit('hide-on-site');
}

function handleDisableCompletely() {
  emit('disable-completely');
}
</script>

<template>
  <div class="lf-metrics-panel" role="region" aria-label="Text metrics">
    <!-- Header -->
    <div class="lf-metrics-panel__header">
      <BarChart3 class="lf-metrics-panel__icon" aria-hidden="true" />
      <span class="lf-metrics-panel__title">Text Metrics</span>
      <Button data-metrics-close variant="ghost" size="icon-sm"
        aria-label="Close metrics panel"
        @click="handleClose"
      >
        <X />
      </Button>
    </div>

    <!-- Content -->
    <div class="lf-metrics-panel__content">
      <!-- Basic counts -->
      <div class="lf-metrics-panel__row">
        <span class="lf-metrics-panel__label">Words</span>
        <span class="lf-metrics-panel__value"
          >{{ formatNumber(metrics.text.words) }}</span
        >
      </div>

      <div class="lf-metrics-panel__row">
        <span class="lf-metrics-panel__label">
          Characters
          <span class="lf-metrics-panel__sublabel"
            >{{ characterCountLabel }}</span
          >
        </span>
        <span class="lf-metrics-panel__value"
          >{{ formatNumber(characterCount) }}</span
        >
      </div>

      <div class="lf-metrics-panel__row">
        <span class="lf-metrics-panel__label">Sentences</span>
        <span class="lf-metrics-panel__value"
          >{{ formatNumber(metrics.text.sentences) }}</span
        >
      </div>

      <div class="lf-metrics-panel__row">
        <span class="lf-metrics-panel__label">Paragraphs</span>
        <span class="lf-metrics-panel__value"
          >{{ formatNumber(metrics.text.paragraphs) }}</span
        >
      </div>

      <!-- Divider -->
      <div class="lf-metrics-panel__divider"/>

      <!-- Time metrics -->
      <div
        v-if="showReadingTime !== false"
        class="lf-metrics-panel__row lf-metrics-panel__row--highlight"
      >
        <span class="lf-metrics-panel__label">
          <span class="lf-metrics-panel__time-icon" aria-hidden="true">📖</span>
          Reading Time
        </span>
        <span class="lf-metrics-panel__value">{{ readingTimeFormatted }}</span>
      </div>

      <div v-if="showSpeakingTime" class="lf-metrics-panel__row">
        <span class="lf-metrics-panel__label">
          <span class="lf-metrics-panel__time-icon" aria-hidden="true">🎤</span>
          Speaking Time
        </span>
        <span class="lf-metrics-panel__value">{{ speakingTimeFormatted }}</span>
      </div>

      <!-- Divider -->
      <div class="lf-metrics-panel__divider"/>

      <!-- Advanced metrics -->
      <div class="lf-metrics-panel__row lf-metrics-panel__row--small">
        <span class="lf-metrics-panel__label">Avg. word length</span>
        <span class="lf-metrics-panel__value"
          >{{ metrics.text.averageWordLength.toFixed(1) }}chars</span
        >
      </div>

      <div class="lf-metrics-panel__row lf-metrics-panel__row--small">
        <span class="lf-metrics-panel__label">Avg. sentence length</span>
        <span class="lf-metrics-panel__value"
          >{{ metrics.text.averageSentenceLength.toFixed(1) }}words</span
        >
      </div>

      <!-- Divider -->
      <div class="lf-metrics-panel__divider" />

      <!-- Hide options -->
      <div class="lf-metrics-panel__actions">
        <Button variant="outline" size="sm" class="justify-start" @click="handleHideOnSite">
          <EyeOff />
          Hide on this site
        </Button>
        <Button variant="destructive" size="sm" class="justify-start" @click="handleDisableCompletely">
          <Power />
          Disable completely
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lf-metrics-panel {
  min-width: 220px;
  max-width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  font-family:
    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  overflow: hidden;
}

.lf-metrics-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 10px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.lf-metrics-panel__icon {
  width: 16px;
    height: 16px;
}

.lf-metrics-panel__title {
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.lf-metrics-panel__content {
  padding: 10px 12px 12px;
}

.lf-metrics-panel__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.lf-metrics-panel__row--highlight {
  background: #f0f9ff;
  margin: 0 -12px;
  padding: 8px 12px;
  font-weight: 500;
}

.lf-metrics-panel__row--small {
  font-size: 12px;
  color: #6b7280;
  padding: 4px 0;
}

.lf-metrics-panel__label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4b5563;
}

.lf-metrics-panel__sublabel {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 400;
}

.lf-metrics-panel__time-icon {
  font-size: 14px;
}

.lf-metrics-panel__value {
  font-weight: 500;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.lf-metrics-panel__divider {
  height: 1px;
  background: #e5e7eb;
  margin: 8px -12px;
}

/* Action buttons */
.lf-metrics-panel__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .lf-metrics-panel {
    background: #1f2937;
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .lf-metrics-panel__header {
    background: #111827;
    border-bottom-color: #374151;
  }

  .lf-metrics-panel__title {
    color: #f9fafb;
  }

  .lf-metrics-panel__label {
    color: #d1d5db;
  }

  .lf-metrics-panel__sublabel {
    color: #6b7280;
  }

  .lf-metrics-panel__value {
    color: #f9fafb;
  }

  .lf-metrics-panel__row--highlight {
    background: #1e3a5f;
  }

  .lf-metrics-panel__row--small {
    color: #9ca3af;
  }

  .lf-metrics-panel__divider {
    background: #374151;
  }
}
</style>
