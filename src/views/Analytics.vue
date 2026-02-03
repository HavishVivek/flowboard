<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold">Analytics</h1>
        <p class="text-gray-400">Track your productivity and progress</p>
      </div>
      <button
        @click="showReportModal = true"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Generate Report
      </button>
    </div>

    <!-- Time Range Selector -->
    <div class="flex gap-2">
      <button
        v-for="range in timeRanges"
        :key="range.value"
        @click="selectedRange = range.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm transition-colors',
          selectedRange === range.value
            ? 'bg-primary-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        ]"
      >
        {{ range.label }}
      </button>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-gray-400 text-sm">Tasks Completed</div>
        <div class="text-3xl font-bold mt-1 text-green-400">{{ stats.tasksCompleted }}</div>
        <div class="text-xs text-gray-500 mt-1">{{ selectedRangeLabel }}</div>
      </div>
      <div class="card">
        <div class="text-gray-400 text-sm">Completion Rate</div>
        <div class="text-3xl font-bold mt-1">{{ stats.completionRate }}%</div>
        <div class="text-xs text-gray-500 mt-1">of all tasks</div>
      </div>
      <div class="card">
        <div class="text-gray-400 text-sm">Content Published</div>
        <div class="text-3xl font-bold mt-1 text-purple-400">{{ stats.contentPublished }}</div>
        <div class="text-xs text-gray-500 mt-1">{{ selectedRangeLabel }}</div>
      </div>
      <div class="card">
        <div class="text-gray-400 text-sm">Projects Active</div>
        <div class="text-3xl font-bold mt-1 text-blue-400">{{ stats.projectsActive }}</div>
        <div class="text-xs text-gray-500 mt-1">currently in progress</div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Tasks by Priority -->
      <div class="card">
        <h3 class="font-semibold mb-4">Tasks by Priority</h3>
        <div class="space-y-3">
          <div v-for="priority in priorityStats" :key="priority.name">
            <div class="flex justify-between text-sm mb-1">
              <span>{{ priority.name }}</span>
              <span class="text-gray-400">{{ priority.count }} ({{ priority.completed }} done)</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-3">
              <div
                :class="['h-3 rounded-full', priority.colorClass]"
                :style="{ width: `${priority.percentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content by Type -->
      <div class="card">
        <h3 class="font-semibold mb-4">Content by Type</h3>
        <div class="space-y-3">
          <div v-for="type in contentTypeStats" :key="type.name">
            <div class="flex justify-between text-sm mb-1">
              <span>{{ type.name }}</span>
              <span class="text-gray-400">{{ type.count }} pieces</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-3">
              <div
                :class="['h-3 rounded-full', type.colorClass]"
                :style="{ width: `${type.percentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Projects by Category -->
      <div class="card">
        <h3 class="font-semibold mb-4">Projects by Category</h3>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="cat in categoryStats"
            :key="cat.name"
            class="bg-gray-700 rounded-lg p-3"
          >
            <div class="flex items-center gap-2 mb-2">
              <span :class="['w-3 h-3 rounded-full', cat.dotClass]"></span>
              <span class="text-sm">{{ cat.name }}</span>
            </div>
            <div class="text-2xl font-bold">{{ cat.count }}</div>
            <div class="text-xs text-gray-500">{{ cat.percentage }}% of total</div>
          </div>
        </div>
      </div>

      <!-- Content Pipeline Status -->
      <div class="card">
        <h3 class="font-semibold mb-4">Content Pipeline Status</h3>
        <div class="space-y-3">
          <div v-for="stage in pipelineStats" :key="stage.name">
            <div class="flex justify-between text-sm mb-1">
              <span>{{ stage.name }}</span>
              <span class="text-gray-400">{{ stage.count }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-3">
              <div
                class="h-3 rounded-full bg-primary-500"
                :style="{ width: `${stage.percentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <h3 class="font-semibold mb-4">Recent Activity</h3>
      <div v-if="recentActivity.length > 0" class="space-y-3">
        <div
          v-for="(activity, index) in recentActivity"
          :key="index"
          class="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg"
        >
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center', activity.iconBg]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="activity.type === 'task'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              <path v-else-if="activity.type === 'project'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm">{{ activity.text }}</div>
            <div class="text-xs text-gray-500">{{ activity.date }}</div>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-500 text-center py-4">No recent activity</p>
    </div>

    <!-- Weekly Report Modal -->
    <WeeklyReport :isOpen="showReportModal" @close="showReportModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectsStore } from '../stores/projects'
import { useTasksStore } from '../stores/tasks'
import { useContentStore } from '../stores/content'
import { CATEGORIES, CONTENT_TYPES, CONTENT_STAGES, TASK_PRIORITIES } from '../services/db'
import WeeklyReport from '../components/WeeklyReport.vue'

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const contentStore = useContentStore()

const selectedRange = ref('week')
const showReportModal = ref(false)

const timeRanges = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' }
]

