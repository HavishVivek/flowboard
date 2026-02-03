<template>
  <div class="overflow-x-auto pb-4">
    <div class="flex gap-4 min-w-max">
      <!-- Stage Columns -->
      <div
        v-for="stage in stages"
        :key="stage"
        class="w-72 flex-shrink-0"
      >
        <div class="bg-gray-800 rounded-lg p-3">
          <!-- Stage Header -->
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-medium text-gray-200">{{ stage }}</h3>
            <span class="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
              {{ contentByStage[stage]?.length || 0 }}
            </span>
          </div>

          <!-- Content Cards -->
          <div
            class="space-y-2 min-h-[200px]"
            @dragover.prevent
            @drop="handleDrop($event, stage)"
          >
            <div
              v-for="item in contentByStage[stage]"
              :key="item.id"
              draggable="true"
              @dragstart="handleDragStart($event, item)"
              :class="[
                'bg-gray-700 rounded-lg p-3 cursor-move hover:bg-gray-650 transition-colors border border-transparent hover:border-primary-500/50',
                draggedItem?.id === item.id ? 'opacity-50' : ''
              ]"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <span :class="['badge', typeClass(item.type)]">
                  {{ item.type }}
                </span>
                <div class="flex gap-1">
                  <button
                    @click="$emit('edit', item)"
                    class="text-gray-400 hover:text-primary-400"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="$emit('delete', item.id)"
                    class="text-gray-400 hover:text-red-400"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <h4 class="text-sm font-medium text-gray-200 mb-1">{{ item.title }}</h4>

              <div v-if="item.project_name" class="text-xs text-gray-500 mb-2">
                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {{ item.project_name }}
              </div>

              <div v-if="item.scheduled_date" class="text-xs text-gray-500">
                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(item.scheduled_date) }}
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="!contentByStage[stage]?.length"
              class="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg"
            >
              Drop content here
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CONTENT_STAGES } from '../services/db'

const props = defineProps({
  content: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update-stage', 'edit', 'delete'])

const stages = CONTENT_STAGES
const draggedItem = ref(null)

const contentByStage = computed(() => {
  const grouped = {}
  stages.forEach(stage => {
    grouped[stage] = props.content.filter(c => c.stage === stage)
  })
  return grouped
})

function typeClass(type) {
  const classes = {
    Video: 'bg-red-900 text-red-200',
    Blog: 'bg-blue-900 text-blue-200',
    Shorts: 'bg-purple-900 text-purple-200',
    Tutorial: 'bg-green-900 text-green-200'
  }
  return classes[type] || 'bg-gray-600 text-gray-300'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function handleDragStart(event, item) {
  draggedItem.value = item
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', item.id)
}

function handleDrop(event, stage) {
  event.preventDefault()
  if (draggedItem.value && draggedItem.value.stage !== stage) {
    emit('update-stage', draggedItem.value.id, stage)
  }
  draggedItem.value = null
}
</script>
