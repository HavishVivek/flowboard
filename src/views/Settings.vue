<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold">Settings</h1>
      <p class="text-gray-400">Configure your project tracker</p>
    </div>

    <!-- AI Settings (Groq) -->
    <div class="card">
      <h3 class="font-semibold mb-4">AI Content Generation (Groq AI)</h3>
      <div class="space-y-4">
        <!-- Show configured message if env var is set -->
        <div v-if="envKeyConfigured" class="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <div class="flex items-center gap-2 text-green-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="font-medium">API Key Configured</span>
          </div>
          <p class="text-green-300/70 text-sm mt-1">
            Using API key from environment variable (VITE_GROQ_API_KEY)
          </p>
        </div>

        <!-- Show input field only if env var is not set -->
        <div v-else>
          <label class="label">Groq API Key</label>
          <input
            v-model="settings.groqApiKey"
            type="password"
            class="input w-full"
            placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p class="text-xs text-gray-500 mt-1">
            Get a free API key at
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="text-primary-400 hover:underline">console.groq.com/keys</a>
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="testGroqConnection"
            :disabled="testingConnection || (!settings.groqApiKey && !envKeyConfigured)"
            class="btn btn-secondary"
          >
            {{ testingConnection ? 'Testing...' : 'Test Connection' }}
          </button>
          <span
            v-if="connectionStatus"
            :class="[
              'text-sm',
              connectionStatus.success ? 'text-green-400' : 'text-red-400'
            ]"
          >
            {{ connectionStatus.message }}
          </span>
        </div>

        <!-- API Key Instructions (only show if not using env var) -->
        <div v-if="!envKeyConfigured" class="bg-gray-700/50 rounded-lg p-4 mt-4">
          <h4 class="font-medium text-sm mb-2">How to get your FREE Groq API key:</h4>
          <ol class="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://console.groq.com/keys" target="_blank" class="text-primary-400 hover:underline">console.groq.com/keys</a></li>
            <li>Sign up with Google/GitHub (completely free!)</li>
            <li>Click "Create API Key"</li>
            <li>Give it a name (e.g., "content-generator")</li>
            <li>Copy the key (starts with "gsk_") and paste above</li>
          </ol>
          <div class="mt-3 pt-3 border-t border-gray-600">
            <p class="text-xs text-green-400 font-medium">
              Why Groq? Super fast, reliable, and 100% FREE!
            </p>
            <p class="text-xs text-gray-400 mt-2">
              <strong>Tip:</strong> You can also set the key in a <code class="bg-gray-800 px-1 rounded">.env</code> file:
            </p>
            <code class="text-xs text-primary-400 block mt-1">VITE_GROQ_API_KEY=gsk_your_token</code>
          </div>
        </div>
      </div>
    </div>

    <!-- Productivity Settings -->
    <div class="card">
      <h3 class="font-semibold mb-4">Productivity Goals</h3>
      <div class="space-y-4">
        <div>
          <label class="label">Weekly Content Goal</label>
          <input v-model.number="settings.weeklyContentGoal" type="number" min="0" max="20" class="input w-full" />
          <p class="text-xs text-gray-500 mt-1">How many content pieces you want to publish per week</p>
        </div>
        <div>
          <label class="label">Work Hours Per Day</label>
          <input v-model.number="settings.workHoursPerDay" type="number" min="1" max="16" class="input w-full" />
          <p class="text-xs text-gray-500 mt-1">Available hours for project work each day</p>
        </div>
        <div>
          <label class="label">Preferred Work Times</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <label
              v-for="slot in timeSlots"
              :key="slot.id"
              :class="[
                'px-3 py-2 rounded-lg cursor-pointer border transition-colors',
                settings.preferredWorkTimes?.includes(slot.id)
                  ? 'bg-primary-600 border-primary-500'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              ]"
            >
              <input
                type="checkbox"
                :value="slot.id"
                v-model="settings.preferredWorkTimes"
                class="sr-only"
              />
              {{ slot.label }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Migration (from Dexie) -->
    <div v-if="hasDexieDataAvailable" class="card border-2 border-yellow-600">
      <h3 class="font-semibold mb-4 text-yellow-400">Migrate Local Data</h3>
      <p class="text-sm text-gray-400 mb-4">
        We found local data from a previous version. You can migrate this data to your cloud account.
      </p>
      <div v-if="migrationStatus" class="mb-4 p-3 rounded-lg" :class="migrationStatus.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'">
        <p :class="migrationStatus.success ? 'text-green-400' : 'text-red-400'">{{ migrationStatus.message }}</p>
        <div v-if="migrationResult" class="mt-2 text-sm text-gray-400">
          <p>Projects: {{ migrationResult.projects.migrated }}/{{ migrationResult.projects.total }}</p>
          <p>Content: {{ migrationResult.content.migrated }}/{{ migrationResult.content.total }}</p>
          <p>Tasks: {{ migrationResult.tasks.migrated }}/{{ migrationResult.tasks.total }}</p>
          <p>Schedule: {{ migrationResult.schedule.migrated }}/{{ migrationResult.schedule.total }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="startMigration"
          :disabled="migrating"
          class="btn btn-primary"
        >
          {{ migrating ? migrationProgress : 'Migrate to Cloud' }}
        </button>
        <button
          @click="exportLocalData"
          class="btn btn-secondary"
        >
          Export as JSON
        </button>
      </div>
    </div>

    <!-- Data Management -->
    <div class="card">
      <h3 class="font-semibold mb-4">Data Management</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Export Data</div>
            <p class="text-sm text-gray-500">Download all your cloud data as JSON</p>
          </div>
          <button @click="exportData" class="btn btn-secondary">Export</button>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Import Data</div>
            <p class="text-sm text-gray-500">Restore from a JSON backup</p>
          </div>
          <label class="btn btn-secondary cursor-pointer">
            Import
            <input type="file" accept=".json" @change="importData" class="sr-only" />
          </label>
        </div>
        <div class="flex items-center justify-between border-t border-gray-700 pt-4">
          <div>
            <div class="font-medium text-red-400">Clear All Data</div>
            <p class="text-sm text-gray-500">Permanently delete all projects, tasks, and content</p>
          </div>
          <button @click="clearAllData" class="btn btn-danger">Clear Data</button>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end">
      <button @click="saveSettings" class="btn btn-primary">Save Settings</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { TIME_SLOTS } from '../services/db'
import { testConnection } from '../services/groqAI'
import { useAuthStore } from '../stores/auth'
import { useProjectsStore } from '../stores/projects'
import { useContentStore } from '../stores/content'
import { useTasksStore } from '../stores/tasks'
import { useScheduleStore } from '../stores/schedule'
import { settingsService, projectsService, contentService, tasksService, scheduleService } from '../services/firestore'
import { hasDexieData, migrateToFirestore, exportDexieData, downloadAsJson, clearDexieData } from '../services/migration'

const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const contentStore = useContentStore()
const tasksStore = useTasksStore()
const scheduleStore = useScheduleStore()

const { userId } = storeToRefs(authStore)

// Check if API key is set via environment variable
const envKeyConfigured = !!import.meta.env.VITE_GROQ_API_KEY

const timeSlots = TIME_SLOTS

const settings = ref({
  groqApiKey: '',
  weeklyContentGoal: 1,
  workHoursPerDay: 8,
  preferredWorkTimes: ['morning', 'afternoon']
})

const testingConnection = ref(false)
const connectionStatus = ref(null)

// Migration state
const hasDexieDataAvailable = ref(false)
const migrating = ref(false)
const migrationProgress = ref('')
const migrationStatus = ref(null)
const migrationResult = ref(null)

async function loadSettings() {
  if (!userId.value) return

  try {
    const allSettings = await settingsService.getAll(userId.value)
    for (const setting of allSettings) {
      if (setting.key === 'groqApiKey') settings.value.groqApiKey = setting.value || ''
      if (setting.key === 'weeklyContentGoal') settings.value.weeklyContentGoal = setting.value || 1
      if (setting.key === 'workHoursPerDay') settings.value.workHoursPerDay = setting.value || 8
      if (setting.key === 'preferredWorkTimes') settings.value.preferredWorkTimes = setting.value || ['morning', 'afternoon']
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }
}

async function saveSettings() {
  if (!userId.value) return

  try {
    // Get existing settings to find their IDs
    const allSettings = await settingsService.getAll(userId.value)
    const settingsMap = new Map(allSettings.map(s => [s.key, s]))

    const settingsToSave = [
      { key: 'groqApiKey', value: settings.value.groqApiKey },
      { key: 'weeklyContentGoal', value: settings.value.weeklyContentGoal },
      { key: 'workHoursPerDay', value: settings.value.workHoursPerDay },
      { key: 'preferredWorkTimes', value: settings.value.preferredWorkTimes }
    ]

    for (const setting of settingsToSave) {
      const existing = settingsMap.get(setting.key)
      if (existing) {
        await settingsService.update(userId.value, existing.id, { value: setting.value })
      } else {
        await settingsService.add(userId.value, setting)
      }
    }

    alert('Settings saved!')
  } catch (e) {
    alert('Failed to save settings: ' + e.message)
  }
}

async function testGroqConnection() {
  if (!settings.value.groqApiKey && !envKeyConfigured) {
    connectionStatus.value = { success: false, message: 'Please enter an API key first' }
    return
  }

  testingConnection.value = true
  connectionStatus.value = null

  // Save the API key first so the test can use it
  await saveSettings()

  try {
    connectionStatus.value = await testConnection()
  } catch (e) {
    connectionStatus.value = { success: false, message: e.message }
  } finally {
    testingConnection.value = false
  }
}

async function checkDexieData() {
  hasDexieDataAvailable.value = await hasDexieData()
}

async function startMigration() {
  if (!userId.value) return

  migrating.value = true
  migrationStatus.value = null
  migrationResult.value = null

  try {
    const result = await migrateToFirestore(userId.value, (progress) => {
      migrationProgress.value = progress
    })

    migrationResult.value = result
    migrationStatus.value = {
      success: true,
      message: 'Migration completed successfully!'
    }

    // Clear Dexie data after successful migration
    await clearDexieData()
    hasDexieDataAvailable.value = false

    // Refresh stores
    await Promise.all([
      projectsStore.fetchProjects(),
      contentStore.fetchContent(),
      tasksStore.fetchTasks(),
      scheduleStore.fetchSchedule()
    ])
  } catch (e) {
    migrationStatus.value = {
      success: false,
      message: 'Migration failed: ' + e.message
    }
  } finally {
    migrating.value = false
    migrationProgress.value = ''
  }
}

async function exportLocalData() {
  try {
    const data = await exportDexieData()
    downloadAsJson(data, `project-tracker-local-backup-${new Date().toISOString().split('T')[0]}.json`)
  } catch (e) {
    alert('Failed to export local data: ' + e.message)
  }
}

async function exportData() {
  if (!userId.value) return

  try {
    const data = {
      projects: projectsStore.projects,
      content: contentStore.content,
      tasks: tasksStore.tasks,
      schedule: scheduleStore.scheduleItems,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Failed to export data: ' + e.message)
  }
}

async function importData(event) {
  const file = event.target.files[0]
  if (!file || !userId.value) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!confirm('This will add imported data to your existing data. Continue?')) {
      return
    }

    // Import data
    if (data.projects) {
      for (const project of data.projects) {
        delete project.id
        await projectsService.add(userId.value, project)
      }
    }
    if (data.content) {
      for (const item of data.content) {
        delete item.id
        await contentService.add(userId.value, item)
      }
    }
    if (data.tasks) {
      for (const task of data.tasks) {
        delete task.id
        await tasksService.add(userId.value, task)
      }
    }
    if (data.schedule) {
      for (const item of data.schedule) {
        delete item.id
        await scheduleService.add(userId.value, item)
      }
    }

    alert('Data imported successfully!')
  } catch (e) {
    alert('Failed to import data: ' + e.message)
  }
}

async function clearAllData() {
  if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
    return
  }

  if (!confirm('This is your last chance. Delete everything?')) {
    return
  }

  if (!userId.value) return

  try {
    // Delete all data from Firestore
    const projects = await projectsService.getAll(userId.value)
    const content = await contentService.getAll(userId.value)
    const tasks = await tasksService.getAll(userId.value)
    const schedule = await scheduleService.getAll(userId.value)

    if (projects.length > 0) await projectsService.bulkDelete(userId.value, projects.map(p => p.id))
    if (content.length > 0) await contentService.bulkDelete(userId.value, content.map(c => c.id))
    if (tasks.length > 0) await tasksService.bulkDelete(userId.value, tasks.map(t => t.id))
    if (schedule.length > 0) await scheduleService.bulkDelete(userId.value, schedule.map(s => s.id))

    alert('All data has been deleted.')
  } catch (e) {
    alert('Failed to clear data: ' + e.message)
  }
}

onMounted(async () => {
  await loadSettings()
  await checkDexieData()
})
</script>
