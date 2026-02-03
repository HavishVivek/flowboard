import { getSetting } from './db'

const DEFAULT_MODEL = 'Qwen/Qwen2.5-1.5B-Instruct'

// Get Hugging Face configuration from settings
async function getConfig() {
  const apiKey = await getSetting('hfApiKey')
  const model = await getSetting('hfModel') || DEFAULT_MODEL
  return { apiKey, model }
}

/**
 * Test connection to Hugging Face API
 */
export async function testConnection() {
  const { apiKey, model } = await getConfig()

  if (!apiKey) {
    return { success: false, message: 'No API key configured. Add your Hugging Face API key in Settings.' }
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', apiKey, model })
    })

    const data = await response.json()
    return data
  } catch (e) {
    return { success: false, message: `Connection failed: ${e.message}` }
  }
}

/**
 * Generate weekly schedule from tasks
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects (for context)
 * @returns {Array} Schedule items with task_id, date, time_slot
 */
export async function generateWeeklySchedule(tasks, projects) {
  const { apiKey, model } = await getConfig()

  // Filter to incomplete tasks only
  const incompleteTasks = tasks.filter(t => !t.completed)

  if (incompleteTasks.length === 0) {
    return []
  }

  // If no API key, use fallback
  if (!apiKey) {
    console.log('No API key, using fallback schedule')
    return generateFallbackSchedule(incompleteTasks)
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'schedule',
        apiKey,
        model,
        tasks: incompleteTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          due_date: t.due_date
        }))
      })
    })

    const data = await response.json()

    if (data.error) {
      console.error('Schedule generation error:', data.error)
      return generateFallbackSchedule(incompleteTasks)
    }

    return data.schedule || []
  } catch (e) {
    console.error('Schedule generation failed:', e)
    return generateFallbackSchedule(incompleteTasks)
  }
}

/**
 * Get AI task suggestions based on current context
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Array} Array of suggestion objects
 */
export async function getTaskSuggestions(tasks, projects) {
  const { apiKey, model } = await getConfig()

  const incompleteTasks = tasks.filter(t => !t.completed)

  if (incompleteTasks.length === 0) {
    return []
  }

  // Determine time of day context
  const hour = new Date().getHours()
  let timeContext = 'morning'
  if (hour >= 12 && hour < 17) timeContext = 'afternoon'
  else if (hour >= 17) timeContext = 'evening'

  // If no API key, use fallback
  if (!apiKey) {
    return getFallbackSuggestions(incompleteTasks, timeContext)
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suggest',
        apiKey,
        model,
        tasks: incompleteTasks.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          due_date: t.due_date
        })),
        parameters: { availableMinutes: 60 }
      })
    })

    const data = await response.json()

    if (data.error || !data.suggestion) {
      return getFallbackSuggestions(incompleteTasks, timeContext)
    }

    // Return as array for compatibility
    return [{
      title: data.suggestion.title,
      reason: data.suggestion.reason,
      task_id: data.suggestion.task_id,
      type: 'task',
      estimated_time: '30 mins'
    }]
  } catch (e) {
    console.error('Task suggestions failed:', e)
    return getFallbackSuggestions(incompleteTasks, timeContext)
  }
}

/**
 * Get suggestion for what to work on next
 * @param {number} availableMinutes - Minutes available to work
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Object} Suggestion object with task_id, title, reason
 */
export async function getNextTaskSuggestion(availableMinutes, tasks, projects) {
  const { apiKey, model } = await getConfig()

  const incompleteTasks = tasks.filter(t => !t.completed)

  if (incompleteTasks.length === 0) {
    return null
  }

  // If no API key, return highest priority task
  if (!apiKey) {
    const top = getTopPriorityTask(incompleteTasks)
    return {
      task_id: top.id,
      title: top.title,
      reason: 'Highest priority task',
      can_complete: true
    }
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suggest',
        apiKey,
        model,
        tasks: incompleteTasks.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          due_date: t.due_date
        })),
        parameters: { availableMinutes }
      })
    })

    const data = await response.json()

    if (data.error || !data.suggestion) {
      const top = getTopPriorityTask(incompleteTasks)
      return {
        task_id: top.id,
        title: top.title,
        reason: 'Highest priority task',
        can_complete: true
      }
    }

    return {
      ...data.suggestion,
      can_complete: true
    }
  } catch (e) {
    console.error('Next task suggestion failed:', e)
    const top = getTopPriorityTask(incompleteTasks)
    return {
      task_id: top.id,
      title: top.title,
      reason: 'Highest priority task',
      can_complete: true
    }
  }
}

// ============ Helper Functions ============

function getTopPriorityTask(tasks) {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  return [...tasks].sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 4
    const bPriority = priorityOrder[b.priority] ?? 4
    return aPriority - bPriority
  })[0]
}

function getFallbackSuggestions(tasks, timeContext) {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }

  const sortedTasks = [...tasks]
    .sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 4
      const bPriority = priorityOrder[b.priority] ?? 4
      return aPriority - bPriority
    })
    .slice(0, 3)

  return sortedTasks.map(task => ({
    title: task.title,
    reason: `${task.priority} priority task`,
    task_id: task.id,
    type: 'task',
    estimated_time: '30 mins'
  }))
}

function generateFallbackSchedule(tasks) {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  const timeSlots = ['Morning (6am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-9pm)']

  // Get next 7 days
  const dates = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 4
    const bPriority = priorityOrder[b.priority] ?? 4
    return aPriority - bPriority
  })

  const schedule = []
  let dateIndex = 0
  let slotIndex = 0

  for (const task of sortedTasks.slice(0, 14)) {
    schedule.push({
      task_id: task.id,
      date: dates[dateIndex],
      time_slot: timeSlots[slotIndex]
    })

    slotIndex++
    if (slotIndex >= timeSlots.length) {
      slotIndex = 0
      dateIndex = (dateIndex + 1) % dates.length
    }
  }

  return schedule
}

export default {
  testConnection,
  getTaskSuggestions,
  generateWeeklySchedule,
  getNextTaskSuggestion
}
