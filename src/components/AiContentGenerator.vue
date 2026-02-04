<template>
  <div class="card">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 class="font-semibold">AI Content Generator</h3>
      </div>
      <button
        v-if="!showGenerator"
        @click="showGenerator = true"
        class="btn btn-secondary btn-sm"
      >
        Open Generator
      </button>
      <button
        v-else
        @click="showGenerator = false"
        class="text-gray-400 hover:text-white"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Collapsed State -->
    <div v-if="!showGenerator" class="text-center py-4">
      <p class="text-gray-400 text-sm">Generate content ideas, titles, and outlines with AI</p>
      <p v-if="!hasApiKey" class="text-yellow-500 text-xs mt-2">
        Add your Hugging Face API key in Settings to enable AI features
      </p>
    </div>

    <!-- Expanded Generator -->
    <div v-else class="space-y-4">
      <!-- Generation Type Tabs -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="genType in generationTypes"
          :key="genType.id"
          @click="selectedType = genType.id"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            selectedType === genType.id
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          ]"
        >
          {{ genType.label }}
        </button>
      </div>

      <!-- Input Form -->
      <div class="space-y-3">
        <!-- Topic/Title Input -->
        <div>
          <label class="label">{{ inputLabel }}</label>
          <input
            v-model="inputText"
            type="text"
            :placeholder="inputPlaceholder"
            class="input w-full"
            @keyup.enter="generate"
          />
        </div>

        <!-- Additional Options Based on Type -->
        <div v-if="selectedType === 'social'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Platform</label>
            <select v-model="platform" class="select w-full">
              <option value="general">General</option>
              <option value="Twitter/X">Twitter/X</option>
              <option value="Instagram">Instagram</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="TikTok">TikTok</option>
            </select>
          </div>
          <div>
            <label class="label">Date Context</label>
            <input v-model="selectedDate" type="date" class="input w-full" />
          </div>
        </div>

        <div v-if="selectedType === 'titles'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Style</label>
            <select v-model="contentStyle" class="select w-full">
              <option value="informative">Informative</option>
              <option value="listicle">Listicle</option>
              <option value="how-to">How-To Guide</option>
              <option value="opinion">Opinion/Editorial</option>
              <option value="news">News/Update</option>
            </select>
          </div>
        </div>

        <div v-if="selectedType === 'outline'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Content Type</label>
            <select v-model="contentType" class="select w-full">
              <option value="blog">Blog Post</option>
              <option value="video">Video Script</option>
              <option value="tutorial">Tutorial</option>
              <option value="shorts">Short-form Video</option>
            </select>
          </div>
          <div>
            <label class="label">Sections</label>
            <input v-model.number="sectionCount" type="number" min="3" max="10" class="input w-full" />
          </div>
        </div>

        <div v-if="selectedType === 'calendar'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Date</label>
            <input v-model="selectedDate" type="date" class="input w-full" required />
          </div>
          <div>
            <label class="label">Content Niche</label>
            <select v-model="niche" class="select w-full">
              <option value="general">General</option>
              <option value="tech">Technology</option>
              <option value="business">Business</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>
        </div>

        <div v-if="selectedType === 'custom'">
          <label class="label">Your Prompt</label>
          <textarea
            v-model="customPrompt"
            class="input w-full h-24"
            placeholder="Describe what content you want to generate..."
          ></textarea>
        </div>

        <!-- Generate Button -->
        <button
          @click="generate"
          :disabled="loading || !canGenerate"
          class="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <svg
            v-if="loading"
            class="w-5 h-5 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ loading ? loadingMessage : 'Generate Content' }}
        </button>
      </div>

      <!-- Loading State with Progress -->
      <div v-if="loading" class="bg-gray-700/50 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="relative w-10 h-10">
            <svg class="w-10 h-10 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <p class="text-gray-200 font-medium">{{ loadingMessage }}</p>
            <p class="text-gray-400 text-sm">This may take 10-30 seconds if the model is loading...</p>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-red-300 font-medium">Generation Failed</p>
            <p class="text-red-400/80 text-sm mt-1">{{ error }}</p>
            <button @click="error = null" class="text-red-300 text-sm mt-2 hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <!-- Generated Content Display -->
      <div v-if="generatedContent && !loading" class="bg-gray-700/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-gray-200">Generated Content</h4>
          <div class="flex gap-2">
            <button
              @click="copyToClipboard"
              class="text-gray-400 hover:text-white p-1"
              title="Copy to clipboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              @click="generatedContent = null"
              class="text-gray-400 hover:text-white p-1"
              title="Clear"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="prose prose-invert prose-sm max-w-none">
          <pre class="whitespace-pre-wrap text-gray-300 text-sm bg-gray-800 rounded p-3 overflow-x-auto">{{ generatedContent }}</pre>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="useAsTitle" v-if="selectedType === 'titles'" class="btn btn-secondary btn-sm">
            Use as Content Title
          </button>
          <button @click="saveAsIdea" class="btn btn-secondary btn-sm">
            Save as Content Idea
          </button>
          <button @click="generate" class="btn btn-secondary btn-sm">
            Regenerate
          </button>
        </div>
      </div>

      <!-- Copied Toast -->
      <div
        v-if="showCopied"
        class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        Copied to clipboard!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  generateSocialPostIdeas,
  generateBlogTitles,
  generateContentOutline,
  generateDateBasedIdeas,
  generateCustomContent,
  isConfigured
} from '../services/groqAI'

