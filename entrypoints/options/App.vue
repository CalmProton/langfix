<script setup lang="ts">
import { ref } from 'vue';
import ProviderTab from './components/ProviderTab.vue';
import ModelsTab from './components/ModelsTab.vue';
import FeaturesTab from './components/FeaturesTab.vue';
import AppearanceTab from './components/AppearanceTab.vue';
import AboutTab from './components/AboutTab.vue';

const activeTab = ref<'provider' | 'models' | 'features' | 'appearance' | 'about'>('provider');

const tabs = [
  { id: 'provider' as const, label: 'AI Provider', icon: '🔌' },
  { id: 'models' as const, label: 'Models', icon: '🤖' },
  { id: 'features' as const, label: 'Features', icon: '⚡' },
  { id: 'appearance' as const, label: 'Appearance', icon: '🎨' },
  { id: 'about' as const, label: 'About', icon: 'ℹ️' },
];
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-3xl font-bold mb-2">LangFix Settings</h1>
      <p class="text-muted-foreground">
        Configure your AI writing assistant
      </p>
    </header>

    <!-- Tab Navigation -->
    <nav class="flex gap-1 border-b mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
        :class="
          activeTab === tab.id
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
      >
        <span class="mr-2">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </nav>

    <!-- Tab Content -->
    <main>
      <ProviderTab v-if="activeTab === 'provider'" />
      <ModelsTab v-else-if="activeTab === 'models'" />
      <FeaturesTab v-else-if="activeTab === 'features'" />
      <AppearanceTab v-else-if="activeTab === 'appearance'" />
      <AboutTab v-else-if="activeTab === 'about'" />
    </main>
  </div>
</template>
