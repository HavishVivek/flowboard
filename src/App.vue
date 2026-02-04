<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Auth page (no sidebar) -->
    <template v-if="!authStore.isAuthenticated">
      <router-view />
    </template>

    <!-- Main app layout with sidebar -->
    <template v-else>
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 flex flex-col z-40">
      <!-- Logo -->
      <div class="p-4 border-b border-gray-700">
        <h1 class="text-xl font-bold text-primary-400">Project Tracker</h1>
        <p class="text-xs text-gray-500">AI-Powered Productivity</p>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <ul class="space-y-1">
          <li v-for="item in navItems" :key="item.path">
            <router-link
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive(item.path)
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5" />
              {{ item.name }}
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- Quick Stats -->
      <div class="p-4 border-t border-gray-700">
        <div class="text-xs text-gray-500 mb-2">Quick Stats</div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="bg-gray-700 rounded p-2">
            <div class="font-bold">{{ stats.projects }}</div>
            <div class="text-xs text-gray-400">Projects</div>
          </div>
          <div class="bg-gray-700 rounded p-2">
            <div class="font-bold">{{ stats.tasks }}</div>
            <div class="text-xs text-gray-400">Tasks</div>
          </div>
        </div>
      </div>

      <!-- User Info & Logout -->
      <div class="p-4 border-t border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
            {{ userInitial }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ authStore.userEmail }}</div>
          </div>
          <button
            @click="handleLogout"
            class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Sign out"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="ml-64 p-6">
      <router-view />
    </main>
    </template>

    <!-- Quick Capture Shortcut (Cmd/Ctrl + K) -->
    <div v-if="showQuickCapture" class="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50" @click.self="showQuickCapture = false">
      <div class="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div class="p-4">
          <input
            ref="quickInput"
            v-model="quickCaptureText"
            @keydown.enter="submitQuickCapture"
            @keydown.esc="showQuickCapture = false"
            type="text"
            placeholder="Quick capture... (Press Enter to add as task)"
            class="input w-full text-lg"
          />
          <div class="flex gap-2 mt-3 text-xs text-gray-500">
            <span class="px-2 py-1 bg-gray-700 rounded">Enter</span> to add task
            <span class="px-2 py-1 bg-gray-700 rounded">Esc</span> to close
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, h, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from './stores/projects'
import { useTasksStore } from './stores/tasks'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const authStore = useAuthStore()

const userInitial = computed(() => {
  const email = authStore.userEmail
  return email ? email.charAt(0).toUpperCase() : '?'
})

async function handleLogout() {
  await authStore.logoutUser()
  router.push('/auth')
}

const showQuickCapture = ref(false)
const quickCaptureText = ref('')
const quickInput = ref(null)

// Icon components
const DashboardIcon = {
  render() {
    return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
    ])
  }
}

const ProjectsIcon = {
  render() {
    return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' })
    ])
  }
}

const ContentIcon = {
  render() {
    return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' })
    ])
  }
}

const CalendarIcon = {
  render() {
    return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
    ])
  }
}

const SettingsIcon = {
  render() {
    return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
    ])
  }
}

const AnalyticsIcon = {
  render() {
    return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
    ])
  }
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: DashboardIcon },
  { name: 'Projects', path: '/projects', icon: ProjectsIcon },
  { name: 'Content', path: '/content', icon: ContentIcon },
  { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
  { name: 'Analytics', path: '/analytics', icon: AnalyticsIcon },
  { name: 'Settings', path: '/settings', icon: SettingsIcon }
]

const stats = computed(() => ({
  projects: projectsStore.projects.length,
  tasks: tasksStore.incompleteTasks.length
}))

function isActive(path) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

function handleKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showQuickCapture.value = !showQuickCapture.value
    if (showQuickCapture.value) {
      nextTick(() => quickInput.value?.focus())
    }
  }
}

async function submitQuickCapture() {
  if (!quickCaptureText.value.trim()) return

  await tasksStore.addTask({
    title: quickCaptureText.value.trim(),
    priority: 'Medium'
  })

  quickCaptureText.value = ''
  showQuickCapture.value = false
}

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await projectsStore.fetchProjects()
    await tasksStore.fetchTasks()
  }
  window.addEventListener('keydown', handleKeydown)
})

// Fetch data when user logs in
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await projectsStore.fetchProjects()
    await tasksStore.fetchTasks()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
