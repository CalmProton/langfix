import { defineContentScript } from 'wxt/utils/define-content-script';
import { createGrammarEngine } from '@/utils/grammar-engine';
import {
  disposeInlineRewriteManager,
  getInlineRewriteManager,
} from '@/utils/inline-rewrite';
import { disposeMetricsUIManager, getMetricsUIManager } from '@/utils/metrics';
import { behaviorStorage, featuresStorage } from '@/utils/storage';
import {
  disposeSuggestionUIManager,
  getSuggestionUIManager,
} from '@/utils/suggestion-ui';
import {
  disposeSummarizationManager,
  getSummarizationManager,
} from '@/utils/summarization';
import { createTextExtractionManager } from '@/utils/text-extraction';
import type { EditableSurface } from '@/utils/text-extraction/types';
import {
  type BehaviorSettings,
  DEFAULT_BEHAVIOR_SETTINGS,
  DEFAULT_FEATURES,
  type FeatureSettings,
} from '@/utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let features: FeatureSettings = {
      ...DEFAULT_FEATURES,
      ...(await featuresStorage.getValue()),
    };
    let behavior: BehaviorSettings = {
      ...DEFAULT_BEHAVIOR_SETTINGS,
      ...(await behaviorStorage.getValue()),
    };

    const textManager = createTextExtractionManager({
      minTextLength: 3,
      debounceMs: 350,
      scanIframes: true,
      scanShadowDom: true,
    });

    const suggestionUI = getSuggestionUIManager();
    const summarization = getSummarizationManager();

    let inlineRewrite: ReturnType<typeof getInlineRewriteManager> | null = null;
    let metricsUI: ReturnType<typeof getMetricsUIManager> | null = null;
    let grammarEngine = await (isGrammarEnabled(features)
      ? createGrammarEngine()
      : Promise.resolve(null));

    let currentSurface: EditableSurface | null = null;
    let currentWatchDisposer: (() => void) | null = null;
    let grammarTimer: ReturnType<typeof setTimeout> | null = null;
    let activeGrammarRequest = 0;

    function isGrammarEnabled(settings: FeatureSettings): boolean {
      return (
        settings.grammarCheck ||
        settings.spellCheck ||
        settings.punctuationCheck
      );
    }

    function isRewriteEnabled(settings: FeatureSettings): boolean {
      return settings.rewritingSuggestions;
    }

    function isMetricsEnabled(settings: FeatureSettings): boolean {
      return settings.wordCount;
    }

    function resetGrammarTimer() {
      if (grammarTimer) {
        clearTimeout(grammarTimer);
        grammarTimer = null;
      }
    }

    async function ensureGrammarEngineReady() {
      if (grammarEngine || !isGrammarEnabled(features)) return;
      grammarEngine = await createGrammarEngine();
      if (!grammarEngine) {
        console.warn('[LangFix] Grammar engine unavailable (no provider set)');
      }
    }

    const ensureInlineRewriteReady = () => {
      if (isRewriteEnabled(features)) {
        if (!inlineRewrite) {
          inlineRewrite = getInlineRewriteManager();
          inlineRewrite.init();
        }
      } else if (inlineRewrite) {
        inlineRewrite.close();
        disposeInlineRewriteManager();
        inlineRewrite = null;
      }
    };

    const ensureMetricsReady = async () => {
      if (isMetricsEnabled(features)) {
        if (!metricsUI) {
          metricsUI = getMetricsUIManager();
          await metricsUI.init();
        }
      } else if (metricsUI) {
        metricsUI.setSurface(null);
        disposeMetricsUIManager();
        metricsUI = null;
      }
    };

    async function runGrammarCheck(surface: EditableSurface) {
      if (!isGrammarEnabled(features)) {
        suggestionUI.clearErrors();
        return;
      }

      await ensureGrammarEngineReady();

      if (!grammarEngine) {
        suggestionUI.clearErrors();
        return;
      }

      const requestId = ++activeGrammarRequest;
      const text = surface.getText();

      if (text.trim().length < 3) {
        suggestionUI.clearErrors();
        return;
      }

      const result = await grammarEngine.checkText(text);

      if (
        requestId !== activeGrammarRequest ||
        surface.id !== currentSurface?.id
      ) {
        return;
      }

      suggestionUI.setErrors(result.errors);
    }

    function scheduleGrammarCheck(surface: EditableSurface) {
      resetGrammarTimer();

      const run = () => {
        void runGrammarCheck(surface);
      };

      if (behavior.autoCheck) {
        const delay = Math.max(behavior.checkDelay ?? 0, 0);
        grammarTimer = setTimeout(run, delay);
      } else {
        run();
      }
    }

    function cleanupSurfaceWatcher() {
      if (currentWatchDisposer) {
        currentWatchDisposer();
        currentWatchDisposer = null;
      }
    }

    function setupSurface(surface: EditableSurface | null) {
      cleanupSurfaceWatcher();
      resetGrammarTimer();
      currentSurface = surface;

      suggestionUI.setSurface(surface);
      inlineRewrite?.setSurface(
        surface && isRewriteEnabled(features) ? surface : null,
      );
      metricsUI?.setSurface(
        surface && isMetricsEnabled(features) ? surface : null,
      );

      if (!surface) {
        suggestionUI.clearErrors();
        return;
      }

      if (!isGrammarEnabled(features)) {
        suggestionUI.clearErrors();
        return;
      }

      void runGrammarCheck(surface);

      currentWatchDisposer = textManager.watchSurface(surface, () => {
        suggestionUI.clearErrors();
        if (isGrammarEnabled(features)) {
          scheduleGrammarCheck(surface);
        }
      });
    }

    async function initialize() {
      textManager.init();
      suggestionUI.init();
      summarization.init();

      ensureInlineRewriteReady();
      await ensureMetricsReady();

      textManager.onFocusChange((current, _previous) => {
        setupSurface(current);
      });

      setupSurface(textManager.getFocusedSurface());
    }

    featuresStorage.watch((updated) => {
      features = { ...DEFAULT_FEATURES, ...updated };
      ensureInlineRewriteReady();
      void ensureMetricsReady();
      setupSurface(textManager.getFocusedSurface());
    });

    behaviorStorage.watch((updated) => {
      behavior = { ...behavior, ...updated };
      if (currentSurface && isGrammarEnabled(features)) {
        void runGrammarCheck(currentSurface);
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        void initialize();
      });
    } else {
      void initialize();
    }

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

      (window as unknown as { __langfix: unknown }).__langfix = {
        textManager,
        suggestionUI,
        inlineRewrite,
        metricsUI,
        summarization,
        triggerGrammarCheck: () => {
          const surface = textManager.getFocusedSurface();
          if (surface) {
            void runGrammarCheck(surface);
          }
        },
        testRewrite: () => {
          inlineRewrite?.triggerRewrite();
        },
        testSummarize: () => {
          summarization.triggerSummarize();
        },
      };
    }

    window.addEventListener('beforeunload', () => {
      cleanupSurfaceWatcher();
      resetGrammarTimer();
      suggestionUI.clearErrors();

      disposeSuggestionUIManager();
      disposeInlineRewriteManager();
      disposeMetricsUIManager();
      disposeSummarizationManager();
    });

    console.log('[LangFix] Content script initialized');
  },
});
