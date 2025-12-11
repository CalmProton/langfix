<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  addGlossaryTerm,
  getLanguageSettings,
  getTranslationGlossary,
  languageSettingsStorage,
  removeGlossaryTerm,
  removeLanguageForSite,
  setLanguageForSite,
} from '@/utils/storage';
import {
  SUPPORTED_LANGUAGES,
  type LanguageSettings,
} from '@/utils/multilingual/types';

// State
const settings = ref<LanguageSettings>({
  defaultLanguage: 'en',
  autoDetect: true,
  preferredTargetLanguage: 'en',
  perSiteOverrides: {},
  enabledLanguages: ['en'],
  translationGlossary: {},
});

const glossary = ref<Record<string, string>>({});
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

// New entries
const newSiteDomain = ref('');
const newSiteLanguage = ref('en');
const newGlossaryTerm = ref('');
const newGlossaryTranslation = ref('');

// Language lists
const tier1Languages = SUPPORTED_LANGUAGES.filter((l) => l.tier === 1);
const tier2Languages = SUPPORTED_LANGUAGES.filter((l) => l.tier === 2);
const allLanguages = [...tier1Languages, ...tier2Languages];

// Load settings
onMounted(async () => {
  try {
    settings.value = await getLanguageSettings();
    glossary.value = await getTranslationGlossary();
  } catch (error) {
    console.error('[LangFix] Failed to load language settings:', error);
  }
});

// Save settings
async function saveSettings() {
  saveStatus.value = 'saving';
  try {
    await languageSettingsStorage.setValue(settings.value);
    saveStatus.value = 'saved';
    setTimeout(() => {
      saveStatus.value = 'idle';
    }, 2000);
  } catch (error) {
    console.error('[LangFix] Failed to save language settings:', error);
    saveStatus.value = 'error';
  }
}

// Toggle language in enabled list
function toggleLanguage(code: string) {
  const idx = settings.value.enabledLanguages.indexOf(code);
  if (idx === -1) {
    settings.value.enabledLanguages.push(code);
  } else {
    // Don't allow removing the last language
    if (settings.value.enabledLanguages.length > 1) {
      settings.value.enabledLanguages.splice(idx, 1);
    }
  }
  saveSettings();
}

// Site overrides
async function addSiteOverride() {
  const domain = newSiteDomain.value.trim().toLowerCase();
  if (!domain) return;

  await setLanguageForSite(domain, newSiteLanguage.value);
  settings.value.perSiteOverrides[domain] = newSiteLanguage.value;

  newSiteDomain.value = '';
  newSiteLanguage.value = 'en';
}

async function removeSiteOverride(domain: string) {
  await removeLanguageForSite(domain);
  delete settings.value.perSiteOverrides[domain];
}

// Glossary
async function addGlossaryEntry() {
  const term = newGlossaryTerm.value.trim();
  const translation = newGlossaryTranslation.value.trim();
  if (!term || !translation) return;

  await addGlossaryTerm(term, translation);
  glossary.value[term.toLowerCase()] = translation;

  newGlossaryTerm.value = '';
  newGlossaryTranslation.value = '';
}

async function removeGlossaryEntry(term: string) {
  await removeGlossaryTerm(term);
  delete glossary.value[term];
}

