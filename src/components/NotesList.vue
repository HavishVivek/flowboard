<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="font-medium text-sm text-gray-300">Notes</h4>
      <button
        v-if="!showAddForm"
        @click="showAddForm = true"
        class="text-primary-400 text-sm hover:underline"
      >
        + Add Note
      </button>
    </div>

    <!-- Add Note Form -->
    <div v-if="showAddForm" class="space-y-2">
      <textarea
        v-model="newNoteContent"
        @keydown.meta.enter="saveNewNote"
        @keydown.ctrl.enter="saveNewNote"
        class="input w-full h-24 text-sm"
        placeholder="Write a note..."
        autofocus
      ></textarea>
      <div class="flex justify-end gap-2">
        <button @click="cancelAdd" class="btn btn-secondary text-sm py-1 px-3">
          Cancel
        </button>
        <button
          @click="saveNewNote"
          :disabled="!newNoteContent.trim()"
          class="btn btn-primary text-sm py-1 px-3"
        >
          Save
        </button>
      </div>
    </div>

    <!-- Notes List -->
    <div v-if="parentNotes.length > 0" class="space-y-2">
      <div
        v-for="note in parentNotes"
        :key="note.id"
        class="bg-gray-700/50 rounded-lg p-3"
      >
        <!-- View Mode -->
        <div v-if="editingNoteId !== note.id">
          <p class="text-sm whitespace-pre-wrap">{{ note.content }}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-gray-500">
              {{ formatDate(note.created_at) }}
              <span v-if="note.updated_at && note.updated_at !== note.created_at">
                (edited)
              </span>
            </span>
            <div class="flex gap-2">
              <button
                @click="startEdit(note)"
                class="text-xs text-gray-400 hover:text-white"
              >
                Edit
              </button>
              <button
                @click="confirmDelete(note.id)"
                class="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="space-y-2">
          <textarea
            v-model="editNoteContent"
            @keydown.meta.enter="saveEdit(note.id)"
            @keydown.ctrl.enter="saveEdit(note.id)"
            class="input w-full h-24 text-sm"
            autofocus
          ></textarea>
          <div class="flex justify-end gap-2">
            <button @click="cancelEdit" class="btn btn-secondary text-sm py-1 px-3">
              Cancel
            </button>
            <button
              @click="saveEdit(note.id)"
              :disabled="!editNoteContent.trim()"
              class="btn btn-primary text-sm py-1 px-3"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-else-if="!showAddForm" class="text-sm text-gray-500 text-center py-2">
      No notes yet
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNotesStore } from '../stores/notes'

const props = defineProps({
  parentType: {
    type: String,
    required: true,
    validator: (value) => ['project', 'task', 'content'].includes(value)
  },
  parentId: {
    type: String,
    required: true
  }
})

const notesStore = useNotesStore()

const showAddForm = ref(false)
const newNoteContent = ref('')
const editingNoteId = ref(null)
const editNoteContent = ref('')

const parentNotes = computed(() => {
  return notesStore.notes
    .filter(n => n.parent_type === props.parentType && n.parent_id === props.parentId)
    .sort((a, b) => {
      const aDate = typeof a.created_at === 'string' ? new Date(a.created_at) : a.created_at?.toDate?.() || new Date()
      const bDate = typeof b.created_at === 'string' ? new Date(b.created_at) : b.created_at?.toDate?.() || new Date()
      return bDate - aDate
    })
})

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate?.() || new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

async function saveNewNote() {
  if (!newNoteContent.value.trim()) return
  await notesStore.addNote(props.parentType, props.parentId, newNoteContent.value.trim())
  newNoteContent.value = ''
  showAddForm.value = false
}

function cancelAdd() {
  newNoteContent.value = ''
  showAddForm.value = false
}

function startEdit(note) {
  editingNoteId.value = note.id
  editNoteContent.value = note.content
}

async function saveEdit(noteId) {
  if (!editNoteContent.value.trim()) return
  await notesStore.updateNote(noteId, editNoteContent.value.trim())
  editingNoteId.value = null
  editNoteContent.value = ''
}

function cancelEdit() {
  editingNoteId.value = null
  editNoteContent.value = ''
}

async function confirmDelete(noteId) {
  if (confirm('Delete this note?')) {
    await notesStore.deleteNote(noteId)
  }
}
</script>
