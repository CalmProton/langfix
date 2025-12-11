import { defineBackground } from 'wxt/utils/define-background';
import { browser } from '#imports';
import { getInlineRewriteHandler } from '@/utils/inline-rewrite';
import { getSummarizationHandler } from '@/utils/summarization';

export default defineBackground(() => {
  console.log('[LangFix] Background script initialized', {
    id: browser.runtime.id,
  });

  // Get handlers
  const inlineRewriteHandler = getInlineRewriteHandler();
  const summarizationHandler = getSummarizationHandler();

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

  // Register context menu for summarization
  browser.contextMenus.create({
    id: 'langfix-summarize',
    title: 'Summarize selected text',
    contexts: ['selection'],
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
