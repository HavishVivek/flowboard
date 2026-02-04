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
        placeholder="Enter your password"
        required
        autocomplete="current-password"
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
      {{ loading ? 'Signing in...' : 'Sign In' }}
    </button>

    <div class="text-center">
      <button
        type="button"
        @click="$emit('forgot-password')"
        class="text-sm text-primary-400 hover:underline"
      >
        Forgot your password?
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['success', 'forgot-password'])

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)

async function handleSubmit() {
  error.value = null
  loading.value = true

  try {
    await authStore.loginUser(email.value, password.value)
    emit('success')
  } catch (e) {
    error.value = authStore.error
  } finally {
    loading.value = false
  }
}
</script>
