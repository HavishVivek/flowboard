<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-gray-400">{{ greeting }}, here's your overview</p>
      </div>
      <button @click="showQuickCapture = true" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Quick Capture
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-gray-400 text-sm">Active Projects</div>
        <div class="text-2xl font-bold mt-1">{{ stats.activeProjects }}</div>
      </div>
      <div class="card">
        <div class="text-gray-400 text-sm">Tasks Due Today</div>
        <div class="text-2xl font-bold mt-1" :class="stats.tasksDueToday > 0 ? 'text-yellow-400' : ''">
          {{ stats.tasksDueToday }}
        </div>
      </div>
      <div class="card">
        <div class="text-gray-400 text-sm">Overdue Tasks</div>
        <div class="text-2xl font-bold mt-1" :class="stats.overdueTasks > 0 ? 'text-red-400' : ''">
          {{ stats.overdueTasks }}
        </div>
      </div>
      <div class="card">
        <div class="text-gray-400 text-sm">Content in Pipeline</div>
        <div class="text-2xl font-bold mt-1">{{ stats.contentInPipeline }}</div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Projects & Tasks -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Recent Projects -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Active Projects</h2>
            <router-link to="/projects" class="text-primary-400 text-sm hover:underline">
              View all
            </router-link>
          </div>
          <div v-if="recentProjects.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ProjectCard
              v-for="project in recentProjects"
              :key="project.id"
              :project="project"
              :tasks-remaining="getTasksRemaining(project.id)"
              @click="$router.push(`/projects/${project.id}`)"
              @edit="editProject"
              @delete="deleteProject"
            />
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            No projects yet. Create one to get started!
          </div>
        </div>

        <!-- Tasks Due Soon -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Tasks Due Soon</h2>
          </div>
          <TaskList
            :tasks="upcomingTasks"
            @toggle="toggleTask"
            @edit="editTask"
            @delete="deleteTask"
          />
        </div>
      </div>

      <!-- Right Column: AI & Priority -->
      <div class="space-y-6">
        <!-- AI Suggestions -->
        <AiSuggestions
          :suggestions="aiSuggestions"
          :loading="aiLoading"
          :error="aiError"
          :time-context="timeContext"
          @refresh="fetchAiSuggestions"
          @select="handleAiSuggestion"
        />

        <!-- Priority Matrix -->
        <PriorityMatrix
          :items="projectsWithPriority"
          @item-click="(item) => $router.push(`/projects/${item.id}`)"
        />

        <!-- Content Pipeline Preview -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Content Pipeline</h2>
            <router-link to="/content" class="text-primary-400 text-sm hover:underline">
              View all
            </router-link>
          </div>
          <div class="space-y-2">
            <div v-for="stage in contentStages" :key="stage" class="flex items-center justify-between text-sm">
              <span class="text-gray-400">{{ stage }}</span>
              <span class="font-medium">{{ contentByStage[stage]?.length || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Capture Modal -->
    <QuickCapture
      :is-open="showQuickCapture"
      :projects="projects"
      @close="showQuickCapture = false"
      @create="handleQuickCreate"
    />

    <!-- Edit Project Modal -->
    <Modal :is-open="showEditProject" title="Edit Project" @close="showEditProject = false">
      <form @submit.prevent="saveProject" class="space-y-4">
        <div>
          <label class="label">Name</label>
          <input v-model="editingProject.name" type="text" class="input w-full" required />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="editingProject.description" class="input w-full h-24"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Category</label>
            <select v-model="editingProject.category" class="select w-full">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div>
            <label class="label">Status</label>
            <select v-model="editingProject.status" class="select w-full">
              <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="label">Impact (1-5)</label>
            <input v-model.number="editingProject.impact" type="number" min="1" max="5" class="input w-full" />
          </div>
          <div>
            <label class="label">Urgency (1-5)</label>
            <input v-model.number="editingProject.urgency" type="number" min="1" max="5" class="input w-full" />
          </div>
          <div>
            <label class="label">Effort (1-5)</label>
            <input v-model.number="editingProject.effort" type="number" min="1" max="5" class="input w-full" />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="showEditProject = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveProject" class="btn btn-primary">Save</button>
        </div>
      </template>
    </Modal>

    <!-- Edit Task Modal -->
    <Modal :is-open="showEditTask" title="Edit Task" @close="showEditTask = false">
      <form @submit.prevent="saveTask" class="space-y-4">
        <div>
          <label class="label">Title</label>
          <input v-model="editingTask.title" type="text" class="input w-full" required />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="editingTask.description" class="input w-full h-24"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Priority</label>
            <select v-model="editingTask.priority" class="select w-full">
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="label">Due Date</label>
            <input v-model="editingTask.due_date" type="date" class="input w-full" />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="showEditTask = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveTask" class="btn btn-primary">Save</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectsStore } from '../stores/projects'
import { useTasksStore } from '../stores/tasks'
import { useContentStore } from '../stores/content'
import { CATEGORIES, PROJECT_STATUSES, TASK_PRIORITIES, CONTENT_STAGES } from '../services/db'
import { getTaskSuggestions } from '../services/ai'
import ProjectCard from '../components/ProjectCard.vue'
import TaskList from '../components/TaskList.vue'
import QuickCapture from '../components/QuickCapture.vue'
import Modal from '../components/Modal.vue'
import PriorityMatrix from '../components/PriorityMatrix.vue'
import AiSuggestions from '../components/AiSuggestions.vue'

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const contentStore = useContentStore()

const categories = CATEGORIES
const statuses = PROJECT_STATUSES
const priorities = TASK_PRIORITIES
const contentStages = CONTENT_STAGES

const showQuickCapture = ref(false)
const showEditProject = ref(false)
const showEditTask = ref(false)
const editingProject = ref({})
const editingTask = ref({})

// AI State
const aiSuggestions = ref([])
const aiLoading = ref(false)
const aiError = ref(null)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const timeContext = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning session - high energy tasks recommended'
  if (hour < 17) return 'Afternoon - balanced productivity'
  return 'Evening - lighter tasks or planning'
})

