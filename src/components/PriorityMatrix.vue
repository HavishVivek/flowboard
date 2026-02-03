<template>
  <div class="bg-gray-800 rounded-xl p-4">
    <h3 class="font-semibold mb-4">Priority Matrix</h3>

    <div class="grid grid-cols-2 gap-2 relative">
      <!-- Y-axis label -->
      <div class="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500 whitespace-nowrap">
        Impact
      </div>

      <!-- High Impact, Low Effort - DO FIRST -->
      <div class="bg-green-900/30 border border-green-700 rounded-lg p-3 min-h-[150px]">
        <div class="text-xs font-medium text-green-400 mb-2">DO FIRST</div>
        <div class="space-y-1">
          <div
            v-for="item in quadrants.doFirst"
            :key="item.id"
            class="text-xs bg-green-900/50 rounded px-2 py-1 truncate cursor-pointer hover:bg-green-800/50"
            @click="$emit('item-click', item)"
          >
            {{ item.name || item.title }}
          </div>
        </div>
      </div>

      <!-- High Impact, High Effort - SCHEDULE -->
      <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-3 min-h-[150px]">
        <div class="text-xs font-medium text-blue-400 mb-2">SCHEDULE</div>
        <div class="space-y-1">
          <div
            v-for="item in quadrants.schedule"
            :key="item.id"
            class="text-xs bg-blue-900/50 rounded px-2 py-1 truncate cursor-pointer hover:bg-blue-800/50"
            @click="$emit('item-click', item)"
          >
            {{ item.name || item.title }}
          </div>
        </div>
      </div>

      <!-- Low Impact, Low Effort - DELEGATE/QUICK WINS -->
      <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 min-h-[150px]">
        <div class="text-xs font-medium text-yellow-400 mb-2">QUICK WINS</div>
        <div class="space-y-1">
          <div
            v-for="item in quadrants.quickWins"
            :key="item.id"
            class="text-xs bg-yellow-900/50 rounded px-2 py-1 truncate cursor-pointer hover:bg-yellow-800/50"
            @click="$emit('item-click', item)"
          >
            {{ item.name || item.title }}
          </div>
        </div>
      </div>

      <!-- Low Impact, High Effort - ELIMINATE -->
      <div class="bg-red-900/30 border border-red-700 rounded-lg p-3 min-h-[150px]">
        <div class="text-xs font-medium text-red-400 mb-2">RECONSIDER</div>
        <div class="space-y-1">
          <div
            v-for="item in quadrants.reconsider"
            :key="item.id"
            class="text-xs bg-red-900/50 rounded px-2 py-1 truncate cursor-pointer hover:bg-red-800/50"
            @click="$emit('item-click', item)"
          >
            {{ item.name || item.title }}
          </div>
        </div>
      </div>

      <!-- X-axis label -->
      <div class="col-span-2 text-center text-xs text-gray-500 mt-2">
        Effort →
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

defineEmits(['item-click'])

const quadrants = computed(() => {
  const result = {
    doFirst: [],    // High impact, low effort (priority_score > 3)
    schedule: [],   // High impact, high effort
    quickWins: [],  // Low impact, low effort
    reconsider: []  // Low impact, high effort (priority_score < 1.5)
  }

  props.items.forEach(item => {
    const impact = item.impact || 3
    const effort = item.effort || 3

    if (impact >= 3 && effort <= 3) {
      result.doFirst.push(item)
    } else if (impact >= 3 && effort > 3) {
      result.schedule.push(item)
    } else if (impact < 3 && effort <= 3) {
      result.quickWins.push(item)
    } else {
      result.reconsider.push(item)
    }
  })

  return result
})
</script>
