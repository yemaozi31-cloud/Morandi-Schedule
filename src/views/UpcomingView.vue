<template>
  <AppLayout>
    <div class="upcoming-view">
      <MobileBackLink />

      <!-- 快速添加 -->
      <div class="quick-add-bar">
        <input v-model="quickAddText" class="quick-add-input" placeholder="快速添加任务..." @keydown.enter="handleQuickAdd" />
        <button class="quick-add-submit" @click="handleQuickAdd" :disabled="!quickAddText.trim()">添加</button>
      </div>

      <!-- 周视图（自带导航） -->
      <div class="week-wrapper">
        <WeekView
          :current-date="currentDate"
          :tasks="taskStore.activeTasks"
          :selected-date="selectedDay"
          @update:current-date="currentDate = $event"
          @select-task="openEditTask"
          @create-task="handleCreateTask"
          @toggle-task="handleToggle"
          @delete-task="handleDelete"
          @select-date="handleSelectDay"
        />
      </div>

      <TaskDetailModal
        :task-id="uiStore.detailTaskId"
        @close="uiStore.closeDetail()"
      />
      <TaskFormModal
        :visible="uiStore.showTaskForm"
        :editing-task="editingTask"
        @close="uiStore.closeTaskForm()"
        @save="handleSave"
      />

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Task } from '@/types'
import { useTaskStore } from '@/stores/taskStore'
import { useUiStore } from '@/stores/uiStore'
import { getTodayStr } from '@/utils/date'
import { nlpParse } from '@/utils/nlpParser'
import MobileBackLink from '@/components/common/MobileBackLink.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import WeekView from '@/components/calendar/WeekView.vue'
import TaskFormModal from '@/components/todo/TaskFormModal.vue'
import TaskDetailModal from '@/components/todo/TaskDetailModal.vue'

const taskStore = useTaskStore()
const uiStore = useUiStore()

const editingTask = ref<Task | null>(null)
const quickAddText = ref('')
const currentDate = ref(getTodayStr())
const selectedDay = ref('')  // 选中的天（高亮用）

function showConfirm(title: string, message: string, onConfirm: () => void) {
  window.__dialog?.warning({
    title,
    content: message,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: onConfirm
  })
}

function handleSelectDay(date: string) {
  selectedDay.value = date
}

function openEditTask(taskId: string) {
  uiStore.openDetail(taskId)
}

watch(() => uiStore.showTaskForm, (show) => {
  if (show && uiStore.editingTaskId) {
    editingTask.value = taskStore.getTaskById(uiStore.editingTaskId) || null
  }
})

async function handleToggle(taskId: string) {
  try { await taskStore.toggleComplete(taskId) } catch {
    window.__message?.error('操作失败')
  }
}

async function handleDelete(taskId: string) {
  console.log('[UpcomingView] handleDelete 被调用:', taskId)
  const task = taskStore.getTaskById(taskId)
  if (!task) return
  showConfirm('删除任务', `确认删除任务"${task.title}"？`, async () => {
    try {
      await taskStore.deleteTask(taskId)
      window.__message?.success('已删除')
    } catch {
      window.__message?.error('删除失败')
    }
  })
}

async function handleQuickAdd() {
  if (!quickAddText.value.trim()) return
  const parsed = nlpParse(quickAddText.value)
  try {
    await taskStore.createTask({
      title: parsed.title || quickAddText.value.trim(),
      dueDate: parsed.dueDate || getTodayStr(),
      dueTime: parsed.dueTime || null,
      priority: (parsed.priority || 'none') as Task['priority'],
      tagIds: [],
      recurring: parsed.recurring ? { type: parsed.recurring as 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly' } : null
    })
    quickAddText.value = ''
    window.__message?.success('任务已创建')
  } catch {
    window.__message?.error('创建失败')
  }
}

function handleCreateTask(data: { dueDate: string }) {
  editingTask.value = null
  selectedDay.value = data.dueDate
  uiStore.openNewTaskForm()
}

async function handleSave(data: any) {
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, data)
      window.__message?.success('任务已更新')
    } else {
      await taskStore.createTask({ ...data, dueDate: data.dueDate || selectedDay.value || null })
      window.__message?.success('任务已创建')
    }
    uiStore.closeTaskForm()
  } catch {
    window.__message?.error('保存失败')
  }
}
</script>

<style scoped>
.upcoming-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: var(--spacing-md);
  overflow-x: hidden;
}

.quick-add-bar {
  display: flex;
  gap: var(--spacing-xs);
}

.quick-add-bar .quick-add-input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
}

.quick-add-bar .quick-add-input:focus { border-color: var(--color-primary); }

.quick-add-submit {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.quick-add-submit:disabled { opacity: 0.5; }

.week-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>