const stats = computed(() => ({
  activeProjects: projectsStore.activeProjects.length,
  tasksDueToday: tasksStore.tasksDueToday.length,
  overdueTasks: tasksStore.overdueTasks.length,
  contentInPipeline: contentStore.content.filter(c => c.stage !== 'Published').length
}))

const projects = computed(() => projectsStore.projects)
const recentProjects = computed(() => projectsStore.activeProjects.slice(0, 4))
const projectsWithPriority = computed(() =>
  projectsStore.projects.filter(p => p.status !== 'Completed' && p.status !== 'Archived')
)
const contentByStage = computed(() => contentStore.contentByStage)

const upcomingTasks = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  return tasksStore.tasks
    .filter(t => !t.completed && t.due_date && t.due_date <= nextWeekStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)
})

function getTasksRemaining(projectId) {
  return tasksStore.tasks.filter(t => t.project_id === projectId && !t.completed).length
}

async function fetchAiSuggestions() {
  aiLoading.value = true
  aiError.value = null

  try {
    const tasks = tasksStore.incompleteTasks
    const projects = projectsStore.activeProjects

    aiSuggestions.value = await getTaskSuggestions(tasks, projects)
  } catch (e) {
    aiError.value = e.message || 'Failed to get AI suggestions'
    aiSuggestions.value = []
  } finally {
    aiLoading.value = false
  }
}

function handleAiSuggestion(suggestion) {
  if (suggestion.task_id) {
    // Navigate to task or mark as current focus
    console.log('Selected task:', suggestion.task_id)
  }
}

async function handleQuickCreate(data) {
  if (data.type === 'project') {
    await projectsStore.addProject({
      name: data.title,
      description: data.description,
      category: data.category
    })
  } else if (data.type === 'content') {
    await contentStore.addContent({
      title: data.title,
      description: data.description,
      project_id: data.project_id,
      type: data.content_type
    })
  } else if (data.type === 'task') {
    await tasksStore.addTask({
      title: data.title,
      description: data.description,
      project_id: data.project_id,
      priority: data.priority,
      due_date: data.due_date
    })
  }
}

function editProject(project) {
  editingProject.value = { ...project }
  showEditProject.value = true
}

async function saveProject() {
  if (editingProject.value.id) {
    await projectsStore.updateProject(editingProject.value.id, editingProject.value)
  }
  showEditProject.value = false
}

async function deleteProject(project) {
  if (confirm(`Delete project "${project.name}"? This will also delete all related tasks and content.`)) {
    await projectsStore.deleteProject(project.id)
  }
}

function editTask(task) {
  editingTask.value = { ...task }
  showEditTask.value = true
}

async function saveTask() {
  if (editingTask.value.id) {
    await tasksStore.updateTask(editingTask.value.id, editingTask.value)
  }
  showEditTask.value = false
}

async function toggleTask(taskId) {
  await tasksStore.toggleTaskComplete(taskId)
}

async function deleteTask(taskId) {
  if (confirm('Delete this task?')) {
    await tasksStore.deleteTask(taskId)
  }
}

onMounted(async () => {
  await Promise.all([
    projectsStore.fetchProjects(),
    tasksStore.fetchTasks(),
    contentStore.fetchContent()
  ])
})
</script>
