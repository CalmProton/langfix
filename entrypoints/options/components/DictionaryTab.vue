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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

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
    <div class="space-y-1">
      <p class="text-sm uppercase tracking-[0.14em] text-muted-foreground">Dictionary</p>
      <h2 class="text-2xl font-semibold">Personal Dictionary & Rules</h2>
      <p class="text-muted-foreground text-sm">
        Manage your personal dictionary and custom grammar rules.
      </p>
    </div>

    <!-- Section Tabs -->
    <Tabs v-model="activeSection" class="space-y-6">
      <TabsList class="w-full justify-start">
        <TabsTrigger value="dictionary" class="gap-2">
          <span>📖</span>
          <span>Dictionary ({{ dictionaryStats.total }})</span>
        </TabsTrigger>
        <TabsTrigger value="rules" class="gap-2">
          <span>📏</span>
          <span>Custom Rules ({{ rulesStats.enabled }}/{{ rulesStats.total }})</span>
        </TabsTrigger>
      </TabsList>

      <!-- Dictionary Section -->
      <TabsContent value="dictionary" class="space-y-6">
        <!-- Actions Bar -->
        <div class="flex flex-wrap items-center gap-3">
          <Button @click="showAddWordDialog = true">
            ➕ Add Word
          </Button>
          <Button variant="outline" @click="showAddContextDialog = true">
            🏷️ Manage Contexts
          </Button>
          <div class="flex-1" />
          <Button variant="outline" @click="exportData">
            📤 Export
          </Button>
          <Button variant="outline" @click="showImportDialog = true">
            📥 Import
          </Button>
        </div>

        <!-- Search & Filter -->
        <div class="flex gap-3">
          <Input
            v-model="dictionarySearch"
            type="text"
            class="flex-1"
            placeholder="Search words..."
          />
          <Select v-model="dictionaryContextFilter">
            <SelectTrigger class="w-40">
              <SelectValue placeholder="All Contexts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contexts</SelectItem>
              <SelectItem v-for="ctx in contexts" :key="ctx.id" :value="ctx.id">
                {{ ctx.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4">
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold">{{ dictionaryStats.total }}</div>
              <div class="text-sm text-muted-foreground">Total Words</div>
            </CardContent>
          </Card>
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold">{{ dictionaryStats.caseSensitive }}</div>
              <div class="text-sm text-muted-foreground">Case Sensitive</div>
            </CardContent>
          </Card>
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold">{{ dictionaryStats.withContext }}</div>
              <div class="text-sm text-muted-foreground">With Context</div>
            </CardContent>
          </Card>
        </div>

        <!-- Dictionary Table -->
        <Card class="overflow-hidden">
          <div v-if="filteredDictionary.length === 0" class="p-8 text-center text-muted-foreground">
            <p v-if="dictionary.length === 0">No words in your dictionary yet.</p>
            <p v-else>No words match your search.</p>
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Word</TableHead>
                <TableHead>Options</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Added</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="entry in filteredDictionary"
                :key="entry.id"
              >
                <TableCell>
                  <span class="font-mono">{{ entry.word }}</span>
                  <p v-if="entry.notes" class="text-xs text-muted-foreground mt-1">
                    {{ entry.notes }}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    v-if="entry.caseSensitive"
                    variant="outline"
                    class="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  >
                    Case Sensitive
                  </Badge>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="ctx in entry.context"
                      :key="ctx"
                      variant="secondary"
                    >
                      {{ contexts.find(c => c.id === ctx)?.name || ctx }}
                    </Badge>
                    <span v-if="!entry.context?.length" class="text-muted-foreground text-sm">—</span>
                  </div>
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ formatDate(entry.addedAt) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-destructive hover:text-destructive"
                    @click="deleteWord(entry.id!)"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <!-- Custom Rules Section -->
      <TabsContent value="rules" class="space-y-6">
        <!-- Actions Bar -->
        <div class="flex flex-wrap items-center gap-3">
          <Button @click="showAddRuleDialog = true">
            ➕ Add Rule
          </Button>
          <div class="flex-1" />
          <Button variant="outline" @click="exportData">
            📤 Export
          </Button>
          <Button variant="outline" @click="showImportDialog = true">
            📥 Import
          </Button>
        </div>

        <!-- Search -->
        <Input
          v-model="rulesSearch"
          type="text"
          class="w-full"
          placeholder="Search rules..."
        />

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-4">
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold">{{ rulesStats.enabled }}/{{ rulesStats.total }}</div>
              <div class="text-sm text-muted-foreground">Active Rules</div>
            </CardContent>
          </Card>
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-yellow-600">{{ rulesStats.ignore }}</div>
              <div class="text-sm text-muted-foreground">Ignore</div>
            </CardContent>
          </Card>
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-blue-600">{{ rulesStats.replace }}</div>
              <div class="text-sm text-muted-foreground">Replace</div>
            </CardContent>
          </Card>
          <Card class="text-center">
            <CardContent class="p-4">
              <div class="text-2xl font-bold text-green-600">{{ rulesStats.prefer }}</div>
              <div class="text-sm text-muted-foreground">Prefer</div>
            </CardContent>
          </Card>
        </div>

        <!-- Rules List -->
        <div class="space-y-3">
          <Card v-if="filteredRules.length === 0" class="p-8 text-center text-muted-foreground">
            <p v-if="customRules.length === 0">No custom rules defined yet.</p>
            <p v-else>No rules match your search.</p>
          </Card>
          <Card
            v-for="rule in filteredRules"
            :key="rule.id"
            class="p-4"
            :class="{ 'opacity-50': !rule.enabled }"
          >
            <div class="flex items-start gap-4">
              <!-- Toggle -->
              <Switch
                :checked="rule.enabled"
                class="mt-1"
                @update:checked="toggleRuleEnabled(rule.id)"
              />

              <!-- Rule Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium">{{ rule.name || rule.pattern }}</span>
                  <Badge
                    variant="outline"
                    :class="getRuleTypeBadgeClass(rule.type)"
                  >
                    {{ getRuleTypeLabel(rule.type) }}
                  </Badge>
                  <Badge
                    v-if="rule.isRegex"
                    variant="outline"
                    class="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  >
                    Regex
                  </Badge>
                  <Badge
                    v-if="rule.caseSensitive"
                    variant="outline"
                    class="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  >
                    Case Sensitive
                  </Badge>
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
                    <Badge
                      v-for="ctx in rule.context"
                      :key="ctx"
                      variant="secondary"
                    >
                      {{ contexts.find(c => c.id === ctx)?.name || ctx }}
                    </Badge>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="deleteRule(rule.id)"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      </TabsContent>
    </Tabs>

    <!-- Add Word Dialog -->
    <Dialog :open="showAddWordDialog" @update:open="showAddWordDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Word to Dictionary</DialogTitle>
          <DialogDescription>
            Add a word or phrase to your personal dictionary.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="new-word">Word or Phrase</Label>
            <Input
              id="new-word"
              v-model="newWord.word"
              type="text"
              placeholder="e.g., MyCompany"
              @keyup.enter="addWord"
            />
          </div>

          <div class="flex items-center gap-2">
            <Checkbox
              id="new-word-case"
              :checked="newWord.caseSensitive"
              @update:checked="newWord.caseSensitive = $event"
            />
            <Label for="new-word-case" class="font-normal">Case sensitive</Label>
          </div>

          <div class="space-y-2">
            <Label>Context (optional)</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="ctx in contexts"
                :key="ctx.id"
                size="sm"
                :variant="newWord.context.includes(ctx.id) ? 'default' : 'outline'"
                @click="toggleContextSelection(ctx.id, newWord.context)"
              >
                {{ ctx.name }}
              </Button>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="new-word-notes">Notes (optional)</Label>
            <Textarea
              id="new-word-notes"
              v-model="newWord.notes"
              rows="2"
              placeholder="Why this word is important..."
            />
          </div>
        </div>

        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showAddWordDialog = false">
            Cancel
          </Button>
          <Button
            :disabled="!newWord.word.trim()"
            @click="addWord"
          >
            Add to Dictionary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Add Rule Dialog -->
    <Dialog :open="showAddRuleDialog" @update:open="showAddRuleDialog = $event">
      <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Rule</DialogTitle>
          <DialogDescription>
            Create a custom grammar or style rule.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="rule-name">Rule Name</Label>
            <Input
              id="rule-name"
              v-model="newRule.name"
              type="text"
              placeholder="e.g., Prefer 'utilize' over 'use'"
            />
          </div>

          <div class="space-y-2">
            <Label>Rule Type</Label>
            <div class="grid grid-cols-3 gap-2">
              <Button
                v-for="type in (['ignore', 'replace', 'prefer'] as const)"
                :key="type"
                :variant="newRule.type === type ? 'default' : 'outline'"
                class="h-auto flex-col gap-1 py-3"
                @click="newRule.type = type"
              >
                <span class="font-medium">{{ getRuleTypeLabel(type) }}</span>
                <span class="text-xs opacity-75">
                  {{ type === 'ignore' ? 'Never flag' : type === 'replace' ? 'Auto-replace' : 'Suggest instead' }}
                </span>
              </Button>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="rule-pattern">Pattern to Match</Label>
            <Input
              id="rule-pattern"
              v-model="newRule.pattern"
              type="text"
              class="font-mono"
              placeholder="e.g., utilize"
            />
            <div class="flex items-center gap-4 mt-2">
              <div class="flex items-center gap-2">
                <Checkbox
                  id="rule-regex"
                  :checked="newRule.isRegex"
                  @update:checked="newRule.isRegex = $event"
                />
                <Label for="rule-regex" class="font-normal text-sm">Use regex</Label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox
                  id="rule-case"
                  :checked="newRule.caseSensitive"
                  @update:checked="newRule.caseSensitive = $event"
                />
                <Label for="rule-case" class="font-normal text-sm">Case sensitive</Label>
              </div>
            </div>
          </div>

          <div v-if="newRule.type !== 'ignore'" class="space-y-2">
            <Label for="rule-replacement">Replacement</Label>
            <Input
              id="rule-replacement"
              v-model="newRule.replacement"
              type="text"
              class="font-mono"
              placeholder="e.g., use"
            />
          </div>

          <div class="space-y-2">
            <Label for="rule-message">Message (optional)</Label>
            <Input
              id="rule-message"
              v-model="newRule.message"
              type="text"
              placeholder="Explanation shown to user..."
            />
          </div>

          <div class="space-y-2">
            <Label>Apply in Contexts (optional)</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="ctx in contexts"
                :key="ctx.id"
                size="sm"
                :variant="newRule.context.includes(ctx.id) ? 'default' : 'outline'"
                @click="toggleContextSelection(ctx.id, newRule.context)"
              >
                {{ ctx.name }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Leave empty to apply everywhere
            </p>
          </div>
        </div>

        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showAddRuleDialog = false">
            Cancel
          </Button>
          <Button
            :disabled="!newRule.pattern.trim()"
            @click="addRuleEntry"
          >
            Add Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Add Context Dialog -->
    <Dialog :open="showAddContextDialog" @update:open="showAddContextDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Contexts</DialogTitle>
          <DialogDescription>
            Create and manage dictionary contexts.
          </DialogDescription>
        </DialogHeader>

        <!-- Existing Contexts -->
        <div class="space-y-2 mb-4">
          <Card
            v-for="ctx in contexts"
            :key="ctx.id"
            class="p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">{{ ctx.name }}</span>
                <p v-if="ctx.description" class="text-sm text-muted-foreground">
                  {{ ctx.description }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="deleteContext(ctx.id)"
              >
                Remove
              </Button>
            </div>
          </Card>
          <div v-if="contexts.length === 0" class="text-center text-muted-foreground py-4">
            No contexts defined.
          </div>
        </div>

        <!-- Add New Context -->
        <div class="border-t pt-4 space-y-3">
          <Label class="text-base font-medium">Add New Context</Label>
          <Input
            v-model="newContext.name"
            type="text"
            placeholder="Context name (e.g., Medical)"
          />
          <Input
            v-model="newContext.description"
            type="text"
            placeholder="Description (optional)"
          />
          <Button
            class="w-full"
            :disabled="!newContext.name.trim()"
            @click="addContextEntry"
          >
            Add Context
          </Button>
        </div>

        <DialogFooter class="mt-4">
          <Button variant="outline" @click="showAddContextDialog = false">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Import Dialog -->
    <Dialog :open="showImportDialog" @update:open="showImportDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Dictionary & Rules</DialogTitle>
          <DialogDescription>
            Import data from a JSON export file.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="import-file">Select File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              @change="handleFileSelect"
            />
          </div>

          <div class="flex items-center gap-2">
            <Checkbox
              id="import-merge"
              :checked="importMerge"
              @update:checked="importMerge = $event"
            />
            <Label for="import-merge" class="font-normal">
              Merge with existing data (uncheck to replace)
            </Label>
          </div>

          <p v-if="importError" class="text-destructive text-sm">
            {{ importError }}
          </p>
        </div>

        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showImportDialog = false">
            Cancel
          </Button>
          <Button
            :disabled="!importFile"
            @click="handleImport"
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
