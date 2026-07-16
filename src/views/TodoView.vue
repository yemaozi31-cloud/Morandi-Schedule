<template>
  <AppLayout>
    <div class="todo-view">
      <TodoToolbar
        :view-mode="taskStore.viewMode"
        :search-text="taskStore.filter.searchText"
        :batch-mode="batchMode"
        @update:view-mode="taskStore.setViewMode"
        @update:search-text="onSearch"
        @add-task="openNewTask"
        @toggle-batch="toggleBatchMode"
      />
      <SmartFilter />

      <!-- 快捷添加栏 -->
      <div class="quick-add-bar">
        <input
          ref="quickAddInput"
          v-model="quickAddText"
          class="quick-add-input"
          placeholder="快速添加任务... 支持 NLP 语法"
          @keydown.enter="handleQuickAdd"
        />
        <button class="quick-add-submit" @click="handleQuickAdd" :disabled="!quickAddText.trim()">添加</button>
      </div>

      <!-- 批量操作工具栏 -->
      <div v-if="batchMode" class="batch-toolbar">
        <span class="batch-count">已选 {{ batchSelected.size }} 项</span>
        <button class="batch-btn" @click="batchComplete">完成</button>
        <button class="batch-btn danger" @click="batchDelete">删除</button>
        <button class="batch-btn cancel" @click="exitBatchMode">取消</button>
      </div>

      <!-- 视图切换 -->
      <div class="todo-view-body">
        <div class="todo-content">
          <template v-if="taskStore.viewMode === 'matrix'">
            <EisenhowerMatrix
              :tasks="taskStore.eisenhowerTasks"
              @toggle="handleToggle"
              @edit="openEditTask"
              @delete="handleDelete"
            />
          </template>
          <template v-else>
            <div class="date-grouped-list">
              <div v-for="group in groupedTasks" :key="group.label" class="date-group">
                <h3 class="date-group-header">{{ group.label }} <span class="group-count">{{ group.tasks.length }}</span></h3>
                <TaskList
                  :tasks="group.tasks"
                  :batch-mode="batchMode"
                  :batch-selected="batchSelected"
                  @select="openEditTask"
                  @toggle="handleToggle"
                  @delete="handleDelete"
                  @batch-toggle="handleBatchToggle"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 任务表单弹窗 -->
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
import { useTagStore } from '@/stores/tagStore'
import type { Task } from '@/types'
import { nlpParse } from '@/utils/nlpParser'
import { format, parseISO, getTodayStr } from '@/utils/date'

import { useDeleteTask } from '@/composables/useDeleteTask'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import TodoToolbar from '@/components/todo/TodoToolbar.vue'
import EisenhowerMatrix from '@/components/today/EisenhowerMatrix.vue'
import TaskFormModal from '@/components/todo/TaskFormModal.vue'
import SmartFilter from '@/components/todo/SmartFilter.vue'
import TaskList from '@/components/todo/TaskList.vue'

const taskStore = useTaskStore()
const uiStore = useUiStore()
const tagStore = useTagStore()
const { confirm, handleDelete: origHandleDelete, onDeleteConfirmed } = useDeleteTask()

const editingTask = ref<Task | null>(null)
const quickAddText = ref('')
const quickAddInput = ref<HTMLInputElement>()
const batchMode = ref(false)
const batchSelected = ref<Set<string>>(new Set())
// 列表模式：按日期分组
const groupedTasks = computed(() => {
  const today = getTodayStr()
  const groups: { label: string; tasks: Task[] }[] = [
    { label: '今天', tasks: [] },
    { label: '明天', tasks: [] },
    { label: '本周', tasks: [] },
    { label: '更晚', tasks: [] },
    { label: '无日期', tasks: [] }
  ]

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

  const endOfWeek = new Date()
  const day = endOfWeek.getDay()
  const diff = day === 0 ? 0 : 7 - day
  endOfWeek.setDate(endOfWeek.getDate() + diff)
  const endOfWeekStr = format(endOfWeek, 'yyyy-MM-dd')

  for (const task of taskStore.filteredTasks) {
    // 持续事件：按区间判断所属分组
    if (task.isSpanning && task.startDate) {
      if (today >= task.startDate && today <= task.dueDate) {
        groups[0].tasks.push(task) // 进行中 → 今天组
      } else if (task.startDate === tomorrowStr) {
        groups[1].tasks.push(task)
      } else if (task.startDate <= endOfWeekStr) {
        groups[2].tasks.push(task)
      } else {
        groups[3].tasks.push(task)
      }
    } else if (!task.dueDate) {
      groups[4].tasks.push(task)
    } else if (task.dueDate === today) {
      groups[0].tasks.push(task)
    } else if (task.dueDate === tomorrowStr) {
      groups[1].tasks.push(task)
    } else if (task.dueDate <= endOfWeekStr) {
      groups[2].tasks.push(task)
    } else {
      groups[3].tasks.push(task)
    }
  }

  return groups.filter(g => g.tasks.length > 0)
})

