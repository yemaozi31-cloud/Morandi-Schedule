<template>
  <div class="timeline-list">
    <!-- 过期任务 -->
    <div v-if="overdueTasks.length > 0" class="timeline-section">
      <div class="timeline-section-header overdue">
        <span>过期任务</span>
        <span class="timeline-count">{{ overdueTasks.length }}</span>
      </div>
      <TaskList
        :tasks="overdueTasks"
        empty-title=""
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
    <!-- 今日任务 -->
    <div class="timeline-section">
      <div class="timeline-section-header today">
        <span>今天</span>
        <span class="timeline-count">{{ todayTasks.length }}</span>
      </div>
      <TaskList
        :tasks="todayTasks"
        empty-title="今天没有任务"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import { getTodayStr } from '@/utils/date'
import TaskList from '@/components/todo/TaskList.vue'

const props = defineProps<{
  tasks: Task[]
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'toggle', id: string): void
  (e: 'delete', id: string): void
}>()

const today = getTodayStr()

const overdueTasks = computed(() =>
  props.tasks.filter(t => t.dueDate && t.dueDate < today)
)

const todayTasks = computed(() =>
  props.tasks.filter(t => !t.dueDate || t.dueDate >= today)
)
</script>

<style scoped>
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.timeline-section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.timeline-section-header.overdue {
  color: var(--color-danger);
  border-bottom: 1px solid var(--color-danger);
}

.timeline-section-header.today {
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-primary);
}

.timeline-count {
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
}
</style>
