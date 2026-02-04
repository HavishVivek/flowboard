import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, logout, subscribeToAuthChanges, resetPassword } from '../services/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const userId = computed(() => user.value?.uid || null)
  const userEmail = computed(() => user.value?.email || null)

  function initAuthListener() {
    return new Promise((resolve) => {
      subscribeToAuthChanges((firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
        resolve(firebaseUser)
      })
    })
  }

  async function loginUser(email, password) {
    error.value = null
    try {
      const firebaseUser = await login(email, password)
      user.value = firebaseUser
      return firebaseUser
    } catch (e) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    }
  }

  async function registerUser(email, password) {
    error.value = null
    try {
      const firebaseUser = await register(email, password)
      user.value = firebaseUser
      return firebaseUser
    } catch (e) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    }
  }

  async function logoutUser() {
    error.value = null
    try {
      await logout()
      user.value = null
    } catch (e) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    }
  }

  async function sendPasswordReset(email) {
    error.value = null
    try {
      await resetPassword(email)
    } catch (e) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    userId,
    userEmail,
    initAuthListener,
    loginUser,
    registerUser,
    logoutUser,
    sendPasswordReset,
    clearError
  }
})

function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/invalid-api-key': 'Invalid Firebase API key. Check your .env file.',
    'auth/configuration-not-found': 'Firebase project not found. Check your Firebase configuration.'
  }
  return messages[code] || `Authentication error: ${code || 'Unknown error'}`
}
