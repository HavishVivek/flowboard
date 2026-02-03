<template>
  <div class="bg-gray-800 rounded-xl p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <button @click="previousWeek" class="p-2 hover:bg-gray-700 rounded-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 class="font-semibold text-lg">{{ weekLabel }}</h3>
        <button @click="nextWeek" class="p-2 hover:bg-gray-700 rounded-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <button @click="goToToday" class="btn btn-secondary text-sm">Today</button>
    </div>

    <!-- Week Grid -->
    <div class="grid grid-cols-7 gap-2">
      <!-- Day Headers -->
      <div
        v-for="(day, index) in weekDays"
        :key="day.date"
        :class="[
          'text-center p-2 rounded-t-lg',
          isToday(day.date) ? 'bg-primary-600' : 'bg-gray-700'
        ]"
      >
        <div class="text-xs text-gray-400">{{ dayNames[index] }}</div>
        <div class="font-semibold">{{ day.dayNum }}</div>
      </div>

      <!-- Day Content -->
      <div
        v-for="day in weekDays"
        :key="'content-' + day.date"
        :class="[
          'min-h-[150px] p-2 rounded-b-lg border-t-0',
          isToday(day.date) ? 'bg-primary-900/30 border border-primary-600' : 'bg-gray-750 border border-gray-700'
        ]"
      >
        <div class="space-y-1">
          <div
            v-for="item in getScheduleForDate(day.date)"
            :key="item.id"
            :class="[
              'text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity',
              item.ai_suggested ? 'bg-purple-900/50 border border-purple-700' : 'bg-gray-700'
            ]"
            @click="$emit('item-click', item)"
          >
            <div class="flex items-center gap-1 mb-1">
              <span v-if="item.ai_suggested" class="text-purple-400">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </span>
              <span class="text-gray-400">{{ item.time_slot }}</span>
            </div>
            <div class="font-medium text-gray-200 truncate">{{ item.task_title || 'Task' }}</div>
          </div>
        </div>

        <button
          v-if="getScheduleForDate(day.date).length === 0"
          @click="$emit('add-item', day.date)"
          class="w-full h-full flex items-center justify-center text-gray-500 hover:text-gray-400 text-xs"
        >
          + Add
        </button>
      </div>
    </div>

    <!-- AI Generate Button -->
    <div class="mt-4 flex justify-center">
      <button
        @click="$emit('generate-schedule')"
        :disabled="generating"
        class="btn btn-primary flex items-center gap-2"
      >
        <svg v-if="!generating" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ generating ? 'Generating...' : 'AI Generate Schedule' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  scheduleItems: {
    type: Array,
    default: () => []
  },
  generating: {
    type: Boolean,
    default: false
  }
})

defineEmits(['generate-schedule', 'item-click', 'add-item'])

const currentWeekStart = ref(getStartOfWeek(new Date()))
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getStartOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: date.getDate()
    })
  }
  return days
})

const weekLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  const startDate = new Date(start.date)
  const endDate = new Date(end.date)

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.dayNum} - ${end.dayNum}`
  }
  return `${startMonth} ${start.dayNum} - ${endMonth} ${end.dayNum}`
})

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0]
}

function getScheduleForDate(dateStr) {
  return props.scheduleItems.filter(item => item.date === dateStr)
}

function previousWeek() {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() - 7)
  currentWeekStart.value = newStart
}

function nextWeek() {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() + 7)
  currentWeekStart.value = newStart
}

function goToToday() {
  currentWeekStart.value = getStartOfWeek(new Date())
}
</script>
