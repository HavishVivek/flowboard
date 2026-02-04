<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label class="label">Email</label>
      <input
        v-model="email"
        type="email"
        class="input w-full"
        placeholder="you@example.com"
        required
        autocomplete="email"
      />
    </div>
    <div>
      <label class="label">Password</label>
      <input
        v-model="password"
        type="password"
        class="input w-full"
        placeholder="At least 6 characters"
        required
        autocomplete="new-password"
        minlength="6"
      />
    </div>
    <div>
      <label class="label">Confirm Password</label>
      <input
        v-model="confirmPassword"
        type="password"
        class="input w-full"
        placeholder="Confirm your password"
        required
        autocomplete="new-password"
      />
    </div>

    <div v-if="error" class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded p-3">
      {{ error }}
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="btn btn-primary w-full"
    >
      {{ loading ? 'Creating account...' : 'Create Account' }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['success'])

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref(null)

async function handleSubmit() {
  error.value = null

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  loading.value = true

  try {
    await authStore.registerUser(email.value, password.value)
    emit('success')
  } catch (e) {
    error.value = authStore.error
  } finally {
    loading.value = false
  }
}
</script>
