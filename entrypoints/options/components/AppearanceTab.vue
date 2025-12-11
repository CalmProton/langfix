<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue';
import { appearanceStorage } from '@/utils/storage';
import type { ThemeType } from '@/utils/types';
import { DEFAULT_APPEARANCE_SETTINGS } from '@/utils/types';

// State
const theme = ref<ThemeType>('auto');
const showWordCount = ref(true);
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Theme options
const themeOptions = [
  { id: 'auto' as const, label: 'System', icon: '💻', description: 'Follow system preference' },
  { id: 'light' as const, label: 'Light', icon: '☀️', description: 'Light theme' },
  { id: 'dark' as const, label: 'Dark', icon: '🌙', description: 'Dark theme' },
];

// Load settings on mount
onMounted(async () => {
  const stored = await appearanceStorage.getValue();
  theme.value = stored.theme ?? DEFAULT_APPEARANCE_SETTINGS.theme;
  showWordCount.value = stored.showWordCount ?? DEFAULT_APPEARANCE_SETTINGS.showWordCount;
});

// Apply theme to document
watchEffect(() => {
  const root = document.documentElement;
  
  if (theme.value === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme.value === 'dark');
  }
});

// Save settings
async function saveSettings() {
  saveStatus.value = 'saving';

  try {
    await appearanceStorage.setValue({
      theme: theme.value,
      showWordCount: showWordCount.value,
    });

    saveStatus.value = 'saved';
    setTimeout(() => {
      saveStatus.value = 'idle';
    }, 2000);
  } catch (error) {
    saveStatus.value = 'error';
    console.error('Save error:', error);
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Appearance</h2>
      <p class="text-muted-foreground text-sm">
        Customize how LangFix looks
      </p>
    </div>

    <!-- Theme Selection -->
    <div class="space-y-3">
      <label class="text-sm font-medium">Theme</label>
      <div class="grid gap-3 grid-cols-3">
        <label
          v-for="option in themeOptions"
          :key="option.id"
          class="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors"
          :class="
            theme === option.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          "
        >
          <input
            type="radio"
            :value="option.id"
            v-model="theme"
            class="sr-only"
          />
          <span class="text-2xl">{{ option.icon }}</span>
          <span class="font-medium text-sm">{{ option.label }}</span>
          <span class="text-xs text-muted-foreground text-center">{{ option.description }}</span>
        </label>
      </div>
    </div>

    <!-- Additional Options -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium">Display Options</h3>
      
      <label class="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
        <div>
          <div class="font-medium text-sm">Show Word Count</div>
          <div class="text-xs text-muted-foreground">
            Display word and character count in the popup
          </div>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="showWordCount"
          @click="showWordCount = !showWordCount"
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :class="showWordCount ? 'bg-primary' : 'bg-input'"
        >
          <span
            class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
            :class="showWordCount ? 'translate-x-5' : 'translate-x-0'"
          />
        </button>
      </label>
    </div>

    <!-- Save Button -->
    <div class="flex items-center gap-4 pt-4 border-t">
      <button
        @click="saveSettings"
        :disabled="saveStatus === 'saving'"
        class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {{ saveStatus === 'saving' ? 'Saving...' : 'Save Appearance' }}
      </button>
      <span v-if="saveStatus === 'saved'" class="text-sm text-green-600">
        ✓ Settings saved
      </span>
      <span v-else-if="saveStatus === 'error'" class="text-sm text-red-600">
        ✗ Error saving settings
      </span>
    </div>
  </div>
</template>
