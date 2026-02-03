<template>
  <div class="bg-gray-800 rounded-xl p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 class="font-semibold">AI Suggestions</h3>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="loading"
        class="text-gray-400 hover:text-primary-400 p-1"
      >
        <svg :class="['w-5 h-5', loading ? 'animate-spin' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="h-16 bg-gray-700 rounded-lg"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-6">
      <p class="text-red-400 text-sm mb-2">{{ error }}</p>
      <button @click="$emit('refresh')" class="text-primary-400 text-sm hover:underline">
        Try again
      </button>
    </div>

    <!-- Suggestions -->
    <div v-else-if="suggestions.length > 0" class="space-y-3">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="bg-gray-700/50 rounded-lg p-3 border border-gray-600 hover:border-purple-500/50 transition-colors cursor-pointer"
        @click="$emit('select', suggestion)"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center text-xs text-purple-300">
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-200 text-sm">{{ suggestion.title }}</h4>
            <p v-if="suggestion.reason" class="text-xs text-gray-400 mt-1">
              {{ suggestion.reason }}
            </p>
            <div class="flex items-center gap-2 mt-2">
              <span v-if="suggestion.estimated_time" class="text-xs text-gray-500">
                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ suggestion.estimated_time }}
              </span>
              <span v-if="suggestion.type" :class="['badge text-xs', typeClass(suggestion.type)]">
                {{ suggestion.type }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-6">
      <svg class="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <p class="text-gray-500 text-sm">Click refresh to get AI suggestions</p>
    </div>

    <!-- Time Context -->
    <div v-if="timeContext" class="mt-4 pt-4 border-t border-gray-700">
      <p class="text-xs text-gray-500">
        Based on: {{ timeContext }}
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  suggestions: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  timeContext: {
    type: String,
    default: null
  }
})

defineEmits(['refresh', 'select'])

function typeClass(type) {
  const classes = {
    task: 'bg-blue-900 text-blue-200',
    project: 'bg-green-900 text-green-200',
    content: 'bg-purple-900 text-purple-200'
  }
  return classes[type] || 'bg-gray-600 text-gray-300'
}
</script>
