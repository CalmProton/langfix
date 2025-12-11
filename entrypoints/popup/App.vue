<script lang="ts" setup>
import { onMounted, reactive } from 'vue';
import { browser } from '#imports';
import {
  apiKeyStorage,
  featuresStorage,
  providerSettingsStorage,
} from '@/utils/storage';
import { DEFAULT_FEATURES, type FeatureSettings } from '@/utils/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const state = reactive({
  loading: true,
  error: '',
  actionStatus: '',
  provider: {
    type: 'unknown',
    mainModel: '',
    fastModel: '',
    hasKey: false,
  },
  features: { ...DEFAULT_FEATURES } as FeatureSettings,
});

async function loadState() {
  state.loading = true;
  try {
    const [storedFeatures, providerSettings, apiKey] = await Promise.all([
      featuresStorage.getValue(),
      providerSettingsStorage.getValue(),
      apiKeyStorage.getValue(),
    ]);

    state.features = { ...DEFAULT_FEATURES, ...storedFeatures };
    state.provider = {
      type: providerSettings.type,
      mainModel: providerSettings.mainModel,
      fastModel: providerSettings.fastModel,
      hasKey: Boolean(apiKey),
    };
    state.error = '';
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

onMounted(() => {
  void loadState();
});

async function toggleFeature(key: keyof FeatureSettings) {
  state.features[key] = !state.features[key];
  await featuresStorage.setValue(state.features);
  state.actionStatus = 'Saved feature toggles';
  setTimeout(() => {
    state.actionStatus = '';
  }, 1500);
}

async function sendMessageToActiveTab(message: unknown) {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      state.actionStatus = 'No active tab';
      return;
    }

    await browser.tabs.sendMessage(tab.id, message);
    state.actionStatus = 'Sent to page';
    setTimeout(() => {
      state.actionStatus = '';
    }, 1500);
  } catch (error) {
    state.actionStatus = 'Unable to reach page';
    console.error('[LangFix Popup] message error', error);
  }
}

function openOptions() {
  void browser.runtime.openOptionsPage();
}

async function triggerSummarize() {
  await sendMessageToActiveTab({ type: 'SUMMARIZE_SELECTION' });
}

async function triggerRewrite() {
  await sendMessageToActiveTab({
    type: 'CONTEXT_MENU_REWRITE',
    mode: 'improve',
  });
}

defineExpose({
  openOptions,
  toggleFeature,
  triggerSummarize,
  triggerRewrite,
});
</script>

<template>
  <main class="popup">
    <header class="header">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">LangFix</p>
        <h1 class="text-xl font-bold leading-tight text-foreground">Writing assistant</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Streamlined controls for rewrite, grammar, and metrics.
        </p>
      </div>
      <Button variant="outline" size="sm" @click="openOptions">Options</Button>
    </header>

    <Card class="mb-3">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-semibold">Provider</CardTitle>
        <Badge :variant="state.provider.hasKey ? 'secondary' : 'destructive'">
          {{ state.provider.hasKey ? 'Configured' : 'API key missing' }}
        </Badge>
      </CardHeader>
      <CardContent class="space-y-1.5">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Type</span>
          <span class="font-semibold">{{ state.provider.type }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Main model</span>
          <span class="font-semibold">{{ state.provider.mainModel }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Fast model</span>
          <span class="font-semibold">{{ state.provider.fastModel }}</span>
        </div>
        <p v-if="state.error" class="mt-2 text-xs text-destructive">{{ state.error }}</p>
      </CardContent>
    </Card>

    <Card class="mb-3">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-semibold">Feature toggles</CardTitle>
        <span v-if="state.actionStatus" class="text-xs text-muted-foreground">{{ state.actionStatus }}</span>
      </CardHeader>
      <CardContent class="space-y-2.5">
        <div class="flex items-center justify-between gap-3 rounded-lg border p-2.5">
          <div class="space-y-0.5">
            <Label class="text-sm font-semibold">Inline rewrite</Label>
            <p class="text-xs text-muted-foreground">Enable rewrite popup and shortcuts.</p>
          </div>
          <Switch :checked="state.features.rewritingSuggestions"
            @update:checked="toggleFeature('rewritingSuggestions')" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border p-2.5">
          <div class="space-y-0.5">
            <Label class="text-sm font-semibold">Grammar checks</Label>
            <p class="text-xs text-muted-foreground">Show underlines and fixes on edit.</p>
          </div>
          <Switch :checked="state.features.grammarCheck" @update:checked="toggleFeature('grammarCheck')" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border p-2.5">
          <div class="space-y-0.5">
            <Label class="text-sm font-semibold">Metrics overlay</Label>
            <p class="text-xs text-muted-foreground">Word counts and pace while typing.</p>
          </div>
          <Switch :checked="state.features.wordCount" @update:checked="toggleFeature('wordCount')" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border p-2.5">
          <div class="space-y-0.5">
            <Label class="text-sm font-semibold">Readability heatmap</Label>
            <p class="text-xs text-muted-foreground">Highlight hard-to-read sentences.</p>
          </div>
          <Switch :checked="state.features.readabilityHeatmap" @update:checked="toggleFeature('readabilityHeatmap')" />
        </div>
      </CardContent>
    </Card>

    <Card class="mb-3">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-semibold">Quick actions</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <Button class="w-full" @click="triggerRewrite">
          Improve selection
        </Button>
        <Button class="w-full" variant="secondary" @click="triggerSummarize">
          Summarize selection
        </Button>
      </CardContent>
    </Card>

    <p v-if="state.loading" class="text-xs text-muted-foreground">Loading settings…</p>
  </main>
</template>

<style scoped>
.popup {
  width: 360px;
  min-height: 100%;
  padding: 16px;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
</style>
