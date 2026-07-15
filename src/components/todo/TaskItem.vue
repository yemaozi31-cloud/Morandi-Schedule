<template>
  <div class="task-item-wrapper">
    <div class="task-item" :class="[
      'p-' + task.priority,
      { completed: task.status === 'completed', expanded: isExpanded, batchMode: batchMode }
    ]" @click="handleClick">
      <!-- 批量选择框 -->
      <label v-if="batchMode" class="batch-checkbox" @click.stop>
        <input type="checkbox" :checked="selected" @change="$emit('batchToggle', task.id)" />
        <span class="checkmark"></span>
      </label>

      <button class="task-checkbox" :class="task.status" @click.stop="$emit('toggle', task.id)">
        <Icon v-if="task.status === 'completed'" name="check" :size="12" />
      </button>
      <div class="task-body">
        <div class="task-title-row">
          <span class="task-title text-ellipsis">{{ task.title }}</span>
          <PriorityBadge v-if="task.priority !== 'none'" :priority="task.priority" />
        </div>
        <div class="task-meta">
          <span v-if="task.dueDate" class="task-date" :class="{ overdue: isOverdue }">
            <Icon name="clock" :size="12" class="meta-icon" />
            {{ formatDate(task.dueDate) }}
            <template v-if="task.dueTime">{{ ' ' + task.dueTime }}</template>
          </span>
          <TagBadge v-for="tagId in task.tagIds" :key="tagId" :tag-id="tagId" />
        </div>
      </div>
      <button class="task-delete" @click.stop="$emit('delete', task.id)" title="删除">
        <Icon name="x" :size="15" />
      </button>
    </div>
    <!-- 展开详情 -->
    <transition name="detail-expand">
      <div v-if="isExpanded" class="task-detail">
        <div v-if="task.description" class="detail-description">{{ task.description }}</div>
        <div class="detail-info">
          <span v-if="task.dueDate" class="detail-field">
            <span class="detail-label">截止:</span> {{ formatDate(task.dueDate) }}{{ task.dueTime ? ' ' + task.dueTime : '' }}
          </span>
          <span class="detail-field">
            <span class="detail-label">优先级:</span> {{ priorityLabels[task.priority] || '无' }}
          </span>
          <span v-if="task.recurring" class="detail-field">
            <span class="detail-label">重复:</span> {{ recurringLabels[task.recurring.type] || task.recurring.type }}
          </span>
        </div>
        <div class="detail-actions">
      <button class="detail-btn urgent-btn" :class="{ active: isUrgent }" @click.stop="toggleUrgent">
        {{ isUrgent ? '紧急' : '不紧急' }}
      </button>
      <button class="detail-btn important-btn" :class="{ active: isImportant }" @click.stop="toggleImportant">
        {{ isImportant ? '重要' : '不重要' }}
      </button>
      <button class="detail-btn edit" @click.stop="handleEditClick">编辑</button>
      <button class="detail-btn delete" @click.stop="$emit('delete', task.id)">删除</button>
    </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Task } from '@/types'
import { formatDate, getTodayStr } from '@/utils/date'
import { useTagStore } from '@/stores/tagStore'
import { useTaskStore } from '@/stores/taskStore'
import Icon from '@/components/common/Icon.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import TagBadge from '@/components/common/TagBadge.vue'

const props = defineProps<{
  task: Task
  batchMode?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'toggle', id: string): void
  (e: 'delete', id: string): void
  (e: 'batchToggle', id: string): void
}>()

const tagStore = useTagStore()
const taskStore = useTaskStore()
const isExpanded = ref(false)

const priorityLabels: Record<string, string> = { none: '无', low: '低', medium: '中', high: '高', urgent: '紧急' }
const recurringLabels: Record<string, string> = { daily: '每天', weekly: '每周', weekdays: '工作日', monthly: '每月', yearly: '每年' }

const today = getTodayStr()

const isUrgent = computed(() =>
  props.task.priority === 'urgent' || (props.task.dueDate && props.task.dueDate <= today)
)

const isImportant = computed(() =>
  props.task.priority === 'high' || props.task.priority === 'medium'
)

const isOverdue = computed(() => {
  if (!props.task.dueDate || props.task.status === 'completed') return false
  return props.task.dueDate < today
})

async function toggleUrgent() {
  try {
    if (isUrgent.value) {
      await taskStore.updateTask(props.task.id, { dueDate: null })
    } else {
      await taskStore.updateTask(props.task.id, { dueDate: today })
    }
  } catch {
    window.__message?.error('操作失败')
  }
}

