<template>
  <AppLayout>
    <div class="calendar-view">
      <CalendarHeader
        :title="headerTitle"
        :current-view="currentView"
        :views="isMobile ? mobileViews : desktopViews"
        :date-picker="currentView === 'day'"
        :date-value="selectedDay || currentDate"
        @prev="goPrev"
        @next="goNext"
        @today="goToday"
        @update:current-view="switchView"
        @select-date="onDatePickerChange"
      />

      <!-- 月进度统计 -->
      <div v-if="currentView === 'month'" class="monthly-stats">
        <div class="stat-row">
          <span>本月任务 <strong>{{ monthlyStats.total }}</strong></span>
          <span class="sep">·</span>
          <span>已完成 <strong class="done">{{ monthlyStats.completed }}</strong></span>
          <span class="sep">·</span>
          <span>完成率 <strong :class="monthlyStats.rate >= 60 ? 'good' : 'low'">{{ monthlyStats.rate }}%</strong></span>
          <span class="sep">·</span>
          <span>剩余 <strong class="pending">{{ monthlyStats.remaining }}</strong></span>
        </div>
      </div>

      <!-- 月/周/日视图切换 -->
      <div class="view-container">
        <MonthView
          v-if="currentView === 'month'"
          :current-date="currentDate"
          :task-map="taskMap"
          :tasks="taskStore.activeTasks"
          :selected-date="selectedDay"
          @select-date="selectDate"
          @select-task="openTask"
          @create-task="handleCreateTask"
        />
        <WeekView
          v-else-if="currentView === 'week'"
          :current-date="currentDate"
          :tasks="taskStore.activeTasks"
          :selected-date="selectedDay"
          @select-date="selectDate"
          @select-task="openTask"
          @create-task="handleCreateTask"
          @toggle-task="handleToggle"
          @delete-task="handleDelete"
        />
        <DayTimeline
          v-else
          :tasks="dayTasks"
          :current-date="selectedDay || currentDate"
          :show-nav="false"
          @create-task="handleCreateTask"
          @select-task="openTask"
          @toggle-task="handleToggle"
          @delete-task="handleDelete"
          @update:current-date="onDayNav"
          @move-task="handleMoveTask"
        />
      </div>

      <!-- 任务详情弹窗 -->
      <TaskDetailModal
        :task-id="uiStore.detailTaskId"
        @close="uiStore.closeDetail()"
      />
      <!-- 悬浮任务面板（月视图中选中某天后显示） -->
      <transition name="panel-slide">
        <div v-if="showDayPanel" class="day-panel-overlay" @click.self="closeDayPanel">
          <div class="day-panel">
            <div class="panel-header">
              <h3 class="panel-date">{{ selectedDayLabel }}</h3>
              <button class="panel-close" @click="closeDayPanel"><Icon name="x" :size="16" /></button>
            </div>
            <div class="panel-tasks">
              <div
                v-for="task in dayTasks"
                :key="task.id"
                class="panel-task"
                :class="['p-' + task.priority, { completed: task.status === 'completed' }]"
              >
                <button class="panel-task-toggle" @click.stop="handleToggle(task.id)">
                  <Icon :name="task.status === 'completed' ? 'check-circle' : 'circle'" :size="16" />
                </button>
                <span class="panel-task-title" @click="openEdit(task.id)">{{ task.title }}</span>
                <span class="panel-task-time" v-if="task.dueTime && (!task.isSpanning || task.dueDate === selectedDay)">
                  {{ task.dueTime }}{{ task.endTime ? '~' + task.endTime : '' }}
                </span>
                <button class="panel-task-delete" @click.stop="handleDelete(task.id)"><Icon name="x" :size="12" /></button>
              </div>
              <div v-if="dayTasks.length === 0" class="panel-empty">当天无任务</div>
            </div>
            <div class="panel-quick-add">
              <input
                v-model="quickAddText"
                class="quick-add-input"
                placeholder="快速添加任务..."
                @keydown.enter="handleQuickAdd"
              />
              <button class="quick-add-btn" @click="handleQuickAdd" :disabled="!quickAddText.trim()">添加</button>
            </div>
            <button class="panel-new-task" @click="openNewTask">+ 新建任务</button>
          </div>
        </div>
      </transition>

      <!-- 任务编辑弹窗 -->
      <TaskFormModal
        :visible="uiStore.showTaskForm"
        :editing-task="editingTask"
        @close="uiStore.closeTaskForm()"
        @save="handleSave"
      />

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { Task } from '@/types'
import { useTaskStore } from '@/stores/taskStore'
import { useUiStore } from '@/stores/uiStore'
import { useResponsive } from '@/composables/useResponsive'
import { format, parseISO, addMonths, addWeeks, addDays, getTodayStr, startOfWeek, getWeekNumber } from '@/utils/date'
import { nlpParse } from '@/utils/nlpParser'

