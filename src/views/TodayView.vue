<template>
  <AppLayout>
    <div class="today-view">
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

      <!-- 今日任务时间线（统一日视图组件） -->
      <div class="today-view-body">
        <div class="today-content">
          <DayTimeline
            :tasks="taskStore.todayTasks"
            :overdue-tasks="overdueTasks"
            :current-date="todayStr"
            :show-nav="false"
            :show-overdue="true"
            @select-task="openEditTask"
            @toggle-task="handleToggle"
            @delete-task="handleDelete"
            @create-task="handleCreateTask"
          @move-task="handleMoveTask"
          />
        </div>

        <!-- 右侧面板: 番茄钟 + 今日习惯 -->
        <div class="right-panel">
          <!-- 桌面端: 完整番茄钟 -->
          <div class="desktop-pomodoro">
            <PomodoroTimer />
          </div>

          <!-- 手机端: 紧凑工具栏 -->
          <div class="mobile-toolbar">
            <router-link to="/pomodoro" class="toolbar-btn pomodoro-btn">
              <Icon name="timer" :size="18" />
              <span>开始专注</span>
            </router-link>

            <div class="toolbar-btn habits-btn">
              <router-link to="/habits" class="habits-btn-link">
                <Icon name="target" :size="18" />
                <span>习惯</span>
                <span v-if="pendingHabitCount > 0" class="habits-badge">{{ pendingHabitCount }}</span>
              </router-link>
              <button class="habits-expand-btn" @click="habitsExpand = !habitsExpand">
                <Icon :name="habitsExpand ? 'chevron-up' : 'chevron-down'" :size="14" />
              </button>
            </div>
          </div>

          <!-- 桌面端标题（含折叠） -->
          <div class="desktop-habits-header" @click="habitsExpand = !habitsExpand">
            <h3 class="panel-title">今日习惯</h3>
            <button class="habits-expand-btn desktop">
              <Icon :name="habitsExpand ? 'arrow-up' : 'arrow-down'" :size="14" />
            </button>
          </div>

          <!-- 习惯卡片（收拉） -->
          <transition name="accordion">
            <div v-if="habitsExpand" class="habits-accordion">
              <HabitCard
                v-for="habit in todayHabits"
                :key="habit.id"
                :habit="habit"
                compact
                :refresh-trigger="sharedRefreshTrigger"
                @checked="onHabitChecked"
              />
            </div>
          </transition>
        </div>
      </div>

      <!-- 任务详情弹窗 -->
      <TaskDetailModal
        :task-id="uiStore.detailTaskId"
        @close="uiStore.closeDetail()"
      />
      <!-- 任务表单弹窗 -->
      <TaskFormModal
        :visible="uiStore.showTaskForm"
        :editing-task="editingTask"
        @close="uiStore.closeTaskForm()"
        @save="handleSave"
      />
      <!-- 本地确认弹窗 -->
      <ConfirmDialog
        v-if="deleteConfirm.show"
        :show="deleteConfirm.show"
        :title="'删除任务'"
        :content="deleteConfirm.content"
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
import { onMounted, computed, ref, watch } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useUiStore } from '@/stores/uiStore'
import { useTagStore } from '@/stores/tagStore'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { useHabitStore } from '@/stores/habitStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { fetchSharedData, pullFromWebDAV } from '@/services/webdavSync'
import type { Task } from '@/types'
import { nlpParse } from '@/utils/nlpParser'
import { getTodayStr } from '@/utils/date'

import Icon from '@/components/common/Icon.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import DayTimeline from '@/components/calendar/DayTimeline.vue'
import type { PeriodKey } from '@/components/calendar/DayTimeline.vue'
import PomodoroTimer from '@/components/pomodoro/PomodoroTimer.vue'
import TaskFormModal from '@/components/todo/TaskFormModal.vue'
import TaskDetailModal from '@/components/todo/TaskDetailModal.vue'
import HabitCard from '@/components/habits/HabitCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useDeleteTask } from '@/composables/useDeleteTask'

const taskStore = useTaskStore()
const uiStore = useUiStore()
const tagStore = useTagStore()
const pomodoroStore = usePomodoroStore()
const habitStore = useHabitStore()
const settingsStore = useSettingsStore()

const todayStr = getTodayStr()
const editingTask = ref<Task | null>(null)
const quickAddText = ref('')
const quickAddInput = ref<HTMLInputElement>()
const habitsExpand = ref(true)
const { confirm: deleteConfirm, handleDelete, onDeleteConfirmed } = useDeleteTask()
const sharedRefreshTrigger = ref(0)

// 云端共享习惯
const cloudSharedHabits = ref<any[]>([])

// 30 秒轮询：刷新共享数据
setInterval(() => {
  sharedRefreshTrigger.value++
  loadCloudSharedHabits()
}, 30000)

/** 合并后的习惯列表：本地 + 云端共享 */
const todayHabits = computed(() => {
  const local = habitStore.sortedHabits
  const cloud = cloudSharedHabits.value
  if (cloud.length === 0) return local
  return [...local, ...cloud].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
})

const pendingHabitCount = computed(() => {
  return todayHabits.value.filter(h => {
    if (h.isShared) return false
    const val = habitStore.getPeriodValue(h.id)
    return val < h.target
  }).length
})