const selectedRangeLabel = computed(() => {
  const range = timeRanges.find(r => r.value === selectedRange.value)
  return range?.label.toLowerCase() || ''
})

const stats = computed(() => {
  const tasks = tasksStore.tasks
  const projects = projectsStore.projects
  const content = contentStore.content

  const completedTasks = tasks.filter(t => t.completed)
  const publishedContent = content.filter(c => c.stage === 'Published')

  return {
    tasksCompleted: completedTasks.length,
    completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    contentPublished: publishedContent.length,
    projectsActive: projects.filter(p => p.status === 'In Progress').length
  }
})

const priorityStats = computed(() => {
  const tasks = tasksStore.tasks
  const colors = {
    Critical: 'bg-red-500',
    High: 'bg-orange-500',
    Medium: 'bg-yellow-500',
    Low: 'bg-gray-500'
  }

  return TASK_PRIORITIES.map(priority => {
    const priorityTasks = tasks.filter(t => t.priority === priority)
    const completed = priorityTasks.filter(t => t.completed).length
    return {
      name: priority,
      count: priorityTasks.length,
      completed,
      percentage: tasks.length > 0 ? Math.round((priorityTasks.length / tasks.length) * 100) : 0,
      colorClass: colors[priority]
    }
  })
})

const contentTypeStats = computed(() => {
  const content = contentStore.content
  const colors = {
    Video: 'bg-red-500',
    Blog: 'bg-blue-500',
    Shorts: 'bg-purple-500',
    Tutorial: 'bg-green-500'
  }

  const maxCount = Math.max(...CONTENT_TYPES.map(type =>
    content.filter(c => c.type === type).length
  ), 1)

  return CONTENT_TYPES.map(type => {
    const typeContent = content.filter(c => c.type === type)
    return {
      name: type,
      count: typeContent.length,
      percentage: Math.round((typeContent.length / maxCount) * 100),
      colorClass: colors[type]
    }
  })
})

const categoryStats = computed(() => {
  const projects = projectsStore.projects
  const colors = {
    IoT: 'bg-blue-500',
    AI: 'bg-purple-500',
    ML: 'bg-pink-500',
    Electronics: 'bg-green-500',
    Other: 'bg-gray-500'
  }

  return CATEGORIES.map(category => {
    const catProjects = projects.filter(p => p.category === category)
    return {
      name: category,
      count: catProjects.length,
      percentage: projects.length > 0 ? Math.round((catProjects.length / projects.length) * 100) : 0,
      dotClass: colors[category]
    }
  })
})

const pipelineStats = computed(() => {
  const content = contentStore.content
  const maxCount = Math.max(...CONTENT_STAGES.map(stage =>
    content.filter(c => c.stage === stage).length
  ), 1)

  return CONTENT_STAGES.map(stage => {
    const stageContent = content.filter(c => c.stage === stage)
    return {
      name: stage,
      count: stageContent.length,
      percentage: Math.round((stageContent.length / maxCount) * 100)
    }
  })
})

const recentActivity = computed(() => {
  const activities = []

  // Add completed tasks
  tasksStore.tasks
    .filter(t => t.completed)
    .slice(0, 5)
    .forEach(task => {
      activities.push({
        type: 'task',
        text: `Completed task: ${task.title}`,
        date: 'Recently',
        iconBg: 'bg-green-900 text-green-400'
      })
    })

  // Add published content
  contentStore.content
    .filter(c => c.stage === 'Published')
    .slice(0, 3)
    .forEach(content => {
      activities.push({
        type: 'content',
        text: `Published: ${content.title}`,
        date: content.published_date || 'Recently',
        iconBg: 'bg-purple-900 text-purple-400'
      })
    })

  // Add recent projects
  projectsStore.projects
    .slice(0, 2)
    .forEach(project => {
      activities.push({
        type: 'project',
        text: `Project: ${project.name} (${project.status})`,
        date: 'Active',
        iconBg: 'bg-blue-900 text-blue-400'
      })
    })

  return activities.slice(0, 10)
})

onMounted(async () => {
  await Promise.all([
    projectsStore.fetchProjects(),
    tasksStore.fetchTasks(),
    contentStore.fetchContent()
  ])
})
</script>
