import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db, { calculatePriorityScore } from '../services/db'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const loading = ref(false)
  const error = ref(null)

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

  // Actions
  async function fetchProjects() {
    loading.value = true
    try {
      projects.value = await db.projects.toArray()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addProject(project) {
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

    const id = await db.projects.add(newProject)
    newProject.id = id
    projects.value.push(newProject)
    return newProject
  }

  async function updateProject(id, updates) {
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

    await db.projects.update(id, updatedData)
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updatedData }
    }
  }

  async function deleteProject(id) {
    await db.projects.delete(id)
    // Also delete related content and tasks
    await db.content.where('project_id').equals(id).delete()
    await db.tasks.where('project_id').equals(id).delete()
    projects.value = projects.value.filter(p => p.id !== id)
  }

  async function getProject(id) {
    return await db.projects.get(id)
  }

  async function updateProjectProgress(id) {
    const tasks = await db.tasks.where('project_id').equals(id).toArray()
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
