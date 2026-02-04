<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Projects</h1>
        <p class="text-gray-400">Manage your technical projects</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Project
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Category:</label>
        <select v-model="filterCategory" class="select text-sm">
          <option value="">All</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Status:</label>
        <select v-model="filterStatus" class="select text-sm">
          <option value="">All</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Sort:</label>
        <select v-model="sortBy" class="select text-sm">
          <option value="priority">Priority</option>
          <option value="name">Name</option>
          <option value="updated">Recently Updated</option>
          <option value="created">Recently Created</option>
        </select>
      </div>
    </div>

    <!-- Projects Grid -->
    <div v-if="filteredProjects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProjectCard
        v-for="project in filteredProjects"
        :key="project.id"
        :project="project"
        :tasks-remaining="getTasksRemaining(project.id)"
        @click="viewProject(project)"
        @edit="openEditModal"
        @delete="deleteProject"
      />
    </div>

    <div v-else class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-400 mb-2">No projects found</h3>
      <p class="text-gray-500 mb-4">Create your first project to get started</p>
      <button @click="openCreateModal" class="btn btn-primary">Create Project</button>
    </div>

    <!-- Create/Edit Modal -->
    <Modal :is-open="showModal" :title="isEditing ? 'Edit Project' : 'New Project'" @close="closeModal">
      <form @submit.prevent="saveProject" class="space-y-4">
        <div>
          <label class="label">Name *</label>
          <input v-model="form.name" type="text" class="input w-full" required />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="form.description" class="input w-full h-24" placeholder="What is this project about?"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Category</label>
            <select v-model="form.category" class="select w-full">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div>
            <label class="label">Status</label>
            <select v-model="form.status" class="select w-full">
              <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>
        </div>

        <!-- Priority Scoring -->
        <div class="border border-gray-700 rounded-lg p-4">
          <h4 class="font-medium mb-3">Priority Scoring</h4>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="label">Impact (1-5)</label>
              <input v-model.number="form.impact" type="range" min="1" max="5" class="w-full" />
              <div class="text-center text-sm text-gray-400">{{ form.impact }}</div>
            </div>
            <div>
              <label class="label">Urgency (1-5)</label>
              <input v-model.number="form.urgency" type="range" min="1" max="5" class="w-full" />
              <div class="text-center text-sm text-gray-400">{{ form.urgency }}</div>
            </div>
            <div>
              <label class="label">Effort (1-5)</label>
              <input v-model.number="form.effort" type="range" min="1" max="5" class="w-full" />
              <div class="text-center text-sm text-gray-400">{{ form.effort }}</div>
            </div>
          </div>
          <div class="text-center mt-3">
            <span class="text-gray-400">Priority Score: </span>
            <span class="font-bold text-primary-400">{{ calculatedScore }}</span>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button @click="saveProject" class="btn btn-primary">
            {{ isEditing ? 'Save Changes' : 'Create Project' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Project Detail Modal -->
    <Modal :is-open="showDetailModal" :title="selectedProject?.name || 'Project'" @close="showDetailModal = false">
      <div v-if="selectedProject" class="space-y-4">
        <div class="flex items-center gap-2">
          <span :class="['badge', `badge-${selectedProject.category?.toLowerCase() || 'other'}`]">
            {{ selectedProject.category }}
          </span>
          <span :class="['px-2 py-1 text-xs rounded', statusClass(selectedProject.status)]">
            {{ selectedProject.status }}
          </span>
        </div>

        <p v-if="selectedProject.description" class="text-gray-400">{{ selectedProject.description }}</p>

        <!-- Progress -->
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-400">Progress</span>
            <span>{{ selectedProject.progress || 0 }}%</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div
              class="bg-primary-500 h-2 rounded-full transition-all"
              :style="{ width: `${selectedProject.progress || 0}%` }"
            ></div>
          </div>
        </div>

        <!-- Tasks Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-medium">Tasks</h4>
            <button @click="openAddTask" class="text-primary-400 text-sm hover:underline">+ Add Task</button>
          </div>
          <TaskList
            :tasks="projectTasks"
            @toggle="toggleTask"
            @edit="openEditTask"
            @delete="deleteTask"
          />
        </div>

        <!-- Content Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-medium">Related Content</h4>
            <button @click="openAddContent" class="text-primary-400 text-sm hover:underline">+ Add Content</button>
          </div>
          <div v-if="projectContent.length > 0" class="space-y-2">
            <div
              v-for="item in projectContent"
              :key="item.id"
              class="flex items-center justify-between p-2 bg-gray-700 rounded"
            >
              <div>
                <span :class="['badge text-xs mr-2', contentTypeClass(item.type)]">{{ item.type }}</span>
                <span class="text-sm">{{ item.title }}</span>
              </div>
              <span class="text-xs text-gray-500">{{ item.stage }}</span>
            </div>
          </div>
          <p v-else class="text-gray-500 text-sm">No content linked to this project</p>
        </div>

        <!-- Notes Section -->
        <div class="border-t border-gray-700 pt-4">
          <NotesList
            v-if="selectedProject"
            parent-type="project"
            :parent-id="selectedProject.id"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <button @click="deleteProject(selectedProject)" class="btn btn-danger">Delete Project</button>
          <div class="flex gap-2">
            <button @click="showDetailModal = false" class="btn btn-secondary">Close</button>
            <button @click="openEditModal(selectedProject)" class="btn btn-primary">Edit</button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Add Task Modal -->
    <Modal :is-open="showTaskModal" title="Add Task" @close="showTaskModal = false">
      <form @submit.prevent="saveTask" class="space-y-4">
        <div>
          <label class="label">Title *</label>
          <input v-model="taskForm.title" type="text" class="input w-full" required />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="taskForm.description" class="input w-full h-20"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Priority</label>
            <select v-model="taskForm.priority" class="select w-full">
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="label">Due Date</label>
            <input v-model="taskForm.due_date" type="date" class="input w-full" />
          </div>
        </div>
        <div>
          <label class="label">Depends On</label>
          <select v-model="taskForm.depends_on" class="select w-full">
            <option :value="null">None</option>
            <option
              v-for="task in projectTasks.filter(t => t.id !== taskForm.id)"
              :key="task.id"
              :value="task.id"
            >
              {{ task.title }}
            </option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="showTaskModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveTask" class="btn btn-primary">{{ taskForm.id ? 'Save' : 'Add Task' }}</button>
        </div>
      </template>
    </Modal>

    <!-- Add Content Modal -->
    <Modal :is-open="showContentModal" title="Add Content" @close="showContentModal = false">
      <form @submit.prevent="saveContent" class="space-y-4">
        <div>
          <label class="label">Title *</label>
          <input v-model="contentForm.title" type="text" class="input w-full" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Type</label>
            <select v-model="contentForm.type" class="select w-full">
              <option v-for="t in contentTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="label">Scheduled Date</label>
            <input v-model="contentForm.scheduled_date" type="date" class="input w-full" />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="showContentModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveContent" class="btn btn-primary">Add Content</button>
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
import { CATEGORIES, PROJECT_STATUSES, TASK_PRIORITIES, CONTENT_TYPES, calculatePriorityScore } from '../services/db'
import ProjectCard from '../components/ProjectCard.vue'
import TaskList from '../components/TaskList.vue'
import Modal from '../components/Modal.vue'
import NotesList from '../components/NotesList.vue'

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const contentStore = useContentStore()

const categories = CATEGORIES
const statuses = PROJECT_STATUSES
const priorities = TASK_PRIORITIES
const contentTypes = CONTENT_TYPES

// Filters
const filterCategory = ref('')
const filterStatus = ref('')
const sortBy = ref('priority')

// Modal state
const showModal = ref(false)
const showDetailModal = ref(false)
const showTaskModal = ref(false)
const showContentModal = ref(false)
const isEditing = ref(false)
const selectedProject = ref(null)

// Forms
const form = ref({
  name: '',
  description: '',
  category: 'Other',
  status: 'Planning',
  impact: 3,
  urgency: 3,
  effort: 3
})

const taskForm = ref({
  title: '',
  description: '',
  priority: 'Medium',
  due_date: '',
  depends_on: null
})

const contentForm = ref({
  title: '',
  type: 'Video',
  scheduled_date: ''
})

const calculatedScore = computed(() => {
  return calculatePriorityScore(form.value.impact, form.value.urgency, form.value.effort)
})

const filteredProjects = computed(() => {
  let result = [...projectsStore.projects]

  if (filterCategory.value) {
    result = result.filter(p => p.category === filterCategory.value)
  }
  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value)
  }

  switch (sortBy.value) {
    case 'priority':
      result.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      break
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'updated':
      result.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      break
    case 'created':
      result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      break
  }

  return result
})

