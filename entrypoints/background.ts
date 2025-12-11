import { defineBackground } from 'wxt/utils/define-background';
import { browser } from '#imports';
import { getInlineRewriteHandler } from '@/utils/inline-rewrite';

export default defineBackground(() => {
  console.log('[LangFix] Background script initialized', { id: browser.runtime.id });

  // Get the inline rewrite handler
  const inlineRewriteHandler = getInlineRewriteHandler();

  // Handle port connections for inline rewrite streaming
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'inline-rewrite') {
      console.log('[LangFix] Inline rewrite connection established');
      inlineRewriteHandler.handleConnection(port);
    }
  });

  // Register context menu items for inline rewrite
  browser.contextMenus.create({
    id: 'langfix-rewrite-improve',
    title: 'Improve selected text',
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'langfix-rewrite-shorten',
    title: 'Shorten selected text',
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'langfix-rewrite-expand',
    title: 'Expand selected text',
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'langfix-rewrite-simplify',
    title: 'Simplify selected text',
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'langfix-rewrite-professional',
    title: 'Make more professional',
    contexts: ['selection'],
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    const modeMap: Record<string, string> = {
      'langfix-rewrite-improve': 'improve',
      'langfix-rewrite-shorten': 'shorten',
      'langfix-rewrite-expand': 'expand',
      'langfix-rewrite-simplify': 'simplify',
      'langfix-rewrite-professional': 'professional',
    };

    const mode = modeMap[info.menuItemId as string];
    if (mode) {
      await browser.tabs.sendMessage(tab.id, {
        type: 'CONTEXT_MENU_REWRITE',
        mode,
      });
    }
  });
});
