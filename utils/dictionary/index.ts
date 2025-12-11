/**
 * Dictionary Module
 * Personal dictionary and custom rules filtering functionality
 */

export {
  applyAllFilters,
  createFilterPipeline,
  filterByCustomRules,
  filterByDictionary,
  filterBySessionIgnore,
  invalidateDictionaryCache,
  isWordInDictionary,
  isWordSessionIgnored,
} from './filter';

export type {
  DictionaryCache,
  DictionaryFilterOptions,
  RuleApplicationResult,
} from './types';
