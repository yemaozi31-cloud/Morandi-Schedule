<template>
  <div class="task-list">
    <TransitionGroup name="task-item" tag="div" class="task-list-inner">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :batch-mode="batchMode"
        :selected="batchSelected?.has(task.id)"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @delete="$emit('delete', $event)"
        @batch-toggle="$emit('batchToggle', $event)"
      />
    </TransitionGroup>
    <EmptyState
      v-if="tasks.length === 0"
      :title="emptyTitle || '暂无任务'"
      icon="inbox"
    />
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@/types'
import TaskItem from './TaskItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'

defineProps<{
  tasks: Task[]
  emptyTitle?: string
  batchMode?: boolean
  batchSelected?: Set<string>
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'toggle', id: string): void
  (e: 'delete', id: string): void
  (e: 'batchToggle', id: string): void
}>()
</script>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-list-inner {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-item-enter-active {
  transition: all 0.2s ease;
}
.task-item-leave-active {
  transition: all 0.2s ease;
}
.task-item-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.task-item-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
