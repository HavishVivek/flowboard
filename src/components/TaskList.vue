<template>
  <div class="space-y-2">
    <div
      v-for="task in sortedTasks"
      :key="task.id"
      :class="[
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        task.completed ? 'bg-gray-800/50' : 'bg-gray-800 hover:bg-gray-750'
      ]"
    >
      <!-- Checkbox -->
      <button
        @click="$emit('toggle', task.id)"
        :class="[
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
          task.completed
            ? 'bg-green-600 border-green-600'
            : 'border-gray-500 hover:border-primary-500'
        ]"
      >
        <svg v-if="task.completed" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Task Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span :class="['text-sm', task.completed ? 'text-gray-500 line-through' : 'text-gray-200']">
            {{ task.title }}
          </span>
          <span :class="['badge text-xs', priorityClass(task.priority)]">
            {{ task.priority }}
          </span>
        </div>

        <div v-if="task.description" class="text-xs text-gray-500 mt-1 truncate">
          {{ task.description }}
        </div>

        <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span v-if="task.due_date" :class="isOverdue(task) ? 'text-red-400' : ''">
            <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatDate(task.due_date) }}
          </span>
          <span v-if="task.depends_on" class="text-yellow-500">
            <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Has dependency
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1">
        <button
          @click="$emit('edit', task)"
          class="p-1.5 text-gray-400 hover:text-primary-400 rounded"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          @click="$emit('delete', task.id)"
          class="p-1.5 text-gray-400 hover:text-red-400 rounded"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="tasks.length === 0" class="text-center py-8 text-gray-500">
      No tasks yet. Add one to get started!
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

defineEmits(['toggle', 'edit', 'delete'])

const sortedTasks = computed(() => {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  return [...props.tasks].sort((a, b) => {
    // Completed tasks go to the bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    // Then sort by priority
    return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
  })
})

function priorityClass(priority) {
  const classes = {
    Critical: 'bg-red-900 text-red-200',
    High: 'bg-orange-900 text-orange-200',
    Medium: 'bg-yellow-900 text-yellow-200',
    Low: 'bg-gray-600 text-gray-300'
  }
  return classes[priority] || 'bg-gray-600 text-gray-300'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task) {
  if (!task.due_date || task.completed) return false
  const today = new Date().toISOString().split('T')[0]
  return task.due_date < today
}
</script>
