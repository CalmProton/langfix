<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { MetricsState, MetricsSettings } from '#utils/metrics/types';
import {
  EMPTY_METRICS_STATE,
  DEFAULT_METRICS_SETTINGS,
} from '#utils/metrics/types';
import {
  metricsCustomPositionStorage,
  metricsHiddenSitesStorage,
  metricsSettingsStorage,
} from '#utils/storage';
import MetricsPill from '#components/metrics-ui/MetricsPill.vue';
import MetricsPanel from '#components/metrics-ui/MetricsPanel.vue';

const props = withDefaults(
  defineProps<{
    metrics?: MetricsState;
    settings?: MetricsSettings;
  }>(),
  {
    metrics: () => EMPTY_METRICS_STATE,
    settings: () => DEFAULT_METRICS_SETTINGS,
  },
);

const emit = defineEmits<{
  'toggle-expanded': [expanded: boolean];
  'hide-on-site': [];
  'disable-completely': [];
}>();

const expanded = ref(false);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const containerRef = ref<HTMLElement | null>(null);
const customPositionPx = ref<{ x: number; y: number } | null>(null);
const customPositionRatio = ref<{ x: number; y: number } | null>(null);

const isHiddenOnSite = ref(false);
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

function getPillEl(): HTMLElement | null {
  return (containerRef.value?.querySelector('.lf-metrics-pill') ?? null) as
    | HTMLElement
    | null;
}

function getAnchorSize(): { width: number; height: number } {
  const pillEl = getPillEl();
  if (!pillEl) return { width: 200, height: 50 };
  const rect = pillEl.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function clampToViewport(x: number, y: number): { x: number; y: number } {
  const { width, height } = getAnchorSize();
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}

function applyRatioToPixels() {
  if (!customPositionRatio.value) return;
  const clamped = clampToViewport(
    customPositionRatio.value.x * window.innerWidth,
    customPositionRatio.value.y * window.innerHeight,
  );
  customPositionPx.value = clamped;
}

function isLegacyPosition(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number' && typeof record.y === 'number';
}

function isStoredPosition(
  value: unknown,
): value is { mode: 'ratio' | 'px'; x: number; y: number } {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.mode !== 'ratio' && record.mode !== 'px') return false;
  return typeof record.x === 'number' && typeof record.y === 'number';
}

const expandDirection = computed<'up' | 'down'>(() => {
  if (!customPositionPx.value) {
    return props.settings.position.startsWith('bottom') ? 'up' : 'down';
  }

  const screenMidpoint = window.innerHeight / 2;
  const { height } = getAnchorSize();
  const anchorCenterY = customPositionPx.value.y + height / 2;
  return anchorCenterY < screenMidpoint ? 'down' : 'up';
});

const horizontalAlign = computed<'start' | 'end'>(() => {
  if (!customPositionPx.value) {
    return props.settings.position.includes('right') ? 'end' : 'start';
  }

  const screenMidpoint = window.innerWidth / 2;
  const { width } = getAnchorSize();
  const anchorCenterX = customPositionPx.value.x + width / 2;
  return anchorCenterX < screenMidpoint ? 'start' : 'end';
});

const positionClasses = computed(() => {
  if (customPositionPx.value) return 'lf-metrics-display--custom';
  return `lf-metrics-display--${props.settings.position}`;
});

const positionStyles = computed(() => {
  if (!customPositionPx.value) return {};
  return {
    left: `${customPositionPx.value.x}px`,
    top: `${customPositionPx.value.y}px`,
    right: 'auto',
    bottom: 'auto',
  };
});

const isVisible = computed(() => {
  return (
    props.settings.enabled &&
    props.settings.displayMode !== 'hidden' &&
    !isHiddenOnSite.value
  );
});

function toggleExpanded() {
  if (isDragging.value) return;
  expanded.value = !expanded.value;
  emit('toggle-expanded', expanded.value);
}

function closePanel() {
  expanded.value = false;
  emit('toggle-expanded', false);
}

function onMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (target.closest('[data-metrics-close]')) {
    return;
  }

  const isPillTarget = Boolean(target.closest('.lf-metrics-pill'));
  const isPanelHeaderTarget = Boolean(target.closest('.lf-metrics-panel__header'));
  if (!isPillTarget && !isPanelHeaderTarget) {
    return;
  }

  isDragging.value = false;

  // Anchor drags to the pill's rect so dragging from the panel header
  // (which may be above the pill) doesn't produce negative offsets.
  const pillEl = getPillEl();
  const anchorRect = pillEl
    ? pillEl.getBoundingClientRect()
    : (event.currentTarget as HTMLElement).getBoundingClientRect();

  const offsetX = Math.min(
    Math.max(0, event.clientX - anchorRect.left),
    anchorRect.width,
  );
  const offsetY = Math.min(
    Math.max(0, event.clientY - anchorRect.top),
    anchorRect.height,
  );

  dragOffset.value = { x: offsetX, y: offsetY };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event: MouseEvent) {
  isDragging.value = true;

  const x = event.clientX - dragOffset.value.x;
  const y = event.clientY - dragOffset.value.y;

  const clamped = clampToViewport(x, y);
  customPositionPx.value = clamped;
  customPositionRatio.value = {
    x: clamped.x / window.innerWidth,
    y: clamped.y / window.innerHeight,
  };
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);

  if (isDragging.value && customPositionRatio.value && currentOrigin) {
    void savePosition(customPositionRatio.value);
  }

  setTimeout(() => {
    isDragging.value = false;
  }, 50);
}

