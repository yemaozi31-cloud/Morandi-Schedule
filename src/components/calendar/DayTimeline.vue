<template>
  <div class="day-timeline">
    <!-- 日期导航（TodayView 不显示，固定今天） -->
    <div v-if="showNav" class="date-nav">
      <button class="nav-btn" @click="goPrev" aria-label="前一天">
        <Icon name="chevron-left" :size="16" />
      </button>
      <h3 class="date-title" @click="goToday">{{ dateTitle }}</h3>
      <button class="nav-btn" @click="goNext" aria-label="后一天">
        <Icon name="chevron-right" :size="16" />
      </button>
      <button v-if="!isToday" class="today-btn" @click="goToday">今天</button>
    </div>

    <!-- 过期任务（仅在 TodayView 显示） -->
    <div v-if="showOverdue && overdueTasks.length > 0" class="section">
      <div class="section-header overdue">
        <span>过期任务</span>
        <span class="section-count">{{ overdueTasks.length }}</span>
      </div>
      <TaskCard
        v-for="task in overdueTasks"
        :key="task.id"
        :task="task"
        class-name="overdue-card"
        :dragging="dragTaskId === task.id"
        @toggle="handleToggle"
        @select="handleSelect"
        @delete="handleDelete"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
      />
    </div>

    <!-- 全天 + 上午 + 下午 + 晚上 -->
    <PeriodSection
      period-key="all-day"
      title="全天"
      default-time=""
      :tasks="allDayTasks"
      :drag-task-id="dragTaskId"
      :drag-over-section="dragOverSection"
      :current-date="currentDate"
      @create-task="handleCreateAllDay"
      @toggle="handleToggle"
      @select="handleSelect"
      @delete="handleDelete"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
      @drag-over="onDragOver"
      @drag-leave="onDragLeave"
      @drop="onDrop"
    >
      <template #task-meta="{ task }">
        <span v-if="task.isSpanning && task.startDate && task.dueDate !== task.startDate" class="task-meta">
          {{ task.startDate.slice(5) }}~{{ task.dueDate.slice(5) }}
        </span>
      </template>
    </PeriodSection>

    <PeriodSection
      period-key="morning"
      title="上午"
      default-time="09:00"
      :tasks="morningTasks"
      :drag-task-id="dragTaskId"
      :drag-over-section="dragOverSection"
      :current-date="currentDate"
      placeholder="点击添加上午任务"
      @create-task="handleCreateSlot('08:00')"
      @toggle="handleToggle"
      @select="handleSelect"
      @delete="handleDelete"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
      @drag-over="onDragOver"
      @drag-leave="onDragLeave"
      @drop="onDrop"
    />

    <PeriodSection
      period-key="afternoon"
      title="下午"
      default-time="14:00"
      :tasks="afternoonTasks"
      :drag-task-id="dragTaskId"
      :drag-over-section="dragOverSection"
      :current-date="currentDate"
      placeholder="点击添加下午任务"
      @create-task="handleCreateSlot('14:00')"
      @toggle="handleToggle"
      @select="handleSelect"
      @delete="handleDelete"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
      @drag-over="onDragOver"
      @drag-leave="onDragLeave"
      @drop="onDrop"
    />

    <PeriodSection
      period-key="evening"
      title="晚上"
      default-time="20:00"
      :tasks="eveningTasks"
      :drag-task-id="dragTaskId"
      :drag-over-section="dragOverSection"
      :current-date="currentDate"
      placeholder="点击添加晚上任务"
      @create-task="handleCreateSlot('19:00')"
      @toggle="handleToggle"
      @select="handleSelect"
      @delete="handleDelete"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
      @drag-over="onDragOver"
      @drag-leave="onDragLeave"
      @drop="onDrop"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { format, parseISO, addDays, subDays, getTodayStr } from '@/utils/date'
import type { Task } from '@/types'
import Icon from '@/components/common/Icon.vue'
import PeriodSection from './PeriodSection.vue'
import TaskCard from './TaskCard.vue'

/** 时段标识 */
export type PeriodKey = 'all-day' | 'morning' | 'afternoon' | 'evening'

const props = defineProps<{
  tasks: Task[]
  currentDate: string
  showNav?: boolean
  showOverdue?: boolean
}>()

