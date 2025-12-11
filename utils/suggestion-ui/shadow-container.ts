/**
 * Shadow Container
 * Creates an isolated shadow DOM container for the suggestion UI
 */

import type { ThemeMode } from './types';

// ============================================================================
// Theme Styles
// ============================================================================

const THEME_TOKENS = `
:host {
  /* Light theme (default) */
  --lf-bg: #ffffff;
  --lf-surface: #f9fafb;
  --lf-text: #111827;
  --lf-text-secondary: #6b7280;
  --lf-border: #e5e7eb;
  --lf-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --lf-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

  /* Underline colors */
  --lf-underline-grammar: #ef4444;
  --lf-underline-spelling: #f97316;
  --lf-underline-punctuation: #eab308;
  --lf-underline-contextual: #3b82f6;
  --lf-underline-info: #8b5cf6;

  /* Action colors */
  --lf-primary: #3b82f6;
  --lf-primary-hover: #2563eb;
  --lf-success: #10b981;
  --lf-success-hover: #059669;
  --lf-danger: #ef4444;
  --lf-danger-hover: #dc2626;

  /* Focus ring */
  --lf-ring: rgba(59, 130, 246, 0.5);
  --lf-ring-offset: 2px;
}

:host(.dark) {
  --lf-bg: #1f2937;
  --lf-surface: #111827;
  --lf-text: #f9fafb;
  --lf-text-secondary: #9ca3af;
  --lf-border: #374151;
  --lf-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --lf-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2);

  /* Underline colors - slightly brighter for dark mode */
  --lf-underline-grammar: #f87171;
  --lf-underline-spelling: #fb923c;
  --lf-underline-punctuation: #facc15;
  --lf-underline-contextual: #60a5fa;
  --lf-underline-info: #a78bfa;

  /* Action colors */
  --lf-primary: #60a5fa;
  --lf-primary-hover: #3b82f6;
  --lf-success: #34d399;
  --lf-success-hover: #10b981;
  --lf-danger: #f87171;
  --lf-danger-hover: #ef4444;

  --lf-ring: rgba(96, 165, 250, 0.5);
}
`;

