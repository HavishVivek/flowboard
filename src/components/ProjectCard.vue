<template>
  <div class="card hover:border-primary-500 transition-colors cursor-pointer" @click="$emit('click', project)">
    <div class="flex justify-between items-start mb-3">
      <h3 class="font-semibold text-lg text-gray-100 truncate flex-1">{{ project.name }}</h3>
      <span :class="['badge', `badge-${project.category?.toLowerCase() || 'other'}`]">
        {{ project.category || 'Other' }}
      </span>
    </div>

    <p v-if="project.description" class="text-gray-400 text-sm mb-3 line-clamp-2">
      {{ project.description }}
    </p>

    <div class="flex items-center gap-2 mb-3">
      <span :class="['px-2 py-1 text-xs rounded', statusClass]">
        {{ project.status }}
      </span>
      <span v-if="project.priority_score" class="text-xs text-gray-400">
        Priority: {{ project.priority_score }}
      </span>
    </div>

    <!-- Progress Bar -->
    <div class="mb-3">
      <div class="flex justify-between text-xs text-gray-400 mb-1">
        <span>Progress</span>
        <span>{{ project.progress || 0 }}%</span>
      </div>
      <div class="w-full bg-gray-700 rounded-full h-2">
        <div
          class="bg-primary-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${project.progress || 0}%` }"
        ></div>
      </div>
    </div>

    <!-- Tasks Remaining -->
    <div v-if="tasksRemaining !== null" class="flex items-center justify-between text-sm">
      <span class="text-gray-400">
        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {{ tasksRemaining }} tasks remaining
      </span>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-3 pt-3 border-t border-gray-700">
      <button
        @click.stop="$emit('edit', project)"
        class="text-gray-400 hover:text-primary-400 text-sm"
      >
        Edit
      </button>
      <button
        @click.stop="$emit('delete', project)"
        class="text-gray-400 hover:text-red-400 text-sm"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  tasksRemaining: {
    type: Number,
    default: null
  }
})

defineEmits(['click', 'edit', 'delete'])

const statusClass = computed(() => {
  const classes = {
    'Planning': 'bg-blue-900 text-blue-200',
    'In Progress': 'bg-yellow-900 text-yellow-200',
    'On Hold': 'bg-orange-900 text-orange-200',
    'Completed': 'bg-green-900 text-green-200',
    'Archived': 'bg-gray-600 text-gray-300'
  }
  return classes[props.project.status] || 'bg-gray-600 text-gray-300'
})
</script>
