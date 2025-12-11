<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const version = '0.1.0';
const repoUrl = 'https://github.com/opengale/langfix';

const links = [
  { label: 'GitHub Repository', url: repoUrl, icon: '📦' },
  { label: 'Report an Issue', url: `${repoUrl}/issues`, icon: '🐛' },
  { label: 'Documentation', url: `${repoUrl}#readme`, icon: '📚' },
];

const technologies = [
  {
    name: 'WXT',
    url: 'https://wxt.dev',
    description: 'Cross-browser extension framework',
  },
  {
    name: 'Vue 3',
    url: 'https://vuejs.org',
    description: 'Progressive JavaScript framework',
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    description: 'Utility-first CSS framework',
  },
  {
    name: 'TOON',
    url: 'https://toonformat.dev',
    description: 'Token-efficient data format',
  },
];
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader class="flex flex-row items-start gap-4">
        <div class="text-4xl">✍️</div>
        <div class="space-y-1">
          <CardTitle>LangFix</CardTitle>
          <CardDescription>Version {{ version }}</CardDescription>
          <p class="text-sm text-muted-foreground">
            Open-source, privacy-first AI writing assistant
          </p>
        </div>
        <Badge variant="secondary" class="ml-auto">MIT Licensed</Badge>
      </CardHeader>
      <CardContent class="space-y-4 text-sm text-muted-foreground">
        <p>
          LangFix is a free, open-source alternative to Grammarly that lets you use
          your own AI API keys. Connect to Anthropic, OpenAI, OpenRouter, or any
          compatible provider to get powerful writing assistance while maintaining
          full control over your data and costs.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <div class="rounded-lg border bg-muted/30 p-3">
            <p class="font-semibold text-foreground">Privacy-first</p>
            <p>Your API keys and data stay yours.</p>
          </div>
          <div class="rounded-lg border bg-muted/30 p-3">
            <p class="font-semibold text-foreground">Multi-provider</p>
            <p>Anthropic, OpenAI, OpenRouter, or your own endpoints.</p>
          </div>
          <div class="rounded-lg border bg-muted/30 p-3">
            <p class="font-semibold text-foreground">Writing superpowers</p>
            <p>Grammar, spelling, rewriting, tone, and readability.</p>
          </div>
          <div class="rounded-lg border bg-muted/30 p-3">
            <p class="font-semibold text-foreground">Cross-browser</p>
            <p>Chrome, Firefox, Edge, and Safari friendly.</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Project links</CardTitle>
        <CardDescription>Explore the code, docs, or file an issue.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-3">
        <Button
          v-for="link in links"
          :key="link.url"
 as="a"
          :href="link.url"
          target="_blank"
 rel="noreferrer"
          variant="outline"
        >
          <span>{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Built with</CardTitle>
        <CardDescription>Open tools that power LangFix.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2">
        <a
          v-for="tech in technologies"
          :key="tech.name"
          :href="tech.url"
          target="_blank"
 rel="noreferrer"
          class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/60"
        >
          <div>
            <p class="font-medium text-foreground">{{ tech.name }}</p>
            <p class="text-xs text-muted-foreground">{{ tech.description }}</p>
          </div>
          <Badge variant="outline">Learn more</Badge>
        </a>
      </CardContent>
    </Card>
  </div>
</template>
