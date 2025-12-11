<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  addCustomRule,
  addDictionaryEntry,
  addDictionaryContext,
  customRulesStorage,
  dictionaryContextsStorage,
  dictionaryStorage,
  exportDictionaryData,
  importDictionaryData,
  removeDictionaryEntry,
  removeDictionaryContext,
  removeCustomRule,
  toggleCustomRule,
  updateCustomRule,
  updateDictionaryEntry,
} from '@/utils/storage';
import type {
  CustomRule,
  DictionaryContext,
  DictionaryEntry,
  DictionaryExport,
} from '@/utils/types';
import { invalidateDictionaryCache } from '@/utils/dictionary/filter';

// ============================================================================
// State
// ============================================================================

const dictionary = ref<DictionaryEntry[]>([]);
const customRules = ref<CustomRule[]>([]);
const contexts = ref<DictionaryContext[]>([]);

const activeSection = ref<'dictionary' | 'rules'>('dictionary');
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Search and filters
const dictionarySearch = ref('');
const dictionaryContextFilter = ref<string>('all');
const rulesSearch = ref('');

// New entry form
const showAddWordDialog = ref(false);
const newWord = ref({
  word: '',
  caseSensitive: false,
  context: [] as string[],
  notes: '',
});

// New rule form
const showAddRuleDialog = ref(false);
const newRule = ref({
  name: '',
  type: 'ignore' as 'ignore' | 'replace' | 'prefer',
  pattern: '',
  isRegex: false,
  replacement: '',
  message: '',
  caseSensitive: false,
  context: [] as string[],
});

// New context form
const showAddContextDialog = ref(false);
const newContext = ref({
  name: '',
  description: '',
  color: '#6366f1',
});

// Edit states
const editingEntry = ref<string | null>(null);
const editingRule = ref<string | null>(null);

// Import/Export
const showImportDialog = ref(false);
const importMerge = ref(true);
const importFile = ref<File | null>(null);
const importError = ref('');

// ============================================================================
// Computed
// ============================================================================

const filteredDictionary = computed(() => {
  let filtered = dictionary.value;

  // Search filter
  if (dictionarySearch.value) {
    const query = dictionarySearch.value.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.word.toLowerCase().includes(query) ||
        e.notes?.toLowerCase().includes(query),
    );
  }

  // Context filter
  if (dictionaryContextFilter.value !== 'all') {
    filtered = filtered.filter((e) =>
      e.context?.includes(dictionaryContextFilter.value),
    );
  }

  return filtered.sort((a, b) => b.addedAt - a.addedAt);
});

const filteredRules = computed(() => {
  let filtered = customRules.value;

  // Search filter
  if (rulesSearch.value) {
    const query = rulesSearch.value.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name?.toLowerCase().includes(query) ||
        r.pattern.toLowerCase().includes(query) ||
        r.message?.toLowerCase().includes(query),
    );
  }

  return filtered.sort((a, b) => b.createdAt - a.createdAt);
});

const dictionaryStats = computed(() => ({
  total: dictionary.value.length,
  caseSensitive: dictionary.value.filter((e) => e.caseSensitive).length,
  withContext: dictionary.value.filter((e) => e.context && e.context.length > 0).length,
}));

const rulesStats = computed(() => ({
  total: customRules.value.length,
  enabled: customRules.value.filter((r) => r.enabled).length,
  ignore: customRules.value.filter((r) => r.type === 'ignore').length,
  replace: customRules.value.filter((r) => r.type === 'replace').length,
  prefer: customRules.value.filter((r) => r.type === 'prefer').length,
}));

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  try {
    [dictionary.value, customRules.value, contexts.value] = await Promise.all([
      dictionaryStorage.getValue(),
      customRulesStorage.getValue(),
      dictionaryContextsStorage.getValue(),
    ]);
  } catch (error) {
    console.error('[LangFix] Failed to load dictionary data:', error);
  }
}

onMounted(loadData);

// ============================================================================
// Dictionary Operations
// ============================================================================