const emit = defineEmits<{
  (e: 'createTask', data: { dueDate: string; dueTime?: string }): void
  (e: 'selectTask', id: string): void
  (e: 'toggleTask', id: string): void
  (e: 'deleteTask', id: string): void
  (e: 'update:currentDate', date: string): void
  (e: 'moveTask', data: { taskId: string; targetPeriod: PeriodKey; sourceDate: string }): void
}>()

// ─── 拖拽状态 ─────────────────────────────────────
const dragTaskId = ref<string | null>(null)
const dragOverSection = ref<PeriodKey | null>(null)

function onDragStart(taskId: string, event: DragEvent) {
  dragTaskId.value = taskId
  event.dataTransfer?.setData('text/plain', taskId)
  event.dataTransfer!.effectAllowed = 'move'
  // 透明拖拽图，防止浏览器截图导致闪烁
  const img = new Image()
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  event.dataTransfer!.setDragImage(img, 0, 0)
}

function onDragEnd() {
  dragTaskId.value = null
  dragOverSection.value = null
}

function onDragOver(section: PeriodKey | null) {
  if (section) dragOverSection.value = section
}

function onDragLeave() {
  dragOverSection.value = null
}

function onDrop(targetPeriod: PeriodKey) {
  if (dragTaskId.value) {
    emit('moveTask', {
      taskId: dragTaskId.value,
      targetPeriod,
      sourceDate: props.currentDate
    })
  }
  dragTaskId.value = null
  dragOverSection.value = null
}

// ─── 日期 ────────────────────────────────────────────
const today = getTodayStr()
const isToday = computed(() => props.currentDate === today)

const dateTitle = computed(() => {
  const d = parseISO(props.currentDate)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${format(d, 'yyyy年M月d日')} ${weekdays[d.getDay()]}`
})

// ─── 任务分组 ────────────────────────────────────────
const overdueTasks = computed(() =>
  props.tasks.filter(t =>
    t.dueDate && t.dueDate < today && t.dueDate !== props.currentDate &&
    !t.deletedAt && t.status !== 'completed'
  )
)

const allDayTasks = computed(() =>
  props.tasks.filter(t =>
    !t.deletedAt && t.status !== 'completed' && t.dueDate && (!t.dueTime || t.isSpanning)
  )
)

function tasksInRange(startHour: number, endHour: number) {
  return props.tasks.filter(t => {
    if (!t.dueDate || !t.dueTime || t.deletedAt || t.status === 'completed') return false
    if (t.isSpanning) return false
    const hour = parseInt(t.dueTime.split(':')[0])
    return hour >= startHour && hour <= endHour
  })
}

const morningTasks = computed(() => tasksInRange(0, 11))
const afternoonTasks = computed(() => tasksInRange(12, 17))
const eveningTasks = computed(() => tasksInRange(18, 23))

// ─── 导航 ────────────────────────────────────────────
function goPrev() {
  emit('update:currentDate', format(subDays(parseISO(props.currentDate), 1), 'yyyy-MM-dd'))
}
function goNext() {
  emit('update:currentDate', format(addDays(parseISO(props.currentDate), 1), 'yyyy-MM-dd'))
}
function goToday() { emit('update:currentDate', today) }

// ─── 事件 ────────────────────────────────────────────
function handleCreateAllDay() { emit('createTask', { dueDate: props.currentDate }) }
function handleCreateSlot(time: string) { emit('createTask', { dueDate: props.currentDate, dueTime: time }) }
function handleSelect(taskId: string) { emit('selectTask', taskId) }
function handleToggle(taskId: string) { emit('toggleTask', taskId) }
function handleDelete(taskId: string) { emit('deleteTask', taskId) }
</script>

<style scoped>
.day-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* ── 日期导航 ─────────────────────────── */
.date-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border-light);
}
.nav-btn {
  color: var(--color-text-muted);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
}
.nav-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }
.date-title {
  flex: 1; font-size: var(--font-size-lg); color: var(--color-text);
  cursor: pointer; user-select: none;
}
.date-title:hover { color: var(--color-primary); }
.today-btn {
  font-size: var(--font-size-sm); color: var(--color-primary);
  border: 1px solid var(--color-primary); border-radius: var(--radius-md);
  padding: var(--spacing-xs) var(--spacing-md);
}
.today-btn:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }

@media (max-width: 767px) {
  .date-title { font-size: var(--font-size-md); }
}
</style>
