<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold">Settings</h1>
      <p class="text-gray-400">Configure your project tracker</p>
    </div>

    <!-- Ollama Settings -->
    <div class="card">
      <h3 class="font-semibold mb-4">AI Settings (Ollama)</h3>
      <div class="space-y-4">
        <div>
          <label class="label">Ollama URL</label>
          <input v-model="settings.ollamaUrl" type="text" class="input w-full" placeholder="http://localhost:11434" />
          <p class="text-xs text-gray-500 mt-1">The URL where Ollama is running</p>
        </div>
        <div>
          <label class="label">Model</label>
          <select v-model="settings.ollamaModel" class="select w-full">
            <option value="llama3.2">Llama 3.2 (Fast)</option>
            <option value="mistral">Mistral (Balanced)</option>
            <option value="codellama">CodeLlama (Coding)</option>
            <option value="llama2">Llama 2</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Choose the model for AI suggestions</p>
        </div>
        <div>
          <button @click="testOllamaConnection" :disabled="testingConnection" class="btn btn-secondary">
            {{ testingConnection ? 'Testing...' : 'Test Connection' }}
          </button>
          <span v-if="connectionStatus" :class="['ml-3 text-sm', connectionStatus.success ? 'text-green-400' : 'text-red-400']">
            {{ connectionStatus.message }}
          </span>
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

    <!-- Data Management -->
    <div class="card">
      <h3 class="font-semibold mb-4">Data Management</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Export Data</div>
            <p class="text-sm text-gray-500">Download all your data as JSON</p>
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
import db, { getSetting, setSetting, TIME_SLOTS } from '../services/db'
import { testConnection } from '../services/ollama'

const timeSlots = TIME_SLOTS

const settings = ref({
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  weeklyContentGoal: 1,
  workHoursPerDay: 8,
  preferredWorkTimes: ['morning', 'afternoon']
})

const testingConnection = ref(false)
const connectionStatus = ref(null)

async function loadSettings() {
  settings.value.ollamaUrl = await getSetting('ollamaUrl') || 'http://localhost:11434'
  settings.value.ollamaModel = await getSetting('ollamaModel') || 'llama3.2'
  settings.value.weeklyContentGoal = await getSetting('weeklyContentGoal') || 1
  settings.value.workHoursPerDay = await getSetting('workHoursPerDay') || 8
  settings.value.preferredWorkTimes = await getSetting('preferredWorkTimes') || ['morning', 'afternoon']
}

async function saveSettings() {
  await setSetting('ollamaUrl', settings.value.ollamaUrl)
  await setSetting('ollamaModel', settings.value.ollamaModel)
  await setSetting('weeklyContentGoal', settings.value.weeklyContentGoal)
  await setSetting('workHoursPerDay', settings.value.workHoursPerDay)
  await setSetting('preferredWorkTimes', settings.value.preferredWorkTimes)
  alert('Settings saved!')
}

async function testOllamaConnection() {
  testingConnection.value = true
  connectionStatus.value = null

  try {
    const result = await testConnection(settings.value.ollamaUrl)
    connectionStatus.value = result
  } catch (e) {
    connectionStatus.value = { success: false, message: e.message }
  } finally {
    testingConnection.value = false
  }
}

async function exportData() {
  const data = {
    projects: await db.projects.toArray(),
    content: await db.content.toArray(),
    tasks: await db.tasks.toArray(),
    schedule: await db.schedule.toArray(),
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `project-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function importData(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!confirm('This will replace all existing data. Continue?')) {
      return
    }

    // Clear existing data
    await db.projects.clear()
    await db.content.clear()
    await db.tasks.clear()
    await db.schedule.clear()

    // Import new data
    if (data.projects) await db.projects.bulkAdd(data.projects)
    if (data.content) await db.content.bulkAdd(data.content)
    if (data.tasks) await db.tasks.bulkAdd(data.tasks)
    if (data.schedule) await db.schedule.bulkAdd(data.schedule)

    alert('Data imported successfully! Please refresh the page.')
    location.reload()
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

  await db.projects.clear()
  await db.content.clear()
  await db.tasks.clear()
  await db.schedule.clear()

  alert('All data has been deleted. Please refresh the page.')
  location.reload()
}

onMounted(loadSettings)
</script>
