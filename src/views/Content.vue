<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Content Pipeline</h1>
        <p class="text-gray-400">Track your content through production stages</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Content
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div v-for="stage in stages" :key="stage" class="card text-center">
        <div class="text-2xl font-bold">{{ contentByStage[stage]?.length || 0 }}</div>
        <div class="text-sm text-gray-400">{{ stage }}</div>
      </div>
    </div>

    <!-- Pipeline Board -->
    <ContentPipeline
      :content="contentWithProjects"
      @update-stage="updateContentStage"
      @edit="openEditModal"
      @delete="deleteContent"
    />

    <!-- Upcoming Schedule -->
    <div class="card">
      <h3 class="font-semibold mb-4">Upcoming Releases</h3>
      <div v-if="upcomingContent.length > 0" class="space-y-2">
        <div
          v-for="item in upcomingContent"
          :key="item.id"
          class="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <span :class="['badge', typeClass(item.type)]">{{ item.type }}</span>
            <span>{{ item.title }}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-400">{{ item.stage }}</span>
            <span class="text-sm">{{ formatDate(item.scheduled_date) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-500 text-center py-4">No upcoming releases scheduled</p>
    </div>

    <!-- Create/Edit Modal -->
    <Modal :is-open="showModal" :title="isEditing ? 'Edit Content' : 'New Content'" @close="closeModal">
      <form @submit.prevent="saveContent" class="space-y-4">
        <div>
          <label class="label">Title *</label>
          <input v-model="form.title" type="text" class="input w-full" required />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="form.description" class="input w-full h-24" placeholder="What is this content about?"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Type</label>
            <select v-model="form.type" class="select w-full">
              <option v-for="t in contentTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="label">Stage</label>
            <select v-model="form.stage" class="select w-full">
              <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Linked Project</label>
            <select v-model="form.project_id" class="select w-full">
              <option :value="null">None</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Scheduled Date</label>
            <input v-model="form.scheduled_date" type="date" class="input w-full" />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button @click="saveContent" class="btn btn-primary">
            {{ isEditing ? 'Save Changes' : 'Create Content' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContentStore } from '../stores/content'
import { useProjectsStore } from '../stores/projects'
import { CONTENT_TYPES, CONTENT_STAGES } from '../services/db'
import ContentPipeline from '../components/ContentPipeline.vue'
import Modal from '../components/Modal.vue'

const contentStore = useContentStore()
const projectsStore = useProjectsStore()

const contentTypes = CONTENT_TYPES
const stages = CONTENT_STAGES

const showModal = ref(false)
const isEditing = ref(false)

const form = ref({
  title: '',
  description: '',
  type: 'Video',
  stage: 'Idea',
  project_id: null,
  scheduled_date: ''
})

const projects = computed(() => projectsStore.projects)
const contentByStage = computed(() => contentStore.contentByStage)
const upcomingContent = computed(() => contentStore.upcomingContent.slice(0, 5))

const contentWithProjects = computed(() => {
  return contentStore.content.map(item => {
    const project = projects.value.find(p => p.id === item.project_id)
    return {
      ...item,
      project_name: project?.name
    }
  })
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function openCreateModal() {
  isEditing.value = false
  form.value = {
    title: '',
    description: '',
    type: 'Video',
    stage: 'Idea',
    project_id: null,
    scheduled_date: ''
  }
  showModal.value = true
}

function openEditModal(content) {
  isEditing.value = true
  form.value = { ...content }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveContent() {
  if (isEditing.value && form.value.id) {
    await contentStore.updateContent(form.value.id, form.value)
  } else {
    await contentStore.addContent(form.value)
  }
  closeModal()
}

async function updateContentStage(contentId, stage) {
  await contentStore.updateContentStage(contentId, stage)
}

async function deleteContent(contentId) {
  if (confirm('Delete this content?')) {
    await contentStore.deleteContent(contentId)
  }
}

onMounted(async () => {
  await Promise.all([
    contentStore.fetchContent(),
    projectsStore.fetchProjects()
  ])
})
</script>
