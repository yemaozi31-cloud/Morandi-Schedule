<template>
  <div
    class="section drop-zone"
    :class="{ 'drag-over': dragOverSection === periodKey }"
    @dragover.prevent="emit('dragOver', periodKey)"
    @dragenter="emit('dragEnter', periodKey)"
    @dragleave="emit('dragLeaveSection')"
    @drop.prevent="emit('drop', periodKey)"
  >
    <!-- 时段标题 -->
    <div class="section-header">
      <span>{{ title }}</span>
      <span v-if="tasks.length > 0" class="section-count">{{ tasks.length }}</span>
    </div>

    <!-- 任务列表 -->
    <TaskCard
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      :dragging="dragTaskId === task.id"
      @toggle="emit('toggle', $event)"
      @select="emit('select', $event)"
      @delete="emit('delete', $event)"
      @drag-start="(id: string, ev: DragEvent) => emit('dragStart', id, ev)"
      @drag-end="() => emit('dragEnd')"
    >
      <template #meta="slotProps">
        <slot name="task-meta" :task="slotProps.task" />
      </template>
    </TaskCard>

    <!-- 添加按钮：始终可见 -->
    <button class="add-task-btn" @click="emit('createTask')">
      <Icon name="plus" :size="12" />
      添加{{ title }}任务
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@/types'
import type { PeriodKey } from './DayTimeline.vue'
import Icon from '@/components/common/Icon.vue'
import TaskCard from './TaskCard.vue'

defineProps<{
  periodKey: PeriodKey
  title: string
  tasks: Task[]
  dragTaskId: string | null
  dragOverSection: PeriodKey | null
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'createTask'): void
  (e: 'toggle', id: string): void
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'dragStart', id: string, event: DragEvent): void
  (e: 'dragEnd'): void
  (e: 'dragOver', section: PeriodKey): void
  (e: 'dragEnter', section: PeriodKey): void
  (e: 'dragLeaveSection'): void
  (e: 'drop', section: PeriodKey): void
}>()
</script>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  padding-bottom: 2px;
  margin-bottom: 2px;
  border-bottom: 1px solid var(--color-border-light);
}

.section-count {
  font-size: var(--font-size-xs);
  font-weight: 400;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 0 6px;
  border-radius: var(--radius-full);
}

/* ── 添加按钮 ──────────────────────────── */
.add-task-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
  border: none;
  text-align: left;
  min-height: 28px;
}

.add-task-btn:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

/* ── 拖拽 ──────────────────────────────── */
.drop-zone {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-lg);
  transition: background 0.15s, outline 0.15s;
  min-height: 48px;
}

.drop-zone.drag-over {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  outline: 2px dashed var(--color-primary);
  outline-offset: -1px;
}

/* ── 手机端 ─────────────────────────────── */
@media (max-width: 767px) {
  .add-task-btn { min-height: 36px; padding: 6px var(--spacing-sm); }
}
</style>
