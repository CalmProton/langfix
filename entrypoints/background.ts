import { defineBackground } from 'wxt/utils/define-background';
import { browser } from '#imports';
import { getProviderFromStorage } from '@/utils/ai-providers';
import { getInlineRewriteHandler } from '@/utils/inline-rewrite';
import { RewriteEngine } from '@/utils/rewrite-engine';
import {
  apiKeyStorage,
  featuresStorage,
  providerSettingsStorage,
} from '@/utils/storage';
import { getSummarizationHandler } from '@/utils/summarization';
import { DEFAULT_FEATURES, type FeatureSettings } from '@/utils/types';

export default defineBackground(() => {
  console.log('[LangFix] Background script initialized', {
    id: browser.runtime.id,
  });

  // Get handlers
  const inlineRewriteHandler = getInlineRewriteHandler();
  const summarizationHandler = getSummarizationHandler();

  let currentFeatures: FeatureSettings = { ...DEFAULT_FEATURES };

  void initializeRewriteEngine();
  watchProviderChanges();

  // Sync rewrite context menus with feature toggles
  featuresStorage
    .getValue()
    .then((stored) => {
      currentFeatures = { ...DEFAULT_FEATURES, ...stored };
      return syncRewriteMenus(currentFeatures);
    })
    .catch((error) => {
      console.warn('[LangFix] Failed to load feature settings', error);
    });

  featuresStorage.watch((updated) => {
    currentFeatures = { ...DEFAULT_FEATURES, ...updated };
    void syncRewriteMenus(currentFeatures);
  });

  // Always register summarization menu
  void createSummarizationMenu();

  const rewriteMenuConfigs = [
    {
      id: 'langfix-rewrite-improve',
      title: 'Improve selected text',
      mode: 'improve',
    },
    {
      id: 'langfix-rewrite-shorten',
      title: 'Shorten selected text',
      mode: 'shorten',
    },
    {
      id: 'langfix-rewrite-expand',
      title: 'Expand selected text',
      mode: 'expand',
    },
    {
      id: 'langfix-rewrite-simplify',
      title: 'Simplify selected text',
      mode: 'simplify',
    },
    {
      id: 'langfix-rewrite-professional',
      title: 'Make more professional',
      mode: 'professional',
    },
  ] as const;

  async function initializeRewriteEngine() {
    const provider = await getProviderFromStorage();
    if (!provider) {
      console.warn(
        '[LangFix] Rewrite engine not initialized: missing provider configuration',
      );
      return;
    }

    inlineRewriteHandler.setRewriteEngine(new RewriteEngine(provider));
  }

  async function removeRewriteMenus() {
    await Promise.all(
      rewriteMenuConfigs.map((config) =>
        browser.contextMenus.remove(config.id).catch(() => undefined),
      ),
    );
  }

  async function createRewriteMenus() {
    await removeRewriteMenus();
    for (const config of rewriteMenuConfigs) {
      browser.contextMenus.create({
        id: config.id,
        title: config.title,
        contexts: ['selection'],
      });
    }
  }

  async function syncRewriteMenus(features: FeatureSettings) {
    if (features.rewritingSuggestions) {
      await createRewriteMenus();
    } else {
      await removeRewriteMenus();
    }
  }

  async function createSummarizationMenu() {
    await browser.contextMenus
      .remove('langfix-summarize')
      .catch(() => undefined);
    browser.contextMenus.create({
      id: 'langfix-summarize',
      title: 'Summarize selected text',
      contexts: ['selection'],
    });
  }

  function watchProviderChanges() {
    apiKeyStorage.watch(() => void initializeRewriteEngine());
    providerSettingsStorage.watch(() => void initializeRewriteEngine());
  }

  // Handle port connections for streaming features
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'inline-rewrite') {
      console.log('[LangFix] Inline rewrite connection established');
      inlineRewriteHandler.handleConnection(port);
    } else if (port.name === 'summarization') {
      console.log('[LangFix] Summarization connection established');
      summarizationHandler.handleConnection(port);
    }
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    // Handle summarization
    if (info.menuItemId === 'langfix-summarize') {
      await browser.tabs.sendMessage(tab.id, {
        type: 'SUMMARIZE_SELECTION',
      });
      return;
    }

    // Handle rewrite modes
    const modeMap: Record<string, string> = Object.fromEntries(
      rewriteMenuConfigs.map((config) => [config.id, config.mode]),
    );

    const mode = modeMap[info.menuItemId as string];
    if (mode) {
      await browser.tabs.sendMessage(tab.id, {
        type: 'CONTEXT_MENU_REWRITE',
        mode,
      });
    }
  });
});