import AppLayout from '@/components/layout/AppLayout.vue'
import CalendarHeader from '@/components/calendar/CalendarHeader.vue'
import MonthView from '@/components/calendar/MonthView.vue'
import WeekView from '@/components/calendar/WeekView.vue'
import DayTimeline from '@/components/calendar/DayTimeline.vue'
import type { PeriodKey } from '@/components/calendar/DayTimeline.vue'
import TaskFormModal from '@/components/todo/TaskFormModal.vue'
import TaskDetailModal from '@/components/todo/TaskDetailModal.vue'
import Icon from '@/components/common/Icon.vue'

const taskStore = useTaskStore()
const uiStore = useUiStore()
const { isMobile } = useResponsive()

const currentDate = ref(getTodayStr())
const currentView = ref(localStorage.getItem('cal_view') || 'month')
watch(currentView, (v) => localStorage.setItem('cal_view', v))
const selectedDay = ref('')
const editingTask = ref<Task | null>(null)
const quickAddText = ref('')

const showDayPanel = computed(() =>
  selectedDay.value && currentView.value === 'month' && !isMobile.value
)

// 月进度统计
const monthlyStats = computed(() => {
  const d = parseISO(currentDate.value)
  const year = d.getFullYear()
  const month = d.getMonth()
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const monthTasks = taskStore.activeTasks.filter(t => {
    if (!t.dueDate) return false
    if (t.isSpanning && t.startDate) {
       const start = parseISO(t.startDate)
       const end = parseISO(t.dueDate)
      return start <= monthEnd && end >= monthStart
    }
    const td = parseISO(t.dueDate)
    return td.getFullYear() === year && td.getMonth() === month
  })
  const total = monthTasks.length
  const completed = monthTasks.filter(t => t.status === 'completed').length
  return {
    total,
    completed,
    remaining: total - completed,
    rate: total > 0 ? Math.round((completed / total) * 100) : 0
  }
})

onMounted(async () => {
  try {
    await taskStore.loadTasks()
  } catch (e) {
    console.error('Failed to load tasks for calendar:', e)
    window.__message?.error('任务加载失败，请刷新重试')
  }
})

const desktopViews = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'day', label: '日' }
]

const mobileViews = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'day', label: '日' }
]

const headerTitle = computed(() => {
  const d = parseISO(currentDate.value)
  if (currentView.value === 'month') {
    return isMobile.value ? format(d, 'M月') : format(d, 'yyyy年 M月')
  }
  if (currentView.value === 'week') {
    const start = startOfWeek(d, { weekStartsOn: 1 })
    const end = addDays(start, 6)
    return `${start.getDate()}-${end.getDate()}`
  }
  return isMobile.value ? format(d, 'M.d') : format(d, 'yyyy年M月d日')
})

// 月视图任务统计（持续事件跨天显示）
const taskMap = computed(() => {
  const map = new Map<string, number>()
  for (const t of taskStore.activeTasks) {
    if (t.status !== 'pending') continue
    if (!t.dueDate) continue
    if (t.isSpanning && t.startDate) {
       const start = new Date(t.startDate)
       const end = new Date(t.dueDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10)
        map.set(key, (map.get(key) || 0) + 1)
      }
    } else {
      map.set(t.dueDate, (map.get(t.dueDate) || 0) + 1)
    }
  }
  return map
})

// 日视图任务（包含持续事件跨天）
const dayTasks = computed(() =>
  taskStore.activeTasks.filter(t => {
    const targetDate = selectedDay.value || currentDate.value
    if (!targetDate || !t.dueDate) return false
    if (t.isSpanning && t.startDate) {
       return targetDate >= t.startDate && targetDate <= t.dueDate
     }
    return t.dueDate === targetDate
  })
)

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  const d = parseISO(selectedDay.value)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return format(d, 'M月d日') + ' ' + weekdays[d.getDay()]
})

