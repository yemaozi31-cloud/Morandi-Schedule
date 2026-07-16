<template>
  <AppLayout>
    <div class="kanban-page">
      <MobileBackLink />
      <div class="kanban-header">
        <h1>看板视图</h1>
        <div class="kanban-controls">
          <button
            v-for="opt in groupOptions"
            :key="opt.key"
            class="group-btn"
            :class="{ active: groupBy === opt.key }"
            @click="groupBy = opt.key"
          >
            {{ opt.label }}
          </button>
          <button class="add-btn" @click="openNewTask">
            <Icon name="plus" :size="16" /> 新建
          </button>
        </div>
      </div>
      <KanbanView
        :tasks="taskStore.activeTasks"
        :group-by="groupBy"
        @select-task="openEditTask"
        @add-task="openNewTask"
        @move-task="handleMoveTask"
      />
    </div>
    <TaskFormModal
      :visible="uiStore.showTaskForm"
      :editing-task="editingTask"
      @close="uiStore.closeTaskForm()"
      @save="handleSave"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useUiStore } from '@/stores/uiStore'
import type { Task } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import KanbanView from '@/components/todo/KanbanView.vue'
import TaskFormModal from '@/components/todo/TaskFormModal.vue'
import Icon from '@/components/common/Icon.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'

const taskStore = useTaskStore()
const uiStore = useUiStore()

const groupBy = ref<'status' | 'priority' | 'tag'>('status')
const editingTask = ref<Task | null>(null)

const groupOptions = [
  { key: 'status' as const, label: '按状态' },
  { key: 'priority' as const, label: '按优先级' },
  { key: 'tag' as const, label: '按标签' }
]

onMounted(async () => {
  await taskStore.loadTasks()
})

function openNewTask() {
  editingTask.value = null
  uiStore.openNewTaskForm()
}

function openEditTask(taskId: string) {
  const task = taskStore.getTaskById(taskId)
  if (task) {
    editingTask.value = task
    uiStore.openEditTaskForm(taskId)
  }
}

async function handleMoveTask(taskId: string, targetColumn: string) {
  try {
    if (groupBy.value === 'status') {
      await taskStore.updateTask(taskId, { status: targetColumn as Task['status'] })
    } else if (groupBy.value === 'priority') {
      await taskStore.updateTask(taskId, { priority: targetColumn as Task['priority'] })
    } else if (groupBy.value === 'tag') {
      const task = taskStore.getTaskById(taskId)
      if (task && !task.tagIds.includes(targetColumn)) {
        await taskStore.updateTask(taskId, { tagIds: [...task.tagIds, targetColumn] })
      }
    }
  } catch {
    window.__message?.error('移动任务失败')
  }
}

async function handleSave(data: any) {
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, data)
      window.__message?.success('任务已更新')
    } else {
      await taskStore.createTask(data)
      window.__message?.success('任务已创建')
    }
    uiStore.closeTaskForm()
  } catch {
    window.__message?.error('保存失败，请重试')
  }
}
</script>

<style scoped>
.kanban-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  min-width: 0;
}

.kanban-header h1 { font-size: var(--font-size-xl); color: var(--color-text); }

.kanban-controls {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: 10px;
}

.group-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.group-btn.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
}

.add-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-on-primary);
  background: var(--color-primary);
  border: none;
}

/* 窄屏：看板头部压缩 */
@media (max-width: 767px) {
  .kanban-header { flex-wrap: wrap; gap: var(--spacing-xs); }
  .kanban-header h1 { font-size: var(--font-size-md); }
  .group-btn, .add-btn { padding: var(--spacing-xs) var(--spacing-sm); font-size: 11px; }
}
</style>
