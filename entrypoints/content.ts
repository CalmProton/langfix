import { defineContentScript } from 'wxt/utils/define-content-script';
import {
  disposeSuggestionUIManager,
  getSuggestionUIManager,
} from '@/utils/suggestion-ui';
import { createTextExtractionManager } from '@/utils/text-extraction';
import type { EditableSurface } from '@/utils/text-extraction/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Create and initialize the text extraction manager
    const textManager = createTextExtractionManager({
      minTextLength: 3,
      debounceMs: 350,
      scanIframes: true,
      scanShadowDom: true,
    });

    // Create the suggestion UI manager
    const suggestionUI = getSuggestionUIManager();

    // Track current surface for change watching
    let currentWatchDisposer: (() => void) | null = null;

    /**
     * Setup suggestion UI for a focused surface
     */
    function setupSurface(surface: EditableSurface | null) {
      // Cleanup previous watcher
      if (currentWatchDisposer) {
        currentWatchDisposer();
        currentWatchDisposer = null;
      }

      // Update suggestion UI surface
      suggestionUI.setSurface(surface);

      if (surface) {
        // Watch for text changes to clear/update errors
        currentWatchDisposer = textManager.watchSurface(
          surface,
          (_text, _selection) => {
            // Clear errors when text changes - grammar engine will re-check
            // This will be connected to the grammar engine in a future task
            suggestionUI.clearErrors();
          },
        );
      }
    }

    // Initialize when DOM is ready
    function initialize() {
      textManager.init();
      suggestionUI.init();

      // Track focus changes to update suggestion UI
      textManager.onFocusChange((current, _previous) => {
        setupSurface(current);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }

    // Log when surfaces are discovered (development only)
    if (import.meta.env.DEV) {
      textManager.onSurfaceAdd((surface) => {
        console.log('[LangFix] Surface added:', surface.type, surface.root);
      });

      textManager.onSurfaceRemove((surface) => {
        console.log('[LangFix] Surface removed:', surface.type);
      });

      textManager.onFocusChange((current, previous) => {
        if (current) {
          console.log(
            '[LangFix] Focus:',
            current.type,
            current.getText().slice(0, 50),
          );
        } else if (previous) {
          console.log('[LangFix] Focus lost');
        }
      });
    }

    // Expose managers for debugging in development
    if (import.meta.env.DEV) {
      (window as unknown as { __langfix: unknown }).__langfix = {
        textManager,
        suggestionUI,
        // Helper to manually test suggestion UI with mock errors
        testErrors: () => {
          const surface = textManager.getFocusedSurface();
          if (!surface) {
            console.log('[LangFix] No focused surface');
            return;
          }
          const text = surface.getText();
          // Create mock errors for testing
          const mockErrors = [
            {
              type: 'spelling' as const,
              op: 'replace' as const,
              original: text.slice(0, 5) || 'test',
              suggestion: 'fixed',
              startIndex: 0,
              endIndex: Math.min(5, text.length),
              severity: 'error' as const,
              explanation: 'This is a test spelling error',
              alternatives: ['option1', 'option2'],
            },
          ];
          suggestionUI.setErrors(mockErrors);
          console.log('[LangFix] Added test errors');
        },
      };
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (currentWatchDisposer) {
        currentWatchDisposer();
      }
      disposeSuggestionUIManager();
    });

    console.log('[LangFix] Content script initialized');
  },
});
