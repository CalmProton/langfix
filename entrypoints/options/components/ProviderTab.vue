<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  apiKeyStorage,
  providerSettingsStorage,
  saveProviderConfig,
} from '@/utils/storage';
import type { ProviderType } from '@/utils/types';
import { createProvider } from '@/utils/ai-providers';
import { DEFAULT_MODELS, DEFAULT_BASE_URLS } from '@/utils/types';

// State
const providerType = ref<ProviderType>('anthropic');
const apiKey = ref('');
const baseUrl = ref('');
const apiFormat = ref<'openai' | 'anthropic'>('openai');
const mainModel = ref('');
const fastModel = ref('');

const keyStatus = ref<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Providers
const providers = [
  { id: 'anthropic' as const, name: 'Anthropic (Claude)', description: 'Claude models from Anthropic' },
  { id: 'openai' as const, name: 'OpenAI (GPT)', description: 'GPT models from OpenAI' },
  { id: 'openrouter' as const, name: 'OpenRouter', description: 'Access multiple AI providers' },
  { id: 'custom' as const, name: 'Custom Provider', description: 'Use a custom API endpoint' },
];

// Computed
const showCustomOptions = computed(() => providerType.value === 'custom');
const currentDefaultModels = computed(() => {
  if (providerType.value === 'custom') return null;
  return DEFAULT_MODELS[providerType.value];
});

// Load settings on mount
onMounted(async () => {
  const [key, settings] = await Promise.all([
    apiKeyStorage.getValue(),
    providerSettingsStorage.getValue(),
  ]);

  apiKey.value = key;
  providerType.value = settings.type;
  baseUrl.value = settings.baseUrl ?? '';
  apiFormat.value = settings.apiFormat ?? 'openai';
  mainModel.value = settings.mainModel;
  fastModel.value = settings.fastModel;
});

// Update models when provider changes
function onProviderChange(newType: ProviderType) {
  providerType.value = newType;
  
  if (newType !== 'custom') {
    const defaults = DEFAULT_MODELS[newType];
    mainModel.value = defaults.main;
    fastModel.value = defaults.fast;
    baseUrl.value = '';
  }
}

// Validate API key
async function validateKey() {
  if (!apiKey.value) {
    keyStatus.value = 'idle';
    return;
  }

  keyStatus.value = 'validating';

  try {
    const config = providerType.value === 'custom'
      ? {
          type: providerType.value,
          apiKey: apiKey.value,
          baseUrl: baseUrl.value,
          mainModel: mainModel.value,
          fastModel: fastModel.value,
          apiFormat: apiFormat.value,
        }
      : {
          type: providerType.value,
          apiKey: apiKey.value,
          baseUrl: baseUrl.value || undefined,
          mainModel: mainModel.value,
          fastModel: fastModel.value,
        };

    const provider = createProvider(config as Parameters<typeof createProvider>[0]);

    const valid = await provider.validateApiKey();
    keyStatus.value = valid ? 'valid' : 'invalid';
  } catch (error) {
    keyStatus.value = 'invalid';
    console.error('Key validation error:', error);
  }
}

// Save settings
async function saveSettings() {
  saveStatus.value = 'saving';

  try {
    await saveProviderConfig({
      type: providerType.value,
      apiKey: apiKey.value,
      baseUrl: baseUrl.value || undefined,
      mainModel: mainModel.value,
      fastModel: fastModel.value,
      ...(providerType.value === 'custom' ? { apiFormat: apiFormat.value } : {}),
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
      <h2 class="text-xl font-semibold">AI Provider</h2>
      <p class="text-muted-foreground text-sm">
        Select your AI provider and enter your API key
      </p>
    </div>

    <!-- Provider Selection -->
    <div class="space-y-3">
      <label class="text-sm font-medium">Provider</label>
      <div class="grid gap-3">
        <label
          v-for="provider in providers"
          :key="provider.id"
          class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors"
          :class="
            providerType === provider.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          "
        >
          <input
            type="radio"
            :value="provider.id"
            :checked="providerType === provider.id"
            @change="onProviderChange(provider.id)"
            class="mt-1"
          />
          <div>
            <div class="font-medium">{{ provider.name }}</div>
            <div class="text-sm text-muted-foreground">{{ provider.description }}</div>
          </div>
        </label>
      </div>
    </div>

    <!-- API Key -->
    <div class="space-y-2">
      <label class="text-sm font-medium" for="apiKey">API Key</label>
      <div class="flex gap-2">
        <input
          id="apiKey"
          type="password"
          v-model="apiKey"
          placeholder="Enter your API key..."
          class="flex-1 px-3 py-2 border rounded-md bg-background"
          @blur="validateKey"
        />
        <button
          @click="validateKey"
          :disabled="!apiKey || keyStatus === 'validating'"
          class="px-4 py-2 border rounded-md hover:bg-muted disabled:opacity-50"
        >
          {{ keyStatus === 'validating' ? 'Checking...' : 'Test' }}
        </button>
      </div>
      <div v-if="keyStatus === 'valid'" class="text-sm text-green-600">
        ✓ API key is valid
      </div>
      <div v-else-if="keyStatus === 'invalid'" class="text-sm text-red-600">
        ✗ API key is invalid
      </div>
    </div>

    <!-- Custom Provider Options -->
    <template v-if="showCustomOptions">
      <div class="space-y-2">
        <label class="text-sm font-medium" for="baseUrl">Base URL</label>
        <input
          id="baseUrl"
          type="url"
          v-model="baseUrl"
          placeholder="https://api.example.com/v1"
          class="w-full px-3 py-2 border rounded-md bg-background"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium">API Format</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input type="radio" v-model="apiFormat" value="openai" />
            <span>OpenAI-compatible</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" v-model="apiFormat" value="anthropic" />
            <span>Anthropic-compatible</span>
          </label>
        </div>
      </div>
    </template>

    <!-- Model presets hint -->
    <div v-if="currentDefaultModels" class="p-4 bg-muted rounded-lg">
      <div class="text-sm font-medium mb-2">Default Models</div>
      <div class="text-sm text-muted-foreground space-y-1">
        <div>Main: <code class="bg-background px-1 rounded">{{ currentDefaultModels.main }}</code></div>
        <div>Fast: <code class="bg-background px-1 rounded">{{ currentDefaultModels.fast }}</code></div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex items-center gap-4 pt-4 border-t">
      <button
        @click="saveSettings"
        :disabled="saveStatus === 'saving'"
        class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {{ saveStatus === 'saving' ? 'Saving...' : 'Save Settings' }}
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