async function addWord() {
  if (!newWord.value.word.trim()) return;

  saveStatus.value = 'saving';
  try {
    await addDictionaryEntry({
      word: newWord.value.word.trim(),
      caseSensitive: newWord.value.caseSensitive,
      context: newWord.value.context.length > 0 ? newWord.value.context : undefined,
      notes: newWord.value.notes || undefined,
      usageCount: 0,
    });

    invalidateDictionaryCache();
    await loadData();

    // Reset form
    newWord.value = { word: '', caseSensitive: false, context: [], notes: '' };
    showAddWordDialog.value = false;

    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to add word:', error);
    saveStatus.value = 'error';
  }
}

async function deleteWord(id: string) {
  saveStatus.value = 'saving';
  try {
    await removeDictionaryEntry(id);
    invalidateDictionaryCache();
    await loadData();
    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to delete word:', error);
    saveStatus.value = 'error';
  }
}

async function updateWord(id: string, updates: Partial<DictionaryEntry>) {
  saveStatus.value = 'saving';
  try {
    await updateDictionaryEntry(id, updates);
    invalidateDictionaryCache();
    await loadData();
    editingEntry.value = null;
    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to update word:', error);
    saveStatus.value = 'error';
  }
}

// ============================================================================
// Custom Rules Operations
// ============================================================================

async function addRuleEntry() {
  if (!newRule.value.pattern.trim()) return;

  saveStatus.value = 'saving';
  try {
    await addCustomRule({
      name: newRule.value.name || newRule.value.pattern,
      type: newRule.value.type,
      pattern: newRule.value.pattern.trim(),
      isRegex: newRule.value.isRegex,
      replacement: newRule.value.replacement || undefined,
      message: newRule.value.message || undefined,
      caseSensitive: newRule.value.caseSensitive,
      context: newRule.value.context.length > 0 ? newRule.value.context : undefined,
      enabled: true,
    });

    invalidateDictionaryCache();
    await loadData();

    // Reset form
    newRule.value = {
      name: '',
      type: 'ignore',
      pattern: '',
      isRegex: false,
      replacement: '',
      message: '',
      caseSensitive: false,
      context: [],
    };
    showAddRuleDialog.value = false;

    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to add rule:', error);
    saveStatus.value = 'error';
  }
}

async function deleteRule(id: string) {
  saveStatus.value = 'saving';
  try {
    await removeCustomRule(id);
    invalidateDictionaryCache();
    await loadData();
    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to delete rule:', error);
    saveStatus.value = 'error';
  }
}

async function toggleRuleEnabled(id: string) {
  saveStatus.value = 'saving';
  try {
    await toggleCustomRule(id);
    invalidateDictionaryCache();
    await loadData();
    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to toggle rule:', error);
    saveStatus.value = 'error';
  }
}

async function updateRuleEntry(id: string, updates: Partial<CustomRule>) {
  saveStatus.value = 'saving';
  try {
    await updateCustomRule(id, updates);
    invalidateDictionaryCache();
    await loadData();
    editingRule.value = null;
    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to update rule:', error);
    saveStatus.value = 'error';
  }
}

// ============================================================================
// Context Operations
// ============================================================================

async function addContextEntry() {
  if (!newContext.value.name.trim()) return;

  saveStatus.value = 'saving';
  try {
    await addDictionaryContext({
      name: newContext.value.name.trim(),
      description: newContext.value.description || undefined,
      color: newContext.value.color,
    });

    await loadData();

    newContext.value = { name: '', description: '', color: '#6366f1' };
    showAddContextDialog.value = false;

    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to add context:', error);
    saveStatus.value = 'error';
  }
}

async function deleteContext(id: string) {
  saveStatus.value = 'saving';
  try {
    await removeDictionaryContext(id);
    await loadData();
    showSaveSuccess();
  } catch (error) {
    console.error('[LangFix] Failed to delete context:', error);
    saveStatus.value = 'error';
  }
}

