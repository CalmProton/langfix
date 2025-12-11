/**
 * Template Manager
 * Core module for managing writing templates
 */
import { BUILT_IN_TEMPLATES, getBuiltInTemplate } from './built-in';
import { parsePlaceholders } from './parser';
import {
  type CreateTemplateInput,
  DEFAULT_TEMPLATE_SETTINGS,
  MAX_CUSTOM_TEMPLATES,
  MAX_RECENTLY_USED,
  type Template,
  type TemplateCategory,
  type TemplateFilters,
  type TemplateSettings,
  type TemplateUsageEntry,
  type UpdateTemplateInput,
} from './types';

// ============================================================================
// Template Manager Class
// ============================================================================

export class TemplateManager {
  private customTemplates: Map<string, Template> = new Map();
  private favorites: Set<string> = new Set();
  private recentlyUsed: TemplateUsageEntry[] = [];
  private usageCounts: Map<string, number> = new Map();
  private settings: TemplateSettings = DEFAULT_TEMPLATE_SETTINGS;
  private initialized = false;

  // Storage callbacks (to be set by storage integration)
  private saveCustomTemplates?: (templates: Template[]) => Promise<void>;
  private saveFavorites?: (ids: string[]) => Promise<void>;
  private saveRecentlyUsed?: (entries: TemplateUsageEntry[]) => Promise<void>;
  private saveUsage?: (usage: Record<string, number>) => Promise<void>;
  private saveSettings?: (settings: TemplateSettings) => Promise<void>;

  /**
   * Initialize the manager with data from storage
   */
  async initialize(data?: {
    customTemplates?: Template[];
    favorites?: string[];
    recentlyUsed?: TemplateUsageEntry[];
    usage?: Record<string, number>;
    settings?: TemplateSettings;
  }): Promise<void> {
    if (this.initialized) return;

    // Load custom templates
    if (data?.customTemplates) {
      for (const template of data.customTemplates) {
        this.customTemplates.set(template.id, template);
      }
    }

    // Load favorites
    if (data?.favorites) {
      this.favorites = new Set(data.favorites);
    }

    // Load recently used
    if (data?.recentlyUsed) {
      this.recentlyUsed = data.recentlyUsed;
    }

    // Load usage counts
    if (data?.usage) {
      for (const [id, count] of Object.entries(data.usage)) {
        this.usageCounts.set(id, count);
      }
    }

    // Load settings
    if (data?.settings) {
      this.settings = { ...DEFAULT_TEMPLATE_SETTINGS, ...data.settings };
    }

    this.initialized = true;
  }

