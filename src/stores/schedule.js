import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { scheduleService } from '../services/firestore'

export const useScheduleStore = defineStore('schedule', () => {
  const authStore = useAuthStore()
  const { userId } = storeToRefs(authStore)

  const scheduleItems = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

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

  // Subscribe to real-time updates
  function subscribeToSchedule() {
    if (!userId.value) return
    if (unsubscribe) unsubscribe()

    unsubscribe = scheduleService.subscribe(userId.value, (data) => {
      scheduleItems.value = data
      loading.value = false
    })
  }

  // Watch for auth changes
  watch(userId, (newUserId) => {
    if (newUserId) {
      subscribeToSchedule()
    } else {
      if (unsubscribe) unsubscribe()
      scheduleItems.value = []
    }
  }, { immediate: true })

  // Actions
  async function fetchSchedule() {
    if (!userId.value) return
    loading.value = true
    try {
      scheduleItems.value = await scheduleService.getAll(userId.value)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchScheduleForDateRange(startDate, endDate) {
    if (!userId.value) return []
    const allItems = await scheduleService.getAll(userId.value)
    return allItems.filter(item => item.date >= startDate && item.date <= endDate)
  }

  async function addScheduleItem(item) {
    if (!userId.value) return null
    const now = new Date().toISOString()
    const newItem = {
      ...item,
      ai_suggested: item.ai_suggested || false,
      created_at: now
    }

    return await scheduleService.add(userId.value, newItem)
  }

  async function updateScheduleItem(id, updates) {
    if (!userId.value) return
    await scheduleService.update(userId.value, id, updates)
  }

  async function deleteScheduleItem(id) {
    if (!userId.value) return
    await scheduleService.remove(userId.value, id)
  }

  async function clearScheduleForDate(date) {
    if (!userId.value) return
    const items = scheduleItems.value.filter(s => s.date === date)
    const ids = items.map(item => item.id)
    if (ids.length > 0) {
      await scheduleService.bulkDelete(userId.value, ids)
    }
  }

  async function clearAiSuggestedSchedule() {
    if (!userId.value) return
    const aiItems = scheduleItems.value.filter(item => item.ai_suggested === true)
    const ids = aiItems.map(item => item.id)
    if (ids.length > 0) {
      await scheduleService.bulkDelete(userId.value, ids)
    }
  }

  // Bulk add schedule items (for AI-generated schedules)
  async function bulkAddScheduleItems(items) {
    if (!userId.value) return []
    const now = new Date().toISOString()
    const newItems = items.map(item => ({
      ...item,
      ai_suggested: true,
      created_at: now
    }))

    return await scheduleService.bulkAdd(userId.value, newItems)
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
