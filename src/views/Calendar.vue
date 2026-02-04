<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Calendar & Schedule</h1>
        <p class="text-gray-400">Plan your work and content releases</p>
      </div>
      <div class="flex gap-2">
        <button @click="clearAiSchedule" class="btn btn-secondary">Clear AI Schedule</button>
      </div>
    </div>

    <!-- AI Content Generator for Date Ideas -->
    <AiContentGenerator
      @use-title="handleAiTitle"
      @save-idea="handleAiIdea"
    />

    <!-- Weekly Schedule -->
    <WeeklySchedule
      :schedule-items="scheduleWithDetails"
      :generating="generating"
      @generate-schedule="generateSchedule"
      @item-click="viewScheduleItem"
      @add-item="openAddScheduleModal"
    />

    <!-- Content Calendar Section -->
    <div class="card">
      <h3 class="font-semibold mb-4">Content Calendar</h3>

      <!-- Month Navigation -->
      <div class="flex items-center justify-between mb-4">
        <button @click="previousMonth" class="p-2 hover:bg-gray-700 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 class="font-medium">{{ monthLabel }}</h4>
        <button @click="nextMonth" class="p-2 hover:bg-gray-700 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-1">
        <!-- Day Headers -->
        <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="text-center text-xs text-gray-500 py-2">
          {{ day }}
        </div>

        <!-- Calendar Days -->
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          :class="[
            'min-h-[80px] p-1 border border-gray-700 rounded',
            day.isCurrentMonth ? 'bg-gray-800' : 'bg-gray-900/50',
            day.isToday ? 'border-primary-500' : ''
          ]"
        >
          <div class="text-xs text-gray-500 mb-1">{{ day.dayNum }}</div>
          <div class="space-y-1">
            <!-- Content items -->
            <div
              v-for="item in getContentForDate(day.date)"
              :key="'content-' + item.id"
              :class="['text-xs p-1 rounded truncate cursor-pointer', typeClass(item.type)]"
              :title="item.title"
              @click="viewContent(item)"
            >
              {{ item.title }}
            </div>
            <!-- Tasks with due dates -->
            <div
              v-for="task in getTasksForDate(day.date)"
              :key="'task-' + task.id"
              :class="[
                'text-xs p-1 rounded truncate cursor-pointer flex items-center gap-1',
                task.completed ? 'bg-green-900/50 text-green-300 line-through' : 'bg-yellow-900/50 text-yellow-200'
              ]"
              :title="task.title"
              @click="toggleTask(task.id)"
            >
              <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="task.completed" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span class="truncate">{{ task.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tasks Due This Week -->
    <div class="card">
      <h3 class="font-semibold mb-4">Tasks Due This Week</h3>
      <div v-if="tasksDueThisWeek.length > 0" class="space-y-2">
        <div
          v-for="task in tasksDueThisWeek"
          :key="task.id"
          class="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <button
              @click="toggleTask(task.id)"
              :class="[
                'w-5 h-5 rounded border-2 flex items-center justify-center',
                task.completed ? 'bg-green-600 border-green-600' : 'border-gray-500'
              ]"
            >
              <svg v-if="task.completed" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <span :class="task.completed ? 'text-gray-500 line-through' : ''">{{ task.title }}</span>
          </div>
          <span class="text-sm text-gray-400">{{ formatDate(task.due_date) }}</span>
        </div>
      </div>
      <p v-else class="text-gray-500 text-center py-4">No tasks due this week</p>
    </div>

    <!-- Add Schedule Item Modal -->
    <Modal :is-open="showScheduleModal" title="Add Schedule Item" @close="showScheduleModal = false">
      <form @submit.prevent="saveScheduleItem" class="space-y-4">
        <div>
          <label class="label">Task</label>
          <select v-model="scheduleForm.task_id" class="select w-full">
            <option :value="null">Select a task...</option>
            <option v-for="task in incompleteTasks" :key="task.id" :value="task.id">
              {{ task.title }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Date</label>
            <input v-model="scheduleForm.date" type="date" class="input w-full" required />
          </div>
          <div>
            <label class="label">Time Slot</label>
            <select v-model="scheduleForm.time_slot" class="select w-full">
              <option v-for="slot in timeSlots" :key="slot.id" :value="slot.label">
                {{ slot.label }}
              </option>
            </select>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="showScheduleModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveScheduleItem" class="btn btn-primary">Add to Schedule</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '../stores/schedule'
import { useTasksStore } from '../stores/tasks'
import { useContentStore } from '../stores/content'
import { useProjectsStore } from '../stores/projects'
import { TIME_SLOTS } from '../services/db'
import { generateWeeklySchedule } from '../services/groqAI'
import WeeklySchedule from '../components/WeeklySchedule.vue'
import Modal from '../components/Modal.vue'
import AiContentGenerator from '../components/AiContentGenerator.vue'

const scheduleStore = useScheduleStore()
const tasksStore = useTasksStore()
const contentStore = useContentStore()
const projectsStore = useProjectsStore()

const timeSlots = TIME_SLOTS
const generating = ref(false)
const currentMonth = ref(new Date())
const showScheduleModal = ref(false)

const scheduleForm = ref({
  task_id: null,
  date: '',
  time_slot: 'Morning (6am-12pm)'
})

const scheduleWithDetails = computed(() => {
  return scheduleStore.scheduleItems.map(item => {
    const task = tasksStore.tasks.find(t => t.id === item.task_id)
    return {
      ...item,
      task_title: task?.title || 'Unknown Task'
    }
  })
})

const incompleteTasks = computed(() => tasksStore.incompleteTasks)

const monthLabel = computed(() => {
  return currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const days = []

  // Add days from previous month
  const startDayOfWeek = firstDay.getDay()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: date.getDate(),
      isCurrentMonth: false,
      isToday: false
    })
  }

  // Add days of current month
  const today = new Date().toISOString().split('T')[0]
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayNum: i,
      isCurrentMonth: true,
      isToday: dateStr === today
    })
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: i,
      isCurrentMonth: false,
      isToday: false
    })
  }

  return days
})

