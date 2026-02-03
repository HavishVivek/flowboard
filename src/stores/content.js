import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../services/db'

export const useContentStore = defineStore('content', () => {
  const content = ref([])
  const loading = ref(false)
  const error = ref(null)

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

  // Actions
  async function fetchContent() {
    loading.value = true
    try {
      content.value = await db.content.toArray()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchContentForProject(projectId) {
    return await db.content.where('project_id').equals(projectId).toArray()
  }

  async function addContent(item) {
    const now = new Date().toISOString()
    const newContent = {
      ...item,
      stage: item.stage || 'Idea',
      created_at: now
    }

    const id = await db.content.add(newContent)
    newContent.id = id
    content.value.push(newContent)
    return newContent
  }

  async function updateContent(id, updates) {
    await db.content.update(id, updates)
    const index = content.value.findIndex(c => c.id === id)
    if (index !== -1) {
      content.value[index] = { ...content.value[index], ...updates }
    }
  }

  async function updateContentStage(id, stage) {
    const updates = { stage }
    if (stage === 'Published') {
      updates.published_date = new Date().toISOString().split('T')[0]
    }
    await updateContent(id, updates)
  }

  async function deleteContent(id) {
    await db.content.delete(id)
    // Also delete related tasks
    await db.tasks.where('content_id').equals(id).delete()
    content.value = content.value.filter(c => c.id !== id)
  }

  async function getContent(id) {
    return await db.content.get(id)
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
