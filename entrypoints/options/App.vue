<script setup lang="ts">
import { ref } from 'vue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProviderTab from './components/ProviderTab.vue';
import ModelsTab from './components/ModelsTab.vue';
import FeaturesTab from './components/FeaturesTab.vue';
import LanguageTab from './components/LanguageTab.vue';
import DictionaryTab from './components/DictionaryTab.vue';
import AppearanceTab from './components/AppearanceTab.vue';
import AboutTab from './components/AboutTab.vue';

const activeTab = ref<
  | 'provider'
  | 'models'
  | 'features'
  | 'language'
  | 'dictionary'
  | 'appearance'
  | 'about'
>('provider');

const tabs = [
  { id: 'provider' as const, label: 'AI Provider', icon: '🔌' },
  { id: 'models' as const, label: 'Models', icon: '🤖' },
  { id: 'features' as const, label: 'Features', icon: '⚡' },
  { id: 'language' as const, label: 'Language', icon: '🌐' },
  { id: 'dictionary' as const, label: 'Dictionary', icon: '📖' },
  { id: 'appearance' as const, label: 'Appearance', icon: '🎨' },
  { id: 'about' as const, label: 'About', icon: 'ℹ️' },
];
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header class="space-y-2">
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Settings
        </p>
        <h1 class="text-3xl font-bold leading-tight">LangFix Control Panel</h1>
        <p class="text-muted-foreground">
          Configure your AI writing assistant experience.
        </p>
      </header>

      <Tabs v-model="activeTab" class="space-y-6">
        <TabsList class="flex w-full flex-wrap gap-2">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            class="flex items-center gap-2"
          >
            <span class="text-lg">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provider">
          <ProviderTab/>
        </TabsContent>
        <TabsContent value="models">
          <ModelsTab/>
        </TabsContent>
        <TabsContent value="features">
          <FeaturesTab/>
        </TabsContent>
        <TabsContent value="language">
          <LanguageTab/>
        </TabsContent>
        <TabsContent value="dictionary">
          <DictionaryTab/>
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab/>
        </TabsContent>
        <TabsContent value="about">
          <AboutTab/>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
