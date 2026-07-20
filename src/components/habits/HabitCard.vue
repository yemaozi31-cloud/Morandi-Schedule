<template>
  <div class="habit-card" :class="{ compact }" :style="{ '--h-color': habit.color }">
    <!-- 紧凑模式 -->
    <template v-if="compact">
      <div class="compact-row">
        <span class="compact-name">
          {{ habit.name }}
          <span v-if="habit.isShared" class="shared-tag">共享</span>
          <span v-if="habit.sharedCreatedBy" class="shared-by">由 {{ habit.sharedCreatedBy }} 创建</span>
        </span>
        <div class="heatmap-nav-inline">
          <button @click.stop="changeMonth(-1)">←</button>
          <span>{{ heatmapYear }}年{{ heatmapMonth + 1 }}月</span>
          <button @click.stop="changeMonth(1)">→</button>
        </div>
        <span class="compact-streak"><Icon name="flame" :size="12" /> {{ streak }} {{ streakUnit }}</span>
        <span class="compact-dot" :class="{ completed: isCompleted }"></span>
        <button class="compact-checkin" :disabled="!habit.isShared && !todayChecked && isCompleted" @click.stop="handleCheckIn">
          {{ todayChecked ? '取消' : '打卡' }}
        </button>
        <button class="compact-expand" @click.stop="$emit('toggleExpand')">
          <Icon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="14" />
        </button>
        <button class="compact-delete" @click.stop="handleDelete" title="删除">
          <Icon name="x" :size="12" />
        </button>
      </div>
      <!-- 热力方块 -->
      <div class="heatmap-grid">
        <div v-for="(d, i) in monthDays" :key="i"
          class="heatmap-cell"
          :class="d ? 'checked' : 'empty'"
          :title="d || ''">
        </div>
      </div>
    </template>

    <!-- 完整模式（桌面端 TodayView 使用） -->
    <template v-else>
      <div class="habit-header">
        <span class="habit-name">
          {{ habit.name }}
          <span v-if="habit.isShared" class="shared-tag">共享</span>
          <span v-if="habit.sharedCreatedBy" class="shared-by">由 {{ habit.sharedCreatedBy }} 创建</span>
        </span>
        <div class="habit-header-right">
          <span class="habit-streak"><Icon name="flame" :size="14" /> {{ streak }} {{ streakUnit }}</span>
          <button class="delete-habit-btn" @click.stop="handleDelete" title="删除习惯"><Icon name="x" :size="14" /></button>
        </div>
      </div>
      <div class="habit-progress">
        <div class="progress-text">
          <span>{{ periodLabel }}进度</span>
          <span>{{ periodValue }} / {{ habit.target }} {{ habit.unit === 'minutes' ? '分钟' : '次' }}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
      <div class="habit-actions">
        <button class="checkin-btn" :disabled="!habit.isShared && !todayChecked && isCompleted" @click="handleCheckIn">
          <Icon :name="todayChecked ? 'x' : 'plus'" :size="16" />
          {{ todayChecked ? '取消' : '打卡' }}
        </button>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Habit } from '@/types'
import { useHabitStore } from '@/stores/habitStore'
import { useSettingsStore } from '@/stores/settingsStore'
import Icon from '@/components/common/Icon.vue'
import { checkInSharedHabit, cancelCheckIn } from '@/services/webdavSync'
import { getTodayStr } from '@/utils/date'
import { showConfirm } from '@/utils/globalConfirm'


const props = defineProps<{
  habit: Habit
  compact?: boolean
  expanded?: boolean
  refreshTrigger?: number
}>()

const emit = defineEmits<{
  (e: 'checked', habitId: string): void
  (e: 'delete', habitId: string): void
  (e: 'toggleExpand'): void
}>()

const habitStore = useHabitStore()
const settingsStore = useSettingsStore()
const cfg = computed(() => settingsStore.syncConfig)

/** 共享习惯：从云端获取的打卡日期集合 */
const sharedCheckInDates = ref<Set<string>>(new Set())

