<script setup lang="ts"></script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="isOpen"
        :disabled="props.disabled || !isInitialized"
        :class="cn('justify-between gap-2 min-w-[140px]', props.class)"
      >
        <span class="flex items-center gap-2">
          <span>{{ currentGenreIcon }}</span>
          <span class="truncate">{{ currentGenreName }}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="opacity-50"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </Button>
    </PopoverTrigger>

    <PopoverContent class="w-[220px] p-1" align="start">
      <!-- Auto-detect option -->
      <button
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
        :class="{ 'bg-accent': currentGenreId === 'auto' }"
        @click="selectGenre('auto')"
      >
        <span>✨</span>
        <span class="flex-1 text-left">Auto-detect</span>
        <svg
          v-if="currentGenreId === 'auto'"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>

      <Separator class="my-1"/>

      <!-- Built-in genres -->
      <div class="max-h-[300px] overflow-y-auto">
        <button
          v-for="genre in builtInGenres"
          :key="genre.id"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          :class="{ 'bg-accent': currentGenreId === genre.id }"
          @click="selectGenre(genre.id)"
        >
          <span>{{ genre.icon }}</span>
          <div class="flex-1 text-left">
            <div class="font-medium">{{ genre.name }}</div>
            <div class="text-xs text-muted-foreground truncate">
              {{ genre.description }}
            </div>
          </div>
          <svg
            v-if="currentGenreId === genre.id"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
          >
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>

      <!-- Custom genres section (if any) -->
      <template v-if="customGenres.length > 0">
        <Separator class="my-1"/>
        <div class="px-2 py-1 text-xs font-medium text-muted-foreground">
          Custom Genres
        </div>
        <button
          v-for="genre in customGenres"
          :key="genre.id"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          :class="{ 'bg-accent': currentGenreId === genre.id }"
          @click="selectGenre(genre.id)"
        >
          <span>{{ genre.icon }}</span>
          <span class="flex-1 text-left">{{ genre.name }}</span>
          <svg
            v-if="currentGenreId === genre.id"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </template>
    </PopoverContent>
  </Popover>
</template>
