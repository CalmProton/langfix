<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

const newSiteDomain = ref('');
const newSiteLanguage = ref('en');
const newGlossaryTerm = ref('');
const newGlossaryTranslation = ref('');

const tier1Languages = SUPPORTED_LANGUAGES.filter((l) => l.tier === 1);
const tier2Languages = SUPPORTED_LANGUAGES.filter((l) => l.tier === 2);
const allLanguages = [...tier1Languages, ...tier2Languages];

onMounted(async () => {
  try {
    settings.value = await getLanguageSettings();
    glossary.value = await getTranslationGlossary();
  } catch (error) {
    console.error('[LangFix] Failed to load language settings:', error);
  }
});

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

function toggleLanguage(code: string) {
  const idx = settings.value.enabledLanguages.indexOf(code);
  if (idx === -1) {
    settings.value.enabledLanguages.push(code);
  } else if (settings.value.enabledLanguages.length > 1) {
    settings.value.enabledLanguages.splice(idx, 1);
  }
  void saveSettings();
}

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

function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : code.toUpperCase();
}
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-1">
      <p class="text-sm uppercase tracking-[0.14em] text-muted-foreground">Language</p>
      <h2 class="text-2xl font-semibold">Language & translation</h2>
      <p class="text-muted-foreground text-sm">
        Configure language detection, grammar checking, and translation preferences.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Default language</CardTitle>
        <CardDescription>Your primary writing language when auto-detect is off.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="default-language">Default language</Label>
          <Select v-model="settings.defaultLanguage" @update:modelValue="saveSettings">
            <SelectTrigger id="default-language">
              <SelectValue placeholder="Choose a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="lang in allLanguages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.nativeName }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="target-language">Preferred translation target</Label>
          <Select
            v-model="settings.preferredTargetLanguage"
 @update:modelValue="saveSettings"
          >
            <SelectTrigger id="target-language">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="lang in allLanguages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.nativeName }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="col-span-full flex items-start gap-3 rounded-lg border bg-card/30 p-4">
          <Switch v-model:checked="settings.autoDetect" aria-label="Toggle language auto-detection"
            @update:checked="saveSettings"
          />
          <div class="space-y-1">
            <p class="font-medium text-sm">Enable automatic language detection</p>
            <p class="text-xs text-muted-foreground">
              Automatically detect the language of your text and apply appropriate grammar rules.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Grammar check languages</CardTitle>
        <CardDescription>Select which languages to check for grammar errors.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div>
          <h4 class="mb-2 text-sm font-medium">Tier 1 - Full support</h4>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label
              v-for="lang in tier1Languages"
              :key="lang.code"
 :for="`tier1-${lang.code}`"
              class="flex items-center gap-3 rounded-lg border bg-card/30 p-3 transition-colors hover:border-primary"
              :class="settings.enabledLanguages.includes(lang.code) ? 'border-primary shadow-sm' : 'border-border'"
            >
              <Checkbox :id="`tier1-${lang.code}`"
                :checked="settings.enabledLanguages.includes(lang.code)"
                @update:checked="toggleLanguage(lang.code)"
              />
              <div>
                <p class="font-medium text-sm">{{ lang.name }}</p>
                <p class="text-xs text-muted-foreground">{{ lang.nativeName }}</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <h4 class="mb-2 text-sm font-medium">Tier 2 - Basic support</h4>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label
              v-for="lang in tier2Languages"
              :key="lang.code"
 :for="`tier2-${lang.code}`"
              class="flex items-center gap-3 rounded-lg border bg-card/30 p-3 transition-colors hover:border-primary"
              :class="settings.enabledLanguages.includes(lang.code) ? 'border-primary shadow-sm' : 'border-border'"
            >
              <Checkbox :id="`tier2-${lang.code}`"
                :checked="settings.enabledLanguages.includes(lang.code)"
                @update:checked="toggleLanguage(lang.code)"
              />
              <div>
                <p class="font-medium text-sm">{{ lang.name }}</p>
                <p class="text-xs text-muted-foreground">{{ lang.nativeName }}</p>
              </div>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Per-site language overrides</CardTitle>
        <CardDescription>Force a specific language for certain websites.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-if="Object.keys(settings.perSiteOverrides).length" class="space-y-2">
          <div v-for="(lang, domain) in settings.perSiteOverrides" :key="domain"
            class="flex items-center justify-between rounded-lg border bg-card/30 p-3">
            <div class="space-x-2 text-sm">
              <span class="font-mono">{{ domain }}</span>
              <span class="text-muted-foreground">→</span>
              <span class="font-medium">{{ getLanguageName(lang) }}</span>
            </div>
            <Button variant="ghost" size="sm" class="text-destructive" @click="removeSiteOverride(domain as string)">
              Remove
            </Button>
          </div>
        </div>
        <div v-else class="rounded-lg border border-dashed bg-card/30 p-4 text-center text-sm text-muted-foreground">
          No site overrides configured.
        </div>

        <div class="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div class="space-y-2">
            <Label for="site-domain">Domain</Label>
            <Input id="site-domain" v-model="newSiteDomain" type="text" placeholder="example.com" />
          </div>
          <div class="space-y-2">
            <Label for="site-language">Language</Label>
            <Select v-model="newSiteLanguage">
              <SelectTrigger id="site-language">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="lang in allLanguages" :key="lang.code" :value="lang.code">
                  {{ lang.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button :disabled="!newSiteDomain.trim()" class="sm:ml-auto" @click="addSiteOverride">
            Add
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Translation glossary</CardTitle>
        <CardDescription>Define custom translations for specific terms.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-if="Object.keys(glossary).length" class="space-y-2">
          <div v-for="(translation, term) in glossary" :key="term"
            class="flex items-center justify-between rounded-lg border bg-card/30 p-3">
            <div class="space-x-2 text-sm">
              <span class="font-mono">"{{ term }}"</span>
              <span class="text-muted-foreground">→</span>
              <span class="font-mono">"{{ translation }}"</span>
            </div>
            <Button variant="ghost" size="sm" class="text-destructive" @click="removeGlossaryEntry(term as string)">
              Remove
            </Button>
          </div>
        </div>
        <div v-else class="rounded-lg border border-dashed bg-card/30 p-4 text-center text-sm text-muted-foreground">
          No glossary terms defined.
        </div>

        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div class="space-y-2">
            <Label for="glossary-term">Source term</Label>
            <Input id="glossary-term" v-model="newGlossaryTerm" type="text" placeholder="Source term" />
          </div>
          <div class="space-y-2">
            <Label for="glossary-translation">Translation</Label>
            <Input id="glossary-translation" v-model="newGlossaryTranslation" type="text"
 placeholder="Translation" />
          </div>
          <Button :disabled="!newGlossaryTerm.trim() || !newGlossaryTranslation.trim()" @click="addGlossaryEntry">
            Add
          </Button>
        </div>
      </CardContent>
    </Card>

    <div
      v-if="saveStatus !== 'idle'"
 class="fixed bottom-4 right-4 rounded-lg px-4 py-2 shadow-lg"
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
