import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../services/db'

export const useScheduleStore = defineStore('schedule', () => {
  const scheduleItems = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const scheduleByDate = computed(() => {
    const grouped = {}
    scheduleItems.value.forEach(item => {
      if (!grouped[item.date]) {
        grouped[item.date] = []
      }
      grouped[item.date].push(item)
    })
    return grouped
  })

  const todaySchedule = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return scheduleItems.value.filter(s => s.date === today)
  })

  const thisWeekSchedule = computed(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const start = startOfWeek.toISOString().split('T')[0]
    const end = endOfWeek.toISOString().split('T')[0]

    return scheduleItems.value.filter(s => s.date >= start && s.date <= end)
  })

  // Actions
  async function fetchSchedule() {
    loading.value = true
    try {
      scheduleItems.value = await db.schedule.toArray()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchScheduleForDateRange(startDate, endDate) {
    return await db.schedule
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray()
  }

  async function addScheduleItem(item) {
    const now = new Date().toISOString()
    const newItem = {
      ...item,
      ai_suggested: item.ai_suggested || false,
      created_at: now
    }

    const id = await db.schedule.add(newItem)
    newItem.id = id
    scheduleItems.value.push(newItem)
    return newItem
  }

  async function updateScheduleItem(id, updates) {
    await db.schedule.update(id, updates)
    const index = scheduleItems.value.findIndex(s => s.id === id)
    if (index !== -1) {
      scheduleItems.value[index] = { ...scheduleItems.value[index], ...updates }
    }
  }

  async function deleteScheduleItem(id) {
    await db.schedule.delete(id)
    scheduleItems.value = scheduleItems.value.filter(s => s.id !== id)
  }

  async function clearScheduleForDate(date) {
    const items = await db.schedule.where('date').equals(date).toArray()
    for (const item of items) {
      await db.schedule.delete(item.id)
    }
    scheduleItems.value = scheduleItems.value.filter(s => s.date !== date)
  }

  async function clearAiSuggestedSchedule() {
    const aiItems = await db.schedule.where('ai_suggested').equals(true).toArray()
    for (const item of aiItems) {
      await db.schedule.delete(item.id)
    }
    scheduleItems.value = scheduleItems.value.filter(s => !s.ai_suggested)
  }

  // Bulk add schedule items (for AI-generated schedules)
  async function bulkAddScheduleItems(items) {
    const now = new Date().toISOString()
    const newItems = items.map(item => ({
      ...item,
      ai_suggested: true,
      created_at: now
    }))

    const ids = await db.schedule.bulkAdd(newItems, { allKeys: true })
    newItems.forEach((item, i) => {
      item.id = ids[i]
    })
    scheduleItems.value.push(...newItems)
    return newItems
  }

  return {
    scheduleItems,
    loading,
    error,
    scheduleByDate,
    todaySchedule,
    thisWeekSchedule,
    fetchSchedule,
    fetchScheduleForDateRange,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    clearScheduleForDate,
    clearAiSuggestedSchedule,
    bulkAddScheduleItems
  }
})
