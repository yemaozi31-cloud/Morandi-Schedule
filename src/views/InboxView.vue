<template>
  <AppLayout>
    <div class="inbox-view">
      <h2 class="page-title">随记</h2>
      <p class="page-desc">随手记录，稍后整理</p>

    <!-- 快捷添加 -->
    <div class="quick-add-bar">
      <input
        v-model="quickText"
        class="quick-add-input"
        placeholder="输入任务... 支持 NLP 语法"
        @keydown.enter="handleQuickAdd"
      />
      <button class="quick-add-btn" @click="handleQuickAdd" :disabled="!quickText.trim()">
        <Icon name="plus" :size="16" />
      </button>
    </div>

    <!-- 收件箱任务列表 -->
    <TaskList
      :tasks="inboxTasks"
      empty-title="随记为空"
      @select="openEditTask"
      @toggle="handleToggle"
      @delete="handleDelete"
    />

    <TaskFormModal
      :visible="uiStore.showTaskForm"
      :editing-task="editingTask"
      @close="uiStore.closeTaskForm()"
      @save="handleSave"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="confirm.show"
      :show="confirm.show"
      :title="'删除任务'"
      :content="confirm.content"
      positive-text="确认"
      negative-text="取消"
      @confirm="onDeleteConfirmed(true)"
      @cancel="onDeleteConfirmed(false)"
      @update:show="(v) => { if (!v) onDeleteConfirmed(false) }"
    />

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useUiStore } from '@/stores/uiStore'
import { nlpParse } from '@/utils/nlpParser'
import type { Task } from '@/types'
import { useDeleteTask } from '@/composables/useDeleteTask'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Icon from '@/components/common/Icon.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import TaskList from '@/components/todo/TaskList.vue'
import TaskFormModal from '@/components/todo/TaskFormModal.vue'

const taskStore = useTaskStore()
const uiStore = useUiStore()
const quickText = ref('')
const editingTask = ref<Task | null>(null)
const { confirm, handleDelete: origHandleDelete, onDeleteConfirmed } = useDeleteTask()

const inboxTasks = computed(() =>
  taskStore.activeTasks.filter(t => !t.tagIds.length)
)

async function handleQuickAdd() {
  if (!quickText.value.trim()) return
  const parsed = nlpParse(quickText.value)
  try {
    await taskStore.createTask({
      title: parsed.title || quickText.value.trim(),
      dueDate: parsed.dueDate || null,
      dueTime: parsed.dueTime || null,
      priority: (parsed.priority || 'none') as Task['priority'],
      tagIds: [],
      recurring: parsed.recurring ? { type: parsed.recurring as any } : null
    })
    quickText.value = ''
    window.__message?.success('已添加到随记')
  } catch {
    window.__message?.error('添加失败')
  }
}

function openEditTask(taskId: string) {
  const task = taskStore.getTaskById(taskId)
  if (task) {
    editingTask.value = task
    uiStore.openEditTaskForm(taskId)
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
    window.__message?.error('保存失败')
  }
}

async function handleToggle(taskId: string) {
  try { await taskStore.toggleComplete(taskId) } catch {
    window.__message?.error('操作失败')
  }
}

function handleDelete(taskId: string) {
  origHandleDelete(taskId)
}
</script>

<style scoped>
.inbox-view {
  max-width: 680px;
}

.page-title { font-size: var(--font-size-xl); color: var(--color-text); margin-bottom: var(--spacing-xs); }
.page-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--spacing-lg); }

.quick-add-bar {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.quick-add-input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-md);
  outline: none;
}

.quick-add-input:focus { border-color: var(--color-primary); }

.quick-add-btn {
  padding: var(--spacing-sm);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.quick-add-btn:disabled { opacity: 0.5; }
</style>