function onSearch(text: string) {
  taskStore.filter.searchText = text
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) batchSelected.value = new Set()
}

function openNewTask() {
  editingTask.value = null
  uiStore.openNewTaskForm()
}

function handleBatchToggle(id: string) {
  const s = new Set(batchSelected.value)
  if (s.has(id)) { s.delete(id) } else { s.add(id) }
  batchSelected.value = s
}

async function batchComplete() {
  let success = 0, fail = 0
  for (const id of batchSelected.value) {
    try { await taskStore.toggleComplete(id); success++ } catch { fail++ }
  }
  if (fail > 0) {
    window.__message?.warning(`已完成 ${success} 项，${fail} 项失败`)
  } else {
    window.__message?.success(`已完成 ${success} 项`)
  }
  exitBatchMode()
}

async function batchDelete() {
  if (!window.confirm(`确认删除 ${batchSelected.value.size} 项任务？此操作不可撤销。`)) return
  let success = 0, fail = 0
  for (const id of batchSelected.value) {
    try { await taskStore.deleteTask(id); success++ } catch { fail++ }
  }
  if (fail > 0) {
    window.__message?.warning(`已删除 ${success} 项，${fail} 项失败`)
  } else {
    window.__message?.success(`已删除 ${success} 项`)
  }
  exitBatchMode()
}

function exitBatchMode() {
  batchMode.value = false
  batchSelected.value = new Set()
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
    quickAddInput.value?.focus()
    window.__message?.success('任务已创建')
  } catch {
    window.__message?.error('创建失败')
  }
}

function openEditTask(taskId: string) {
  const task = taskStore.getTaskById(taskId)
  if (task) {
    editingTask.value = task
    uiStore.openEditTaskForm(taskId)
  }
}

async function handleToggle(taskId: string) {
  try {
    await taskStore.toggleComplete(taskId)
  } catch {
    window.__message?.error('操作失败，请重试')
  }
}

function handleDelete(taskId: string) {
  console.log('[TodoView] handleDelete 被调用:', taskId)
  origHandleDelete(taskId)
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
  } catch (e) {
    window.__message?.error('保存失败，请重试')
  }
}
</script>

<style scoped>
.todo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.todo-view-body {
  display: flex;
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.quick-add-bar {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) 0;
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

.quick-add-input:focus {
  border-color: var(--color-primary);
}

.quick-add-submit {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.quick-add-submit:disabled { opacity: 0.5; }

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.batch-count { color: var(--color-text-on-primary); font-size: var(--font-size-sm); margin-right: auto; }

.batch-btn {
  padding: 2px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-on-primary);
  border: 1px solid rgba(255,255,255,0.4);
  background: transparent;
  cursor: pointer;
}

.batch-btn.danger { color: var(--color-danger); border-color: var(--color-danger); }
.batch-btn.cancel { opacity: 0.7; }

.todo-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.right-panel {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.panel-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.today-habits {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.date-grouped-list {
  overflow-y: auto;
  flex: 1;
}

.date-group {
  margin-bottom: var(--spacing-md);
}

.date-group-header {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) var(--spacing-md);
  margin-bottom: var(--spacing-xs);
}

.group-count {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  margin-left: var(--spacing-xs);
}

@media (max-width: 767px) {
  .todo-view-body {
    flex-direction: column;
  }
  .right-panel {
    width: 100%;
    order: -1;
  }
  .today-habits.mobile-collapsible {
    display: none;
  }
}
</style>
