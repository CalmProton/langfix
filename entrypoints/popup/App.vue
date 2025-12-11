<script lang="ts" setup>
import { onMounted, reactive } from 'vue';
import { browser } from '#imports';
import {
  apiKeyStorage,
  featuresStorage,
  providerSettingsStorage,
} from '@/utils/storage';
import { DEFAULT_FEATURES, type FeatureSettings } from '@/utils/types';

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
        <p class="eyebrow">LangFix</p>
        <h1 class="title">Writing assistant</h1>
        <p class="subtext">
          Streamlined controls for rewrite, grammar, and metrics.
        </p>
      </div>
      <button class="link" type="button" @click="openOptions">Options</button>
    </header>

    <section class="card">
      <div class="card-head">
        <span class="label">Provider</span>
        <span :class="['pill', state.provider.hasKey ? 'pill--ok' : 'pill--warn']">
          {{ state.provider.hasKey ? 'Configured' : 'API key missing' }}
        </span>
      </div>
      <div class="provider">
        <div class="provider-row">
          <span class="muted">Type</span>
          <span class="value">{{ state.provider.type }}</span>
        </div>
        <div class="provider-row">
          <span class="muted">Main model</span>
          <span class="value">{{ state.provider.mainModel }}</span>
        </div>
        <div class="provider-row">
          <span class="muted">Fast model</span>
          <span class="value">{{ state.provider.fastModel }}</span>
        </div>
      </div>
      <p v-if="state.error" class="error">{{ state.error }}</p>
    </section>

    <section class="card">
      <div class="card-head">
        <span class="label">Feature toggles</span>
        <span v-if="state.actionStatus" class="muted">{{ state.actionStatus }}</span>
      </div>
      <div class="toggles">
        <label class="toggle">
          <div>
            <p class="value">Inline rewrite</p>
            <p class="muted">Enable rewrite popup and shortcuts.</p>
          </div>
          <input type="checkbox" :checked="state.features.rewritingSuggestions"
            @change="toggleFeature('rewritingSuggestions')">
        </label>
        <label class="toggle">
          <div>
            <p class="value">Grammar checks</p>
            <p class="muted">Show underlines and fixes on edit.</p>
          </div>
          <input type="checkbox" :checked="state.features.grammarCheck" @change="toggleFeature('grammarCheck')">
        </label>
        <label class="toggle">
          <div>
            <p class="value">Metrics overlay</p>
            <p class="muted">Word counts and pace while typing.</p>
          </div>
          <input type="checkbox" :checked="state.features.wordCount" @change="toggleFeature('wordCount')">
        </label>
        <label class="toggle">
          <div>
            <p class="value">Readability heatmap</p>
            <p class="muted">Highlight hard-to-read sentences.</p>
          </div>
          <input type="checkbox" :checked="state.features.readabilityHeatmap"
            @change="toggleFeature('readabilityHeatmap')">
        </label>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <span class="label">Quick actions</span>
      </div>
      <div class="actions">
        <button class="btn" type="button" @click="triggerRewrite">
          Improve selection
        </button>
        <button class="btn btn--secondary" type="button" @click="triggerSummarize">
          Summarize selection
        </button>
      </div>
    </section>

    <p v-if="state.loading" class="muted">Loading settings…</p>
  </main>
</template>

<style scoped>
.popup {
  width: 360px;
  min-height: 100%;
  padding: 16px;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #0b1221 45%, #0f172a 100%);
  color: #e2e8f0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
  margin: 0 0 4px;
}

.title {
  margin: 0;
  font-size: 20px;
  line-height: 1.1;
  color: #f8fafc;
}

.subtext {
  margin: 6px 0 0;
  color: #cbd5e1;
  font-size: 13px;
}

.link {
  background: transparent;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.label {
  font-weight: 700;
  font-size: 13px;
  color: #f8fafc;
}

.pill {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid #1e293b;
}

.pill--ok {
  background: rgba(34, 197, 94, 0.12);
  color: #34d399;
  border-color: rgba(34, 197, 94, 0.25);
}

.pill--warn {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.25);
}

.provider {
  display: grid;
  gap: 6px;
}

.provider-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.muted {
  color: #94a3b8;
  font-size: 12px;
}

.value {
  color: #e2e8f0;
  font-weight: 600;
  font-size: 13px;
}

.toggles {
  display: grid;
  gap: 10px;
}

.toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #1f2937;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  gap: 12px;
}

.toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
}

.actions {
  display: grid;
  gap: 8px;
}

.btn {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 700;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #0f172a;
}
.btn--secondary {
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
}
.error {
  margin-top: 8px;
  color: #fca5a5;
  font-size: 12px;
}
</style>