const projectTasks = computed(() => {
  if (!selectedProject.value) return []
  return tasksStore.tasks.filter(t => t.project_id === selectedProject.value.id)
})

const projectContent = computed(() => {
  if (!selectedProject.value) return []
  return contentStore.content.filter(c => c.project_id === selectedProject.value.id)
})

function getTasksRemaining(projectId) {
  return tasksStore.tasks.filter(t => t.project_id === projectId && !t.completed).length
}

function statusClass(status) {
  const classes = {
    'Planning': 'bg-blue-900 text-blue-200',
    'In Progress': 'bg-yellow-900 text-yellow-200',
    'On Hold': 'bg-orange-900 text-orange-200',
    'Completed': 'bg-green-900 text-green-200',
    'Archived': 'bg-gray-600 text-gray-300'
  }
  return classes[status] || 'bg-gray-600 text-gray-300'
}

function contentTypeClass(type) {
  const classes = {
    Video: 'bg-red-900 text-red-200',
    Blog: 'bg-blue-900 text-blue-200',
    Shorts: 'bg-purple-900 text-purple-200',
    Tutorial: 'bg-green-900 text-green-200'
  }
  return classes[type] || 'bg-gray-600 text-gray-300'
}

function openCreateModal() {
  isEditing.value = false
  form.value = {
    name: '',
    description: '',
    category: 'Other',
    status: 'Planning',
    impact: 3,
    urgency: 3,
    effort: 3
  }
  showModal.value = true
}

