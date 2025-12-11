/**
 * Genre Manager
 * Singleton class for managing genre selection, detection, and history
 */
import { storage } from '#imports';
import type { AIProvider } from '#utils/types';
import { BUILT_IN_GENRES, BUILT_IN_GENRES_MAP } from './configs';
import type {
  CustomGenre,
  DetectionContext,
  GenreConfig,
  GenreDetectionResult,
  GenreHistoryEntry,
  UserGenrePreferences,
} from './types';
import { DEFAULT_GENRE_PREFERENCES } from './types';

// ============================================================================
// Constants
// ============================================================================

const GENRE_HISTORY_MAX_ENTRIES = 100;
const GENRE_HISTORY_STORAGE_KEY = 'local:genreHistory';
const GENRE_PREFERENCES_STORAGE_KEY = 'sync:genrePreferences';
const CUSTOM_GENRES_STORAGE_KEY = 'sync:customGenres';
const CURRENT_GENRE_STORAGE_KEY = 'local:currentGenre';

// Domain-to-genre mapping for common sites
const DOMAIN_GENRE_MAP: Record<string, string> = {
  // Academic platforms
  'scholar.google.com': 'academic',
  'jstor.org': 'academic',
  'academia.edu': 'academic',
  'researchgate.net': 'academic',
  'arxiv.org': 'academic',
  'overleaf.com': 'academic',

  // Business/Professional
  'linkedin.com': 'business',
  'slack.com': 'business',
  'notion.so': 'business',
  'monday.com': 'business',
  'asana.com': 'business',

  // Social/Casual
  'twitter.com': 'casual',
  'x.com': 'casual',
  'facebook.com': 'casual',
  'instagram.com': 'casual',
  'reddit.com': 'casual',
  'discord.com': 'casual',

  // Technical
  'github.com': 'technical',
  'gitlab.com': 'technical',
  'stackoverflow.com': 'technical',
  'readthedocs.io': 'technical',
  'docs.microsoft.com': 'technical',

  // Legal
  'westlaw.com': 'legal',
  'lexisnexis.com': 'legal',

  // Journalistic/News
  'medium.com': 'journalistic',
  'substack.com': 'journalistic',
  'wordpress.com': 'journalistic',
};

// ============================================================================
// Genre Manager Class
// ============================================================================

export class GenreManager {
  private static instance: GenreManager | null = null;
  private currentGenre: GenreConfig | null = null;
  private genres: Map<string, GenreConfig> = new Map();
  private customGenres: Map<string, CustomGenre> = new Map();
  private history: GenreHistoryEntry[] = [];
  private preferences: UserGenrePreferences = DEFAULT_GENRE_PREFERENCES;
  private initialized = false;
  private aiProvider: AIProvider | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GenreManager {
    if (!GenreManager.instance) {
      GenreManager.instance = new GenreManager();
    }
    return GenreManager.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    GenreManager.instance = null;
  }

  /**
   * Initialize the genre manager
   */
  async initialize(aiProvider?: AIProvider): Promise<void> {
    if (this.initialized) return;

    this.aiProvider = aiProvider || null;

    // Load built-in genres
    this.loadBuiltInGenres();

    // Load custom genres from storage
    await this.loadCustomGenres();

    // Load preferences
    await this.loadPreferences();

    // Load history
    await this.loadHistory();

    // Set current genre from preferences
    await this.restoreCurrentGenre();

    this.initialized = true;
  }