/** 从云端加载共享打卡数据 */
async function refreshSharedFromCloud() {
  if (!props.habit.isShared || !cfg.value.nickname || !props.habit.sharedHabitName) return
  try {
    const { fetchSharedCheckIns } = await import('@/services/webdavSync')
    const data = await fetchSharedCheckIns(cfg.value)
    const myDates = data
      .filter(c => c.habitName === props.habit.sharedHabitName && c.nick === cfg.value.nickname)
      .map(c => c.date)
    sharedCheckInDates.value = new Set(myDates)
  } catch (e) { console.error('[HabitCard] 刷新共享打卡失败:', e) }
}

/** 今天是否已打卡（共享/普通通用） */
const todayChecked = computed(() => {
  if (props.habit.isShared) return sharedCheckInDates.value.has(getTodayStr())
  return habitStore.getCheckInsForHabit(props.habit.id).some(c => c.date === getTodayStr())
})

// ── 热力图月份状态 ──────────────────────────────
const heatmapViewDate = ref(new Date())
const heatmapYear = computed(() => heatmapViewDate.value.getFullYear())
const heatmapMonth = computed(() => heatmapViewDate.value.getMonth())

function changeMonth(delta: number) {
  const d = new Date(heatmapViewDate.value)
  d.setMonth(d.getMonth() + delta)
  heatmapViewDate.value = d
}

const monthDays = computed(() => {
  const year = heatmapViewDate.value.getFullYear()
  const month = heatmapViewDate.value.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result: string[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (props.habit.isShared) {
      result.push(sharedCheckInDates.value.has(dateStr) ? dateStr : '')
    } else {
      result.push(habitStore.getCheckInsForHabit(props.habit.id).some(c => c.date === dateStr) ? dateStr : '')
    }
  }
  return result
})

const periodLabel = computed(() => habitStore.getPeriodLabel(props.habit.frequency))
const periodValue = computed(() =>
  props.habit.isShared ? (todayChecked.value ? 1 : 0) : habitStore.getPeriodValue(props.habit.id)
)
const streak = computed(() => {
  if (props.habit.isShared) {
    const dates = Array.from(sharedCheckInDates.value).sort().reverse()
    if (dates.length === 0) return 0
    let s = 1
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      if ((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24) === 1) s++
      else break
    }
    return s
  }
  return habitStore.getStreak(props.habit.id)
})
const streakUnit = computed(() => {
  if (props.habit.frequency === 'weekly') return '周'
  if (props.habit.frequency === 'monthly') return '月'
  return '天'
})
const isCompleted = computed(() => periodValue.value >= props.habit.target)

const progressPercent = computed(() =>
  Math.min(100, Math.round((periodValue.value / props.habit.target) * 100))
)

// 共享习惯：挂载时加载 + 外部 trigger 刷新
if (props.habit.isShared) {
  refreshSharedFromCloud()
  watch(() => props.refreshTrigger, () => refreshSharedFromCloud())
}

async function handleCheckIn() {
  try {
    if (props.habit.isShared) {
      if (todayChecked.value) {
        const ok = await cancelCheckIn(cfg.value, props.habit.sharedHabitName!, cfg.value.nickname!)
        if (ok) {
          sharedCheckInDates.value.delete(getTodayStr())
          window.__message?.info('已取消打卡')
        } else {
          window.__message?.error('取消失败，请检查网络')
        }
      } else {
        const ok = await checkInSharedHabit(cfg.value, props.habit.sharedHabitName!, cfg.value.nickname!)
        if (ok) {
          sharedCheckInDates.value.add(getTodayStr())
          window.__message?.success('打卡成功')
        } else {
          window.__message?.error('打卡失败，请检查网络')
        }
      }
      emit('checked', props.habit.id)
      return
    }
    // 普通习惯：支持取消
    const today = getTodayStr()
    const existing = habitStore.getCheckInsForHabit(props.habit.id).find(c => c.date === today)
    if (existing) {
      await habitStore.deleteCheckIn(props.habit.id, today)
      window.__message?.info('已取消打卡')
    } else {
      await habitStore.checkIn(props.habit.id, props.habit.unit === 'minutes' ? props.habit.target : 1)
      window.__message?.success('打卡成功')
    }
    emit('checked', props.habit.id)
  } catch {
    window.__message?.error('操作失败')
  }
}