  /**
   * Set storage callbacks for persistence
   */
  setStorageCallbacks(callbacks: {
    saveCustomTemplates?: (templates: Template[]) => Promise<void>;
    saveFavorites?: (ids: string[]) => Promise<void>;
    saveRecentlyUsed?: (entries: TemplateUsageEntry[]) => Promise<void>;
    saveUsage?: (usage: Record<string, number>) => Promise<void>;
    saveSettings?: (settings: TemplateSettings) => Promise<void>;
  }): void {
    this.saveCustomTemplates = callbacks.saveCustomTemplates;
    this.saveFavorites = callbacks.saveFavorites;
    this.saveRecentlyUsed = callbacks.saveRecentlyUsed;
    this.saveUsage = callbacks.saveUsage;
    this.saveSettings = callbacks.saveSettings;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get all templates (built-in + custom) with optional filtering
   */
  getAll(filters?: TemplateFilters): Template[] {
    let templates: Template[] = [];

    // Include built-in templates
    if (filters?.includeBuiltIn !== false && this.settings.showBuiltIn) {
      templates.push(...BUILT_IN_TEMPLATES);
    }

    // Include custom templates
    if (filters?.includeCustom !== false) {
      templates.push(...Array.from(this.customTemplates.values()));
    }

    // Apply filters
    templates = this.applyFilters(templates, filters);

    // Apply sorting
    templates = this.sortTemplates(templates);

    return templates;
  }

  /**
   * Get template by ID
   */
  getById(id: string): Template | undefined {
    // Check custom templates first
    const custom = this.customTemplates.get(id);
    if (custom) {
      return this.enrichTemplate(custom);
    }

    // Check built-in templates
    const builtIn = getBuiltInTemplate(id);
    if (builtIn) {
      return this.enrichTemplate(builtIn);
    }

    return undefined;
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): Template[] {
    return this.getAll({ category });
  }

  /**
   * Get favorite templates
   */
  getFavorites(): Template[] {
    return this.getAll({ favoritesOnly: true });
  }

  /**
   * Get recently used templates
   */
  getRecentlyUsed(limit = 10): Template[] {
    const templates: Template[] = [];

    for (const entry of this.recentlyUsed.slice(0, limit)) {
      const template = this.getById(entry.id);
      if (template) {
        templates.push(template);
      }
    }

    return templates;
  }

  /**
   * Search templates by query
   */
  search(query: string): Template[] {
    return this.getAll({ query });
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new custom template
   */
  async create(input: CreateTemplateInput): Promise<Template> {
    if (this.customTemplates.size >= MAX_CUSTOM_TEMPLATES) {
      throw new Error(
        `Maximum number of custom templates (${MAX_CUSTOM_TEMPLATES}) reached`,
      );
    }

    const now = Date.now();
    const template: Template = {
      ...input,
      id: generateTemplateId(),
      placeholders: parsePlaceholders(input.content),
      isBuiltIn: false,
      isFavorite: input.isFavorite ?? false,
      createdAt: now,
      updatedAt: now,
      metadata: {
        source: 'custom',
        usageCount: 0,
        ...input.metadata,
      },
    };

    this.customTemplates.set(template.id, template);

    // Persist changes
    await this.persistCustomTemplates();

    return template;
  }

  /**
   * Update an existing custom template
   */
  async update(id: string, updates: UpdateTemplateInput): Promise<Template> {
    const template = this.customTemplates.get(id);

    if (!template) {
      throw new Error(`Template with ID "${id}" not found`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot modify built-in templates');
    }

    // Update fields
    const updatedTemplate: Template = {
      ...template,
      ...updates,
      id: template.id, // Prevent ID change
      isBuiltIn: false, // Prevent changing to built-in
      createdAt: template.createdAt, // Preserve creation time
      updatedAt: Date.now(),
    };

    // Re-parse placeholders if content changed
    if (updates.content) {
      updatedTemplate.placeholders = parsePlaceholders(updates.content);
    }

    this.customTemplates.set(id, updatedTemplate);

    // Persist changes
    await this.persistCustomTemplates();

    return updatedTemplate;
  }

  /**
   * Delete a custom template
   */
  async delete(id: string): Promise<void> {
    const template = this.customTemplates.get(id);

    if (!template) {
      throw new Error(`Template with ID "${id}" not found`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    this.customTemplates.delete(id);
    this.favorites.delete(id);

    // Remove from recently used
    this.recentlyUsed = this.recentlyUsed.filter((entry) => entry.id !== id);

    // Persist changes
    await this.persistCustomTemplates();
    await this.persistFavorites();
    await this.persistRecentlyUsed();
  }

  /**
   * Duplicate a template (creates a copy)
   */
  async duplicate(id: string): Promise<Template> {
    const original = this.getById(id);

    if (!original) {
      throw new Error(`Template with ID "${id}" not found`);
    }

    return this.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      content: original.content,
      category: original.category,
      tags: [...original.tags],
      isFavorite: false,
      metadata: {
        source: 'custom',
      },
    });
  }

  // ============================================================================
  // Favorites Management
  // ============================================================================

  /**
   * Toggle favorite status for a template
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const template = this.getById(id);

    if (!template) {
      throw new Error(`Template with ID "${id}" not found`);
    }

    const isFavorite = this.favorites.has(id);

    if (isFavorite) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }

    // Update custom template if applicable
    const customTemplate = this.customTemplates.get(id);
    if (customTemplate) {
      customTemplate.isFavorite = !isFavorite;
      await this.persistCustomTemplates();
    }

    await this.persistFavorites();

    return !isFavorite;
  }

  /**
   * Check if template is a favorite
   */
  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  /**
   * Record template usage
   */
  async recordUsage(id: string): Promise<void> {
    const template = this.getById(id);

    if (!template) {
      return;
    }

    // Update usage count
    const currentCount = this.usageCounts.get(id) || 0;
    this.usageCounts.set(id, currentCount + 1);

    // Update recently used
    const now = Date.now();
    this.recentlyUsed = this.recentlyUsed.filter((entry) => entry.id !== id);
    this.recentlyUsed.unshift({ id, usedAt: now });

    // Trim to max size
    if (this.recentlyUsed.length > MAX_RECENTLY_USED) {
      this.recentlyUsed = this.recentlyUsed.slice(0, MAX_RECENTLY_USED);
    }

    // Update metadata if custom template
    const customTemplate = this.customTemplates.get(id);
    if (customTemplate) {
      customTemplate.metadata = {
        ...customTemplate.metadata,
        usageCount: currentCount + 1,
        lastUsed: now,
      };
      await this.persistCustomTemplates();
    }

    await this.persistUsage();
    await this.persistRecentlyUsed();
  }

  /**
   * Get usage count for a template
   */
  getUsageCount(id: string): number {
    return this.usageCounts.get(id) || 0;
  }

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Get current settings
   */
  getSettings(): TemplateSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<TemplateSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await this.persistSettings();
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  /**
   * Export custom templates to JSON
   */
  exportTemplates(): string {
    const templates = Array.from(this.customTemplates.values());
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        templates,
      },
      null,
      2,
    );
  }

  /**
   * Import templates from JSON
   */
  async importTemplates(
    json: string,
    options: { overwriteExisting?: boolean } = {},
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };

    try {
      const data = JSON.parse(json);

      if (!data.templates || !Array.isArray(data.templates)) {
        throw new Error('Invalid template export format');
      }

      for (const template of data.templates) {
        try {
          // Check if template with same name exists
          const existing = Array.from(this.customTemplates.values()).find(
            (t) => t.name === template.name,
          );

          if (existing && !options.overwriteExisting) {
            result.skipped++;
            continue;
          }

          if (existing) {
            await this.update(existing.id, template);
          } else {
            await this.create({
              name: template.name,
              description: template.description,
              content: template.content,
              category: template.category || 'custom',
              tags: template.tags || [],
              isFavorite: false,
              metadata: {
                source: 'imported',
              },
            });
          }

          result.imported++;
        } catch (err) {
          result.errors.push(
            `Failed to import "${template.name}": ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      }
    } catch (err) {
      result.errors.push(
        `Failed to parse import file: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    return result;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private applyFilters(
    templates: Template[],
    filters?: TemplateFilters,
  ): Template[] {
    if (!filters) return templates;

    let result = templates;

    // Filter by category
    if (filters.category) {
      result = result.filter((t) => t.category === filters.category);
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const filterTags = filters.tags;
      result = result.filter((t) =>
        filterTags.some((tag) => t.tags.includes(tag)),
      );
    }

    // Filter by favorites
    if (filters.favoritesOnly) {
      result = result.filter((t) => this.favorites.has(t.id) || t.isFavorite);
    }

    // Filter by search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return result;
  }

  private sortTemplates(templates: Template[]): Template[] {
    const sorted = [...templates];

    switch (this.settings.sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const aRecent = this.recentlyUsed.find((r) => r.id === a.id);
          const bRecent = this.recentlyUsed.find((r) => r.id === b.id);
          return (bRecent?.usedAt || 0) - (aRecent?.usedAt || 0);
        });
        break;
      case 'usage':
        sorted.sort(
          (a, b) =>
            (this.usageCounts.get(b.id) || 0) -
            (this.usageCounts.get(a.id) || 0),
        );
        break;
    }

    return sorted;
  }

  private enrichTemplate(template: Template): Template {
    return {
      ...template,
      isFavorite: this.favorites.has(template.id) || template.isFavorite,
      metadata: {
        ...template.metadata,
        usageCount: this.usageCounts.get(template.id) || 0,
      },
    };
  }

  // ============================================================================
  // Persistence Helpers
  // ============================================================================

  private async persistCustomTemplates(): Promise<void> {
    if (this.saveCustomTemplates) {
      await this.saveCustomTemplates(Array.from(this.customTemplates.values()));
    }
  }

  private async persistFavorites(): Promise<void> {
    if (this.saveFavorites) {
      await this.saveFavorites(Array.from(this.favorites));
    }
  }

  private async persistRecentlyUsed(): Promise<void> {
    if (this.saveRecentlyUsed) {
      await this.saveRecentlyUsed(this.recentlyUsed);
    }
  }

  private async persistUsage(): Promise<void> {
    if (this.saveUsage) {
      await this.saveUsage(Object.fromEntries(this.usageCounts));
    }
  }

  private async persistSettings(): Promise<void> {
    if (this.saveSettings) {
      await this.saveSettings(this.settings);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique template ID
 */
function generateTemplateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: TemplateManager | null = null;

/**
 * Get or create the template manager singleton
 */
export function getTemplateManager(): TemplateManager {
  if (!managerInstance) {
    managerInstance = new TemplateManager();
  }
  return managerInstance;
}

/**
 * Create a new template manager instance
 */
export function createTemplateManager(): TemplateManager {
  return new TemplateManager();
}
