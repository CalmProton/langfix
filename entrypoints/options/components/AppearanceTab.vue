<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { appearanceStorage } from '@/utils/storage';
import type { ThemeType } from '@/utils/types';
import { DEFAULT_APPEARANCE_SETTINGS } from '@/utils/types';

const theme = ref<ThemeType>('auto');
const showWordCount = ref(true);
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

const themeOptions = [
  {
    id: 'auto' as const,
    label: 'System',
    icon: '💻',
    description: 'Follow system preference',
  },
  {
    id: 'light' as const,
    label: 'Light',
    icon: '☀️',
    description: 'Light theme',
  },
  { id: 'dark' as const, label: 'Dark', icon: '🌙', description: 'Dark theme' },
];

onMounted(async () => {
  const stored = await appearanceStorage.getValue();
  theme.value = stored.theme ?? DEFAULT_APPEARANCE_SETTINGS.theme;
  showWordCount.value =
    stored.showWordCount ?? DEFAULT_APPEARANCE_SETTINGS.showWordCount;
});

watchEffect(() => {
  const root = document.documentElement;

  if (theme.value === 'auto') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme.value === 'dark');
  }
});

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
    <div class="space-y-2">
      <p class="text-sm uppercase tracking-[0.14em] text-muted-foreground">Appearance</p>
      <h2 class="text-2xl font-semibold">Theme & display</h2>
      <p class="text-muted-foreground text-sm">Customize how LangFix looks.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Theme</CardTitle>
        <CardDescription>Select how LangFix follows your system.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup v-model="theme" class="grid gap-3 sm:grid-cols-3">
          <label v-for="option in themeOptions" :key="option.id"
            class="flex cursor-pointer flex-col gap-3 rounded-lg border bg-card/30 p-4 transition-colors hover:border-primary"
            :class="theme === option.id ? 'border-primary shadow-sm' : 'border-border'" :for="`theme-${option.id}`">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ option.icon }}</span>
                <div class="space-y-1">
                  <Label :for="`theme-${option.id}`" class="text-base font-semibold">
                    {{ option.label }}
                  </Label>
                  <p class="text-xs text-muted-foreground">{{ option.description }}</p>
                </div>
              </div>
              <RadioGroupItem :id="`theme-${option.id}`" :value="option.id"
 aria-label="Theme choice" />
            </div>
          </label>
        </RadioGroup>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Display options</CardTitle>
        <CardDescription>Control what appears in the popup.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div class="space-y-1">
            <p class="font-medium text-sm">Show word count</p>
            <p class="text-xs text-muted-foreground">
              Display word and character count in the popup.
            </p>
          </div>
          <Switch v-model:checked="showWordCount" aria-label="Toggle word count" />
        </div>
      </CardContent>
    </Card>

    <div class="flex items-center gap-4 pt-2">
      <Button :disabled="saveStatus === 'saving'" @click="saveSettings">
        {{ saveStatus === 'saving' ? 'Saving…' : 'Save appearance' }}
      </Button>
      <span v-if="saveStatus === 'saved'" class="text-sm text-green-600">✓ Settings saved</span>
      <span v-else-if="saveStatus === 'error'" class="text-sm text-destructive">✗ Error saving settings</span>
    </div>
  </div>
</template>
