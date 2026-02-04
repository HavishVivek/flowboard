import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { notesService } from '../services/firestore'

export const useNotesStore = defineStore('notes', () => {
  const authStore = useAuthStore()
  const { userId } = storeToRefs(authStore)

  const notes = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  // Computed - get notes for a specific parent
  function getNotesForParent(parentType, parentId) {
    return computed(() => {
      return notes.value
        .filter(n => n.parent_type === parentType && n.parent_id === parentId)
        .sort((a, b) => {
          const aDate = a.created_at?.toDate?.() || new Date(a.created_at)
          const bDate = b.created_at?.toDate?.() || new Date(b.created_at)
          return bDate - aDate
        })
    })
  }

  // Subscribe to real-time updates
  function subscribeToNotes() {
    if (!userId.value) return
    if (unsubscribe) unsubscribe()

    unsubscribe = notesService.subscribe(userId.value, (data) => {
      notes.value = data
      loading.value = false
    })
  }

  // Watch for auth changes
  watch(userId, (newUserId) => {
    if (newUserId) {
      subscribeToNotes()
    } else {
      if (unsubscribe) unsubscribe()
      notes.value = []
    }
  }, { immediate: true })

  // Actions
  async function fetchNotes() {
    if (!userId.value) return
    loading.value = true
    try {
      notes.value = await notesService.getAll(userId.value)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchNotesForParent(parentType, parentId) {
    if (!userId.value) return []
    const allNotes = await notesService.getWhere(userId.value, 'parent_type', '==', parentType)
    return allNotes.filter(n => n.parent_id === parentId)
  }

  async function addNote(parentType, parentId, content) {
    if (!userId.value) return null
    const now = new Date().toISOString()
    const newNote = {
      content,
      parent_type: parentType,
      parent_id: parentId,
      created_at: now,
      updated_at: now
    }

    return await notesService.add(userId.value, newNote)
  }

  async function updateNote(id, content) {
    if (!userId.value) return
    await notesService.update(userId.value, id, {
      content,
      updated_at: new Date().toISOString()
    })
  }

  async function deleteNote(id) {
    if (!userId.value) return
    await notesService.remove(userId.value, id)
  }

  async function deleteNotesForParent(parentType, parentId) {
    if (!userId.value) return
    const parentNotes = notes.value.filter(n => n.parent_type === parentType && n.parent_id === parentId)
    const ids = parentNotes.map(n => n.id)
    if (ids.length > 0) {
      await notesService.bulkDelete(userId.value, ids)
    }
  }

  return {
    notes,
    loading,
    error,
    getNotesForParent,
    fetchNotes,
    fetchNotesForParent,
    addNote,
    updateNote,
    deleteNote,
    deleteNotesForParent
  }
})
