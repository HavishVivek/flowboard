import { getSetting } from './db'

const HF_API_URL = 'https://api-inference.huggingface.co/models'
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'

// Get Hugging Face configuration from settings
async function getConfig() {
  const apiKey = await getSetting('hfApiKey')
  const model = await getSetting('hfModel') || DEFAULT_MODEL
  return { apiKey, model }
}

// Test connection to Hugging Face
export async function testConnection() {
  const { apiKey } = await getConfig()

  if (!apiKey) {
    return { success: false, message: 'No API key configured. Add your Hugging Face API key in Settings.' }
  }

  try {
    const response = await fetch(`${HF_API_URL}/${DEFAULT_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: 'Hello',
        parameters: { max_new_tokens: 10 }
      })
    })

    if (response.ok) {
      return { success: true, message: 'Connected to Hugging Face!' }
    } else if (response.status === 401) {
      return { success: false, message: 'Invalid API key' }
    } else if (response.status === 503) {
      return { success: true, message: 'Connected! Model is loading (this is normal for first use)' }
    } else {
      return { success: false, message: `API responded with status ${response.status}` }
    }
  } catch (e) {
    return { success: false, message: `Connection failed: ${e.message}` }
  }
}

// Generate text using Hugging Face
async function generate(prompt, options = {}) {
  const { apiKey, model } = await getConfig()

  if (!apiKey) {
    throw new Error('No Hugging Face API key configured')
  }

  const response = await fetch(`${HF_API_URL}/${options.model || model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        return_full_text: false
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // HF returns an array with generated_text
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text
  }

  throw new Error('Unexpected response format from Hugging Face')
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

  const prompt = `<s>[INST] You are a productivity assistant. Based on the current time (${timeContext}) and the following tasks and projects, suggest the top 3 tasks to work on right now.

Current Tasks:
${JSON.stringify(taskList, null, 2)}

Active Projects:
${JSON.stringify(projectList, null, 2)}

Respond ONLY with a JSON array of exactly 3 suggestions:
[{"title": "Task name", "reason": "Brief reason", "task_id": null, "type": "task", "estimated_time": "30 mins"}]

JSON array only: [/INST]`

  try {
    const response = await generate(prompt, { temperature: 0.5 })

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

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
  const { apiKey } = await getConfig()

  if (!apiKey) {
    console.log('No API key, using fallback schedule')
    const weekDates = getWeekDates()
    const preferredTimes = await getSetting('preferredWorkTimes') || ['morning', 'afternoon']
    return generateFallbackSchedule(tasks, weekDates, preferredTimes)
  }

  const workHours = await getSetting('workHoursPerDay') || 8
  const preferredTimes = await getSetting('preferredWorkTimes') || ['morning', 'afternoon']
  const weekDates = getWeekDates()

  const taskList = tasks.slice(0, 10).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date
  }))

  if (taskList.length === 0) {
    return []
  }

  const prompt = `<s>[INST] Create a weekly schedule for these tasks.

Tasks: ${JSON.stringify(taskList)}

Dates: ${weekDates.join(', ')}
Time slots: "Morning (6am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-9pm)"

Respond ONLY with JSON array:
[{"task_id": 1, "date": "YYYY-MM-DD", "time_slot": "Morning (6am-12pm)"}]

JSON only: [/INST]`

  try {
    const response = await generate(prompt, { temperature: 0.3, maxTokens: 800 })

    const jsonMatch = response.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      const schedule = JSON.parse(jsonMatch[0])
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

function getWeekDates() {
  const today = new Date()
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    weekDates.push(date.toISOString().split('T')[0])
  }
  return weekDates
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

  if (taskList.length === 0) {
    return null
  }

  const { apiKey } = await getConfig()

  if (!apiKey) {
    return {
      task_id: taskList[0].id,
      title: taskList[0].title,
      reason: 'Highest priority task',
      can_complete: true
    }
  }

  const prompt = `<s>[INST] You have ${availableMinutes} minutes. Which task?

Tasks: ${JSON.stringify(taskList)}

Respond with JSON: {"task_id": 1, "title": "name", "reason": "why", "can_complete": true}

JSON only: [/INST]`

  try {
    const response = await generate(prompt, { temperature: 0.3 })

    const jsonMatch = response.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      task_id: taskList[0].id,
      title: taskList[0].title,
      reason: 'Highest priority task',
      can_complete: true
    }
  } catch (e) {
    console.error('Next task suggestion error:', e)
    return {
      task_id: taskList[0].id,
      title: taskList[0].title,
      reason: 'Highest priority task',
      can_complete: true
    }
  }
}

export default {
  testConnection,
  getTaskSuggestions,
  generateWeeklySchedule,
  getNextTaskSuggestion
}
