import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { projectsService, tasksService, contentService } from '../services/firestore'
import { calculatePriorityScore } from '../services/db'

export const useProjectsStore = defineStore('projects', () => {
  const authStore = useAuthStore()
  const { userId } = storeToRefs(authStore)

  const projects = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  // Computed
  const projectsByCategory = computed(() => {
    const grouped = {}
    projects.value.forEach(project => {
      if (!grouped[project.category]) {
        grouped[project.category] = []
      }
      grouped[project.category].push(project)
    })
    return grouped
  })

  const activeProjects = computed(() => {
    return projects.value.filter(p => p.status !== 'Completed' && p.status !== 'Archived')
  })

  const projectsSortedByPriority = computed(() => {
    return [...projects.value].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
  })

  // Subscribe to real-time updates
  function subscribeToProjects() {
    if (!userId.value) return
    if (unsubscribe) unsubscribe()

    unsubscribe = projectsService.subscribe(userId.value, (data) => {
      projects.value = data
      loading.value = false
    })
  }

  // Watch for auth changes
  watch(userId, (newUserId) => {
    if (newUserId) {
      subscribeToProjects()
    } else {
      if (unsubscribe) unsubscribe()
      projects.value = []
    }
  }, { immediate: true })

  // Actions
  async function fetchProjects() {
    if (!userId.value) return
    loading.value = true
    try {
      projects.value = await projectsService.getAll(userId.value)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addProject(project) {
    if (!userId.value) return null
    const now = new Date().toISOString()
    const newProject = {
      ...project,
      status: project.status || 'Planning',
      progress: project.progress || 0,
      priority_score: calculatePriorityScore(
        project.impact || 3,
        project.urgency || 3,
        project.effort || 3
      ),
      created_at: now,
      updated_at: now
    }

    const result = await projectsService.add(userId.value, newProject)
    return result
  }

  async function updateProject(id, updates) {
    if (!userId.value) return
    const now = new Date().toISOString()
    const updatedData = {
      ...updates,
      updated_at: now
    }

    if (updates.impact !== undefined || updates.urgency !== undefined || updates.effort !== undefined) {
      const existing = projects.value.find(p => p.id === id)
      updatedData.priority_score = calculatePriorityScore(
        updates.impact ?? existing?.impact ?? 3,
        updates.urgency ?? existing?.urgency ?? 3,
        updates.effort ?? existing?.effort ?? 3
      )
    }

    await projectsService.update(userId.value, id, updatedData)
  }

  async function deleteProject(id) {
    if (!userId.value) return

    // Delete related tasks and content
    const relatedTasks = await tasksService.getWhere(userId.value, 'project_id', '==', id)
    const relatedContent = await contentService.getWhere(userId.value, 'project_id', '==', id)

    const taskIds = relatedTasks.map(t => t.id)
    const contentIds = relatedContent.map(c => c.id)

    if (taskIds.length > 0) await tasksService.bulkDelete(userId.value, taskIds)
    if (contentIds.length > 0) await contentService.bulkDelete(userId.value, contentIds)

    await projectsService.remove(userId.value, id)
  }

  async function getProject(id) {
    if (!userId.value) return null
    return await projectsService.get(userId.value, id)
  }

  async function updateProjectProgress(id) {
    if (!userId.value) return
    const tasks = await tasksService.getWhere(userId.value, 'project_id', '==', id)
    if (tasks.length === 0) {
      await updateProject(id, { progress: 0 })
      return
    }

    const completedTasks = tasks.filter(t => t.completed).length
    const progress = Math.round((completedTasks / tasks.length) * 100)
    await updateProject(id, { progress })
  }

  return {
    projects,
    loading,
    error,
    projectsByCategory,
    activeProjects,
    projectsSortedByPriority,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    updateProjectProgress
  }
})