// ============================================================================
// Import/Export
// ============================================================================

async function exportData() {
  try {
    const data = await exportDictionaryData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `langfix-dictionary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[LangFix] Failed to export data:', error);
  }
}

async function handleImport() {
  if (!importFile.value) {
    importError.value = 'Please select a file';
    return;
  }

  try {
    const text = await importFile.value.text();
    const data = JSON.parse(text) as DictionaryExport;

    // Basic validation
    if (!data.dictionary || !Array.isArray(data.dictionary)) {
      importError.value = 'Invalid file format: missing dictionary array';
      return;
    }

    const result = await importDictionaryData(data, { merge: importMerge.value });
    invalidateDictionaryCache();
    await loadData();

    showImportDialog.value = false;
    importFile.value = null;
    importError.value = '';

    alert(`Import complete: ${result.imported} items imported, ${result.skipped} skipped`);
  } catch (error) {
    console.error('[LangFix] Failed to import data:', error);
    importError.value = 'Failed to parse file. Please ensure it\'s a valid JSON export.';
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  importFile.value = target.files?.[0] || null;
  importError.value = '';
}

// ============================================================================
// UI Helpers
// ============================================================================

function showSaveSuccess() {
  saveStatus.value = 'saved';
  setTimeout(() => {
    saveStatus.value = 'idle';
  }, 2000);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function getRuleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ignore: 'Ignore',
    replace: 'Replace',
    prefer: 'Prefer',
  };
  return labels[type] || type;
}

function getRuleTypeBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    ignore: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    replace: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    prefer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}

function toggleContextSelection(ctx: string, list: string[]) {
  const idx = list.indexOf(ctx);
  if (idx === -1) {
    list.push(ctx);
  } else {
    list.splice(idx, 1);
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-semibold">Personal Dictionary & Rules</h2>
      <p class="text-muted-foreground mt-1">
        Manage your personal dictionary and custom grammar rules.
      </p>
    </div>

    <!-- Section Tabs -->
    <div class="flex gap-2 border-b">
      <button
        @click="activeSection = 'dictionary'"
        class="px-4 py-2 font-medium transition-colors border-b-2 -mb-px"
        :class="
          activeSection === 'dictionary'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
      >
        📖 Dictionary ({{ dictionaryStats.total }})
      </button>
      <button
        @click="activeSection = 'rules'"
        class="px-4 py-2 font-medium transition-colors border-b-2 -mb-px"
        :class="
          activeSection === 'rules'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
      >
        📏 Custom Rules ({{ rulesStats.enabled }}/{{ rulesStats.total }})
      </button>
    </div>

    <!-- Dictionary Section -->
    <div v-if="activeSection === 'dictionary'" class="space-y-6">
      <!-- Actions Bar -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          @click="showAddWordDialog = true"
          class="btn btn-primary"
        >
          ➕ Add Word
        </button>
        <button
          @click="showAddContextDialog = true"
          class="btn btn-outline"
        >
          🏷️ Manage Contexts
        </button>
        <div class="flex-1" />
        <button @click="exportData" class="btn btn-outline">
          📤 Export
        </button>
        <button @click="showImportDialog = true" class="btn btn-outline">
          📥 Import
        </button>
      </div>

      <!-- Search & Filter -->
      <div class="flex gap-3">
        <input
          v-model="dictionarySearch"
          type="text"
          class="input flex-1"
          placeholder="Search words..."
        />
        <select v-model="dictionaryContextFilter" class="select w-40">
          <option value="all">All Contexts</option>
          <option v-for="ctx in contexts" :key="ctx.id" :value="ctx.id">
            {{ ctx.name }}
          </option>
        </select>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold">{{ dictionaryStats.total }}</div>
          <div class="text-sm text-muted-foreground">Total Words</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold">{{ dictionaryStats.caseSensitive }}</div>
          <div class="text-sm text-muted-foreground">Case Sensitive</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold">{{ dictionaryStats.withContext }}</div>
          <div class="text-sm text-muted-foreground">With Context</div>
        </div>
      </div>

      <!-- Dictionary Table -->
      <div class="card overflow-hidden">
        <div v-if="filteredDictionary.length === 0" class="p-8 text-center text-muted-foreground">
          <p v-if="dictionary.length === 0">No words in your dictionary yet.</p>
          <p v-else>No words match your search.</p>
        </div>
        <table v-else class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium">Word</th>
              <th class="px-4 py-3 text-left text-sm font-medium">Options</th>
              <th class="px-4 py-3 text-left text-sm font-medium">Context</th>
              <th class="px-4 py-3 text-left text-sm font-medium">Added</th>
              <th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="entry in filteredDictionary"
              :key="entry.id"
              class="hover:bg-muted/30"
            >
              <td class="px-4 py-3">
                <span class="font-mono">{{ entry.word }}</span>
                <p v-if="entry.notes" class="text-xs text-muted-foreground mt-1">
                  {{ entry.notes }}
                </p>
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="entry.caseSensitive"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                >
                  Case Sensitive
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="ctx in entry.context"
                    :key="ctx"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                  >
                    {{ contexts.find(c => c.id === ctx)?.name || ctx }}
                  </span>
                  <span v-if="!entry.context?.length" class="text-muted-foreground text-sm">—</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-muted-foreground">
                {{ formatDate(entry.addedAt) }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  @click="deleteWord(entry.id!)"
                  class="text-destructive hover:underline text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Custom Rules Section -->
    <div v-if="activeSection === 'rules'" class="space-y-6">
      <!-- Actions Bar -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          @click="showAddRuleDialog = true"
          class="btn btn-primary"
        >
          ➕ Add Rule
        </button>
        <div class="flex-1" />
        <button @click="exportData" class="btn btn-outline">
          📤 Export
        </button>
        <button @click="showImportDialog = true" class="btn btn-outline">
          📥 Import
        </button>
      </div>

      <!-- Search -->
      <input
        v-model="rulesSearch"
        type="text"
        class="input w-full"
        placeholder="Search rules..."
      />

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-4">
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold">{{ rulesStats.enabled }}/{{ rulesStats.total }}</div>
          <div class="text-sm text-muted-foreground">Active Rules</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-yellow-600">{{ rulesStats.ignore }}</div>
          <div class="text-sm text-muted-foreground">Ignore</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ rulesStats.replace }}</div>
          <div class="text-sm text-muted-foreground">Replace</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{{ rulesStats.prefer }}</div>
          <div class="text-sm text-muted-foreground">Prefer</div>
        </div>
      </div>

      <!-- Rules List -->
      <div class="space-y-3">
        <div v-if="filteredRules.length === 0" class="card p-8 text-center text-muted-foreground">
          <p v-if="customRules.length === 0">No custom rules defined yet.</p>
          <p v-else>No rules match your search.</p>
        </div>
        <div
          v-for="rule in filteredRules"
          :key="rule.id"
          class="card p-4"
          :class="{ 'opacity-50': !rule.enabled }"
        >
          <div class="flex items-start gap-4">
            <!-- Toggle -->
            <button
              type="button"
              role="switch"
              :aria-checked="rule.enabled"
              @click="toggleRuleEnabled(rule.id)"
              class="mt-1 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
              :class="rule.enabled ? 'bg-primary' : 'bg-input'"
            >
              <span
                class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform"
                :class="rule.enabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>

            <!-- Rule Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium">{{ rule.name || rule.pattern }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="getRuleTypeBadgeClass(rule.type)"
                >
                  {{ getRuleTypeLabel(rule.type) }}
                </span>
                <span
                  v-if="rule.isRegex"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  Regex
                </span>
                <span
                  v-if="rule.caseSensitive"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                >
                  Case Sensitive
                </span>
              </div>

              <div class="text-sm text-muted-foreground space-y-1">
                <p>
                  <span class="font-mono bg-muted px-1 rounded">{{ rule.pattern }}</span>
                  <template v-if="rule.replacement">
                    → <span class="font-mono bg-muted px-1 rounded">{{ rule.replacement }}</span>
                  </template>
                </p>
                <p v-if="rule.message" class="italic">{{ rule.message }}</p>
                <div v-if="rule.context?.length" class="flex gap-1 mt-2">
                  <span
                    v-for="ctx in rule.context"
                    :key="ctx"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                  >
                    {{ contexts.find(c => c.id === ctx)?.name || ctx }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <button
              @click="deleteRule(rule.id)"
              class="text-destructive hover:underline text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Word Dialog -->
    <div
      v-if="showAddWordDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddWordDialog = false"
    >
      <div class="bg-background rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Add Word to Dictionary</h3>

        <div class="space-y-4">
          <div>
            <label class="label">Word or Phrase</label>
            <input
              v-model="newWord.word"
              type="text"
              class="input w-full"
              placeholder="e.g., MyCompany"
              @keyup.enter="addWord"
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="newWord.caseSensitive"
              type="checkbox"
              id="new-word-case"
              class="checkbox"
            />
            <label for="new-word-case">Case sensitive</label>
          </div>

          <div>
            <label class="label">Context (optional)</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="ctx in contexts"
                :key="ctx.id"
                type="button"
                @click="toggleContextSelection(ctx.id, newWord.context)"
                class="px-3 py-1 rounded-full text-sm border transition-colors"
                :class="
                  newWord.context.includes(ctx.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                "
              >
                {{ ctx.name }}
              </button>
            </div>
          </div>

          <div>
            <label class="label">Notes (optional)</label>
            <textarea
              v-model="newWord.notes"
              class="input w-full"
              rows="2"
              placeholder="Why this word is important..."
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAddWordDialog = false" class="btn btn-outline">
            Cancel
          </button>
          <button
            @click="addWord"
            class="btn btn-primary"
            :disabled="!newWord.word.trim()"
          >
            Add to Dictionary
          </button>
        </div>
      </div>
    </div>

    <!-- Add Rule Dialog -->
    <div
      v-if="showAddRuleDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddRuleDialog = false"
    >
      <div class="bg-background rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">Add Custom Rule</h3>

        <div class="space-y-4">
          <div>
            <label class="label">Rule Name</label>
            <input
              v-model="newRule.name"
              type="text"
              class="input w-full"
              placeholder="e.g., Prefer 'utilize' over 'use'"
            />
          </div>

          <div>
            <label class="label">Rule Type</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="type in ['ignore', 'replace', 'prefer']"
                :key="type"
                type="button"
                @click="newRule.type = type as 'ignore' | 'replace' | 'prefer'"
                class="p-3 rounded-lg border text-center transition-colors"
                :class="
                  newRule.type === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                "
              >
                <div class="font-medium">{{ getRuleTypeLabel(type) }}</div>
                <div class="text-xs opacity-75">
                  {{ type === 'ignore' ? 'Never flag' : type === 'replace' ? 'Auto-replace' : 'Suggest instead' }}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label class="label">Pattern to Match</label>
            <input
              v-model="newRule.pattern"
              type="text"
              class="input w-full font-mono"
              placeholder="e.g., utilize"
            />
            <div class="flex items-center gap-4 mt-2">
              <label class="flex items-center gap-2 text-sm">
                <input v-model="newRule.isRegex" type="checkbox" class="checkbox" />
                Use regex
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input v-model="newRule.caseSensitive" type="checkbox" class="checkbox" />
                Case sensitive
              </label>
            </div>
          </div>

          <div v-if="newRule.type !== 'ignore'">
            <label class="label">Replacement</label>
            <input
              v-model="newRule.replacement"
              type="text"
              class="input w-full font-mono"
              placeholder="e.g., use"
            />
          </div>

          <div>
            <label class="label">Message (optional)</label>
            <input
              v-model="newRule.message"
              type="text"
              class="input w-full"
              placeholder="Explanation shown to user..."
            />
          </div>

          <div>
            <label class="label">Apply in Contexts (optional)</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="ctx in contexts"
                :key="ctx.id"
                type="button"
                @click="toggleContextSelection(ctx.id, newRule.context)"
                class="px-3 py-1 rounded-full text-sm border transition-colors"
                :class="
                  newRule.context.includes(ctx.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                "
              >
                {{ ctx.name }}
              </button>
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              Leave empty to apply everywhere
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAddRuleDialog = false" class="btn btn-outline">
            Cancel
          </button>
          <button
            @click="addRuleEntry"
            class="btn btn-primary"
            :disabled="!newRule.pattern.trim()"
          >
            Add Rule
          </button>
        </div>
      </div>
    </div>

    <!-- Add Context Dialog -->
    <div
      v-if="showAddContextDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddContextDialog = false"
    >
      <div class="bg-background rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Manage Contexts</h3>

        <!-- Existing Contexts -->
        <div class="space-y-2 mb-6">
          <div
            v-for="ctx in contexts"
            :key="ctx.id"
            class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div>
              <span class="font-medium">{{ ctx.name }}</span>
              <p v-if="ctx.description" class="text-sm text-muted-foreground">
                {{ ctx.description }}
              </p>
            </div>
            <button
              @click="deleteContext(ctx.id)"
              class="text-destructive hover:underline text-sm"
            >
              Remove
            </button>
          </div>
          <div v-if="contexts.length === 0" class="text-center text-muted-foreground py-4">
            No contexts defined.
          </div>
        </div>

        <!-- Add New Context -->
        <div class="border-t pt-4">
          <h4 class="font-medium mb-3">Add New Context</h4>
          <div class="space-y-3">
            <input
              v-model="newContext.name"
              type="text"
              class="input w-full"
              placeholder="Context name (e.g., Medical)"
            />
            <input
              v-model="newContext.description"
              type="text"
              class="input w-full"
              placeholder="Description (optional)"
            />
            <button
              @click="addContextEntry"
              class="btn btn-primary w-full"
              :disabled="!newContext.name.trim()"
            >
              Add Context
            </button>
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <button @click="showAddContextDialog = false" class="btn btn-outline">
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- Import Dialog -->
    <div
      v-if="showImportDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showImportDialog = false"
    >
      <div class="bg-background rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Import Dictionary & Rules</h3>

        <div class="space-y-4">
          <div>
            <label class="label">Select File</label>
            <input
              type="file"
              accept=".json"
              @change="handleFileSelect"
              class="input w-full"
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="importMerge"
              type="checkbox"
              id="import-merge"
              class="checkbox"
            />
            <label for="import-merge">
              Merge with existing data (uncheck to replace)
            </label>
          </div>

          <p v-if="importError" class="text-destructive text-sm">
            {{ importError }}
          </p>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showImportDialog = false" class="btn btn-outline">
            Cancel
          </button>
          <button
            @click="handleImport"
            class="btn btn-primary"
            :disabled="!importFile"
          >
            Import
          </button>
        </div>
      </div>
    </div>

    <!-- Save Status Toast -->
    <div
      v-if="saveStatus !== 'idle'"
      class="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg"
      :class="{
        'bg-primary text-primary-foreground': saveStatus === 'saving',
        'bg-green-500 text-white': saveStatus === 'saved',
        'bg-destructive text-destructive-foreground': saveStatus === 'error',
      }"
    >
      <span v-if="saveStatus === 'saving'">Saving...</span>
      <span v-else-if="saveStatus === 'saved'">✓ Saved</span>
      <span v-else-if="saveStatus === 'error'">Failed to save</span>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.card {
  @apply border rounded-xl bg-card;
}

.label {
  @apply block text-sm font-medium mb-1;
}

.input {
  @apply px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary;
}

.select {
  @apply px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary;
}

.checkbox {
  @apply w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20;
}

.btn-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50;
}

.btn-outline {
  @apply border hover:bg-muted;
}
</style>
