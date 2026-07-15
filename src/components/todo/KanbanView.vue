<template>
  <div class="kanban-view">
    <div class="kanban-board">
      <div v-for="col in columns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :class="col.key" @dragover.prevent @drop.prevent="onDrop(col.key)">
          <span class="col-title">{{ col.label }}</span>
          <span class="col-count">{{ col.tasks.length }}</span>
          <button v-if="col.key === 'pending'" class="col-add" @click="$emit('addTask')" aria-label="添加任务">
            <Icon name="plus" :size="16" />
          </button>
        </div>
        <div class="kanban-col-body" @dragover.prevent @drop.prevent="onDrop(col.key)">
          <div
            v-for="task in col.tasks"
            :key="task.id"
            class="kanban-card"
            :class="'p-' + task.priority"
            draggable="true"
            @dragstart="onDragStart(task.id)"
            @dragend="onDragEnd"
            @click="$emit('selectTask', task.id)"
          >
            <div class="kanban-card-title">{{ task.title }}</div>
            <div class="kanban-card-meta">
              <PriorityBadge v-if="task.priority !== 'none'" :priority="task.priority" />
              <span v-if="task.dueDate" class="kanban-date">{{ formatDate(task.dueDate) }}</span>
            </div>
          </div>
          <div v-if="col.tasks.length === 0" class="kanban-empty">拖拽任务到此处</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import { formatDate } from '@/utils/date'
import { useTagStore } from '@/stores/tagStore'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  tasks: Task[]
  groupBy: 'status' | 'priority' | 'tag'
}>()

const tagStore = useTagStore()

const emit = defineEmits<{
  (e: 'selectTask', id: string): void
  (e: 'addTask'): void
  (e: 'moveTask', taskId: string, targetStatus: string): void
}>()

let draggedTaskId: string | null = null

function onDragStart(taskId: string) {
  draggedTaskId = taskId
}

function onDragEnd() {
  // 取消拖拽或拖拽完成时清除状态，避免 draggedTaskId 残留
  draggedTaskId = null
}

function onDrop(targetColumn: string) {
  if (draggedTaskId) {
    emit('moveTask', draggedTaskId, targetColumn)
    draggedTaskId = null
  }
}

const columns = computed(() => {
  if (props.groupBy === 'status') {
    const statuses = [
      { key: 'pending', label: '待办' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ]
    return statuses.map(s => ({
      ...s,
      tasks: props.tasks.filter(t => t.status === s.key)
    }))
  }

  if (props.groupBy === 'priority') {
    const priorities = [
      { key: 'urgent', label: '紧急' },
      { key: 'high', label: '高' },
      { key: 'medium', label: '中' },
      { key: 'low', label: '低' },
      { key: 'none', label: '无优先级' }
    ]
    return priorities.map(p => ({
      key: p.key,
      label: p.label,
      tasks: props.tasks.filter(t => t.priority === p.key)
    }))
  }

  // groupBy === 'tag'
  const tagMap = new Map<string, Task[]>()
  const noTag: Task[] = []
  for (const t of props.tasks) {
    if (t.tagIds.length === 0) {
      noTag.push(t)
    } else {
      for (const tagId of t.tagIds) {
        if (!tagMap.has(tagId)) tagMap.set(tagId, [])
        tagMap.get(tagId)!.push(t)
      }
    }
  }

  const result = Array.from(tagMap.entries()).map(([tagId, tasks]) => {
    const tag = tagStore.getTagById(tagId)
    return {
      key: tagId,
      label: tag?.name || tagId.slice(0, 8),
      tasks
    }
  })
  if (noTag.length > 0) {
    result.unshift({ key: '_none', label: '无标签', tasks: noTag })
  }
  return result
})
</script>

<style scoped>
.kanban-view {
  flex: 1;
  min-height: 0;
}

.kanban-board {
  display: flex;
  gap: var(--spacing-sm);
  height: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  align-items: flex-start;
  padding-bottom: var(--spacing-md);
}

.kanban-col {
  flex: 1;
  min-width: 240px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.kanban-col-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-bg-secondary);
}

.kanban-col-header.pending { color: var(--color-primary); }
.kanban-col-header.completed { color: var(--color-success); }
.kanban-col-header.cancelled { color: var(--color-text-muted); }

.col-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: var(--color-surface);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  margin-left: auto;
}

.col-add {
  color: var(--color-primary);
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}
.col-add:hover { background: var(--color-surface-hover); }

.kanban-col-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.kanban-card {
  background: color-mix(in srgb, var(--color-border) 4%, var(--color-surface));
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: grab;
  transition: box-shadow var(--transition-fast);
}

.kanban-card:hover { box-shadow: 0 2px 8px var(--color-shadow); }
.kanban-card.p-urgent { background: color-mix(in srgb, var(--color-danger) 25%, var(--color-surface)); }
.kanban-card.p-high { background: color-mix(in srgb, var(--color-warning) 25%, var(--color-surface)); }
.kanban-card.p-medium { background: color-mix(in srgb, var(--color-info) 22%, var(--color-surface)); }
.kanban-card.p-low { background: color-mix(in srgb, var(--color-success) 20%, var(--color-surface)); }

.kanban-card-title {
  font-size: var(--font-size-md);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-card-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.kanban-date { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.kanban-empty {
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xl);
  border: 2px dashed var(--color-border-light);
  border-radius: var(--radius-md);
}

/* 移动端适配: 上下堆叠，每列占满宽度，高度自适应 */
@media (max-width: 767px) {
  .kanban-view {
    flex: 1;
    min-height: 0;
  }
  .kanban-board {
    flex-direction: column;
    overflow-x: visible;
    height: auto;
    gap: var(--spacing-md);
  }
  .kanban-col {
    flex: none;           /* 取消 flex:1，高度由内容决定 */
    width: 100%;          /* 宽度撑满 */
    max-width: 100%;
    min-width: 0;
    max-height: none;
  }
  .kanban-col-body {
    overflow-y: visible;  /* 全部展开，不内部滚动 */
    max-height: none;
    flex: none;
  }
}
</style>