function goPrev() {
  const d = parseISO(currentDate.value)
  if (currentView.value === 'week') currentDate.value = format(addWeeks(d, -1), 'yyyy-MM-dd')
  else if (currentView.value === 'month') currentDate.value = format(addMonths(d, -1), 'yyyy-MM-dd')
  else {
    currentDate.value = format(addDays(d, -1), 'yyyy-MM-dd')
    selectedDay.value = currentDate.value // 日视图同步 selectedDay
  }
}

function goNext() {
  const d = parseISO(currentDate.value)
  if (currentView.value === 'week') currentDate.value = format(addWeeks(d, 1), 'yyyy-MM-dd')
  else if (currentView.value === 'month') currentDate.value = format(addMonths(d, 1), 'yyyy-MM-dd')
  else {
    currentDate.value = format(addDays(d, 1), 'yyyy-MM-dd')
    selectedDay.value = currentDate.value // 日视图同步 selectedDay
  }
}

function goToday() {
  currentDate.value = getTodayStr()
  selectedDay.value = getTodayStr()
}

function switchView(view: string) {
  currentView.value = view
  if (view === 'day' && !selectedDay.value) {
    selectedDay.value = currentDate.value
  }
  if (view === 'month') {
    selectedDay.value = ''  // 切回月视图时清空选中日期，panel 不自动弹出
  }
}

function onDatePickerChange(date: string) {
  currentDate.value = date
  selectedDay.value = date
}

function onDayNav(date: string) {
  currentDate.value = date
  selectedDay.value = date
}

function selectDate(date: string) {
  selectedDay.value = date
  if (isMobile.value) {
    currentView.value = 'day'
  }
}

function closeDayPanel() {
  selectedDay.value = ''
}

function openTask(taskId: string) {
  uiStore.openDetail(taskId)
}

function openEdit(taskId: string) {
  openTask(taskId)
}

function openNewTask() {
  editingTask.value = null
  // 如果当前选中了某天，预填日期
  const prefill = selectedDay.value ? { dueDate: selectedDay.value } : undefined
  uiStore.openNewTaskForm(prefill)
}

// 当通过 TaskDetailModal 打开编辑表单时，同步 editingTask
watch(() => uiStore.showTaskForm, (show) => {
  if (show && uiStore.editingTaskId) {
    editingTask.value = taskStore.getTaskById(uiStore.editingTaskId) || null
  }
})

function handleCreateTask(data: { dueDate: string; dueTime?: string }) {
  // 从日历点击 → 打开表单并预填日期/时间
  editingTask.value = null
  selectedDay.value = data.dueDate
  uiStore.openNewTaskForm({
    dueDate: data.dueDate,
    dueTime: data.dueTime
  })
}

/** 拖拽任务到不同时段 */
async function handleMoveTask(data: { taskId: string; targetPeriod: PeriodKey }) {
  const task = taskStore.getTaskById(data.taskId)
  if (!task) return
  const targetHours: Record<PeriodKey, string | null> = {
    'all-day': null,
    'morning': '09',
    'afternoon': '14',
    'evening': '20'
  }
  const hour = targetHours[data.targetPeriod]
  if (hour === null) {
    await taskStore.updateTask(data.taskId, { dueTime: null })
  } else {
    const minutes = task.dueTime ? task.dueTime.split(':')[1] : '00'
    await taskStore.updateTask(data.taskId, { dueTime: `${hour}:${minutes}` })
  }
}

async function handleToggle(taskId: string) {
  try {
    await taskStore.toggleComplete(taskId)
  } catch {
    window.__message?.error('操作失败')
  }
}

async function handleDelete(taskId: string) {
  if (window.__dialog) {
    window.__dialog.warning({
      title: '删除任务',
      content: '确定要删除该任务吗？此操作不会立即永久删除。',
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await taskStore.deleteTask(taskId)
          window.__message?.success('任务已删除')
        } catch (e) {
          console.error('[CalendarView] deleteTask失败:', e)
          window.__message?.error('删除失败')
        }
      }
    })
  } else {
    console.warn('[CalendarView] __dialog 不可用，降级 confirm')
    if (confirm('确定要删除该任务吗？')) {
      try {
        await taskStore.deleteTask(taskId)
        window.__message?.success('任务已删除')
      } catch (e) {
        console.error('[CalendarView] deleteTask失败:', e)
        window.__message?.error('删除失败')
      }
    }
  }
}

