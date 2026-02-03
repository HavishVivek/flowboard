import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../services/db'
import { useProjectsStore } from './projects'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const loading = ref(false)
  const error = ref(null)

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

  // Actions
  async function fetchTasks() {
    loading.value = true
    try {
      tasks.value = await db.tasks.toArray()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchTasksForProject(projectId) {
    return await db.tasks.where('project_id').equals(projectId).toArray()
  }

  async function fetchTasksForContent(contentId) {
    return await db.tasks.where('content_id').equals(contentId).toArray()
  }

  async function addTask(task) {
    const now = new Date().toISOString()
    const newTask = {
      ...task,
      completed: false,
      priority: task.priority || 'Medium',
      created_at: now
    }

    const id = await db.tasks.add(newTask)
    newTask.id = id
    tasks.value.push(newTask)

    // Update project progress
    if (task.project_id) {
      const projectsStore = useProjectsStore()
      await projectsStore.updateProjectProgress(task.project_id)
    }

    return newTask
  }

  async function updateTask(id, updates) {
    // Track completion timestamp
    if (updates.completed !== undefined) {
      const task = tasks.value.find(t => t.id === id)
      if (task) {
        if (updates.completed && !task.completed) {
          // Task being completed - set completed_at
          updates.completed_at = new Date().toISOString()
        } else if (!updates.completed && task.completed) {
          // Task being uncompleted - clear completed_at
          updates.completed_at = null
        }
      }
    }

    await db.tasks.update(id, updates)
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      const updatedTask = { ...tasks.value[index], ...updates }
      tasks.value[index] = updatedTask

      // Update project progress if completion status changed
      if (updates.completed !== undefined && updatedTask.project_id) {
        const projectsStore = useProjectsStore()
        await projectsStore.updateProjectProgress(updatedTask.project_id)
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
    const task = tasks.value.find(t => t.id === id)
    await db.tasks.delete(id)
    tasks.value = tasks.value.filter(t => t.id !== id)

    // Update project progress
    if (task?.project_id) {
      const projectsStore = useProjectsStore()
      await projectsStore.updateProjectProgress(task.project_id)
    }
  }

  async function getTask(id) {
    return await db.tasks.get(id)
  }

  // Get tasks that can be completed (no incomplete dependencies)
  async function getActionableTasks() {
    const allTasks = await db.tasks.where('completed').equals(false).toArray()
    const actionable = []

    for (const task of allTasks) {
      if (!task.depends_on) {
        actionable.push(task)
      } else {
        const dependency = await db.tasks.get(task.depends_on)
        if (dependency?.completed) {
          actionable.push(task)
        }
      }
    }

    return actionable
  }

  // Get task with its dependencies
  async function getTaskWithDependencies(id) {
    const task = await db.tasks.get(id)
    if (!task) return null

    let dependency = null
    if (task.depends_on) {
      dependency = await db.tasks.get(task.depends_on)
    }

    const dependents = await db.tasks.where('depends_on').equals(id).toArray()

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
