<template>
  <div
    class="task-card"
    :class="[`p-${task.priority}`, className, { dragging, completed: task.status === 'completed' }]"
    :draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <button class="task-toggle" @click.stop="$emit('toggle', task.id)" :title="task.status === 'completed' ? '重开' : '完成'">
      <Icon :name="task.status === 'completed' ? 'check-circle' : 'circle'" :size="15" color="var(--color-primary)" />
    </button>
    <div class="task-body" @click.stop="$emit('select', task.id)">
      <span v-if="task.dueTime && !task.isSpanning" class="task-time">{{ task.dueTime }}{{ task.endTime ? '~' + task.endTime : '' }}</span>
      <span class="task-title">{{ task.title }}</span>
      <slot name="meta" :task="task" />
    </div>
    <button class="task-delete" @click.stop="$emit('delete', task.id)" title="删除">
      <Icon name="x" :size="14" color="var(--color-text-muted)" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@/types'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  task: Task
  className?: string
  dragging?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'dragStart', id: string, event: DragEvent): void
  (e: 'dragEnd'): void
}>()

function onDragStart(event: DragEvent) {
  emit('dragStart', props.task.id, event)
}

function onDragEnd() {
  emit('dragEnd')
}
</script>

<style scoped>
.task-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px var(--spacing-sm);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border-left: 3px solid var(--color-border);
  transition: opacity 0.15s, background 0.15s;
  cursor: default;
  min-height: 32px;
  user-select: none;
}
.task-card:hover { background: var(--color-surface-hover); }
.task-card.dragging { opacity: 0.3; }

.task-card.p-urgent { border-left-color: var(--priority-urgent-bg); }
.task-card.p-high { border-left-color: var(--priority-high-bg); }
.task-card.p-medium { border-left-color: var(--priority-medium-bg); }
.task-card.p-low { border-left-color: var(--priority-low-bg); }
.task-card.p-none { border-left-color: var(--priority-none-bg); }

.task-toggle {
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  cursor: pointer; padding: 2px;
  width: 22px; height: 22px;
}

.task-body {
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: var(--spacing-sm);
  cursor: pointer; overflow: hidden;
}

.task-time {
  font-size: var(--font-size-sm); color: var(--color-primary);
  font-weight: 500; white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.task-title {
  font-size: var(--font-size-md); color: var(--color-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.task-meta {
  font-size: var(--font-size-sm); color: var(--color-text-muted); white-space: nowrap;
}

.task-delete {
  display: flex; flex-shrink: 0;
  cursor: pointer; padding: 2px; opacity: 0.5;
  transition: opacity 0.15s;
}
.task-card:hover .task-delete { opacity: 1; }
.task-delete:hover { opacity: 1 !important; }
.task-delete:hover :deep(svg) { color: var(--color-danger) !important; }

@media (max-width: 767px) {
  .task-card { padding: 8px var(--spacing-sm); min-height: 40px; }
  .task-delete { opacity: 0.6; }
}
.task-card.completed { opacity: 0.55; }
.task-card.completed .task-title { text-decoration: line-through; color: var(--color-text-muted); }
.task-card.completed .task-toggle { opacity: 0.6; }
</style>