async function loadCloudSharedHabits() {
  const cfg = settingsStore.syncConfig
  if (!cfg.webdavUrl || !cfg.nickname) return
  try {
    const data = await fetchSharedData(cfg)
    const nick = cfg.nickname
    const myHabits = data.habits.filter(h => h.members.includes(nick!))
    cloudSharedHabits.value = myHabits.map(h => ({
      id: `shared-${h.name}`,
      name: h.name,
      frequency: 'daily' as const,
      target: 1,
      unit: 'times' as const,
      color: '#A3B5A0',
      isShared: true,
      sharedHabitName: h.name,
      sharedCreatedBy: h.createdBy,
      createdAt: h.createdAt
    }))
  } catch { /* 轮询静默重试 */ }
}

const overdueTasks = computed(() =>
  taskStore.activeTasks.filter(t =>
    t.dueDate && t.dueDate < todayStr && !t.deletedAt && t.status !== 'completed' && t.status !== 'cancelled'
  )
)

onMounted(async () => {
  // 先拉云端覆盖本地
  try { await pullFromWebDAV(settingsStore.syncConfig) } catch {}
  // 再从本地加载到内存
  await taskStore.loadTasks()
  await tagStore.loadTags()
  await pomodoroStore.loadSessions()
  await habitStore.loadHabits()
  await habitStore.loadCheckIns()
  await loadCloudSharedHabits()
})

function openEditTask(taskId: string) {
  uiStore.openDetail(taskId)
}

watch(() => uiStore.showTaskForm, (show) => {
  if (show) {
    editingTask.value = uiStore.editingTaskId
      ? taskStore.getTaskById(uiStore.editingTaskId) || null
      : null
  }
})

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

/** 拖拽任务到不同时段：调整 dueTime */
async function handleMoveTask(data: { taskId: string; targetPeriod: PeriodKey }) {
  const task = taskStore.getTaskById(data.taskId)
  if (!task) return
  const targetHours: Record<PeriodKey, string | null> = {
    'all-day': null,
    'morning': '09',
    'afternoon': '14',
    'evening': '20'
  }
  const hour = targetHours[data.targetPeriod]
  if (hour === null) {
    await taskStore.updateTask(data.taskId, { dueTime: null })
  } else {
    const minutes = task.dueTime ? task.dueTime.split(':')[1] : '00'
    await taskStore.updateTask(data.taskId, { dueTime: `${hour}:${minutes}` })
  }
}

function handleCreateTask(data: { dueDate: string; dueTime?: string }) {
  editingTask.value = null
  uiStore.openNewTaskForm({ dueDate: data.dueDate, dueTime: data.dueTime })
}

async function handleToggle(taskId: string) {
  try {
    await taskStore.toggleComplete(taskId)
  } catch {
    window.__message?.error('操作失败，请重试')
  }
}

// handleDelete / onDeleteConfirmed 由 useDeleteTask composable 提供

async function onHabitChecked(habitId: string) {
  // HabitCard 内部已处理打卡/取消，此处不需要额外操作
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
.today-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.today-view-body {
  display: flex;
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
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

.today-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
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

.mobile-toolbar {
  display: none;
}

.desktop-pomodoro {
  display: block;
}

.desktop-pomodoro :deep(.pomodoro-timer) {
  padding: var(--spacing-md);
}

.desktop-pomodoro :deep(.timer-display) {
  font-size: 36px;
  margin-bottom: var(--spacing-sm);
}

.desktop-pomodoro :deep(.duration-btn) {
  font-size: 12px;
  padding: 2px 8px;
}

.desktop-habits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.desktop-habits-header .panel-title {
  margin-bottom: 0;
}

.habits-expand-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.habits-expand-btn:hover {
  color: var(--color-text);
}

.habits-expand-btn.desktop {
  padding: var(--spacing-xs);
}

.habits-accordion {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* 紧凑模式：隐藏不需要的元素（热力图、月份导航、展开/删除按钮、状态点） */
.habits-accordion :deep(.heatmap-nav-inline),
.habits-accordion :deep(.compact-expand),
.habits-accordion :deep(.compact-delete),
.habits-accordion :deep(.compact-dot),
.habits-accordion :deep(.heatmap-grid) {
  display: none !important;
}

/* 手风琴过渡 */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .today-view-body {
    flex-direction: column;
  }
  .right-panel {
    width: 100%;
    order: -1;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  .desktop-pomodoro {
    display: none;
  }
  .desktop-habits-header {
    display: none;
  }
  .mobile-toolbar {
    display: flex;
    gap: var(--spacing-sm);
    width: 100%;
  }
  .toolbar-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: 500;
    border: 1px solid var(--color-border-light);
    background: var(--color-surface);
    overflow: visible;
    min-height: 44px;
  }
  .pomodoro-btn {
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    border-color: var(--color-primary);
  }
  .habits-btn {
    position: relative;
    padding: 0;
    overflow: visible;
    background: color-mix(in srgb, var(--color-warm) 20%, var(--color-surface));
    border-color: var(--color-warm);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .habits-btn-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    text-decoration: none;
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }
  .habits-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: var(--radius-full);
    background: var(--color-warm);
    color: var(--color-text-on-primary);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
  }
  .habits-expand-btn {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 56px;
    padding: 0;
    background: transparent;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .habits-accordion {
    width: 100%;
  }
}

</style>
