<script lang="ts" setup>
import { computed } from 'vue';
import type {
  SuggestionError,
  ViewportRect,
} from '../../utils/suggestion-ui/types';

const props = defineProps<{
  error: SuggestionError;
  rect: ViewportRect;
  isActive: boolean;
}>();

const emit = defineEmits<{
  click: [];
  keydown: [event: KeyboardEvent];
}>();

const underlineClass = computed(() => {
  return `lf-underline lf-underline--${props.error.type}`;
});

const underlineStyle = computed(() => ({
  left: `${props.rect.x}px`,
  top: `${props.rect.y + props.rect.height - 3}px`,
  width: `${props.rect.width}px`,
}));

const hitTargetStyle = computed(() => ({
  left: `${props.rect.x}px`,
  top: `${props.rect.y}px`,
  width: `${props.rect.width}px`,
  height: `${props.rect.height}px`,
}));

function handleClick() {
  emit('click');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('click');
  } else {
    emit('keydown', event);
  }
}
</script>

<template>
  <button
    type="button"
    class="lf-hit-target"
    :style="hitTargetStyle"
    :aria-label="`${error.type} error: ${error.original}. ${error.explanation}`"
    :aria-pressed="isActive"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span :class="underlineClass" :style="underlineStyle"/>
    <span class="lf-sr-only">
      {{ error.type }}: {{ error.original }}- {{ error.explanation }}
    </span>
  </button>
</template>
