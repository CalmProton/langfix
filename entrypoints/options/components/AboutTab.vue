<script setup lang="ts">
const version = '0.1.0';
const repoUrl = 'https://github.com/opengale/langfix';

const links = [
  { label: 'GitHub Repository', url: repoUrl, icon: '📦' },
  { label: 'Report an Issue', url: `${repoUrl}/issues`, icon: '🐛' },
  { label: 'Documentation', url: `${repoUrl}#readme`, icon: '📚' },
];

const technologies = [
  { name: 'WXT', url: 'https://wxt.dev', description: 'Cross-browser extension framework' },
  { name: 'Vue 3', url: 'https://vuejs.org', description: 'Progressive JavaScript framework' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: 'Utility-first CSS framework' },
  { name: 'TOON', url: 'https://toonformat.dev', description: 'Token-efficient data format' },
];
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">About LangFix</h2>
      <p class="text-muted-foreground text-sm">
        Open-source, privacy-first AI writing assistant
      </p>
    </div>

    <!-- Version Info -->
    <div class="p-6 border rounded-lg bg-muted/30">
      <div class="flex items-center gap-4">
        <div class="text-4xl">✍️</div>
        <div>
          <h3 class="text-lg font-bold">LangFix</h3>
          <p class="text-muted-foreground">Version {{ version }}</p>
        </div>
      </div>
    </div>

    <!-- Description -->
    <div class="space-y-3">
      <h3 class="font-medium">What is LangFix?</h3>
      <p class="text-sm text-muted-foreground leading-relaxed">
        LangFix is a free, open-source alternative to Grammarly that lets you use your own AI API keys.
        Connect to Anthropic, OpenAI, OpenRouter, or any compatible provider to get powerful writing
        assistance while maintaining full control over your data and costs.
      </p>
    </div>

    <!-- Key Features -->
    <div class="space-y-3">
      <h3 class="font-medium">Key Features</h3>
      <ul class="grid gap-2 text-sm text-muted-foreground">
        <li class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          Privacy-first: Your API keys, your data
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          Multi-provider support (Anthropic, OpenAI, OpenRouter)
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          Grammar, spelling, and style checking
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          Text rewriting and tone adjustment
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          Cross-browser support (Chrome, Firefox, Edge, Safari)
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          Open source and free forever
        </li>
      </ul>
    </div>

    <!-- Links -->
    <div class="space-y-3">
      <h3 class="font-medium">Links</h3>
      <div class="flex flex-wrap gap-3">
        <a
          v-for="link in links"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
        >
          <span>{{ link.icon }}</span>
          <span class="text-sm">{{ link.label }}</span>
        </a>
      </div>
    </div>

    <!-- Built With -->
    <div class="space-y-3">
      <h3 class="font-medium">Built With</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <a
          v-for="tech in technologies"
          :key="tech.name"
          :href="tech.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
        >
          <div>
            <div class="font-medium text-sm">{{ tech.name }}</div>
            <div class="text-xs text-muted-foreground">{{ tech.description }}</div>
          </div>
        </a>
      </div>
    </div>

    <!-- License -->
    <div class="p-4 border rounded-lg bg-muted/30">
      <p class="text-sm text-muted-foreground">
        LangFix is open source software licensed under the MIT License.
        Contributions are welcome!
      </p>
    </div>
  </div>
</template>
