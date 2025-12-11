<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { featuresStorage } from '@/utils/storage';
import type { FeatureSettings } from '@/utils/types';
import { DEFAULT_FEATURES } from '@/utils/types';

const features = ref<FeatureSettings>({ ...DEFAULT_FEATURES });
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

const featureGroups = [
  {
    title: 'Core Checks',
    description: 'Essential grammar and spelling features',
    features: [
      {
        key: 'grammarCheck' as const,
        label: 'Grammar Check',
        description: 'Detect grammatical errors',
      },
      {
        key: 'spellCheck' as const,
        label: 'Spell Check',
        description: 'Find and correct spelling mistakes',
      },
      {
        key: 'punctuationCheck' as const,
        label: 'Punctuation Check',
        description: 'Fix punctuation issues',
      },
    ],
  },
  {
    title: 'Style Analysis',
    description: 'Writing style and clarity improvements',
    features: [
      {
        key: 'styleAnalysis' as const,
        label: 'Style Analysis',
        description: 'Analyze overall writing style',
      },
      {
        key: 'passiveVoiceDetection' as const,
        label: 'Passive Voice Detection',
        description: 'Highlight passive voice usage',
      },
      {
        key: 'adverbDetection' as const,
        label: 'Adverb Detection',
        description: 'Flag excessive adverb use',
      },
    ],
  },
  {
    title: 'Readability',
    description: 'Text complexity and readability tools',
    features: [
      {
        key: 'readabilityScore' as const,
        label: 'Readability Score',
        description: 'Show reading level scores',
      },
      {
        key: 'readabilityHeatmap' as const,
        label: 'Readability Heatmap',
        description: 'Visual complexity overlay',
      },
    ],
  },
  {
    title: 'Enhancement',
    description: 'Writing improvement suggestions',
    features: [
      {
        key: 'synonymSuggestions' as const,
        label: 'Synonym Suggestions',
        description: 'Alternative word choices',
      },
      {
        key: 'rewritingSuggestions' as const,
        label: 'Rewriting Suggestions',
        description: 'Sentence rewrite options',
      },
      {
        key: 'toneDetection' as const,
        label: 'Tone Detection',
        description: 'Analyze writing tone',
      },
    ],
  },
  {
    title: 'Utility',
    description: 'Additional helpful features',
    features: [
      {
        key: 'wordCount' as const,
        label: 'Word Count',
        description: 'Show word and character counts',
      },
      {
        key: 'autoCorrect' as const,
        label: 'Auto-Correct',
        description: 'Automatically fix common errors',
      },
    ],
  },
];

const enabledTotal = computed(() =>
  Object.values(features.value).filter(Boolean).length,
);

onMounted(async () => {
  const stored = await featuresStorage.getValue();
  features.value = { ...DEFAULT_FEATURES, ...stored };
});

function toggleFeature(key: keyof FeatureSettings) {
  features.value[key] = !features.value[key];
}

async function saveSettings() {
  saveStatus.value = 'saving';

  try {
    await featuresStorage.setValue(features.value);

    saveStatus.value = 'saved';
    setTimeout(() => {
      saveStatus.value = 'idle';
    }, 2000);
  } catch (error) {
    saveStatus.value = 'error';
    console.error('Save error:', error);
  }
}

function toggleGroup(group: (typeof featureGroups)[0], enabled: boolean) {
  for (const feature of group.features) {
    features.value[feature.key] = enabled;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <p class="text-sm uppercase tracking-[0.14em] text-muted-foreground">Features</p>
      <h2 class="text-2xl font-semibold">Pick the tools you need</h2>
      <p class="text-muted-foreground text-sm">
        Enable or disable LangFix capabilities. {{ enabledTotal }} features enabled.
      </p>
    </div>

    <div class="space-y-4">
      <Card v-for="group in featureGroups" :key="group.title">
        <CardHeader class="flex flex-row items-start justify-between gap-3">
          <div class="space-y-1">
            <CardTitle class="text-base">{{ group.title }}</CardTitle>
            <CardDescription>{{ group.description }}</CardDescription>
          </div>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" @click="toggleGroup(group, true)">
              All on
            </Button>
            <Button size="sm" variant="ghost" @click="toggleGroup(group, false)">
              All off
            </Button>
          </div>
        </CardHeader>
        <CardContent class="divide-y">
          <div
            v-for="feature in group.features"
            :key="feature.key"
            class="flex items-center justify-between gap-4 py-3"
          >
            <div>
              <p class="font-medium text-sm">{{ feature.label }}</p>
              <p class="text-xs text-muted-foreground">{{ feature.description }}</p>
            </div>
            <Switch v-model:checked="features[feature.key]" :aria-label="`Toggle ${feature.label}`" />
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="flex items-center gap-4 pt-2">
      <Button :disabled="saveStatus === 'saving'" @click="saveSettings">
        {{ saveStatus === 'saving' ? 'Saving…' : 'Save features' }}
      </Button>
      <span v-if="saveStatus === 'saved'" class="text-sm text-green-600">✓ Settings saved</span>
      <span v-else-if="saveStatus === 'error'" class="text-sm text-destructive">✗ Error saving settings</span>
    </div>
  </div>
</template>
