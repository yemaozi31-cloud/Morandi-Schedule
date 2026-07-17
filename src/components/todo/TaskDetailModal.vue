<template>
  <teleport to="body">
    <div v-if="task" class="detail-overlay" @click.self="close">
      <div class="detail-card">
        <div class="detail-header">
          <span class="detail-title">{{ task.title }}</span>
          <button class="detail-close" @click="close"><Icon name="x" :size="16" /></button>
        </div>
        <div class="detail-body">
          <div class="detail-row" v-if="task.dueDate">
            <span class="detail-label">日期</span>
            <span class="detail-value">{{ task.dueDate }}</span>
          </div>
          <div class="detail-row" v-if="task.dueTime">
            <span class="detail-label">时间</span>
            <span class="detail-value">{{ task.dueTime }}{{ task.endTime ? '~' + task.endTime : '' }}</span>
          </div>
          <div class="detail-row" v-if="task.isSpanning && task.startDate">
            <span class="detail-label">跨天</span>
            <span class="detail-value">{{ task.startDate }} ~ {{ task.dueDate }}</span>
          </div>
          <div class="detail-row" v-if="task.priority && task.priority !== 'none'">
            <span class="detail-label">优先级</span>
            <span class="detail-value priority-badge" :class="'p-' + task.priority">{{ priorityLabel }}</span>
          </div>
          <div class="detail-row" v-if="task.description">
            <span class="detail-label">备注</span>
            <span class="detail-value">{{ task.description }}</span>
          </div>
          <div class="detail-row" v-if="task.recurring">
            <span class="detail-label">重复</span>
            <span class="detail-value">{{ recurringLabel }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="detail-btn edit-btn" @click="handleEdit">修改</button>
          <button class="detail-btn delete-btn" @click="handleDelete">删除</button>
        </div>
        <div class="detail-footer">
          <button class="detail-btn add-btn" @click="handleAddNew">+ 添加新任务</button>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <ConfirmDialog
        v-if="confirm.show"
        :show="confirm.show"
        :title="'删除任务'"
        :content="confirm.content"
        positive-text="确认"
        negative-text="取消"
        @confirm="onDeleteConfirmed(true); close()"
        @cancel="onDeleteConfirmed(false)"
        @update:show="(v) => { if (!v) onDeleteConfirmed(false) }"
      />

    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import { useUiStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { useDeleteTask } from '@/composables/useDeleteTask'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  taskId: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUiStore()
const taskStore = useTaskStore()
const { confirm, handleDelete: origHandleDelete, onDeleteConfirmed } = useDeleteTask()

const task = computed<Task | null>(() => {
  if (!props.taskId) return null
  const found = taskStore.getTaskById(props.taskId)
  return found || null
})

const priorityLabel = computed(() => {
  if (!task.value) return ''
  const labels: Record<string, string> = { urgent: '紧急', high: '高', medium: '中', low: '低' }
  return labels[task.value.priority] || ''
})

const recurringLabel = computed(() => {
  if (!task.value?.recurring) return ''
  const labels: Record<string, string> = { daily: '每天', weekly: '每周', weekdays: '工作日', monthly: '每月' }
  return labels[task.value.recurring.type] || task.value.recurring.type
})

function close() {
  emit('close')
  uiStore.closeDetail()
}

function handleEdit() {
  if (task.value) {
    uiStore.openEditTaskForm(task.value.id)
    close()
  }
}

function handleDelete() {
  if (!task.value) return
  origHandleDelete(task.value.id)
}

function handleAddNew() {
  const prefill: any = {}
  if (task.value?.dueDate) prefill.dueDate = task.value.dueDate
  if (task.value?.dueTime) prefill.dueTime = task.value.dueTime
  uiStore.openNewTaskForm(prefill)
  close()
}
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: 8000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: env(safe-area-inset-top, 0px);
}
@media (min-width: 768px) {
  .detail-overlay { align-items: center; }
}

.detail-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-lg);
  max-height: 80vh;
  overflow-y: auto;
}
@media (min-width: 768px) {
  .detail-card { border-radius: var(--radius-xl); }
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}
.detail-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}
.detail-close {
  color: var(--color-text-muted);
  display: flex;
  padding: 4px;
  border-radius: var(--radius-sm);
}
.detail-close:hover { background: var(--color-surface-hover); }

.detail-body { display: flex; flex-direction: column; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
.detail-row { display: flex; gap: var(--spacing-xs); }
.detail-label { font-size: var(--font-size-sm); color: var(--color-text-muted); min-width: 48px; flex-shrink: 0; }
.detail-value { font-size: var(--font-size-sm); color: var(--color-text); font-weight: 500; }
.priority-badge {
  padding: 0 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  line-height: 1.6;
}
.priority-badge.p-urgent { background: var(--priority-urgent-bg); color: var(--priority-urgent-text); }
.priority-badge.p-high { background: var(--priority-high-bg); color: var(--priority-high-text); }
.priority-badge.p-medium { background: var(--priority-medium-bg); color: var(--priority-medium-text); }
.priority-badge.p-low { background: var(--priority-low-bg); color: var(--priority-low-text); }

.detail-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}
.detail-btn {
  flex: 1;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
  text-align: center;
  font-weight: 500;
}
.edit-btn { background: var(--color-primary); color: var(--color-text-on-primary); border: none; }
.delete-btn { background: transparent; color: var(--color-danger); border: 1px solid var(--color-danger); }
.add-btn { width: 100%; background: var(--color-surface); color: var(--color-primary); border: 1px dashed var(--color-primary); }
.detail-footer { padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border-light); }
</style>
