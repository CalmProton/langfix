<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import type { Template } from '@/utils/templates';
import { TEMPLATE_CATEGORIES } from '@/utils/templates';

const props = defineProps<{
  template: Template;
}>();

const emit = defineEmits<{
  (e: 'select', template: Template): void;
  (e: 'preview', template: Template): void;
  (e: 'favorite', template: Template): void;
}>();

const category = computed(() => {
  return TEMPLATE_CATEGORIES.find((c) => c.id === props.template.category);
});

const truncatedDescription = computed(() => {
  const desc = props.template.description || '';
  return desc.length > 80 ? `${desc.slice(0, 80)}...` : desc;
});
</script>

<template>
  <div
    class="group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/50 cursor-pointer"
    @click="emit('select', template)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">{{ category?.icon }}</span>
        <h3 class="font-medium text-sm leading-tight">{{ template.name }}</h3>
      </div>

      <!-- Favorite Button -->
      <button
        class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-yellow-500"
        @click.stop="emit('favorite', template)"
        :aria-label="template.isFavorite ? 'Remove from favorites' : 'Add to favorites'"
      >
        <svg
          v-if="template.isFavorite"
          class="w-4 h-4 fill-yellow-500"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
        <svg
          v-else
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>
    </div>

    <!-- Description -->
    <p v-if="truncatedDescription" class="text-xs text-muted-foreground mb-3">
      {{ truncatedDescription }}
    </p>

    <!-- Tags -->
    <div v-if="template.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
      <Badge
        v-for="tag in template.tags.slice(0, 3)"
        :key="tag"
        variant="secondary"
        class="text-[10px] px-1.5 py-0"
      >
        {{ tag }}
      </Badge>
      <Badge
        v-if="template.tags.length > 3"
        variant="outline"
        class="text-[10px] px-1.5 py-0"
      >
        +{{ template.tags.length - 3 }}
      </Badge>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click.stop="emit('preview', template)"
      >
        Preview
      </button>
      <span class="text-muted-foreground">·</span>
      <button
        class="text-xs text-primary font-medium hover:underline"
        @click.stop="emit('select', template)"
      >
        Use
      </button>
    </div>

    <!-- Built-in Badge -->
    <Badge
      v-if="template.isBuiltIn"
      variant="outline"
      class="absolute top-2 right-2 text-[10px] px-1 py-0 opacity-60"
    >
      Built-in
    </Badge>
  </div>
</template>
