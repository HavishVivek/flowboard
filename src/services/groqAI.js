import { getSetting } from './db'

const PROXY_URL = 'http://localhost:3001/api/ai-generate'
const ENV_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''

const MAX_RETRIES = 3
const RETRY_DELAY = 2000

async function getConfig() {
  const apiKey = ENV_API_KEY || await getSetting('groqApiKey')
  return { apiKey }
}

export async function isConfigured() {
  if (ENV_API_KEY) return true
  const settingsKey = await getSetting('groqApiKey')
  return !!settingsKey
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGroqAPI(prompt, maxTokens = 500) {
  const { apiKey } = await getConfig()

  if (!apiKey) {
    throw new Error('Groq API key not configured. Please add your API key in Settings.')
  }

  let lastError = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          apiKey,
          maxTokens
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.choices[0].message.content.trim()
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API error: ${response.status}`)

    } catch (error) {
      lastError = error

      if (error.message.includes('API key')) {
        throw error
      }

      if (attempt < MAX_RETRIES) {
        console.log(`Retrying (attempt ${attempt}/${MAX_RETRIES})`)
        await sleep(RETRY_DELAY)
        continue
      }
    }
  }

  throw lastError || new Error('Failed to generate content after multiple attempts')
}

export async function testConnection() {
  const { apiKey } = await getConfig()

  if (!apiKey) {
    return {
      success: false,
      message: 'No API key configured. Add your Groq API key in Settings.'
    }
  }

  try {
    await callGroqAPI('Hello', 10)
    return {
      success: true,
      message: 'Connected successfully to Groq AI!'
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`
    }
  }
}

export async function generateSocialPostIdeas(topic, platform = 'general', date = null) {
  const dateContext = date ? `\nDate context: ${date}` : ''

  const prompt = `Generate 3 engaging ${platform} post ideas about: "${topic}"${dateContext}

Requirements:
- Make them attention-grabbing and shareable
- Include relevant hashtag suggestions
- Keep appropriate length for ${platform}
- Be creative and original

Format each idea clearly numbered 1, 2, 3.`

  return await callGroqAPI(prompt, 600)
}

export async function generateBlogTitles(topic, style = 'informative') {
  const prompt = `Generate 5 compelling blog title options for a ${style} article about: "${topic}"

Requirements:
- Titles should be SEO-friendly
- Include power words that drive clicks
- Vary the formats (questions, how-tos, lists, etc.)
- Keep under 60 characters when possible

List the 5 titles numbered 1-5.`

  return await callGroqAPI(prompt, 300)
}

export async function generateContentOutline(title, type = 'blog', sections = 5) {
  const typeGuidance = {
    blog: 'Include an introduction, main points with subheadings, and conclusion',
    video: 'Include hook, main segments, and call-to-action',
    tutorial: 'Include prerequisites, step-by-step sections, and troubleshooting tips',
    shorts: 'Include hook (first 3 seconds), main point, and quick CTA'
  }

  const prompt = `Create a detailed ${type} content outline for: "${title}"

Requirements:
- ${typeGuidance[type] || typeGuidance.blog}
- Include approximately ${sections} main sections
- Add bullet points under each section
- Suggest key talking points

Format with clear headings and bullet points.`

  return await callGroqAPI(prompt, 700)
}

export async function generateDateBasedIdeas(date, niche = 'general') {
  const dateObj = new Date(date)
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const prompt = `Generate content ideas for ${formattedDate} in the ${niche} niche.

Consider:
- Any holidays or observances around this date
- Seasonal relevance
- Day of the week (weekday vs weekend content)
- Trending topics that might be relevant

Provide 4 content ideas with:
1. Content title/topic
2. Best format (video, blog, social post, etc.)
3. Why it's relevant for this date
4. Key angle or hook`

  return await callGroqAPI(prompt, 600)
}

export async function generateDescription(title, type = 'video', keywords = '') {
  const keywordClause = keywords ? `\nInclude these keywords naturally: ${keywords}` : ''

  const prompt = `Write a compelling ${type} description for: "${title}"${keywordClause}

Requirements:
- 2-3 paragraphs
- Hook readers in the first line
- Include a call-to-action
- Be informative but engaging
- Optimize for search when relevant`

  return await callGroqAPI(prompt, 400)
}

export async function generateCustomContent(userPrompt, options = {}) {
  return await callGroqAPI(userPrompt, options.maxTokens || 500)
}

export async function suggestImprovements(content, goal = 'engagement') {
  const prompt = `Review this content and suggest improvements focused on ${goal}:

"${content}"

Provide:
1. Specific areas to improve
2. Concrete suggestions with examples
3. Quick wins for immediate improvement`

  return await callGroqAPI(prompt, 500)
}

// ============ Task & Schedule Functions ============

/**
 * Get task suggestions based on current context
 */
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
    const response = await callGroqAPI(prompt, 600)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return getFallbackSuggestions(tasks, timeContext)
  } catch (e) {
    console.error('AI suggestion error:', e)
    return getFallbackSuggestions(tasks, timeContext)
  }
}

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

/**
 * Generate weekly schedule from tasks
 */
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
    const response = await callGroqAPI(prompt, 800)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
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

/**
 * Get suggestion for what to work on next
 */
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
    const response = await callGroqAPI(prompt, 200)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

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
  isConfigured,
  generateSocialPostIdeas,
  generateBlogTitles,
  generateContentOutline,
  generateDateBasedIdeas,
  generateDescription,
  generateCustomContent,
  suggestImprovements,
  getTaskSuggestions,
  generateWeeklySchedule,
  getNextTaskSuggestion
}