const emit = defineEmits(['use-title', 'save-idea'])

// UI State
const showGenerator = ref(false)
const loading = ref(false)
const loadingMessage = ref('Generating...')
const error = ref(null)
const generatedContent = ref(null)
const showCopied = ref(false)
const hasApiKey = ref(false)

// Generation Type Options
const generationTypes = [
  { id: 'social', label: 'Social Posts' },
  { id: 'titles', label: 'Blog Titles' },
  { id: 'outline', label: 'Content Outline' },
  { id: 'calendar', label: 'Date Ideas' },
  { id: 'custom', label: 'Custom Prompt' }
]
const selectedType = ref('social')

// Form State
const inputText = ref('')
const platform = ref('general')
const selectedDate = ref('')
const contentStyle = ref('informative')
const contentType = ref('blog')
const sectionCount = ref(5)
const niche = ref('general')
const customPrompt = ref('')

// Computed Properties
const inputLabel = computed(() => {
  const labels = {
    social: 'Topic',
    titles: 'Blog Topic',
    outline: 'Content Title',
    calendar: 'Date',
    custom: 'Prompt'
  }
  return labels[selectedType.value] || 'Topic'
})

const inputPlaceholder = computed(() => {
  const placeholders = {
    social: 'e.g., Benefits of morning routines',
    titles: 'e.g., Productivity tips for remote workers',
    outline: 'e.g., Complete Guide to Home Automation',
    calendar: 'Select a date above',
    custom: 'Describe your content needs...'
  }
  return placeholders[selectedType.value] || 'Enter topic...'
})

const canGenerate = computed(() => {
  if (!hasApiKey.value) return false

  switch (selectedType.value) {
    case 'calendar':
      return !!selectedDate.value
    case 'custom':
      return customPrompt.value.trim().length > 0
    default:
      return inputText.value.trim().length > 0
  }
})

// Methods
async function checkApiKey() {
  hasApiKey.value = await isConfigured()
}

async function generate() {
  if (!canGenerate.value) return

  loading.value = true
  error.value = null
  generatedContent.value = null
  loadingMessage.value = 'Connecting to AI model...'

  try {
    let result

    switch (selectedType.value) {
      case 'social':
        loadingMessage.value = 'Generating social post ideas...'
        result = await generateSocialPostIdeas(
          inputText.value,
          platform.value,
          selectedDate.value || null
        )
        break

      case 'titles':
        loadingMessage.value = 'Generating blog titles...'
        result = await generateBlogTitles(inputText.value, contentStyle.value)
        break

      case 'outline':
        loadingMessage.value = 'Creating content outline...'
        result = await generateContentOutline(
          inputText.value,
          contentType.value,
          sectionCount.value
        )
        break

      case 'calendar':
        loadingMessage.value = 'Finding date-relevant ideas...'
        result = await generateDateBasedIdeas(selectedDate.value, niche.value)
        break

      case 'custom':
        loadingMessage.value = 'Processing your request...'
        result = await generateCustomContent(customPrompt.value)
        break

      default:
        throw new Error('Unknown generation type')
    }

    generatedContent.value = result
  } catch (e) {
    error.value = e.message || 'Failed to generate content. Please try again.'
  } finally {
    loading.value = false
    loadingMessage.value = 'Generating...'
  }
}

function copyToClipboard() {
  if (generatedContent.value) {
    navigator.clipboard.writeText(generatedContent.value)
    showCopied.value = true
    setTimeout(() => {
      showCopied.value = false
    }, 2000)
  }
}

function useAsTitle() {
  if (generatedContent.value) {
    // Extract first title from generated content
    const lines = generatedContent.value.split('\n')
    const titleLine = lines.find(line => line.match(/^\d+\./))
    if (titleLine) {
      const title = titleLine.replace(/^\d+\.\s*/, '').trim()
      emit('use-title', title)
    }
  }
}

function saveAsIdea() {
  if (generatedContent.value) {
    emit('save-idea', {
      title: inputText.value || 'AI Generated Idea',
      description: generatedContent.value,
      type: selectedType.value
    })
  }
}

// Lifecycle
onMounted(checkApiKey)
</script>
