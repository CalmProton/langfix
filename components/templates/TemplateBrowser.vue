<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Template, TemplateCategory } from '@/utils/templates';
import { TEMPLATE_CATEGORIES, getTemplateManager } from '@/utils/templates';
import TemplateCard from './TemplateCard.vue';

const props = withDefaults(
  defineProps<{
    /** Whether to show the "Create New" button */
    showCreateButton?: boolean;
    /** Initial category filter */
    initialCategory?: TemplateCategory | 'all' | 'favorites';
    /** Maximum height for scrollable area */
    maxHeight?: string;
  }>(),
  {
    showCreateButton: true,
    initialCategory: 'all',
    maxHeight: '400px',
  },
);

const emit = defineEmits<{
  (e: 'select', template: Template): void;
  (e: 'preview', template: Template): void;
  (e: 'create'): void;
}>();

const manager = getTemplateManager();
const searchQuery = ref('');
const activeTab = ref<string>(props.initialCategory);

// Get filtered templates
const templates = computed(() => {
  const filters: {
    category?: TemplateCategory;
    query?: string;
    favoritesOnly?: boolean;
  } = {};

  if (searchQuery.value) {
    filters.query = searchQuery.value;
  }

  if (activeTab.value === 'favorites') {
    filters.favoritesOnly = true;
  } else if (activeTab.value !== 'all') {
    filters.category = activeTab.value as TemplateCategory;
  }

  return manager.getAll(filters);
});

// Group templates by category for display
const groupedTemplates = computed(() => {
  if (activeTab.value !== 'all' || searchQuery.value) {
    return null; // Don't group when filtering
  }

  const groups = new Map<TemplateCategory, Template[]>();
  for (const template of templates.value) {
    const category = template.category;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    const categoryGroup = groups.get(category);
    if (categoryGroup) {
      categoryGroup.push(template);
    }
  }
  return groups;
});

const handleSelect = (template: Template) => {
  emit('select', template);
};

const handlePreview = (template: Template) => {
  emit('preview', template);
};

const handleFavorite = async (template: Template) => {
  await manager.toggleFavorite(template.id);
};

// Reset to initial category when it changes
watch(
  () => props.initialCategory,
  (newVal) => {
    activeTab.value = newVal;
  },
);
</script>

<template>
  <div class="template-browser flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative flex-1">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input
          v-model="searchQuery"
          type="search"
          placeholder="Search templates..."
          class="pl-9"
        />
      </div>
      <Button v-if="showCreateButton" size="sm" @click="emit('create')">
        <svg
          class="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        New
      </Button>
    </div>

    <!-- Category Tabs -->
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="w-full justify-start overflow-x-auto flex-nowrap">
        <TabsTrigger value="all" class="text-xs">All</TabsTrigger>
        <TabsTrigger value="favorites" class="text-xs">
          <svg class="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          Favorites
        </TabsTrigger>
        <TabsTrigger
          v-for="cat in TEMPLATE_CATEGORIES.filter((c) => c.id !== 'custom')"
          :key="cat.id"
          :value="cat.id"
          class="text-xs"
        >
          {{ cat.icon }}
          {{ cat.label }}
        </TabsTrigger>
      </TabsList>

      <!-- Templates Grid -->
      <ScrollArea class="mt-4" :style="{ maxHeight }">
        <TabsContent value="all" class="mt-0">
          <!-- Grouped view -->
          <template v-if="groupedTemplates && !searchQuery">
            <div
              v-for="[category, categoryTemplates] in groupedTemplates"
              :key="category"
              class="mb-6"
            >
              <h3 class="text-sm font-medium mb-3 flex items-center gap-2">
                <span
                  >{{
                  TEMPLATE_CATEGORIES.find((c) => c.id === category)?.icon
                }}</span
                >
                <span
                  >{{
                  TEMPLATE_CATEGORIES.find((c) => c.id === category)?.label
                }}</span
                >
                <span class="text-muted-foreground text-xs"
                  >({{ categoryTemplates.length }})</span
                >
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TemplateCard
                  v-for="template in categoryTemplates"
                  :key="template.id"
                  :template="template"
                  @select="handleSelect"
                  @preview="handlePreview"
                  @favorite="handleFavorite"
                />
              </div>
            </div>
          </template>

          <!-- Flat list when searching -->
          <template v-else>
            <div
              v-if="templates.length === 0"
              class="text-center py-8 text-muted-foreground"
            >
              <p>No templates found</p>
              <p class="text-sm">Try a different search term</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TemplateCard
                v-for="template in templates"
                :key="template.id"
                :template="template"
                @select="handleSelect"
                @preview="handlePreview"
                @favorite="handleFavorite"
              />
            </div>
          </template>
        </TabsContent>

        <!-- Category-specific tabs -->
        <TabsContent
          v-for="cat in ['favorites', ...TEMPLATE_CATEGORIES.map((c) => c.id)]"
          :key="cat"
          :value="cat"
          class="mt-0"
        >
          <div
            v-if="templates.length === 0"
            class="text-center py-8 text-muted-foreground"
          >
            <p v-if="cat === 'favorites'">No favorite templates yet</p>
            <p v-else>No templates in this category</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TemplateCard
              v-for="template in templates"
              :key="template.id"
              :template="template"
              @select="handleSelect"
              @preview="handlePreview"
              @favorite="handleFavorite"
            />
          </div>
        </TabsContent>
      </ScrollArea>
    </Tabs>
  </div>
</template>
