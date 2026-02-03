<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
      @click.self="close"
    >
      <div class="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-lg font-semibold">Quick Capture</h2>
          <button @click="close" class="text-gray-400 hover:text-gray-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Type Selector -->
        <div class="flex border-b border-gray-700">
          <button
            v-for="type in captureTypes"
            :key="type.id"
            @click="selectedType = type.id"
            :class="[
              'flex-1 py-3 text-sm font-medium transition-colors',
              selectedType === type.id
                ? 'bg-gray-700 text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-200'
            ]"
          >
            {{ type.label }}
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
          <!-- Title -->
          <div>
            <input
              ref="titleInput"
              v-model="form.title"
              type="text"
              :placeholder="titlePlaceholder"
              class="input w-full text-lg"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <textarea
              v-model="form.description"
              placeholder="Description (optional)"
              class="input w-full h-24 resize-none"
            ></textarea>
          </div>

          <!-- Project Selector (for Content and Tasks) -->
          <div v-if="selectedType !== 'project'">
            <label class="label">Link to Project</label>
            <select v-model="form.project_id" class="select w-full">
              <option :value="null">No project</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <!-- Category (for Projects) -->
          <div v-if="selectedType === 'project'">
            <label class="label">Category</label>
            <select v-model="form.category" class="select w-full">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <!-- Content Type (for Content) -->
          <div v-if="selectedType === 'content'">
            <label class="label">Content Type</label>
            <select v-model="form.content_type" class="select w-full">
              <option v-for="type in contentTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>

          <!-- Priority (for Tasks) -->
          <div v-if="selectedType === 'task'">
            <label class="label">Priority</label>
            <select v-model="form.priority" class="select w-full">
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <!-- Due Date (for Tasks) -->
          <div v-if="selectedType === 'task'">
            <label class="label">Due Date</label>
            <input v-model="form.due_date" type="date" class="input w-full" />
          </div>

          <!-- Submit -->
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="close" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Create {{ selectedType }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { CATEGORIES, CONTENT_TYPES, TASK_PRIORITIES } from '../services/db'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  projects: {
    type: Array,
    default: () => []
  },
  initialType: {
    type: String,
    default: 'project'
  }
})

const emit = defineEmits(['close', 'create'])

const titleInput = ref(null)
const selectedType = ref(props.initialType)
const categories = CATEGORIES
const contentTypes = CONTENT_TYPES
const priorities = TASK_PRIORITIES

const captureTypes = [
  { id: 'project', label: 'Project' },
  { id: 'content', label: 'Content' },
  { id: 'task', label: 'Task' }
]

const form = ref({
  title: '',
  description: '',
  category: 'Other',
  project_id: null,
  content_type: 'Video',
  priority: 'Medium',
  due_date: ''
})

const titlePlaceholder = computed(() => {
  const placeholders = {
    project: 'Project name...',
    content: 'Content title...',
    task: 'Task title...'
  }
  return placeholders[selectedType.value]
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    selectedType.value = props.initialType
    resetForm()
    await nextTick()
    titleInput.value?.focus()
  }
})

function resetForm() {
  form.value = {
    title: '',
    description: '',
    category: 'Other',
    project_id: null,
    content_type: 'Video',
    priority: 'Medium',
    due_date: ''
  }
}

function close() {
  emit('close')
}

function handleSubmit() {
  const data = {
    type: selectedType.value,
    title: form.value.title,
    description: form.value.description
  }

  if (selectedType.value === 'project') {
    data.category = form.value.category
  } else if (selectedType.value === 'content') {
    data.project_id = form.value.project_id
    data.content_type = form.value.content_type
  } else if (selectedType.value === 'task') {
    data.project_id = form.value.project_id
    data.priority = form.value.priority
    data.due_date = form.value.due_date || null
  }

  emit('create', data)
  close()
}
</script>