async function savePosition(position: { x: number; y: number }) {
  if (!currentOrigin) return;

  const positions = (await metricsCustomPositionStorage.getValue()) ?? {};
  positions[currentOrigin] = { mode: 'ratio', x: position.x, y: position.y };
  await metricsCustomPositionStorage.setValue(positions);
}

async function loadPosition() {
  if (!currentOrigin) return;

  const positions = (await metricsCustomPositionStorage.getValue()) as unknown as
    | Record<string, unknown>
    | undefined;
  const stored = positions?.[currentOrigin];
  if (!stored) return;

  await nextTick();

  // Back-compat: old entries were {x,y} in pixels (no mode)
  if (isLegacyPosition(stored) && !isStoredPosition(stored)) {
    const px = clampToViewport(stored.x, stored.y);
    customPositionPx.value = px;
    customPositionRatio.value = {
      x: px.x / window.innerWidth,
      y: px.y / window.innerHeight,
    };
    await savePosition(customPositionRatio.value);
    return;
  }

  if (!isStoredPosition(stored)) return;

  if (stored.mode === 'px') {
    const px = clampToViewport(stored.x, stored.y);
    customPositionPx.value = px;
    customPositionRatio.value = {
      x: px.x / window.innerWidth,
      y: px.y / window.innerHeight,
    };
    await savePosition(customPositionRatio.value);
    return;
  }

  customPositionRatio.value = { x: stored.x, y: stored.y };
  applyRatioToPixels();
}

async function checkHiddenSite() {
  if (!currentOrigin) return;

  const hiddenSites = await metricsHiddenSitesStorage.getValue();
  isHiddenOnSite.value = hiddenSites.includes(currentOrigin);
}

async function hideOnSite() {
  if (!currentOrigin) return;

  const hiddenSites = await metricsHiddenSitesStorage.getValue();
  if (!hiddenSites.includes(currentOrigin)) {
    await metricsHiddenSitesStorage.setValue([...hiddenSites, currentOrigin]);
  }

  isHiddenOnSite.value = true;
  emit('hide-on-site');
}

async function disableCompletely() {
  const settings = await metricsSettingsStorage.getValue();
  await metricsSettingsStorage.setValue({ ...settings, enabled: false });
  emit('disable-completely');
}

watch(
  () => props.settings.position,
  () => {
    customPositionPx.value = null;
    customPositionRatio.value = null;

    if (!currentOrigin) return;

    metricsCustomPositionStorage.getValue().then(positions => {
      if (!positions?.[currentOrigin]) return;
      delete positions[currentOrigin];
      metricsCustomPositionStorage.setValue(positions);
    });
  },
);

onMounted(() => {
  void loadPosition();
  void checkHiddenSite();

  window.addEventListener('resize', applyRatioToPixels);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('resize', applyRatioToPixels);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="lf-metrics-fade">
      <div
        v-if="isVisible"
 ref="containerRef" :class="[
        'lf-metrics-display',
        positionClasses,
        { 'lf-metrics-display--dragging': isDragging }
      ]"
        :style="positionStyles"
        @mousedown="onMouseDown"
      >
        <template v-if="settings.displayMode === 'pill'">
          <div class="lf-metrics-pill-wrapper">
            <MetricsPill :metrics="metrics" :show-reading-time="settings.showReadingTime" @click="toggleExpanded" />

            <div v-if="expanded" :class="[
              'lf-metrics-display__panel',
              `lf-metrics-display__panel--${expandDirection}`,
              `lf-metrics-display__panel--align-${horizontalAlign}`,
            ]">
              <MetricsPanel :metrics="metrics" :show-reading-time="settings.showReadingTime"
                :show-speaking-time="settings.showSpeakingTime" :character-count-mode="settings.characterCountMode"
                @close="closePanel" @hide-on-site="hideOnSite" @disable-completely="disableCompletely" />
            </div>
          </div>
        </template>

        <template v-else-if="settings.displayMode === 'panel'">
          <MetricsPanel
            :metrics="metrics"
            :show-reading-time="settings.showReadingTime"
            :show-speaking-time="settings.showSpeakingTime"
            :character-count-mode="settings.characterCountMode"
            @close="closePanel"
 @hide-on-site="hideOnSite" @disable-completely="disableCompletely"
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

/* Pill wrapper for relative positioning of panel */
.lf-metrics-pill-wrapper {
  position: relative;
}

/* Expanded panel anchored to the pill */
.lf-metrics-display__panel {
  position: absolute;
  z-index: 1;
}

.lf-metrics-display__panel--down {
  top: calc(100% + 8px);
}

.lf-metrics-display__panel--up {
  bottom: calc(100% + 8px);
}

.lf-metrics-display__panel--align-start {
  left: 0;
}

.lf-metrics-display__panel--align-end {
  right: 0;
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