const BASE_STYLES = `
* {
  box-sizing: border-box;
}

/* Container layer for underlines */
.lf-underlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2147483640;
}

/* Container layer for popups */
.lf-popups {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2147483645;
}

/* Error underline */
.lf-underline {
  position: fixed;
  pointer-events: none;
  height: 3px;
  bottom: 0;
  background: none;
}

.lf-underline--grammar {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3' viewBox='0 0 6 3'%3E%3Cpath d='M0 3 L1.5 0 L3 3 L4.5 0 L6 3' fill='none' stroke='%23ef4444' stroke-width='1'/%3E%3C/svg%3E");
}

.lf-underline--spelling {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3' viewBox='0 0 6 3'%3E%3Cpath d='M0 3 L1.5 0 L3 3 L4.5 0 L6 3' fill='none' stroke='%23f97316' stroke-width='1'/%3E%3C/svg%3E");
}

.lf-underline--punctuation {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='1' viewBox='0 0 4 1'%3E%3Ccircle cx='2' cy='0.5' r='0.5' fill='%23eab308'/%3E%3C/svg%3E");
  height: 1px;
}

.lf-underline--contextual {
  border-bottom: 2px dashed var(--lf-underline-contextual);
  height: 0;
  background: none;
}

/* Focusable hit target */
.lf-hit-target {
  position: fixed;
  cursor: pointer;
  pointer-events: auto;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
}

.lf-hit-target:focus-visible {
  outline: 2px solid var(--lf-ring);
  outline-offset: 1px;
  border-radius: 2px;
}

.lf-hit-target:hover .lf-underline {
  opacity: 0.7;
}

/* Popup container */
.lf-popup {
  position: fixed;
  background: var(--lf-bg);
  border: 1px solid var(--lf-border);
  border-radius: 8px;
  box-shadow: var(--lf-shadow-lg);
  padding: 12px;
  min-width: 280px;
  max-width: 400px;
  pointer-events: auto;
  animation: lf-popup-in 0.15s ease-out;
}

@keyframes lf-popup-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.lf-popup--above {
  animation-name: lf-popup-in-above;
}

@keyframes lf-popup-in-above {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Popup header */
.lf-popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.lf-popup-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--lf-surface);
}

.lf-popup-type--grammar { color: var(--lf-underline-grammar); }
.lf-popup-type--spelling { color: var(--lf-underline-spelling); }
.lf-popup-type--punctuation { color: var(--lf-underline-punctuation); }
.lf-popup-type--contextual { color: var(--lf-underline-contextual); }

.lf-popup-close {
  margin-left: auto;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--lf-text-secondary);
  border-radius: 4px;
}

.lf-popup-close:hover {
  background: var(--lf-surface);
  color: var(--lf-text);
}

/* Original text */
.lf-popup-original {
  font-family: ui-monospace, monospace;
  font-size: 14px;
  color: var(--lf-text);
  background: var(--lf-surface);
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
  text-decoration: line-through;
  text-decoration-color: var(--lf-danger);
}

/* Suggestions */
.lf-popup-suggestions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.lf-suggestion-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--lf-surface);
  border: 1px solid var(--lf-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 14px;
  color: var(--lf-text);
  transition: background-color 0.1s, border-color 0.1s;
}

.lf-suggestion-btn:hover {
  background: var(--lf-primary);
  border-color: var(--lf-primary);
  color: white;
}

.lf-suggestion-btn:focus-visible {
  outline: 2px solid var(--lf-ring);
  outline-offset: 2px;
}

.lf-suggestion-btn--primary {
  background: var(--lf-primary);
  border-color: var(--lf-primary);
  color: white;
}

.lf-suggestion-btn--primary:hover {
  background: var(--lf-primary-hover);
  border-color: var(--lf-primary-hover);
}

/* Explanation */
.lf-popup-explanation {
  font-size: 13px;
  color: var(--lf-text-secondary);
  line-height: 1.4;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--lf-surface);
  border-radius: 4px;
}

/* Action buttons */
.lf-popup-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--lf-border);
}

.lf-action-btn {
  flex: 1;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--lf-border);
  background: var(--lf-surface);
  color: var(--lf-text-secondary);
  transition: background-color 0.1s, color 0.1s;
}

.lf-action-btn:hover {
  background: var(--lf-border);
  color: var(--lf-text);
}

.lf-action-btn:focus-visible {
  outline: 2px solid var(--lf-ring);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .lf-popup,
  .lf-popup--above {
    animation: none;
  }
}

/* Screen reader only */
.lf-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Live region for announcements */
.lf-live-region {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

// ============================================================================
// Shadow Container Class
// ============================================================================

export class ShadowContainer {
  readonly host: HTMLDivElement;
  readonly shadow: ShadowRoot;
  readonly underlinesContainer: HTMLDivElement;
  readonly popupsContainer: HTMLDivElement;
  readonly liveRegion: HTMLDivElement;

  private currentTheme: ThemeMode = 'system';
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    // Create host element
    this.host = document.createElement('div');
    this.host.id = 'langfix-suggestion-ui';
    this.host.setAttribute('aria-hidden', 'false');

    // Create shadow root
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = THEME_TOKENS + BASE_STYLES;
    this.shadow.appendChild(style);

    // Create underlines container
    this.underlinesContainer = document.createElement('div');
    this.underlinesContainer.className = 'lf-underlines';
    this.underlinesContainer.setAttribute('aria-hidden', 'true');
    this.shadow.appendChild(this.underlinesContainer);

    // Create popups container
    this.popupsContainer = document.createElement('div');
    this.popupsContainer.className = 'lf-popups';
    this.shadow.appendChild(this.popupsContainer);

    // Create live region for accessibility announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'lf-live-region';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.shadow.appendChild(this.liveRegion);

    // Setup system theme detection
    this.setupThemeDetection();
  }

  /**
   * Mount the container to the document
   */
  mount(): void {
    if (!this.host.isConnected) {
      document.body.appendChild(this.host);
    }
  }

  /**
   * Unmount the container from the document
   */
  unmount(): void {
    if (this.host.isConnected) {
      this.host.remove();
    }
    this.cleanupThemeDetection();
  }

  /**
   * Set the theme mode
   */
  setTheme(mode: ThemeMode): void {
    this.currentTheme = mode;
    this.applyTheme();
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string): void {
    // Clear and set message with a delay for screen readers
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      this.liveRegion.textContent = message;
    });
  }

  /**
   * Setup system theme detection
   */
  private setupThemeDetection(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQueryHandler = () => this.applyTheme();
      this.mediaQuery.addEventListener('change', this.mediaQueryHandler);
      this.applyTheme();
    }
  }

  /**
   * Cleanup theme detection listener
   */
  private cleanupThemeDetection(): void {
    if (this.mediaQuery && this.mediaQueryHandler) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryHandler);
      this.mediaQuery = null;
      this.mediaQueryHandler = null;
    }
  }

  /**
   * Apply the current theme
   */
  private applyTheme(): void {
    let isDark = false;

    if (this.currentTheme === 'system') {
      isDark = this.mediaQuery?.matches ?? false;
    } else {
      isDark = this.currentTheme === 'dark';
    }

    if (isDark) {
      this.host.classList.add('dark');
    } else {
      this.host.classList.remove('dark');
    }
  }

  /**
   * Check if currently mounted
   */
  get isMounted(): boolean {
    return this.host.isConnected;
  }
}

// ============================================================================
// Factory
// ============================================================================

let sharedContainer: ShadowContainer | null = null;

/**
 * Get or create the shared shadow container
 */
export function getShadowContainer(): ShadowContainer {
  if (!sharedContainer) {
    sharedContainer = new ShadowContainer();
  }
  return sharedContainer;
}

/**
 * Dispose the shared container
 */
export function disposeShadowContainer(): void {
  if (sharedContainer) {
    sharedContainer.unmount();
    sharedContainer = null;
  }
}
