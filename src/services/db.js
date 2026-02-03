import Dexie from 'dexie'

export const db = new Dexie('ProjectTrackerDB')

db.version(1).stores({
  projects: '++id, name, category, status, priority_score, created_at, updated_at',
  content: '++id, title, type, project_id, stage, scheduled_date, published_date, created_at',
  tasks: '++id, title, project_id, content_id, priority, due_date, completed, depends_on, created_at',
  schedule: '++id, date, time_slot, task_id, ai_suggested, created_at',
  settings: 'key'
})

// Project categories
export const CATEGORIES = ['IoT', 'AI', 'ML', 'Electronics', 'Other']

// Project statuses
export const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived']

// Content types
export const CONTENT_TYPES = ['Video', 'Blog', 'Shorts', 'Tutorial']

// Content stages
export const CONTENT_STAGES = ['Idea', 'Draft', 'Production', 'Review', 'Published']

// Task priorities
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

// Time slots for scheduling
export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning (6am-12pm)', start: 6, end: 12 },
  { id: 'afternoon', label: 'Afternoon (12pm-5pm)', start: 12, end: 17 },
  { id: 'evening', label: 'Evening (5pm-9pm)', start: 17, end: 21 },
  { id: 'night', label: 'Night (9pm-12am)', start: 21, end: 24 }
]

// Helper to calculate priority score
export function calculatePriorityScore(impact, urgency, effort) {
  // Impact and Urgency are 1-5, Effort is 1-5 (higher = more effort)
  // Formula: (Impact * Urgency) / Effort
  if (effort === 0) effort = 1
  return Math.round((impact * urgency) / effort * 10) / 10
}

// Initialize default settings
export async function initializeSettings() {
  const existingSettings = await db.settings.get('initialized')
  if (!existingSettings) {
    await db.settings.bulkPut([
      { key: 'initialized', value: true },
      { key: 'hfApiKey', value: '' },
      { key: 'hfModel', value: 'mistralai/Mistral-7B-Instruct-v0.2' },
      { key: 'weeklyContentGoal', value: 1 },
      { key: 'workHoursPerDay', value: 8 },
      { key: 'preferredWorkTimes', value: ['morning', 'afternoon'] }
    ])
  }
}

// Get a setting
export async function getSetting(key) {
  const setting = await db.settings.get(key)
  return setting?.value
}

// Set a setting
export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

// Get current week date range (Monday to Sunday)
export function getWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday

  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return {
    start: monday,
    end: sunday
  }
}

// Format date for display (e.g., "Jan 27")
export function formatDateForDisplay(date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format date for input fields (YYYY-MM-DD)
export function formatDateForInput(date) {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export default db