  /**
   * Set the AI provider for content-based detection
   */
  setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
  }

  /**
   * Load built-in genres into the genres map
   */
  private loadBuiltInGenres(): void {
    for (const genre of BUILT_IN_GENRES) {
      this.genres.set(genre.id, genre);
    }
  }

  /**
   * Load custom genres from storage
   */
  private async loadCustomGenres(): Promise<void> {
    try {
      const customGenres = await storage.getItem<CustomGenre[]>(
        CUSTOM_GENRES_STORAGE_KEY,
      );
      if (customGenres && Array.isArray(customGenres)) {
        for (const genre of customGenres) {
          this.customGenres.set(genre.id, genre);
          this.genres.set(genre.id, genre);
        }
      }
    } catch (error) {
      console.warn('Failed to load custom genres:', error);
    }
  }

  /**
   * Load user preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const prefs = await storage.getItem<UserGenrePreferences>(
        GENRE_PREFERENCES_STORAGE_KEY,
      );
      if (prefs) {
        this.preferences = { ...DEFAULT_GENRE_PREFERENCES, ...prefs };
      }
    } catch (error) {
      console.warn('Failed to load genre preferences:', error);
    }
  }

  /**
   * Load genre history from storage
   */
  private async loadHistory(): Promise<void> {
    try {
      const history = await storage.getItem<GenreHistoryEntry[]>(
        GENRE_HISTORY_STORAGE_KEY,
      );
      if (history && Array.isArray(history)) {
        this.history = history;
      }
    } catch (error) {
      console.warn('Failed to load genre history:', error);
    }
  }

  /**
   * Restore current genre from storage
   */
  private async restoreCurrentGenre(): Promise<void> {
    try {
      const currentGenreId = await storage.getItem<string>(
        CURRENT_GENRE_STORAGE_KEY,
      );
      if (currentGenreId && currentGenreId !== 'auto') {
        const genre = this.genres.get(currentGenreId);
        if (genre) {
          this.currentGenre = genre;
        }
      }
    } catch (error) {
      console.warn('Failed to restore current genre:', error);
    }
  }

  /**
   * Set the current genre by ID
   */
  async setGenre(genreId: string): Promise<void> {
    if (genreId === 'auto') {
      this.currentGenre = null;
      await storage.setItem(CURRENT_GENRE_STORAGE_KEY, 'auto');
      return;
    }

    const genre = this.genres.get(genreId);
    if (!genre) {
      throw new Error(`Genre not found: ${genreId}`);
    }

    this.currentGenre = genre;
    await storage.setItem(CURRENT_GENRE_STORAGE_KEY, genreId);
    await this.trackGenreUsage(genreId);
  }

  /**
   * Get the current genre
   */
  getCurrentGenre(): GenreConfig | null {
    return this.currentGenre;
  }

  /**
   * Get all available genres (built-in + custom)
   */
  getAllGenres(): GenreConfig[] {
    return Array.from(this.genres.values());
  }

  /**
   * Get all built-in genres
   */
  getBuiltInGenres(): GenreConfig[] {
    return BUILT_IN_GENRES;
  }

  /**
   * Get all custom genres
   */
  getCustomGenres(): CustomGenre[] {
    return Array.from(this.customGenres.values());
  }

  /**
   * Get a genre by ID
   */
  getGenre(id: string): GenreConfig | undefined {
    return this.genres.get(id);
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserGenrePreferences {
    return { ...this.preferences };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    updates: Partial<UserGenrePreferences>,
  ): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    await storage.setItem(GENRE_PREFERENCES_STORAGE_KEY, this.preferences);
  }

  /**
   * Detect genre based on context
   */
  async detectGenre(context: DetectionContext): Promise<GenreDetectionResult> {
    // 1. Try domain-based detection first (fastest)
    const domainGenre = this.detectByDomain(context.url);
    if (domainGenre) {
      return {
        genreId: domainGenre,
        confidence: 0.8,
        reason: 'Detected from domain',
        fromHistory: false,
      };
    }

    // 2. Check history for this domain
    const historyGenre = await this.getHistoricalGenre(context.url);
    if (historyGenre) {
      return {
        genreId: historyGenre,
        confidence: 0.7,
        reason: 'Based on previous usage',
        fromHistory: true,
      };
    }

    // 3. Use AI to detect from content (if provider available and text is sufficient)
    if (this.aiProvider && context.text.length > 50) {
      try {
        const aiGenre = await this.detectByContent(context.text);
        if (aiGenre) {
          return {
            genreId: aiGenre,
            confidence: 0.6,
            reason: 'Detected from content',
            fromHistory: false,
          };
        }
      } catch (error) {
        console.warn('AI genre detection failed:', error);
      }
    }

    // 4. Default to casual
    return {
      genreId: 'casual',
      confidence: 0.3,
      reason: 'Default genre',
      fromHistory: false,
    };
  }

  /**
   * Detect genre based on domain
   */
  private detectByDomain(url: string): string | null {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');

      // Check exact match
      if (DOMAIN_GENRE_MAP[hostname]) {
        return DOMAIN_GENRE_MAP[hostname];
      }

      // Check partial match (e.g., subdomain.github.com)
      for (const [domain, genre] of Object.entries(DOMAIN_GENRE_MAP)) {
        if (hostname.endsWith(domain)) {
          return genre;
        }
      }
    } catch {
      // Invalid URL
    }

    return null;
  }

  /**
   * Get historical genre for a URL/domain
   */
  private async getHistoricalGenre(url: string): Promise<string | null> {
    try {
      const hostname = new URL(url).hostname;

      // Find recent entries for this domain (within last 7 days)
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentEntries = this.history.filter(
        (entry) => entry.domain === hostname && entry.timestamp > cutoff,
      );

      if (recentEntries.length > 0) {
        // Return the most recent genre used
        return recentEntries[recentEntries.length - 1].genreUsed;
      }
    } catch {
      // Invalid URL
    }

    return null;
  }

  /**
   * Detect genre from content using AI
   */
  private async detectByContent(text: string): Promise<string | null> {
    if (!this.aiProvider) return null;

    const prompt = `Analyze the following text and determine which writing genre it belongs to.
Choose from: academic, business, creative, technical, casual, journalistic, legal.

Text (first 500 chars): "${text.slice(0, 500)}"

Respond with only the genre name in lowercase.`;

    try {
      const response = await this.aiProvider.sendRequest({
        modelType: 'fast', // Use fast model for quick detection
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 20,
      });

      const genre = response.content.trim().toLowerCase();
      if (BUILT_IN_GENRES_MAP[genre]) {
        return genre;
      }
    } catch {
      // AI detection failed
    }

    return null;
  }

  /**
   * Track genre usage for history
   */
  private async trackGenreUsage(genreId: string): Promise<void> {
    try {
      // Get current tab URL (this would need browser API access)
      // For now, we'll skip URL tracking if not available
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (!url) return;

      const hostname = new URL(url).hostname;

      const entry: GenreHistoryEntry = {
        url,
        domain: hostname,
        genreUsed: genreId,
        timestamp: Date.now(),
      };

      // Add to history
      this.history.push(entry);

      // Limit history size
      if (this.history.length > GENRE_HISTORY_MAX_ENTRIES) {
        this.history = this.history.slice(-GENRE_HISTORY_MAX_ENTRIES);
      }

      // Save to storage
      await storage.setItem(GENRE_HISTORY_STORAGE_KEY, this.history);
    } catch (error) {
      console.warn('Failed to track genre usage:', error);
    }
  }

  /**
   * Create a custom genre based on a built-in genre
   */
  async createCustomGenre(
    name: string,
    baseGenreId: string,
    modifications: Partial<GenreConfig>,
  ): Promise<CustomGenre> {
    const baseGenre = this.genres.get(baseGenreId);
    if (!baseGenre) {
      throw new Error(`Base genre not found: ${baseGenreId}`);
    }

    const customId = `custom-${Date.now()}`;

    const customGenre: CustomGenre = {
      ...baseGenre,
      ...modifications,
      id: customId,
      name,
      isCustom: true,
      baseGenre: baseGenreId,
      userModifications: modifications,
    };

    // Store in memory
    this.customGenres.set(customId, customGenre);
    this.genres.set(customId, customGenre);

    // Persist to storage
    await this.saveCustomGenres();

    return customGenre;
  }

  /**
   * Update a custom genre
   */
  async updateCustomGenre(
    genreId: string,
    updates: Partial<GenreConfig>,
  ): Promise<CustomGenre> {
    const existing = this.customGenres.get(genreId);
    if (!existing) {
      throw new Error(`Custom genre not found: ${genreId}`);
    }

    const updated: CustomGenre = {
      ...existing,
      ...updates,
      userModifications: {
        ...existing.userModifications,
        ...updates,
      },
    };

    this.customGenres.set(genreId, updated);
    this.genres.set(genreId, updated);

    await this.saveCustomGenres();

    return updated;
  }

  /**
   * Delete a custom genre
   */
  async deleteCustomGenre(genreId: string): Promise<void> {
    if (!this.customGenres.has(genreId)) {
      throw new Error(`Custom genre not found: ${genreId}`);
    }

    this.customGenres.delete(genreId);
    this.genres.delete(genreId);

    // If current genre was deleted, reset to auto
    if (this.currentGenre?.id === genreId) {
      this.currentGenre = null;
      await storage.setItem(CURRENT_GENRE_STORAGE_KEY, 'auto');
    }

    await this.saveCustomGenres();
  }

  /**
   * Save custom genres to storage
   */
  private async saveCustomGenres(): Promise<void> {
    const genres = Array.from(this.customGenres.values());
    await storage.setItem(CUSTOM_GENRES_STORAGE_KEY, genres);
  }

  /**
   * Clear genre history
   */
  async clearHistory(): Promise<void> {
    this.history = [];
    await storage.setItem(GENRE_HISTORY_STORAGE_KEY, []);
  }

  /**
   * Get the prompt suffix for the current genre
   */
  getSystemPromptSuffix(): string {
    return this.currentGenre?.systemPromptSuffix || '';
  }

  /**
   * Get grammar check modifiers for the current genre
   */
  getGrammarCheckModifiers(): string[] {
    return this.currentGenre?.grammarCheckModifiers || [];
  }

  /**
   * Get style check modifiers for the current genre
   */
  getStyleCheckModifiers(): string[] {
    return this.currentGenre?.styleCheckModifiers || [];
  }

  /**
   * Get rewrite instructions for the current genre
   */
  getRewriteInstructions(): string {
    return this.currentGenre?.rewriteInstructions || '';
  }

  /**
   * Check if a contraction error should be suppressed based on genre
   */
  shouldAllowContractions(): boolean {
    return this.currentGenre?.allowContractions ?? true;
  }

  /**
   * Check if passive voice should be flagged based on genre
   */
  shouldFlagPassiveVoice(): boolean {
    return this.currentGenre?.passiveVoice === 'avoid';
  }

  /**
   * Check if sentence fragments are allowed based on genre
   */
  shouldAllowFragments(): boolean {
    return this.currentGenre?.allowedFragments ?? false;
  }
}
