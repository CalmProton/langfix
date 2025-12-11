<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { featuresStorage } from '@/utils/storage';
import type { FeatureSettings } from '@/utils/types';
import { DEFAULT_FEATURES } from '@/utils/types';

// State
const features = ref<FeatureSettings>({ ...DEFAULT_FEATURES });
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Feature groups for organization
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

// Load settings on mount
onMounted(async () => {
  const stored = await featuresStorage.getValue();
  features.value = { ...DEFAULT_FEATURES, ...stored };
});

// Toggle feature
function toggleFeature(key: keyof FeatureSettings) {
  features.value[key] = !features.value[key];
}

// Save settings
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

// Enable/disable all in a group
function toggleGroup(group: (typeof featureGroups)[0], enabled: boolean) {
  for (const feature of group.features) {
    features.value[feature.key] = enabled;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Features</h2>
      <p class="text-muted-foreground text-sm">
        Enable or disable LangFix features
      </p>
    </div>

    <!-- Feature Groups -->
    <div class="space-y-6">
      <div
        v-for="group in featureGroups"
        :key="group.title"
        class="border rounded-lg overflow-hidden"
      >
        <!-- Group Header -->
        <div class="bg-muted px-4 py-3 flex items-center justify-between">
          <div>
            <h3 class="font-medium">{{ group.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ group.description }}</p>
          </div>
          <div class="flex gap-2">
            <button
              @click="toggleGroup(group, true)"
              class="text-xs px-2 py-1 border rounded hover:bg-background"
            >
              All On
            </button>
            <button
              @click="toggleGroup(group, false)"
              class="text-xs px-2 py-1 border rounded hover:bg-background"
            >
              All Off
            </button>
          </div>
        </div>

        <!-- Feature Toggles -->
        <div class="divide-y">
          <label
            v-for="feature in group.features"
            :key="feature.key"
            class="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer"
          >
            <div>
              <div class="font-medium text-sm">{{ feature.label }}</div>
              <div class="text-xs text-muted-foreground">
                {{ feature.description }}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="features[feature.key]"
              @click="toggleFeature(feature.key)"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :class="features[feature.key] ? 'bg-primary' : 'bg-input'"
            >
              <span
                class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
                :class="features[feature.key] ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </label>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex items-center gap-4 pt-4 border-t">
      <button
        @click="saveSettings"
        :disabled="saveStatus === 'saving'"
        class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {{ saveStatus === 'saving' ? 'Saving...' : 'Save Features' }}
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
