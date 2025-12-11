<script lang="ts" setup>
import { computed } from 'vue';
import type { SentenceScore } from '#utils/readability-engine/types';
import { HEATMAP_COLORS } from '#utils/readability-engine/types';
import type { ViewportRect } from '#utils/suggestion-ui/types';

const props = defineProps<{
  sentence: SentenceScore;
  rect: ViewportRect;
  isHovered: boolean;
}>();

const emit = defineEmits<{
  mouseenter: [];
  mouseleave: [];
  click: [];
}>();

const highlightStyle = computed(() => {
  const color = HEATMAP_COLORS[props.sentence.level];
  return {
    left: `${props.rect.x}px`,
    top: `${props.rect.y}px`,
    width: `${props.rect.width}px`,
    height: `${props.rect.height}px`,
    backgroundColor: color.background,
    '--hover-opacity': props.isHovered ? '0.35' : color.opacity,
  };
});

const highlightClass = computed(() => ({
  'lf-readability-highlight': true,
  [`lf-readability-highlight--${props.sentence.level}`]: true,
  'lf-readability-highlight--hovered': props.isHovered,
}));

function handleMouseEnter() {
  emit('mouseenter');
}

function handleMouseLeave() {
  emit('mouseleave');
}

function handleClick() {
  emit('click');
}
</script>

<template>
  <div
    :class="highlightClass"
    :style="highlightStyle"
    :aria-label="`${sentence.level} readability: ${sentence.reasons.join(', ')}`"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  />
</template>

<style scoped>
.lf-readability-highlight {
  position: fixed;
  pointer-events: auto;
  cursor: pointer;
  border-radius: 2px;
  transition:
    background-color 0.15s ease,
    opacity 0.15s ease;
  z-index: 9998;
}

.lf-readability-highlight--hovered {
  outline: 1px solid currentColor;
  outline-offset: -1px;
}

.lf-readability-highlight--easy {
  outline-color: rgb(34, 197, 94);
}

.lf-readability-highlight--moderate {
  outline-color: rgb(234, 179, 8);
}

.lf-readability-highlight--hard {
  outline-color: rgb(239, 68, 68);
}

.lf-readability-highlight--unknown {
  display: none;
}
</style>
