<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeVariants } from '@/components/ui/badge';
import type { GenreConfig } from '@/utils/genre-engine/types';

const props = defineProps<{
  genre: GenreConfig;
  class?: string;
}>();

/**
 * Map formality levels to badge variants
 */
const variant = computed<BadgeVariants['variant']>(() => {
  const formalityMap: Record<string, BadgeVariants['variant']> = {
    'very-low': 'outline',
    'low': 'outline',
    'medium': 'secondary',
    'medium-high': 'secondary',
    'high': 'default',
    'very-high': 'default',
  };
  return formalityMap[props.genre.formality] || 'secondary';
});
</script>

<template>
  <span
    :class="cn(badgeVariants({ variant }), 'gap-1', props.class)"
    data-slot="genre-badge"
  >
    <span>{{ genre.icon }}</span>
    <span class="text-xs">{{ genre.name }}</span>
  </span>
</template>