async function handleDelete() {
  const ok = await showConfirm({ title: '删除习惯', content: `确认删除习惯"${props.habit.name}"？打卡记录也将被清除。` })
  if (!ok) return
  try {
    if (props.habit.isShared && props.habit.sharedHabitName) {
      // 共享习惯：退出到云端，本地不留记录
      const { leaveSharedHabit } = await import('@/services/webdavSync')
      await leaveSharedHabit(cfg.value, props.habit.sharedHabitName, cfg.value.nickname!)
    } else {
      // 普通习惯：删本地记录
      await habitStore.deleteHabit(props.habit.id)
    }
    window.__message?.success('习惯已删除')
  } catch {
    window.__message?.error('删除失败')
  }
}
</script>

<style scoped>
.habit-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border-light);
  border-left: 4px solid var(--h-color);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* 紧凑模式 */
.habit-card.compact {
  padding: 0;
  border-left: 3px solid var(--h-color);
  border-radius: var(--radius-md);
  gap: 0;
}

.compact-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) var(--spacing-md);
  min-height: 48px;
}

.compact-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-md);
  color: var(--color-text);
  font-weight: 500;
}

.compact-streak {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-right: 4px;
}

.compact-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.compact-dot.completed {
  background: var(--color-success);
  border-color: var(--color-success);
}

.compact-checkin {
  min-width: 48px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--h-color);
  background: color-mix(in srgb, var(--h-color) 10%, var(--color-surface));
  color: var(--h-color);
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  text-align: center;
}

.compact-checkin:disabled {
  opacity: 0.5;
  cursor: default;
}

.compact-expand {
  background: none;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
}

.compact-expand:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.compact-delete {
  background: none;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact-delete:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
}

/* 完整模式 */
.habit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.habit-name { font-size: var(--font-size-md); font-weight: 500; color: var(--color-text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.habit-header-right { display: flex; align-items: center; gap: var(--spacing-sm); flex-shrink: 0; }
.habit-streak { font-size: var(--font-size-sm); color: var(--color-text-muted); white-space: nowrap; }

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.progress-bar-bg {
  height: 6px;
  background: var(--color-bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--h-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.checkin-btn {
  width: 100%;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--h-color);
  color: var(--h-color);
  background: color-mix(in srgb, var(--h-color) 10%, var(--color-surface));
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.checkin-btn:hover:not(:disabled) {
  background: var(--h-color);
  color: var(--color-text-on-primary);
}

.checkin-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.delete-habit-btn {
  color: var(--color-text-muted);
  font-size: 14px;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.delete-habit-btn:hover {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}

/* ── 共享习惯标签 ──────────────────────── */
.shared-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, #A3B5A0 20%, transparent);
  color: #6B8F71;
  font-weight: 500;
  margin-left: 4px;
  vertical-align: middle;
}
.shared-by {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-left: var(--spacing-xs);
  vertical-align: middle;
}

/* ── 紧凑模式热力图（与共享空间一致） ────────── */
.heatmap-nav-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.heatmap-nav-inline button {
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  line-height: 1.3;
  transition: all var(--transition-fast);
}
.heatmap-nav-inline button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.heatmap-grid {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  padding: 0 var(--spacing-md) var(--spacing-sm);
}
.heatmap-cell {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.heatmap-cell.empty {
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
}
.heatmap-cell.checked {
  background: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 70%, transparent);
}

/* ── 手机端缩小按钮 ──────────────────────── */
@media (max-width: 767px) {
  .compact-checkin {
    min-width: 40px;
    padding: 6px 8px;
    font-size: 11px;
  }
  .compact-expand {
    min-width: 32px;
    min-height: 28px;
  }
  .compact-delete {
    min-width: 32px;
    min-height: 28px;
  }
}
</style>