const tasksDueThisWeek = computed(() => {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const start = startOfWeek.toISOString().split('T')[0]
  const end = endOfWeek.toISOString().split('T')[0]

  return tasksStore.tasks
    .filter(t => t.due_date && t.due_date >= start && t.due_date <= end)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
})

function typeClass(type) {
  const classes = {
    Video: 'bg-red-900/70 text-red-200',
    Blog: 'bg-blue-900/70 text-blue-200',
    Shorts: 'bg-purple-900/70 text-purple-200',
    Tutorial: 'bg-green-900/70 text-green-200'
  }
  return classes[type] || 'bg-gray-600 text-gray-300'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getContentForDate(date) {
  return contentStore.content.filter(c => c.scheduled_date === date)
}

function getTasksForDate(date) {
  return tasksStore.tasks.filter(t => t.due_date === date)
}

function previousMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

async function generateSchedule() {
  generating.value = true
  try {
    const tasks = tasksStore.incompleteTasks
    const projects = projectsStore.activeProjects

    const scheduleItems = await generateWeeklySchedule(tasks, projects)

    // Clear existing AI schedule and add new one
    await scheduleStore.clearAiSuggestedSchedule()
    if (scheduleItems.length > 0) {
      await scheduleStore.bulkAddScheduleItems(scheduleItems)
    }
  } catch (e) {
    console.error('Failed to generate schedule:', e)
    alert('Failed to generate schedule: ' + e.message)
  } finally {
    generating.value = false
  }
}

async function clearAiSchedule() {
  if (confirm('Clear all AI-generated schedule items?')) {
    await scheduleStore.clearAiSuggestedSchedule()
  }
}

function viewScheduleItem(item) {
  console.log('View schedule item:', item)
}

function openAddScheduleModal(date) {
  scheduleForm.value = {
    task_id: null,
    date: date || new Date().toISOString().split('T')[0],
    time_slot: 'Morning (6am-12pm)'
  }
  showScheduleModal.value = true
}

async function saveScheduleItem() {
  if (!scheduleForm.value.task_id) {
    alert('Please select a task')
    return
  }

  await scheduleStore.addScheduleItem({
    task_id: scheduleForm.value.task_id,
    date: scheduleForm.value.date,
    time_slot: scheduleForm.value.time_slot
  })
  showScheduleModal.value = false
}

async function toggleTask(taskId) {
  await tasksStore.toggleTaskComplete(taskId)
}

function viewContent(item) {
  console.log('View content:', item)
}

// Handle AI-generated content
function handleAiTitle(title) {
  console.log('AI Title:', title)
  // Could navigate to content creation or open a modal
}

function handleAiIdea(idea) {
  // Add as new content idea
  contentStore.addContent({
    title: idea.title,
    description: idea.description,
    type: 'Blog',
    stage: 'Idea',
    project_id: null,
    scheduled_date: ''
  })
}

onMounted(async () => {
  await Promise.all([
    scheduleStore.fetchSchedule(),
    tasksStore.fetchTasks(),
    contentStore.fetchContent(),
    projectsStore.fetchProjects()
  ])
})
</script>