function openEditModal(project) {
  isEditing.value = true
  form.value = { ...project }
  showModal.value = true
  showDetailModal.value = false
}

function closeModal() {
  showModal.value = false
}

function viewProject(project) {
  selectedProject.value = project
  showDetailModal.value = true
}

async function saveProject() {
  if (isEditing.value && form.value.id) {
    await projectsStore.updateProject(form.value.id, form.value)
  } else {
    await projectsStore.addProject(form.value)
  }
  closeModal()
}

async function deleteProject(project) {
  if (confirm(`Delete project "${project.name}"? This will also delete all related tasks and content.`)) {
    await projectsStore.deleteProject(project.id)
    showDetailModal.value = false
  }
}

function openAddTask() {
  taskForm.value = {
    title: '',
    description: '',
    priority: 'Medium',
    due_date: '',
    depends_on: null
  }
  showTaskModal.value = true
}

function openEditTask(task) {
  taskForm.value = { ...task }
  showTaskModal.value = true
}

async function saveTask() {
  if (taskForm.value.id) {
    await tasksStore.updateTask(taskForm.value.id, taskForm.value)
  } else {
    await tasksStore.addTask({
      ...taskForm.value,
      project_id: selectedProject.value.id
    })
  }
  showTaskModal.value = false
}

async function toggleTask(taskId) {
  await tasksStore.toggleTaskComplete(taskId)
}

async function deleteTask(taskId) {
  if (confirm('Delete this task?')) {
    await tasksStore.deleteTask(taskId)
  }
}

function openAddContent() {
  contentForm.value = {
    title: '',
    type: 'Video',
    scheduled_date: ''
  }
  showContentModal.value = true
}

async function saveContent() {
  await contentStore.addContent({
    ...contentForm.value,
    project_id: selectedProject.value.id
  })
  showContentModal.value = false
}

onMounted(async () => {
  await Promise.all([
    projectsStore.fetchProjects(),
    tasksStore.fetchTasks(),
    contentStore.fetchContent()
  ])
})
</script>