async function toggleImportant() {
  try {
    if (isImportant.value) {
      await taskStore.updateTask(props.task.id, { priority: 'none' as Task['priority'] })
    } else {
      await taskStore.updateTask(props.task.id, { priority: 'high' as Task['priority'] })
    }
  } catch {
    window.__message?.error('操作失败')
  }
}

function handleEditClick() {
  try {
    emit('select', props.task.id)
  } catch (e) {
    console.error('编辑按钮出错:', e)
    window.__message?.error('打开编辑失败')
  }
}

function handleClick() {
  if (props.batchMode) {
    emit('batchToggle', props.task.id)
  } else {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<style scoped>
.task-item-wrapper {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  cursor: pointer;
}

/* 优先级背景染色 */
.task-item.p-urgent { background: color-mix(in srgb, var(--color-danger) 20%, var(--color-bg)); }
.task-item.p-urgent:hover { background: color-mix(in srgb, var(--color-danger) 28%, var(--color-bg)); }
.task-item.p-high { background: color-mix(in srgb, var(--color-warning) 20%, var(--color-bg)); }
.task-item.p-high:hover { background: color-mix(in srgb, var(--color-warning) 28%, var(--color-bg)); }
.task-item.p-medium { background: color-mix(in srgb, var(--color-info) 18%, var(--color-bg)); }
.task-item.p-medium:hover { background: color-mix(in srgb, var(--color-info) 26%, var(--color-bg)); }
.task-item.p-low { background: color-mix(in srgb, var(--color-success) 16%, var(--color-bg)); }
.task-item.p-low:hover { background: color-mix(in srgb, var(--color-success) 24%, var(--color-bg)); }
.task-item.p-none { background: transparent; }
.task-item.p-none:hover { background: var(--color-surface-hover); }

.task-item.expanded {
  background: var(--color-surface);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.batch-checkbox {
  display: flex;
  align-items: center;
  padding: 2px 0;
  cursor: pointer;
  position: relative;
}

.batch-checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.batch-checkbox .checkmark {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border-radius: 4px;
  border: 2px solid var(--color-border);
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.batch-checkbox input:checked + .checkmark {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.batch-checkbox input:checked + .checkmark::after {
  content: '';
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 1px;
}

.task-checkbox {
  width: 20px;
  height: 20px;
  min-height: 20px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all var(--transition-fast);
}

.task-checkbox.completed {
  background: var(--color-success);
  border-color: var(--color-success);
}

.task-body { flex: 1; min-width: 0; }
.task-title-row { display: flex; align-items: center; gap: var(--spacing-sm); }
.task-title { font-size: var(--font-size-md); color: var(--color-text); line-height: 1.4; min-width: 0; }
.task-meta { display: flex; align-items: center; gap: var(--spacing-xs); margin-top: 4px; flex-wrap: wrap; }
.meta-icon { margin-right: 2px; opacity: 0.6; }
.task-date { font-size: var(--font-size-sm); color: var(--color-text-muted); display: flex; align-items: center; }
.task-date.overdue { color: var(--color-danger); font-weight: 500; }
.task-delete { opacity: 0; color: var(--color-text-muted); font-size: 14px; padding: 2px 4px; transition: all var(--transition-fast); flex-shrink: 0; }
.task-item:hover .task-delete { opacity: 1; }
.task-delete:hover { color: var(--color-danger); }

/* 展开详情 */
.task-detail {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) calc(20px + var(--spacing-sm) * 3);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.detail-description { font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }
.detail-info { display: flex; gap: var(--spacing-md); flex-wrap: wrap; }
.detail-field { font-size: var(--font-size-sm); color: var(--color-text); }
.detail-label { color: var(--color-text-muted); margin-right: 2px; }
.detail-actions { display: flex; gap: var(--spacing-xs); }
.detail-btn { padding: 2px 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; height: 26px; box-sizing: border-box; border: 1px solid var(--color-border); background: transparent; color: var(--color-text); }
.detail-btn.edit { background: var(--color-primary); color: var(--color-text-on-primary); border: none; }
.detail-btn.delete { color: var(--color-danger); border: 1px solid var(--color-danger); background: transparent; }
.detail-btn.active.urgent-btn { background: var(--color-warm); color: var(--color-text-on-primary); border-color: var(--color-warm); }
.detail-btn.active.important-btn { background: #C4A87C; color: var(--color-text-on-primary); border-color: #C4A87C; }

.detail-expand-enter-active, .detail-expand-leave-active { transition: all 0.2s ease; }
.detail-expand-enter-from, .detail-expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
</style>
