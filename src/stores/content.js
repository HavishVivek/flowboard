import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { contentService, tasksService } from '../services/firestore'

export const useContentStore = defineStore('content', () => {
  const authStore = useAuthStore()
  const { userId } = storeToRefs(authStore)

  const content = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  // Computed
  const contentByStage = computed(() => {
    const stages = {
      Idea: [],
      Draft: [],
      Production: [],
      Review: [],
      Published: []
    }
    content.value.forEach(item => {
      if (stages[item.stage]) {
        stages[item.stage].push(item)
      }
    })
    return stages
  })

  const contentByType = computed(() => {
    const grouped = {}
    content.value.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = []
      }
      grouped[item.type].push(item)
    })
    return grouped
  })

  const upcomingContent = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return content.value
      .filter(c => c.scheduled_date && c.scheduled_date >= today && c.stage !== 'Published')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  })

  const publishedContent = computed(() => {
    return content.value.filter(c => c.stage === 'Published')
  })

  // Subscribe to real-time updates
  function subscribeToContent() {
    if (!userId.value) return
    if (unsubscribe) unsubscribe()

    unsubscribe = contentService.subscribe(userId.value, (data) => {
      content.value = data
      loading.value = false
    })
  }

  // Watch for auth changes
  watch(userId, (newUserId) => {
    if (newUserId) {
      subscribeToContent()
    } else {
      if (unsubscribe) unsubscribe()
      content.value = []
    }
  }, { immediate: true })

  // Actions
  async function fetchContent() {
    if (!userId.value) return
    loading.value = true
    try {
      content.value = await contentService.getAll(userId.value)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchContentForProject(projectId) {
    if (!userId.value) return []
    return await contentService.getWhere(userId.value, 'project_id', '==', projectId)
  }

  async function addContent(item) {
    if (!userId.value) return null
    const now = new Date().toISOString()
    const newContent = {
      ...item,
      stage: item.stage || 'Idea',
      created_at: now
    }

    return await contentService.add(userId.value, newContent)
  }

  async function updateContent(id, updates) {
    if (!userId.value) return
    await contentService.update(userId.value, id, updates)
  }

  async function updateContentStage(id, stage) {
    const updates = { stage }
    if (stage === 'Published') {
      updates.published_date = new Date().toISOString().split('T')[0]
    }
    await updateContent(id, updates)
  }

  async function deleteContent(id) {
    if (!userId.value) return

    // Delete related tasks
    const relatedTasks = await tasksService.getWhere(userId.value, 'content_id', '==', id)
    const taskIds = relatedTasks.map(t => t.id)
    if (taskIds.length > 0) await tasksService.bulkDelete(userId.value, taskIds)

    await contentService.remove(userId.value, id)
  }

  async function getContent(id) {
    if (!userId.value) return null
    return await contentService.get(userId.value, id)
  }

  // Get content statistics
  function getContentStats() {
    const stats = {
      total: content.value.length,
      byType: {},
      byStage: {},
      publishedThisMonth: 0
    }

    const thisMonth = new Date().toISOString().slice(0, 7)

    content.value.forEach(item => {
      // By type
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1

      // By stage
      stats.byStage[item.stage] = (stats.byStage[item.stage] || 0) + 1

      // Published this month
      if (item.published_date && item.published_date.startsWith(thisMonth)) {
        stats.publishedThisMonth++
      }
    })

    return stats
  }

  return {
    content,
    loading,
    error,
    contentByStage,
    contentByType,
    upcomingContent,
    publishedContent,
    fetchContent,
    fetchContentForProject,
    addContent,
    updateContent,
    updateContentStage,
    deleteContent,
    getContent,
    getContentStats
  }
})
