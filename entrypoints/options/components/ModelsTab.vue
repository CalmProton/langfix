<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { providerSettingsStorage, saveProviderConfig } from '@/utils/storage';
import { DEFAULT_MODELS } from '@/utils/types';
import type { ProviderType } from '@/utils/types';

// State
const providerType = ref<ProviderType>('anthropic');
const mainModel = ref('');
const fastModel = ref('');
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Model presets for each provider
const modelPresets = {
  anthropic: [
    {
      main: 'claude-sonnet-4-20250514',
      fast: 'claude-haiku-4-20250514',
      label: 'Claude 4 (Latest)',
    },
    {
      main: 'claude-3-5-sonnet-20241022',
      fast: 'claude-3-haiku-20240307',
      label: 'Claude 3.5/3',
    },
  ],
  openai: [
    { main: 'gpt-4o', fast: 'gpt-4o-mini', label: 'GPT-4o (Latest)' },
    { main: 'gpt-4-turbo', fast: 'gpt-3.5-turbo', label: 'GPT-4 Turbo / 3.5' },
  ],
  openrouter: [
    {
      main: 'anthropic/claude-sonnet-4',
      fast: 'anthropic/claude-haiku-4',
      label: 'Claude 4 via OpenRouter',
    },
    {
      main: 'openai/gpt-4o',
      fast: 'openai/gpt-4o-mini',
      label: 'GPT-4o via OpenRouter',
    },
  ],
};

// Load settings on mount
onMounted(async () => {
  const settings = await providerSettingsStorage.getValue();
  providerType.value = settings.type;
  mainModel.value = settings.mainModel;
  fastModel.value = settings.fastModel;
});

// Get current presets
const currentPresets = computed(() => {
  if (providerType.value === 'custom') return [];
  return modelPresets[providerType.value] || [];
});

// Apply preset
function applyPreset(preset: { main: string; fast: string }) {
  mainModel.value = preset.main;
  fastModel.value = preset.fast;
}

// Save settings
async function saveSettings() {
  saveStatus.value = 'saving';

  try {
    await saveProviderConfig({
      mainModel: mainModel.value,
      fastModel: fastModel.value,
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
      <h2 class="text-xl font-semibold">Model Selection</h2>
      <p class="text-muted-foreground text-sm">
        Configure which AI models to use for different tasks
      </p>
    </div>

    <!-- Model Explanation -->
    <div class="grid gap-4 md:grid-cols-2">
      <div class="p-4 border rounded-lg">
        <h3 class="font-medium mb-2">🧠 Main Model</h3>
        <p class="text-sm text-muted-foreground">
          Used for complex tasks like rewriting, tone analysis, and detailed
          explanations. Should be a capable model with good reasoning abilities.
        </p>
      </div>
      <div class="p-4 border rounded-lg">
        <h3 class="font-medium mb-2">⚡ Fast Model</h3>
        <p class="text-sm text-muted-foreground">
          Used for quick tasks like grammar checking, spelling, and simple
          corrections. Optimized for speed and cost efficiency.
        </p>
      </div>
    </div>

    <!-- Presets -->
    <div v-if="currentPresets.length > 0" class="space-y-3">
      <label class="text-sm font-medium">Quick Presets</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in currentPresets"
          :key="preset.label"
          @click="applyPreset(preset)"
          class="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
          :class="
            mainModel === preset.main && fastModel === preset.fast
              ? 'border-primary bg-primary/5'
              : ''
          "
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- Main Model Input -->
    <div class="space-y-2">
      <label class="text-sm font-medium" for="mainModel">Main Model</label>
      <input
        id="mainModel"
        type="text"
        v-model="mainModel"
        placeholder="e.g., claude-sonnet-4-20250514"
        class="w-full px-3 py-2 border rounded-md bg-background"
      >
      <p class="text-xs text-muted-foreground">
        Enter the model identifier as specified by your provider
      </p>
    </div>

    <!-- Fast Model Input -->
    <div class="space-y-2">
      <label class="text-sm font-medium" for="fastModel">Fast Model</label>
      <input
        id="fastModel"
        type="text"
        v-model="fastModel"
        placeholder="e.g., claude-haiku-4-20250514"
        class="w-full px-3 py-2 border rounded-md bg-background"
      >
      <p class="text-xs text-muted-foreground">
        A smaller, faster model for quick checks
      </p>
    </div>

    <!-- Save Button -->
    <div class="flex items-center gap-4 pt-4 border-t">
      <button
        @click="saveSettings"
        :disabled="saveStatus === 'saving'"
        class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {{ saveStatus === 'saving' ? 'Saving...' : 'Save Models' }}
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
