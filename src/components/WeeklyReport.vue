<template>
  <Modal :isOpen="isOpen" title="Generate Report" @close="$emit('close')">
    <!-- Date Range Picker -->
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Start Date</label>
          <input
            type="date"
            v-model="startDate"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            v-model="endDate"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-gray-700 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-green-400">{{ reportData.tasksCompleted }}</div>
          <div class="text-xs text-gray-400">Tasks Completed</div>
        </div>
        <div class="bg-gray-700 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-purple-400">{{ reportData.contentPublished }}</div>
          <div class="text-xs text-gray-400">Content Published</div>
        </div>
        <div class="bg-gray-700 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-blue-400">{{ reportData.projectsWorkedOn }}</div>
          <div class="text-xs text-gray-400">Projects</div>
        </div>
      </div>

      <!-- Completed Tasks Section -->
      <div v-if="reportData.tasksByProject.length > 0">
        <h3 class="font-semibold text-sm text-gray-300 mb-2">Completed Tasks</h3>
        <div class="space-y-3 max-h-48 overflow-y-auto">
          <div v-for="projectGroup in reportData.tasksByProject" :key="projectGroup.projectId" class="bg-gray-700/50 rounded-lg p-3">
            <div class="font-medium text-sm mb-2">{{ projectGroup.projectName }}</div>
            <ul class="space-y-1">
              <li v-for="task in projectGroup.tasks" :key="task.id" class="flex items-center gap-2 text-sm text-gray-300">
                <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="flex-1">{{ task.title }}</span>
                <span class="text-xs text-gray-500">{{ task.completedDate }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Content Published Section -->
      <div v-if="reportData.publishedContent.length > 0">
        <h3 class="font-semibold text-sm text-gray-300 mb-2">Content Published</h3>
        <div class="space-y-2 max-h-32 overflow-y-auto">
          <div v-for="item in reportData.publishedContent" :key="item.id" class="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
            <span :class="['px-2 py-0.5 text-xs rounded', getTypeBadgeClass(item.type)]">{{ item.type }}</span>
            <span class="flex-1 text-sm">{{ item.title }}</span>
            <span class="text-xs text-gray-500">{{ item.publishedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="reportData.tasksCompleted === 0 && reportData.contentPublished === 0" class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No completed work in this date range</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between gap-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Close
        </button>
        <button
          @click="copyReport"
          :disabled="reportData.tasksCompleted === 0 && reportData.contentPublished === 0"
          :class="[
            'px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
            reportData.tasksCompleted === 0 && reportData.contentPublished === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          {{ copied ? 'Copied!' : 'Copy Report' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Modal from './Modal.vue'
import { useTasksStore } from '../stores/tasks'
import { useContentStore } from '../stores/content'
import { useProjectsStore } from '../stores/projects'
import { getWeekRange, formatDateForDisplay, formatDateForInput } from '../services/db'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const tasksStore = useTasksStore()
const contentStore = useContentStore()
const projectsStore = useProjectsStore()

const weekRange = getWeekRange()
const startDate = ref(formatDateForInput(weekRange.start))
const endDate = ref(formatDateForInput(weekRange.end))
const copied = ref(false)

const reportData = computed(() => {
  const start = new Date(startDate.value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate.value)
  end.setHours(23, 59, 59, 999)

  // Filter completed tasks in date range
  const completedTasks = tasksStore.tasks.filter(task => {
    if (!task.completed || !task.completed_at) return false
    const completedDate = new Date(task.completed_at)
    return completedDate >= start && completedDate <= end
  })

  // Group tasks by project
  const projectMap = new Map()
  completedTasks.forEach(task => {
    const projectId = task.project_id || 'unassigned'
    if (!projectMap.has(projectId)) {
      const project = projectsStore.projects.find(p => p.id === task.project_id)
      projectMap.set(projectId, {
        projectId,
        projectName: project?.name || 'Unassigned Tasks',
        tasks: []
      })
    }
    projectMap.get(projectId).tasks.push({
      id: task.id,
      title: task.title,
      completedDate: formatDateForDisplay(task.completed_at)
    })
  })

  // Filter published content in date range
  const publishedContent = contentStore.content.filter(item => {
    if (item.stage !== 'Published' || !item.published_date) return false
    const publishedDate = new Date(item.published_date)
    return publishedDate >= start && publishedDate <= end
  }).map(item => ({
    id: item.id,
    title: item.title,
    type: item.type,
    publishedDate: formatDateForDisplay(item.published_date)
  }))

  // Count unique projects worked on
  const projectsWorkedOn = new Set([
    ...completedTasks.filter(t => t.project_id).map(t => t.project_id),
    ...contentStore.content.filter(c => {
      if (!c.project_id || c.stage !== 'Published' || !c.published_date) return false
      const publishedDate = new Date(c.published_date)
      return publishedDate >= start && publishedDate <= end
    }).map(c => c.project_id)
  ]).size

  return {
    tasksCompleted: completedTasks.length,
    contentPublished: publishedContent.length,
    projectsWorkedOn,
    tasksByProject: Array.from(projectMap.values()),
    publishedContent
  }
})

function getTypeBadgeClass(type) {
  const classes = {
    Video: 'bg-red-900 text-red-300',
    Blog: 'bg-blue-900 text-blue-300',
    Shorts: 'bg-purple-900 text-purple-300',
    Tutorial: 'bg-green-900 text-green-300'
  }
  return classes[type] || 'bg-gray-700 text-gray-300'
}

function generateMarkdown() {
  const start = formatDateForDisplay(startDate.value)
  const end = formatDateForDisplay(endDate.value)
  const year = new Date(startDate.value).getFullYear()

  let md = `# Weekly Report (${start} - ${end}, ${year})\n\n`
  md += `## Summary\n`
  md += `- Tasks Completed: ${reportData.value.tasksCompleted}\n`
  md += `- Content Published: ${reportData.value.contentPublished}\n`
  md += `- Projects Worked On: ${reportData.value.projectsWorkedOn}\n`

  if (reportData.value.tasksByProject.length > 0) {
    md += `\n## Completed Tasks\n`
    reportData.value.tasksByProject.forEach(group => {
      md += `\n### ${group.projectName}\n`
      group.tasks.forEach(task => {
        md += `- [x] ${task.title} (${task.completedDate})\n`
      })
    })
  }

  if (reportData.value.publishedContent.length > 0) {
    md += `\n## Content Published\n`
    reportData.value.publishedContent.forEach(item => {
      md += `- ${item.type}: "${item.title}" (${item.publishedDate})\n`
    })
  }

  return md
}

async function copyReport() {
  const markdown = generateMarkdown()
  try {
    await navigator.clipboard.writeText(markdown)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Reset copied state when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    copied.value = false
    // Reset to current week
    const weekRange = getWeekRange()
    startDate.value = formatDateForInput(weekRange.start)
    endDate.value = formatDateForInput(weekRange.end)
  }
})
</script>