// Get language name
function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : code.toUpperCase();
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-semibold">Language Settings</h2>
      <p class="text-muted-foreground mt-1">
        Configure language detection, grammar checking, and translation preferences.
      </p>
    </div>

    <!-- Default Language -->
    <section class="card">
      <h3 class="card-title">Default Language</h3>
      <p class="card-description">
        Your primary writing language. This is used when language auto-detection is disabled.
      </p>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label class="label" for="default-language">Default Language</label>
          <select
            id="default-language"
            v-model="settings.defaultLanguage"
            class="select"
            @change="saveSettings"
          >
            <option v-for="lang in allLanguages" :key="lang.code" :value="lang.code">
              {{ lang.name }} ({{ lang.nativeName }})
            </option>
          </select>
        </div>

        <div>
          <label class="label" for="target-language">Preferred Translation Target</label>
          <select
            id="target-language"
            v-model="settings.preferredTargetLanguage"
            class="select"
            @change="saveSettings"
          >
            <option v-for="lang in allLanguages" :key="lang.code" :value="lang.code">
              {{ lang.name }} ({{ lang.nativeName }})
            </option>
          </select>
        </div>
      </div>

      <div class="mt-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="settings.autoDetect"
            class="checkbox"
            @change="saveSettings"
          />
          <span>Enable automatic language detection</span>
        </label>
        <p class="text-sm text-muted-foreground mt-1 ml-6">
          Automatically detect the language of your text and apply appropriate grammar rules.
        </p>
      </div>
    </section>

    <!-- Enabled Languages for Grammar -->
    <section class="card">
      <h3 class="card-title">Grammar Check Languages</h3>
      <p class="card-description">
        Select which languages to check for grammar errors. Tier 1 languages have full grammar support,
        while Tier 2 languages have basic support.
      </p>

      <div class="mt-4 space-y-4">
        <!-- Tier 1 -->
        <div>
          <h4 class="text-sm font-medium mb-2">Tier 1 - Full Support</h4>
          <div class="grid grid-cols-3 gap-2">
            <label
              v-for="lang in tier1Languages"
              :key="lang.code"
              class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
              :class="{
                'border-primary bg-primary/5': settings.enabledLanguages.includes(lang.code),
                'border-border': !settings.enabledLanguages.includes(lang.code),
              }"
            >
              <input
                type="checkbox"
                :checked="settings.enabledLanguages.includes(lang.code)"
                class="checkbox"
                @change="toggleLanguage(lang.code)"
              />
              <div>
                <div class="font-medium text-sm">{{ lang.name }}</div>
                <div class="text-xs text-muted-foreground">{{ lang.nativeName }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Tier 2 -->
        <div>
          <h4 class="text-sm font-medium mb-2">Tier 2 - Basic Support</h4>
          <div class="grid grid-cols-3 gap-2">
            <label
              v-for="lang in tier2Languages"
              :key="lang.code"
              class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
              :class="{
                'border-primary bg-primary/5': settings.enabledLanguages.includes(lang.code),
                'border-border': !settings.enabledLanguages.includes(lang.code),
              }"
            >
              <input
                type="checkbox"
                :checked="settings.enabledLanguages.includes(lang.code)"
                class="checkbox"
                @change="toggleLanguage(lang.code)"
              />
              <div>
                <div class="font-medium text-sm">{{ lang.name }}</div>
                <div class="text-xs text-muted-foreground">{{ lang.nativeName }}</div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- Per-Site Language Overrides -->
    <section class="card">
      <h3 class="card-title">Per-Site Language Overrides</h3>
      <p class="card-description">
        Force a specific language for certain websites, bypassing auto-detection.
      </p>

      <!-- Existing overrides -->
      <div v-if="Object.keys(settings.perSiteOverrides).length > 0" class="mt-4 space-y-2">
        <div
          v-for="(lang, domain) in settings.perSiteOverrides"
          :key="domain"
          class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
        >
          <div>
            <span class="font-mono text-sm">{{ domain }}</span>
            <span class="mx-2">→</span>
            <span class="text-sm font-medium">{{ getLanguageName(lang) }}</span>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm text-destructive"
            @click="removeSiteOverride(domain as string)"
          >
            Remove
          </button>
        </div>
      </div>

      <div v-else class="mt-4 p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
        No site overrides configured.
      </div>

      <!-- Add new override -->
      <div class="mt-4 flex gap-2">
        <input
          v-model="newSiteDomain"
          type="text"
          class="input flex-1"
          placeholder="example.com"
        />
        <select v-model="newSiteLanguage" class="select w-40">
          <option v-for="lang in allLanguages" :key="lang.code" :value="lang.code">
            {{ lang.name }}
          </option>
        </select>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!newSiteDomain.trim()"
          @click="addSiteOverride"
        >
          Add
        </button>
      </div>
    </section>

    <!-- Translation Glossary -->
    <section class="card">
      <h3 class="card-title">Translation Glossary</h3>
      <p class="card-description">
        Define custom translations for specific terms. These will be applied during translation.
      </p>

      <!-- Existing glossary entries -->
      <div v-if="Object.keys(glossary).length > 0" class="mt-4 space-y-2">
        <div
          v-for="(translation, term) in glossary"
          :key="term"
          class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
        >
          <div>
            <span class="font-mono text-sm">"{{ term }}"</span>
            <span class="mx-2">→</span>
            <span class="font-mono text-sm">"{{ translation }}"</span>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm text-destructive"
            @click="removeGlossaryEntry(term as string)"
          >
            Remove
          </button>
        </div>
      </div>

      <div v-else class="mt-4 p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
        No glossary terms defined.
      </div>

      <!-- Add new term -->
      <div class="mt-4 flex gap-2">
        <input
          v-model="newGlossaryTerm"
          type="text"
          class="input flex-1"
          placeholder="Source term"
        />
        <input
          v-model="newGlossaryTranslation"
          type="text"
          class="input flex-1"
          placeholder="Translation"
        />
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!newGlossaryTerm.trim() || !newGlossaryTranslation.trim()"
          @click="addGlossaryEntry"
        >
          Add
        </button>
      </div>
    </section>

    <!-- Save Status -->
    <div
      v-if="saveStatus !== 'idle'"
      class="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg"
      :class="{
        'bg-primary text-primary-foreground': saveStatus === 'saving',
        'bg-green-500 text-white': saveStatus === 'saved',
        'bg-destructive text-destructive-foreground': saveStatus === 'error',
      }"
    >
      <span v-if="saveStatus === 'saving'">Saving...</span>
      <span v-else-if="saveStatus === 'saved'">✓ Saved</span>
      <span v-else-if="saveStatus === 'error'">Failed to save</span>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.card {
  @apply p-6 border rounded-xl bg-card;
}

.card-title {
  @apply text-lg font-semibold;
}

.card-description {
  @apply text-sm text-muted-foreground mt-1;
}

.label {
  @apply block text-sm font-medium mb-1;
}

.select {
  @apply w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary;
}

.checkbox {
  @apply w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20;
}

.input {
  @apply px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20;
}

.btn-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
}

.btn-ghost {
  @apply hover:bg-muted;
}

.btn-sm {
  @apply px-2 py-1 text-sm;
}
</style>
