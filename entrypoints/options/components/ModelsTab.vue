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
import { providerSettingsStorage, saveProviderConfig } from '@/utils/storage';
import type { ProviderType } from '@/utils/types';
import { DEFAULT_MODELS } from '@/utils/types';

const providerType = ref<ProviderType>('anthropic');
const mainModel = ref('');
const fastModel = ref('');
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

const currentPresets = computed(() => {
  if (providerType.value === 'custom') return [];
  return modelPresets[providerType.value] || [];
});

onMounted(async () => {
  const settings = await providerSettingsStorage.getValue();
  providerType.value = settings.type;
  mainModel.value = settings.mainModel;
  fastModel.value = settings.fastModel;
});

function applyPreset(preset: { main: string; fast: string }) {
  mainModel.value = preset.main;
  fastModel.value = preset.fast;
}

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
    <div class="space-y-1">
      <p class="text-sm uppercase tracking-[0.14em] text-muted-foreground">Models</p>
      <h2 class="text-2xl font-semibold">Choose your stacks</h2>
      <p class="text-muted-foreground text-sm">
        Configure which AI models to use for different tasks.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base flex items-center gap-2">🧠 Main model</CardTitle>
          <CardDescription>
            Use for rewriting, tone analysis, and longer responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Prefer quality</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-base flex items-center gap-2">⚡ Fast model</CardTitle>
          <CardDescription>
            Optimized for quick grammar checks and small fixes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Prefer speed</Badge>
        </CardContent>
      </Card>
    </div>

    <div v-if="currentPresets.length > 0" class="space-y-3">
      <Label class="text-sm font-medium">Quick presets</Label>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="preset in currentPresets"
          :key="preset.label"
 size="sm" variant="outline"
          :class="
            mainModel === preset.main && fastModel === preset.fast
              ? 'border-primary bg-primary/5'
              : ''
          "
 @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </Button>
      </div>
    </div>

    <Card>
      <CardContent class="space-y-4 p-6">
        <div class="space-y-2">
          <Label for="mainModel">Main model</Label>
          <Input id="mainModel"
 v-model="mainModel"
 type="text"
 placeholder="e.g., claude-sonnet-4-20250514"
 />
          <p class="text-xs text-muted-foreground">
            Enter the model identifier as specified by your provider.
          </p>
        </div>

        <div class="space-y-2">
          <Label for="fastModel">Fast model</Label>
          <Input id="fastModel"
 v-model="fastModel"
 type="text"
 placeholder="e.g., claude-haiku-4-20250514"
 />
          <p class="text-xs text-muted-foreground">
            Use a smaller, faster model for quick checks.
          </p>
        </div>
      </CardContent>
    </Card>

    <div class="flex items-center gap-4">
      <Button :disabled="saveStatus === 'saving'" @click="saveSettings">
        {{ saveStatus === 'saving' ? 'Saving…' : 'Save models' }}
      </Button>
      <span v-if="saveStatus === 'saved'" class="text-sm text-green-600">✓ Settings saved</span>
      <span v-else-if="saveStatus === 'error'" class="text-sm text-destructive">✗ Error saving settings</span>
    </div>
  </div>
</template>
