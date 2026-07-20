<template>
  <div class="habit-heatmap">
    <div class="heatmap-header">
      <h3 class="heatmap-title">{{ habitName }}</h3>
      <span class="heatmap-stats">
        {{ currentStreak }}{{ streakUnit }}连续
      </span>
    </div>

    <div class="month-nav">
      <button class="month-btn" @click="prevMonth"><Icon name="chevron-left" :size="16" /></button>
      <span class="month-label">{{ currentYear }}年{{ currentMonth + 1 }}月</span>
      <button class="month-btn" @click="nextMonth"><Icon name="chevron-right" :size="16" /></button>
    </div>

    <div class="weekday-header">
      <span v-for="w in weekdays" :key="w" class="weekday-label">{{ w }}</span>
    </div>

    <div class="heatmap-grid">
      <div v-for="(day, idx) in calendarDays" :key="idx"
        class="heatmap-cell" :class="[day.level, { today: day.isToday, 'other-month': day.isOtherMonth }]"
        :title="day.date ? `${day.date}: ${day.value}/${habitTarget}` : ''">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useHabitStore } from '@/stores/habitStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, getTodayStr } from '@/utils/date'
import { fetchSharedCheckIns } from '@/services/webdavSync'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{ habitId: string; habitName: string; habitTarget: number; refreshTrigger?: number; isShared?: boolean }>()

const habitStore = useHabitStore()
const settingsStore = useSettingsStore()
const todayStr = getTodayStr()

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const currentDate = ref(new Date())
const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

const habit = computed(() => habitStore.habits.get(props.habitId))
const isShared = computed(() => props.isShared ?? habit.value?.isShared ?? false)
const sharedName = computed(() => {
  if (props.isShared) return props.habitName
  return habit.value?.sharedHabitName
})
const myNick = computed(() => settingsStore.syncConfig.nickname)

/** 云端共享打卡数据 */
const sharedCheckIns = ref<{ date: string }[]>([])

async function loadSharedCheckIns() {
  if (!isShared.value || !sharedName.value || !myNick.value) return
  try {
    const data = await fetchSharedCheckIns(settingsStore.syncConfig)
    sharedCheckIns.value = data.filter(c => c.habitName === sharedName.value && c.nick === myNick.value)
  } catch { /* ignore */ }
}

onMounted(() => loadSharedCheckIns())
watch(() => props.refreshTrigger, () => loadSharedCheckIns())

function getDayValue(dateStr: string): number {
  if (isShared.value) return sharedCheckIns.value.some(c => c.date === dateStr) ? 1 : 0
  return habitStore.getCheckInsForHabit(props.habitId)
    .filter(c => c.date === dateStr).reduce((s, c) => s + c.value, 0)
}

function calcSharedStreak(): number {
  const dates = sharedCheckIns.value.map(c => c.date).sort().reverse()
  if (!dates.length) return 0
  let s = 1
  for (let i = 1; i < dates.length; i++) {
    if ((new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000 === 1) s++
    else break
  }
  return s
}

const currentStreak = computed(() => isShared.value ? calcSharedStreak() : habitStore.getStreak(props.habitId))

const streakUnit = computed(() => {
  const h = habit.value
  if (!h) return '天'
  return h.frequency === 'weekly' ? '周' : h.frequency === 'monthly' ? '月' : '天'
})

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(currentDate.value), { weekStartsOn: 0 })
  const result: any[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, 'yyyy-MM-dd')
    const isOtherMonth = d.getMonth() !== currentMonth.value
    const isToday = dateStr === todayStr
    let level = 'level-0'
    let value = 0
    if (!isOtherMonth) {
      value = getDayValue(dateStr)
      const r = props.habitTarget > 0 ? value / props.habitTarget : 0
      if (r >= 1) level = 'level-4'
      else if (r >= 0.75) level = 'level-3'
      else if (r >= 0.5) level = 'level-2'
      else if (r > 0) level = 'level-1'
    }
    result.push({ date: dateStr, value, level, isToday, isOtherMonth })
  }
  return result
})

function prevMonth() { currentDate.value = subMonths(currentDate.value, 1) }
function nextMonth() { currentDate.value = addMonths(currentDate.value, 1) }
</script>

<style scoped>
.habit-heatmap { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--spacing-lg); border: 1px solid var(--color-border-light); }
.heatmap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); }
.heatmap-title { font-size: var(--font-size-md); font-weight: 500; color: var(--color-text); }
.heatmap-stats { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.month-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: var(--spacing-xs); border-radius: var(--radius-sm); display: flex; align-items: center; }
.month-btn:hover { color: var(--color-text); background: var(--color-surface-hover); }
.month-label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text); }
.weekday-header { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 2px; }
.weekday-label { text-align: center; font-size: 10px; color: var(--color-text-muted); padding: 2px 0; }
.heatmap-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.heatmap-cell { aspect-ratio: 1; border-radius: 3px; background: var(--color-bg); position: relative; }
.heatmap-cell.other-month { background: transparent; }
.heatmap-cell.level-1 { background: color-mix(in srgb, var(--color-primary) 25%, transparent); }
.heatmap-cell.level-2 { background: color-mix(in srgb, var(--color-primary) 50%, transparent); }
.heatmap-cell.level-3 { background: color-mix(in srgb, var(--color-primary) 75%, transparent); }
.heatmap-cell.level-4 { background: var(--color-primary); }
.heatmap-cell.today { outline: 2px solid var(--color-text); outline-offset: -1px; z-index: 1; }
</style>
