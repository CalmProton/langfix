<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  apiKeyStorage,
  providerSettingsStorage,
  saveProviderConfig,
} from '@/utils/storage';
import type { ProviderType } from '@/utils/types';
import { createProvider } from '@/utils/ai-providers';
import { DEFAULT_MODELS, DEFAULT_BASE_URLS } from '@/utils/types';

const providerType = ref<ProviderType>('anthropic');
const apiKey = ref('');
const baseUrl = ref('');
const apiFormat = ref<'openai' | 'anthropic'>('openai');
const mainModel = ref('');
const fastModel = ref('');

const keyStatus = ref<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

const providers = [
  {
    id: 'anthropic' as const,
    name: 'Anthropic (Claude)',
    description: 'Claude models from Anthropic',
  },
  {
    id: 'openai' as const,
    name: 'OpenAI (GPT)',
    description: 'GPT models from OpenAI',
  },
  {
    id: 'openrouter' as const,
    name: 'OpenRouter',
    description: 'Access multiple AI providers',
  },
  {
    id: 'custom' as const,
    name: 'Custom Provider',
    description: 'Use a custom API endpoint',
  },
];

const showCustomOptions = computed(() => providerType.value === 'custom');
const currentDefaultModels = computed(() => {
  if (providerType.value === 'custom') return null;
  return DEFAULT_MODELS[providerType.value];
});

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

function onProviderChange(newType: ProviderType) {
  providerType.value = newType;

  if (newType !== 'custom') {
    const defaults = DEFAULT_MODELS[newType];
    mainModel.value = defaults.main;
    fastModel.value = defaults.fast;
    baseUrl.value = DEFAULT_BASE_URLS[newType] ?? '';
  }
}

async function validateKey() {
  if (!apiKey.value) {
    keyStatus.value = 'idle';
    return;
  }

  keyStatus.value = 'validating';

  try {
    const config =
      providerType.value === 'custom'
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

    const provider = createProvider(
      config as Parameters<typeof createProvider>[0],
    );

    const valid = await provider.validateApiKey();
    keyStatus.value = valid ? 'valid' : 'invalid';
  } catch (error) {
    keyStatus.value = 'invalid';
    console.error('Key validation error:', error);
  }
}

async function saveSettings() {
  saveStatus.value = 'saving';

  try {
    await saveProviderConfig({
      type: providerType.value,
      apiKey: apiKey.value,
      baseUrl: baseUrl.value || undefined,
      mainModel: mainModel.value,
      fastModel: fastModel.value,
      ...(providerType.value === 'custom'
        ? { apiFormat: apiFormat.value }
        : {}),
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
    <div class="space-y-1">
      <p class="text-sm uppercase tracking-[0.14em] text-muted-foreground">Provider</p>
      <h2 class="text-2xl font-semibold">Connect your AI backend</h2>
      <p class="text-muted-foreground text-sm">
        Select your AI provider and enter your API key.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Provider</CardTitle>
        <CardDescription>Pick where LangFix sends requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup v-model="providerType" class="grid gap-3 md:grid-cols-2"
          @update:modelValue="onProviderChange($event as ProviderType)">
          <label v-for="provider in providers" :key="provider.id"
            class="flex cursor-pointer items-start gap-3 rounded-lg border bg-card/30 p-4 transition-colors hover:border-primary"
            :class="providerType === provider.id ? 'border-primary shadow-sm' : 'border-border'"
            :for="`provider-${provider.id}`">
            <RadioGroupItem :id="`provider-${provider.id}`" :value="provider.id"
 class="mt-1"
 />
            <div class="space-y-1">
              <Label :for="`provider-${provider.id}`">{{ provider.name }}</Label>
              <p class="text-sm text-muted-foreground">{{ provider.description }}</p>
            </div>
            <Badge v-if="provider.id === 'custom'" variant="outline" class="ml-auto">Advanced</Badge>
          </label>
        </RadioGroup>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="space-y-1">
        <CardTitle class="text-lg">API key</CardTitle>
        <CardDescription>Keys are stored locally in your browser.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div class="flex-1 space-y-2">
            <Label for="apiKey">API key</Label>
            <Input id="apiKey"
 v-model="apiKey"
 type="password" placeholder="Enter your API key" @blur="validateKey"
 />
          </div>
          <Button class="self-start sm:self-end" variant="outline" :disabled="!apiKey || keyStatus === 'validating'"
            @click="validateKey">
            {{ keyStatus === 'validating' ? 'Checking…' : 'Test key' }}
          </Button>
        </div>
        <p v-if="keyStatus === 'valid'" class="text-sm text-green-600">✓ API key is valid</p>
        <p v-else-if="keyStatus === 'invalid'" class="text-sm text-destructive">✗ API key is invalid</p>
      </CardContent>
    </Card>

    <Card v-if="showCustomOptions">
      <CardHeader>
        <CardTitle class="text-lg">Custom provider details</CardTitle>
        <CardDescription>Point LangFix at your own endpoint.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="baseUrl">Base URL</Label>
          <Input id="baseUrl"
 v-model="baseUrl"
 type="url"
 placeholder="https://api.example.com/v1"
 />
        </div>

        <div class="space-y-2">
          <Label>API format</Label>
          <RadioGroup v-model="apiFormat" class="grid gap-2 sm:grid-cols-2">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border bg-card/30 p-3 transition-colors hover:border-primary"
              for="format-openai">
              <RadioGroupItem id="format-openai" value="openai" />
              <div>
                <p class="font-medium text-sm">OpenAI-compatible</p>
                <p class="text-xs text-muted-foreground">Works with most hosted providers.</p>
              </div>
            </label>
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border bg-card/30 p-3 transition-colors hover:border-primary"
              for="format-anthropic">
              <RadioGroupItem id="format-anthropic" value="anthropic" />
              <div>
                <p class="font-medium text-sm">Anthropic-compatible</p>
                <p class="text-xs text-muted-foreground">Use Claude-style endpoints.</p>
              </div>
            </label>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>

    <Card v-else-if="currentDefaultModels">
      <CardHeader>
        <CardTitle class="text-lg">Default models</CardTitle>
        <CardDescription>We prefill common choices for this provider.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">Main</span>
          <Badge variant="outline">{{ currentDefaultModels.main }}</Badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">Fast</span>
          <Badge variant="outline">{{ currentDefaultModels.fast }}</Badge>
        </div>
      </CardContent>
    </Card>

    <div class="flex items-center gap-4">
      <Button :disabled="saveStatus === 'saving'" @click="saveSettings">
        {{ saveStatus === 'saving' ? 'Saving…' : 'Save settings' }}
      </Button>
      <span v-if="saveStatus === 'saved'" class="text-sm text-green-600">✓ Settings saved</span>
      <span v-else-if="saveStatus === 'error'" class="text-sm text-destructive">✗ Error saving settings</span>
    </div>
  </div>
</template>
