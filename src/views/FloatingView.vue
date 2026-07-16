<template>
  <div class="floating-view" :class="{ minimized: isMinimized, dragging: isDragging }">
    <!-- 小球模式 -->
    <div
      v-if="isMinimized"
      class="floating-ball"
      @mousedown="startDrag"
      @touchstart.prevent="startDrag"
      @click="isMinimized = false"
      :style="{ left: ballPos.x + 'px', top: ballPos.y + 'px' }"
    >
      <Icon name="plus" :size="22" color="#fff" />
      <span class="ball-badge" v-if="pendingCount">{{ pendingCount }}</span>
    </div>

    <!-- 展开模式 -->
    <div v-else class="floating-panel" :style="{ left: ballPos.x + 'px', top: ballPos.y + 'px' }">
      <div class="floating-header" @mousedown="startDrag" @touchstart.prevent="startDrag">
        <span class="floating-title">快速添加</span>
        <div class="floating-actions">
          <button class="float-btn minimize" @click="isMinimized = true" title="最小化">
            <Icon name="minus" :size="14" />
          </button>
          <button class="float-btn close" @click="$emit('close')" title="关闭">
            <Icon name="x" :size="14" />
          </button>
        </div>
      </div>
      <div class="floating-body">
        <div class="quick-input-row">
          <input
            ref="quickInput"
            v-model="quickText"
            class="quick-input"
            placeholder="输入任务... 支持 NLP 语法"
            @keydown.enter="handleQuickAdd"
          />
          <button class="quick-add-btn" @click="handleQuickAdd" :disabled="!quickText.trim()">添加</button>
        </div>
        <div class="quick-options">
          <MorandiSelect v-model="quickPriority" class="quick-select" :options="[
            { value: 'none', label: '优先级' },
            { value: 'low', label: '低' },
            { value: 'medium', label: '中' },
            { value: 'high', label: '高' },
            { value: 'urgent', label: '紧急' }
          ]" placeholder="优先级" />
          <MorandiDatePicker v-model="quickDueDate" class="quick-date" clearable />
        </div>
        <div class="recent-tasks" v-if="recent.length > 0">
          <span class="recent-label">最近任务</span>
          <div v-for="task in recent.slice(0, 5)" :key="task.id" class="recent-item" :class="'p-' + task.priority">
            <span class="recent-title text-ellipsis">{{ task.title }}</span>
            <button class="recent-toggle" @click="toggleComplete(task.id)">
              {{ task.status === 'completed' ? '✓' : '○' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { nlpParse } from '@/utils/nlpParser'
import type { Task } from '@/types'
import Icon from '@/components/common/Icon.vue'
import MorandiDatePicker from '@/components/common/MorandiDatePicker.vue'
import MorandiSelect from '@/components/common/MorandiSelect.vue'

defineEmits<{
  (e: 'close'): void
}>()

const taskStore = useTaskStore()

const isMinimized = ref(false)
const isDragging = ref(false)
const quickText = ref('')
const quickPriority = ref('none')
const quickDueDate = ref('')
const quickInput = ref<HTMLInputElement>()

const ballPos = ref({ x: 20, y: 100 })

let dragOffset = { x: 0, y: 0 }

const pendingCount = computed(() => taskStore.pendingTasks)

const recent = computed(() =>
  taskStore.activeTasks.slice(0, 5)
)

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  dragOffset.x = clientX - ballPos.value.x
  dragOffset.y = clientY - ballPos.value.y

  const onMove = (ev: MouseEvent | TouchEvent) => {
    const cx = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX
    const cy = 'touches' in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY
    ballPos.value = {
      x: Math.max(0, Math.min(window.innerWidth - 60, cx - dragOffset.x)),
      y: Math.max(0, Math.min(window.innerHeight - 60, cy - dragOffset.y))
    }
  }

  const onUp = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onUp)
}

async function handleQuickAdd() {
  if (!quickText.value.trim()) return

  const parsed = nlpParse(quickText.value)

  try {
    await taskStore.createTask({
      title: parsed.title || quickText.value.trim(),
      dueDate: parsed.dueDate || quickDueDate.value || null,
      dueTime: parsed.dueTime || null,
      priority: (quickPriority.value !== 'none' ? quickPriority.value : (parsed.priority || 'none')) as Task['priority'],
      recurring: parsed.recurring ? { type: parsed.recurring as 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly' } : null
    })
    window.__message?.success('任务已创建')
    quickText.value = ''
    quickPriority.value = 'none'
    quickDueDate.value = ''
  } catch {
    window.__message?.error('创建失败')
  }
}

async function toggleComplete(taskId: string) {
  try {
    await taskStore.toggleComplete(taskId)
  } catch {
    window.__message?.error('操作失败')
  }
}

onMounted(async () => {
  await taskStore.loadTasks()
  quickInput.value?.focus()
})
</script>

<style scoped>
.floating-view {
  position: fixed;
  z-index: 9999;
}

/* 小球模式 */
.floating-ball {
  position: fixed;
  width: 48px;
  height: 48px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 4px 12px var(--color-shadow-heavy);
  z-index: 9999;
  transition: box-shadow var(--transition-fast);
}

.floating-ball:hover { box-shadow: 0 6px 16px var(--color-shadow-heavy); }
.floating-ball.dragging { cursor: grabbing; }

.ball-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-danger);
  color: var(--color-text-on-primary);
  font-size: 10px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 展开面板 */
.floating-panel {
  position: fixed;
  width: 320px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px var(--color-shadow-heavy);
  border: 1px solid var(--color-border);
  overflow: hidden;
  z-index: 9999;
}

.floating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  cursor: grab;
}

.floating-title { color: var(--color-text-on-primary); font-size: var(--font-size-sm); font-weight: 500; }

.floating-actions { display: flex; gap: 2px; }
.float-btn {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.float-btn:hover { background: rgba(255,255,255,0.2); }

.floating-body {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.quick-input-row {
  display: flex;
  gap: var(--spacing-xs);
}

.quick-input {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
}

.quick-input:focus { border-color: var(--color-primary); }

.quick-add-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.quick-options {
  display: flex;
  gap: var(--spacing-xs);
}

.quick-select, .quick-date {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.recent-tasks {
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--spacing-sm);
}

.recent-label { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--spacing-xs); display: block; }

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}

.recent-item.p-urgent { background: color-mix(in srgb, var(--color-danger) 20%, var(--color-bg)); }
.recent-item.p-high { background: color-mix(in srgb, var(--color-warning) 20%, var(--color-bg)); }
.recent-item.p-medium { background: color-mix(in srgb, var(--color-info) 18%, var(--color-bg)); }
.recent-item.p-low { background: color-mix(in srgb, var(--color-success) 16%, var(--color-bg)); }

.recent-title { flex: 1; min-width: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.recent-toggle { color: var(--color-text-muted); font-size: 14px; }
.recent-toggle:hover { color: var(--color-primary); }
</style>
