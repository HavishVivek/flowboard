<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-400">Project Tracker</h1>
        <p class="text-gray-400 mt-2">AI-Powered Productivity</p>
      </div>

      <div class="card">
        <!-- Tabs -->
        <div class="flex border-b border-gray-700 mb-6">
          <button
            @click="activeTab = 'login'"
            :class="[
              'flex-1 py-3 text-center font-medium transition-colors',
              activeTab === 'login'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            Sign In
          </button>
          <button
            @click="activeTab = 'register'"
            :class="[
              'flex-1 py-3 text-center font-medium transition-colors',
              activeTab === 'register'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            Create Account
          </button>
        </div>

        <!-- Login Form -->
        <LoginForm
          v-if="activeTab === 'login'"
          @success="handleAuthSuccess"
          @forgot-password="showForgotPassword = true"
        />

        <!-- Register Form -->
        <RegisterForm
          v-else
          @success="handleAuthSuccess"
        />

        <!-- Forgot Password Modal -->
        <div
          v-if="showForgotPassword"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          @click.self="showForgotPassword = false"
        >
          <div class="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 class="text-lg font-semibold mb-4">Reset Password</h3>
            <form @submit.prevent="handlePasswordReset" class="space-y-4">
              <div>
                <label class="label">Email</label>
                <input
                  v-model="resetEmail"
                  type="email"
                  class="input w-full"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div v-if="resetMessage" :class="[
                'text-sm p-3 rounded',
                resetMessage.success
                  ? 'bg-green-900/30 border border-green-800 text-green-400'
                  : 'bg-red-900/30 border border-red-800 text-red-400'
              ]">
                {{ resetMessage.text }}
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="showForgotPassword = false"
                  class="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="sendingReset"
                  class="btn btn-primary flex-1"
                >
                  {{ sendingReset ? 'Sending...' : 'Send Reset Link' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginForm from '../components/LoginForm.vue'
import RegisterForm from '../components/RegisterForm.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('login')
const showForgotPassword = ref(false)
const resetEmail = ref('')
const sendingReset = ref(false)
const resetMessage = ref(null)

function handleAuthSuccess() {
  router.push('/')
}

async function handlePasswordReset() {
  sendingReset.value = true
  resetMessage.value = null

  try {
    await authStore.sendPasswordReset(resetEmail.value)
    resetMessage.value = {
      success: true,
      text: 'Password reset email sent! Check your inbox.'
    }
    resetEmail.value = ''
  } catch (e) {
    resetMessage.value = {
      success: false,
      text: authStore.error || 'Failed to send reset email'
    }
  } finally {
    sendingReset.value = false
  }
}
</script>