async function handleQuickAdd() {
  if (!quickAddText.value.trim()) return
  const parsed = nlpParse(quickAddText.value)
  try {
    await taskStore.createTask({
      title: parsed.title || quickAddText.value.trim(),
      dueDate: parsed.dueDate || selectedDay.value || getTodayStr(),
      dueTime: parsed.dueTime || null,
      endDate: parsed.endDate || null,
      endTime: parsed.endTime || null,
      priority: (parsed.priority || 'none') as Task['priority'],
      tagIds: [],
      recurring: parsed.recurring ? { type: parsed.recurring as 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly' } : null
    })
    quickAddText.value = ''
    window.__message?.success('任务已创建')
  } catch {
    window.__message?.error('创建失败')
  }
}

async function handleSave(data: any) {
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, data)
      window.__message?.success('任务已更新')
    } else {
      await taskStore.createTask({ ...data, dueDate: data.dueDate || selectedDay.value || null })
      window.__message?.success('任务已创建')
    }
    uiStore.closeTaskForm()
  } catch {
    window.__message?.error('保存失败')
  }
}
</script>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
}

.monthly-stats {
  margin-bottom: var(--spacing-sm);
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  flex-wrap: wrap;
}
.stat-row strong { font-weight: 600; color: var(--color-text); }
.stat-row .done { color: var(--color-success); }
.stat-row .pending { color: var(--color-text-muted); }
.stat-row .good { color: var(--color-success); }
.stat-row .low { color: var(--color-warning); }
.sep { color: var(--color-border); }

/* 悬浮任务面板 */
.day-panel-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-panel {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 380px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.panel-date { font-size: var(--font-size-md); font-weight: 600; color: var(--color-text); }

.panel-close {
  color: var(--color-text-muted); padding: 2px 4px; border-radius: var(--radius-sm);
}

.panel-close:hover { color: var(--color-text); background: var(--color-surface-hover); }

.panel-tasks {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm) 0;
}

.panel-task {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-lg);
  transition: background 0.15s;
}

.panel-task.p-urgent { background: color-mix(in srgb, var(--color-danger) 20%, var(--color-bg)); }
.panel-task.p-urgent:hover { background: color-mix(in srgb, var(--color-danger) 28%, var(--color-bg)); }
.panel-task.p-high { background: color-mix(in srgb, var(--color-warning) 20%, var(--color-bg)); }
.panel-task.p-high:hover { background: color-mix(in srgb, var(--color-warning) 28%, var(--color-bg)); }
.panel-task.p-medium { background: color-mix(in srgb, var(--color-info) 18%, var(--color-bg)); }
.panel-task.p-medium:hover { background: color-mix(in srgb, var(--color-info) 26%, var(--color-bg)); }
.panel-task.p-low { background: color-mix(in srgb, var(--color-success) 16%, var(--color-bg)); }
.panel-task.p-low:hover { background: color-mix(in srgb, var(--color-success) 24%, var(--color-bg)); }
.panel-task.p-none { background: transparent; }
.panel-task.p-none:hover { background: var(--color-surface-hover); }

.panel-task.completed .panel-task-title {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.panel-task-toggle {
  color: var(--color-text-muted); cursor: pointer; display: flex; padding: 2px;
  flex-shrink: 0;
}

.panel-task-toggle:hover { color: var(--color-primary); }

.panel-task-title {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-task-delete {
  color: var(--color-text-muted); cursor: pointer; padding: 2px; opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.panel-task:hover .panel-task-delete { opacity: 1; }
.panel-task-delete:hover { color: var(--color-danger); }

.panel-task-time {
  font-size: 11px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-right: var(--spacing-xs);
}

.panel-empty {
  text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.panel-quick-add {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.panel-quick-add .quick-add-input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
}

.panel-quick-add .quick-add-input:focus { border-color: var(--color-primary); }

.quick-add-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.quick-add-btn:disabled { opacity: 0.5; }

.panel-new-task {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  text-align: center;
}

.panel-new-task:hover { background: var(--color-surface-hover); }

.panel-slide-enter-active, .panel-slide-leave-active { transition: all 0.2s ease; }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: translateY(10px); }

/* 视图切换动画 */
.view-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
