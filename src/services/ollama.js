import { getSetting } from './db'

// Get Ollama configuration from settings
async function getConfig() {
  // Always use proxy in development to avoid CORS issues
  const url = import.meta.env.DEV ? '/ollama' : (await getSetting('ollamaUrl') || 'http://localhost:11434')
  const model = await getSetting('ollamaModel') || 'llama3.2'
  return { url, model }
}

// Test connection to Ollama
export async function testConnection(customUrl = null) {
  let url
  if (customUrl) {
    url = customUrl
  } else {
    const config = await getConfig()
    url = config.url
  }

  try {
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET'
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.models?.map(m => m.name).join(', ') || 'None'
      return { success: true, message: `Connected! Available models: ${models}` }
    } else {
      return { success: false, message: `Server responded with status ${response.status}` }
    }
  } catch (e) {
    return { success: false, message: `Connection failed: ${e.message}` }
  }
}

// Generate text using Ollama
async function generate(prompt, options = {}) {
  const { url, model } = await getConfig()

  const response = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 1000
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }

  const data = await response.json()
  return data.response
}

// Get task suggestions based on current context
export async function getTaskSuggestions(tasks, projects) {
  const taskList = tasks.slice(0, 10).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    project_id: t.project_id
  }))

  const projectList = projects.slice(0, 5).map(p => ({
    id: p.id,
    name: p.name,
    priority_score: p.priority_score,
    status: p.status
  }))

  const hour = new Date().getHours()
  let timeContext = 'morning'
  if (hour >= 12 && hour < 17) timeContext = 'afternoon'
  else if (hour >= 17) timeContext = 'evening'

  const prompt = `You are a productivity assistant. Based on the current time (${timeContext}) and the following tasks and projects, suggest the top 3 tasks to work on right now.

Current Tasks:
${JSON.stringify(taskList, null, 2)}

Active Projects:
${JSON.stringify(projectList, null, 2)}

Consider:
- Task priority and due dates
- Time of day (${timeContext} - ${hour < 12 ? 'high energy, good for complex work' : hour < 17 ? 'balanced energy' : 'lower energy, good for lighter tasks'})
- Project priority scores

Respond ONLY with a JSON array of exactly 3 suggestions in this format:
[
  {
    "title": "Task or action name",
    "reason": "Brief reason why now is good for this",
    "task_id": null or the task ID if referencing an existing task,
    "type": "task" or "project",
    "estimated_time": "15 mins" or "30 mins" or "1 hour"
  }
]

JSON array only, no other text:`

  try {
    const response = await generate(prompt, { temperature: 0.5 })

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // Fallback suggestions if parsing fails
    return getFallbackSuggestions(tasks, timeContext)
  } catch (e) {
    console.error('AI suggestion error:', e)
    return getFallbackSuggestions(tasks, timeContext)
  }
}

// Fallback suggestions when AI is unavailable
function getFallbackSuggestions(tasks, timeContext) {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }

  const sortedTasks = [...tasks]
    .filter(t => !t.completed)
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

// Generate weekly schedule
export async function generateWeeklySchedule(tasks, projects) {
  const workHours = await getSetting('workHoursPerDay') || 8
  const preferredTimes = await getSetting('preferredWorkTimes') || ['morning', 'afternoon']

  const today = new Date()
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    weekDates.push(date.toISOString().split('T')[0])
  }

  const taskList = tasks.slice(0, 15).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date
  }))

  const prompt = `You are a scheduling assistant. Create an optimal weekly schedule for these tasks.

Tasks to schedule:
${JSON.stringify(taskList, null, 2)}

Available dates: ${weekDates.join(', ')}
Work hours per day: ${workHours}
Preferred work times: ${preferredTimes.join(', ')}

Rules:
- Respect due dates (schedule before the due date)
- Higher priority tasks should be scheduled earlier
- Balance workload across the week
- Use time slots: "Morning (6am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-9pm)"

Respond ONLY with a JSON array of schedule items:
[
  {
    "task_id": <task id number>,
    "date": "YYYY-MM-DD",
    "time_slot": "Morning (6am-12pm)" or "Afternoon (12pm-5pm)" or "Evening (5pm-9pm)"
  }
]

JSON array only, no other text:`

  try {
    const response = await generate(prompt, { temperature: 0.3 })

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const schedule = JSON.parse(jsonMatch[0])
      // Validate and filter schedule items
      return schedule.filter(item =>
        item.task_id &&
        item.date &&
        item.time_slot &&
        weekDates.includes(item.date)
      )
    }

    return generateFallbackSchedule(tasks, weekDates, preferredTimes)
  } catch (e) {
    console.error('Schedule generation error:', e)
    return generateFallbackSchedule(tasks, weekDates, preferredTimes)
  }
}

// Fallback schedule generation
function generateFallbackSchedule(tasks, weekDates, preferredTimes) {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  const timeSlotMap = {
    morning: 'Morning (6am-12pm)',
    afternoon: 'Afternoon (12pm-5pm)',
    evening: 'Evening (5pm-9pm)'
  }

  const sortedTasks = [...tasks]
    .filter(t => !t.completed)
    .sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 4
      const bPriority = priorityOrder[b.priority] ?? 4
      return aPriority - bPriority
    })

  const schedule = []
  let dateIndex = 0
  let timeIndex = 0

  for (const task of sortedTasks.slice(0, 14)) {
    const timeSlot = timeSlotMap[preferredTimes[timeIndex % preferredTimes.length]]

    schedule.push({
      task_id: task.id,
      date: weekDates[dateIndex],
      time_slot: timeSlot
    })

    timeIndex++
    if (timeIndex >= preferredTimes.length) {
      timeIndex = 0
      dateIndex = (dateIndex + 1) % weekDates.length
    }
  }

  return schedule
}

// Get "What should I work on?" suggestion
export async function getNextTaskSuggestion(availableMinutes, tasks, projects) {
  const taskList = tasks
    .filter(t => !t.completed)
    .slice(0, 10)
    .map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      due_date: t.due_date
    }))

  const prompt = `You have ${availableMinutes} minutes available. Which task should you work on?

Available tasks:
${JSON.stringify(taskList, null, 2)}

Consider:
- Time available (${availableMinutes} mins)
- Task priority
- Due dates

Respond with a single JSON object:
{
  "task_id": <id of recommended task>,
  "title": "task title",
  "reason": "why this task fits the available time",
  "can_complete": true/false
}

JSON only:`

  try {
    const response = await generate(prompt, { temperature: 0.3 })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // Fallback: return highest priority task
    if (taskList.length > 0) {
      return {
        task_id: taskList[0].id,
        title: taskList[0].title,
        reason: 'Highest priority task',
        can_complete: true
      }
    }

    return null
  } catch (e) {
    console.error('Next task suggestion error:', e)
    if (taskList.length > 0) {
      return {
        task_id: taskList[0].id,
        title: taskList[0].title,
        reason: 'Highest priority task',
        can_complete: true
      }
    }
    return null
  }
}

export default {
  testConnection,
  getTaskSuggestions,
  generateWeeklySchedule,
  getNextTaskSuggestion
}
