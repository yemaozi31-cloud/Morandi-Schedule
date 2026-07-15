<template>
  <div class="day-view">
    <!-- 全天任务区 -->
    <div v-if="allDayTasks.length > 0" class="all-day-section">
      <div class="all-day-label">全天</div>
      <div class="all-day-tasks">
        <div
          v-for="task in allDayTasks"
          :key="task.id"
          class="day-task-card all-day"
          :class="task.priority"
        >
          <button class="task-toggle" @click.stop="handleToggle(task.id)">
            <Icon :name="task.status === 'completed' ? 'check-circle' : 'circle'" :size="14" />
          </button>
          <div class="task-title" @click.stop="$emit('selectTask', task.id)">{{ task.title }}</div>
          <button class="task-delete" @click.stop="handleDelete(task.id)"><Icon name="x" :size="12" /></button>
        </div>
      </div>
    </div>
    <div class="day-timeline">
      <div
        v-for="hour in 24"
        :key="hour"
        class="timeline-row"
        :class="{ 'current-hour': hour === currentHour }"
      >
        <div class="timeline-label">{{ String(hour - 1).padStart(2, '0') + ':00' }}</div>
        <div class="timeline-slot" @click="handleSlotClick(hour)"></div>
        <div class="timeline-tasks">
          <div
            v-for="task in getTasksForHour(hour)"
            :key="task.id"
            class="day-task-card"
            :class="task.priority"
            :style="taskStyle(task)"
          >
            <button class="task-toggle" @click.stop="handleToggle(task.id)">
              <Icon :name="task.status === 'completed' ? 'check-circle' : 'circle'" :size="14" />
            </button>
            <div class="task-content" @click.stop="$emit('selectTask', task.id)">
              <div class="task-time">{{ task.dueTime }}{{ task.endTime ? '~' + task.endTime : '' }}</div>
              <div class="task-title">{{ task.title }}</div>
            </div>
            <button class="task-delete" @click.stop="handleDelete(task.id)"><Icon name="x" :size="12" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  currentDate: string
  tasks: Task[]
}>()

const emit = defineEmits<{
  (e: 'selectTask', id: string): void
  (e: 'createTask', data: { dueDate: string; dueTime?: string }): void
  (e: 'toggleTask', id: string): void
  (e: 'deleteTask', id: string): void
}>()

const currentHour = computed(() => new Date().getHours() + 1)

const allDayTasks = computed(() =>
  props.tasks.filter(t =>
    t.dueDate && !t.deletedAt && t.status !== 'completed' && (
      !t.dueTime ||
      (t.isSpanning && t.dueDate !== props.currentDate)
    )
  )
)

function getTasksForHour(hour: number): Task[] {
  return props.tasks.filter(t => {
    if (!t.dueDate || t.deletedAt || t.status === 'completed') return false
    if (!t.dueTime) return false
    // 跨天任务只在最后一天显示在时间轴上
    if (t.isSpanning && t.dueDate !== props.currentDate) return false
    const taskHour = parseInt(t.dueTime.split(':')[0])
    return taskHour === hour - 1 || (taskHour < hour - 1 && t.endTime && parseInt(t.endTime.split(':')[0]) >= hour - 1)
  })
}

function taskStyle(task: Task) {
  if (!task.endTime) return {}
  const start = parseInt(task.dueTime.split(':')[0]) * 60 + parseInt(task.dueTime.split(':')[1] || '0')
  const end = parseInt(task.endTime.split(':')[0]) * 60 + parseInt(task.endTime.split(':')[1] || '0')
  const duration = Math.max(end - start, 15)
  return {
    height: Math.max((duration / 60) * 60, 24) + 'px',
    minHeight: '24px'
  }
}

function handleSlotClick(hour: number) {
  // hour 来自 v-for="hour in 24"（1-24），标签显示 hour-1（00:00-23:00）
  // 创建任务时使用 hour-1 得到正确的小时数
  emit('createTask', {
    dueDate: props.currentDate,
    dueTime: `${String(hour - 1).padStart(2, '0')}:00`
  })
}

function handleToggle(taskId: string) {
  emit('toggleTask', taskId)
}

function handleDelete(taskId: string) {
  emit('deleteTask', taskId)
}
</script>

<style scoped>
.day-view { height: calc(100vh - 200px); overflow-y: auto; }

.all-day-section {
  display: grid;
  grid-template-columns: 60px 1fr;
  border-bottom: 2px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-bg);
  z-index: 2;
}

.all-day-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: var(--spacing-sm);
  text-align: right;
  border-right: 1px solid var(--color-border-light);
}

.all-day-tasks {
  padding: 2px var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  min-height: 60px;
  border-bottom: 1px solid var(--color-border-light);
  position: relative;
}

.timeline-row.current-hour {
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);
}

.timeline-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: var(--spacing-xs) var(--spacing-sm);
  text-align: right;
  position: relative;
  top: -8px;
}

.timeline-slot {
  cursor: pointer;
  min-height: 60px;
  position: absolute;
  left: 60px;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1;
}

.timeline-slot:hover {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.timeline-tasks {
  padding: 2px var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.day-task-card {
  padding: 2px 4px 2px 2px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
  cursor: pointer;
  display: flex;
  gap: 2px;
  align-items: center;
  min-width: 0;
  pointer-events: auto;
  overflow: hidden;
}

.day-task-card.all-day { background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)); }

.day-task-card.urgent { background: color-mix(in srgb, var(--color-danger) 25%, var(--color-surface)); }
.day-task-card.high { background: color-mix(in srgb, var(--color-warning) 25%, var(--color-surface)); }
.day-task-card.medium { background: color-mix(in srgb, var(--color-info) 22%, var(--color-surface)); }
.day-task-card:hover { background: var(--color-surface-hover); }

.task-toggle {
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  padding: 2px;
  flex-shrink: 0;
}
.task-toggle:hover { color: var(--color-primary); }

.task-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.task-time { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; }
.task-title { font-size: var(--font-size-sm); color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.task-delete {
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.day-task-card:hover .task-delete { opacity: 1; }
.task-delete:hover { color: var(--color-danger); }

/* 手机端：紧凑时间轴 */
@media (max-width: 767px) {
  .day-view { height: calc(100vh - 160px); }
  .timeline-row { min-height: 44px; }
  .timeline-slot { min-height: 44px; }
  .timeline-label { font-size: 10px; padding: 2px var(--spacing-xs); top: -6px; width: 44px; }
  .all-day-section { grid-template-columns: 44px 1fr; }
  .all-day-label { font-size: 10px; padding: var(--spacing-xs); width: 44px; }
  .day-task-card { padding: 3px 4px; }
  .task-title { font-size: var(--font-size-md); }
  .task-time { font-size: 10px; }
}
</style>