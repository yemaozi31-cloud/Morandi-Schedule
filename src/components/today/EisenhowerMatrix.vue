<template>
  <div class="eisenhower-matrix">
    <div class="matrix-grid">
      <div
        v-for="q in quadrants"
        :key="q.key"
        class="matrix-cell"
        :class="q.class"
        @dragover.prevent
        @drop="onDrop($event, q.key)"
      >
        <div class="cell-header">
          <span class="cell-title">{{ q.title }}</span>
          <span class="cell-count">{{ tasks[q.key].length }}</span>
        </div>
        <div class="cell-body">
          <TaskCard
            v-for="task in tasks[q.key]"
            :key="task.id"
            :task="task"
            @toggle="handleToggle"
            @select="handleEdit"
            @delete="handleDelete"
            @drag-start="(id, ev) => onDragStart(ev, id)"
            @drag-end="onDragEnd"
          />
          <div v-if="tasks[q.key].length === 0" class="cell-empty">空</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@/types'
import { useTaskStore } from '@/stores/taskStore'
import Icon from '@/components/common/Icon.vue'
import TaskCard from '@/components/calendar/TaskCard.vue'

const props = defineProps<{
  tasks: {
    q1: Task[]
    q2: Task[]
    q3: Task[]
    q4: Task[]
  }
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
}>()

const taskStore = useTaskStore()

const openActions = ref<string | null>(null)

function toggleActions(quadrantKey: string, taskId: string) {
  const key = quadrantKey + '-' + taskId
  openActions.value = openActions.value === key ? null : key
}

function handleEdit(taskId: string) {
  openActions.value = null
  emit('edit', taskId)
}

function handleDelete(taskId: string) {
  openActions.value = null
  emit('delete', taskId)
}

const quadrants = [
  { key: 'q1' as const, title: '重要 · 紧急', class: 'cell-q1' },
  { key: 'q2' as const, title: '重要 · 不紧急', class: 'cell-q2' },
  { key: 'q3' as const, title: '不重要 · 紧急', class: 'cell-q3' },
  { key: 'q4' as const, title: '不重要 · 不紧急', class: 'cell-q4' }
]

let draggedTaskId: string | null = null

function onDragEnd() {
  draggedTaskId = null
}

function onDragStart(e: DragEvent, taskId: string) {
  draggedTaskId = taskId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }
}

async function onDrop(e: DragEvent, targetQuadrant: string) {
  const taskId = (e.dataTransfer?.getData('text/plain')) || draggedTaskId
  if (!taskId) return
  draggedTaskId = null

  const task = taskStore.getTaskById(taskId)
  if (!task) return

  const today = new Date().toISOString().slice(0, 10)
  const isUrgent = task.priority === 'urgent' || (task.dueDate && task.dueDate <= today)
  const isImportant = task.priority === 'high' || task.priority === 'medium'

  const currentQ = isUrgent && isImportant ? 'q1'
    : !isUrgent && isImportant ? 'q2'
    : isUrgent && !isImportant ? 'q3'
    : 'q4'

  if (currentQ === targetQuadrant) return

  let newPriority: Task['priority'] | undefined

  // 连续任务只改优先级，不改日期
  if (task.isSpanning) {
    switch (targetQuadrant) {
      case 'q1': newPriority = 'high'; break
      case 'q2': newPriority = task.priority === 'low' || task.priority === 'none' ? 'medium' : task.priority; break
      case 'q3': newPriority = 'low'; break
      case 'q4': newPriority = 'none'; break
    }
    try {
      await taskStore.updateTask(taskId, { priority: newPriority })
      window.__message?.success('任务已移动')
    } catch { window.__message?.error('移动失败') }
    return
  }

  let newDueDate: string | null | undefined

  switch (targetQuadrant) {
    case 'q1':
      newPriority = 'high'
      newDueDate = task.dueDate || today
      break
    case 'q2':
      newPriority = task.priority === 'low' || task.priority === 'none' ? 'medium' : task.priority
      newDueDate = null
      break
    case 'q3':
      newPriority = 'low'
      newDueDate = task.dueDate || today
      break
    case 'q4':
      newPriority = 'none'
      newDueDate = null
      break
  }

  try {
    await taskStore.updateTask(taskId, {
      ...(newPriority ? { priority: newPriority } : {}),
      ...(newDueDate !== undefined ? { dueDate: newDueDate } : {})
    })
    window.__message?.success('任务已移动')
  } catch {
    window.__message?.error('移动失败')
  }
}

function handleTaskClick(taskId: string) {
  handleToggle(taskId)
}

function handleToggle(taskId: string) {
  emit('toggle', taskId)
}

function priorityLabel(p: string) {
  const map: Record<string, string> = { urgent: '紧急', high: '高', medium: '中', low: '低' }
  return map[p] || ''
}
</script>

<style scoped>
.eisenhower-matrix {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.matrix-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  height: 100%;
  background: var(--color-border-light);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.matrix-cell {
  background: var(--color-surface);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.cell-q1 { background: color-mix(in srgb, var(--color-danger) 4%, var(--color-surface)); }
.cell-q2 { }
.cell-q3 { background: color-mix(in srgb, var(--color-warning) 4%, var(--color-surface)); }
.cell-q4 { background: var(--color-bg); }

.cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  flex-shrink: 0;
  padding: 0 var(--spacing-xs);
}

.cell-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cell-count {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 0 6px;
  border-radius: 999px;
  line-height: 20px;
}

.cell-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 var(--spacing-xs);
}

.cell-empty {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--spacing-lg) 0;
  opacity: 0.4;
}

@media (max-width: 767px) {
  .matrix-grid {
    gap: 1px;
  }
  .matrix-cell {
    padding: var(--spacing-xs);
  }
  .cell-title {
    font-size: 11px;
    margin-bottom: 0;
  }
}
</style>
