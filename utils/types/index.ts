/**
 * Types Index
 * Re-export all types for convenient imports
 */

// Genre types (also exported from genre-engine)
export type {
  CustomGenre,
  DetectionContext,
  FormalityLevel,
  GenreConfig,
  GenreDetectionResult,
  GenreHistoryEntry,
  GenreId,
  GenreMetadata,
  JargonLevel,
  PassiveVoicePolicy,
  PreferredPerson,
  SentenceComplexity,
  UserGenrePreferences,
  VocabularyLevel,
} from '#utils/genre-engine/types';
// AI Provider types
export * from './ai-provider';
// Dictionary & custom rules types
export * from './dictionary';
// Grammar & writing analysis types
export * from './grammar';
// Settings types
export * from './settings';
