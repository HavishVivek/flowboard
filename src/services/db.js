// Constants for the application - no longer contains Dexie database code

// Stub for getSetting - settings now come from environment variables or Firestore
// This maintains backward compatibility with groqAI.js
export async function getSetting(key) {
  const defaults = {
    workHoursPerDay: 8,
    preferredWorkTimes: ['morning', 'afternoon'],
    groqApiKey: null // API key comes from VITE_GROQ_API_KEY env var
  }
  return defaults[key] ?? null
}

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
