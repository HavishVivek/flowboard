import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { useProjectsStore } from './projects'
import { tasksService } from '../services/firestore'

export const useTasksStore = defineStore('tasks', () => {
  const authStore = useAuthStore()
  const { userId } = storeToRefs(authStore)

  const tasks = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  // Computed
  const tasksByProject = computed(() => {
    const grouped = {}
    tasks.value.forEach(task => {
      const key = task.project_id || 'unassigned'
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(task)
    })
    return grouped
  })

  const incompleteTasks = computed(() => {
    return tasks.value.filter(t => !t.completed)
  })

  const tasksDueToday = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.value.filter(t => !t.completed && t.due_date === today)
  })

  const overdueTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.value.filter(t => !t.completed && t.due_date && t.due_date < today)
  })

  const tasksSortedByPriority = computed(() => {
    const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
    return [...tasks.value].sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 4
      const bPriority = priorityOrder[b.priority] ?? 4
      return aPriority - bPriority
    })
  })

  // Subscribe to real-time updates
  function subscribeToTasks() {
    if (!userId.value) return
    if (unsubscribe) unsubscribe()

    unsubscribe = tasksService.subscribe(userId.value, (data) => {
      tasks.value = data
      loading.value = false
    })
  }

  // Watch for auth changes
  watch(userId, (newUserId) => {
    if (newUserId) {
      subscribeToTasks()
    } else {
      if (unsubscribe) unsubscribe()
      tasks.value = []
    }
  }, { immediate: true })

  // Actions
  async function fetchTasks() {
    if (!userId.value) return
    loading.value = true
    try {
      tasks.value = await tasksService.getAll(userId.value)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchTasksForProject(projectId) {
    if (!userId.value) return []
    return await tasksService.getWhere(userId.value, 'project_id', '==', projectId)
  }

  async function fetchTasksForContent(contentId) {
    if (!userId.value) return []
    return await tasksService.getWhere(userId.value, 'content_id', '==', contentId)
  }

  async function addTask(task) {
    if (!userId.value) return null
    const now = new Date().toISOString()
    const newTask = {
      ...task,
      completed: false,
      priority: task.priority || 'Medium',
      created_at: now
    }

    const result = await tasksService.add(userId.value, newTask)

    // Update project progress
    if (task.project_id) {
      const projectsStore = useProjectsStore()
      await projectsStore.updateProjectProgress(task.project_id)
    }

    return result
  }

  async function updateTask(id, updates) {
    if (!userId.value) return

    // Track completion timestamp
    if (updates.completed !== undefined) {
      const task = tasks.value.find(t => t.id === id)
      if (task) {
        if (updates.completed && !task.completed) {
          updates.completed_at = new Date().toISOString()
        } else if (!updates.completed && task.completed) {
          updates.completed_at = null
        }
      }
    }

    await tasksService.update(userId.value, id, updates)

    // Update project progress if completion status changed
    if (updates.completed !== undefined) {
      const task = tasks.value.find(t => t.id === id)
      if (task?.project_id) {
        const projectsStore = useProjectsStore()
        await projectsStore.updateProjectProgress(task.project_id)
      }
    }
  }

  async function toggleTaskComplete(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      await updateTask(id, { completed: !task.completed })
    }
  }

  async function deleteTask(id) {
    if (!userId.value) return
    const task = tasks.value.find(t => t.id === id)
    await tasksService.remove(userId.value, id)

    // Update project progress
    if (task?.project_id) {
      const projectsStore = useProjectsStore()
      await projectsStore.updateProjectProgress(task.project_id)
    }
  }

  async function getTask(id) {
    if (!userId.value) return null
    return await tasksService.get(userId.value, id)
  }

  // Get tasks that can be completed (no incomplete dependencies)
  async function getActionableTasks() {
    if (!userId.value) return []
    const allTasks = tasks.value.filter(t => !t.completed)
    const actionable = []

    for (const task of allTasks) {
      if (!task.depends_on) {
        actionable.push(task)
      } else {
        const dependency = tasks.value.find(t => t.id === task.depends_on)
        if (dependency?.completed) {
          actionable.push(task)
        }
      }
    }

    return actionable
  }

  // Get task with its dependencies
  async function getTaskWithDependencies(id) {
    if (!userId.value) return null
    const task = await tasksService.get(userId.value, id)
    if (!task) return null

    let dependency = null
    if (task.depends_on) {
      dependency = await tasksService.get(userId.value, task.depends_on)
    }

    const dependents = tasks.value.filter(t => t.depends_on === id)

    return {
      ...task,
      dependency,
      dependents
    }
  }

  return {
    tasks,
    loading,
    error,
    tasksByProject,
    incompleteTasks,
    tasksDueToday,
    overdueTasks,
    tasksSortedByPriority,
    fetchTasks,
    fetchTasksForProject,
    fetchTasksForContent,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    getTask,
    getActionableTasks,
    getTaskWithDependencies
  }
})
