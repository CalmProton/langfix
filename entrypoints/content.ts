import { createTextExtractionManager } from '@/utils/text-extraction';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Create and initialize the text extraction manager
    const manager = createTextExtractionManager({
      minTextLength: 3,
      debounceMs: 350,
      scanIframes: true,
      scanShadowDom: true,
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => manager.init());
    } else {
      manager.init();
    }

    // Log when surfaces are discovered (development only)
    if (import.meta.env.DEV) {
      manager.onSurfaceAdd((surface) => {
        console.log('[LangFix] Surface added:', surface.type, surface.root);
      });

      manager.onSurfaceRemove((surface) => {
        console.log('[LangFix] Surface removed:', surface.type);
      });

      manager.onFocusChange((current, previous) => {
        if (current) {
          console.log('[LangFix] Focus:', current.type, current.getText().slice(0, 50));
        } else if (previous) {
          console.log('[LangFix] Focus lost');
        }
      });
    }

    // Expose manager for debugging in development
    if (import.meta.env.DEV) {
      (window as unknown as { __langfix: unknown }).__langfix = { manager };
    }

    console.log('[LangFix] Content script initialized');
  },
});
