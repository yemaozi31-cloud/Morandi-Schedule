<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-card">
          <div class="modal-header">
            <div v-if="showCourseSwitch" class="modal-tabs">
              <span class="modal-tab" @click="switchToCourse">课程</span>
              <span class="modal-tab active">任务</span>
            </div>
            <h3 v-else>{{ editingTask ? '编辑任务' : '新建任务' }}</h3>
            <button class="modal-close" @click="$emit('close')" aria-label="关闭">
              <Icon name="x" :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>任务标题</label>
              <input
                ref="titleInput"
                v-model="form.title"
                placeholder="输入任务描述..."
                @keydown.enter="handleQuickAdd"
              />
              <div v-if="nlpPreview.visible" class="nlp-preview">
                <span class="nlp-chip" v-if="nlpPreview.date">{{ nlpPreview.date }}</span>
                <span class="nlp-chip" v-if="nlpPreview.time">{{ nlpPreview.time }}</span>
                <span class="nlp-chip" v-if="nlpPreview.priorityLabel">{{ nlpPreview.priorityLabel }}</span>
                <span class="nlp-chip" v-if="nlpPreview.recurring">{{ nlpPreview.recurring }}</span>
                <span class="nlp-chip" v-if="nlpPreview.tag">{{ nlpPreview.tag }}</span>
              </div>
              <p class="form-hint">支持自然语言: "明天下午3点买菜 p1 #超市 每天"</p>
            </div>
            <div class="form-group">
              <label>备注</label>
              <textarea v-model="form.description" rows="3" placeholder="添加备注..."></textarea>
            </div>
            <div class="form-group">
              <label class="spanning-toggle">
                <span>持续事件</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="form.isSpanning" />
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
            <template v-if="form.isSpanning">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>开始日期</label>
                  <MorandiDatePicker v-model="form.startDate" clearable />
                </div>
                <div class="form-group flex-1">
                  <label>开始时间</label>
                  <MorandiTimePicker v-model="form.startTime" clearable />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>截止日期</label>
                  <MorandiDatePicker v-model="form.dueDate" clearable />
                </div>
                <div class="form-group flex-1">
                  <label>截止时间</label>
                  <MorandiTimePicker v-model="form.dueTime" clearable />
                </div>
              </div>
            </template>
            <template v-else>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>日期</label>
                  <MorandiDatePicker v-model="form.dueDate" clearable />
                </div>
                <div class="form-group flex-1">
                  <label>事件时间</label>
                  <MorandiTimePicker v-model="form.dueTime" clearable />
                </div>
              </div>
            </template>
            <div class="form-group">
              <label>优先级</label>
              <div class="priority-group">
                <button
                  v-for="opt in priorityOptions"
                  :key="opt.value"
                  class="priority-option"
                  :class="{ active: form.priority === opt.value }"
                  :style="{ '--opt-color': opt.color }"
                  @click="form.priority = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>标签</label>
              <div class="tag-group">
                <button
                  v-for="tag in sortedTags"
                  :key="tag.id"
                  class="tag-option"
                  :class="{ active: selectedTagIds.includes(tag.id) }"
                  :style="{ '--tag-color': tag.color }"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
                <p v-if="sortedTags.length === 0" class="form-hint">暂无标签，请先在标签页创建</p>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>重复</label>
                <MorandiSelect v-model="form.recurringType" :options="recurringOptions" placeholder="不重复" />
              </div>
              <div class="form-group flex-1">
                <label>提醒</label>
                <MorandiSelect v-model="form.reminderMinutes" :options="reminderOptions" placeholder="不提醒" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="footer-btn cancel" @click="$emit('close')">取消</button>
            <button class="footer-btn confirm" @click="handleSave" :disabled="!form.title.trim()">
              {{ editingTask ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import type { Task } from '@/types'
import { useTagStore } from '@/stores/tagStore'
import { useUiStore } from '@/stores/uiStore'
import { nlpParse } from '@/utils/nlpParser'
import Icon from '@/components/common/Icon.vue'
import MorandiDatePicker from '@/components/common/MorandiDatePicker.vue'
import MorandiTimePicker from '@/components/common/MorandiTimePicker.vue'
import MorandiSelect from '@/components/common/MorandiSelect.vue'

const props = defineProps<{
  visible: boolean
  editingTask?: Task | null
  showCourseSwitch?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: any): void
  (e: 'switchCourse'): void
}>()

const recurringOptions = [
  { value: '', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'weekdays', label: '工作日' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' }
]

const reminderOptions = [
  { value: null, label: '不提醒' },
  { value: 0, label: '准时' },
  { value: 5, label: '提前5分钟' },
  { value: 10, label: '提前10分钟' },
  { value: 30, label: '提前30分钟' },
  { value: 60, label: '提前1小时' },
  { value: 1440, label: '提前1天' }
]

function switchToCourse() { emit('switchCourse') }

const tagStore = useTagStore()
const uiStore = useUiStore()
const sortedTags = computed(() => tagStore.sortedTags)
const titleInput = ref<HTMLInputElement>()

const priorityOptions = [
  { value: 'none', label: '无', color: '#B5AFA8' },
  { value: 'low', label: '低', color: '#A0B5C4' },
  { value: 'medium', label: '中', color: '#8FA8B5' },
  { value: 'high', label: '高', color: '#D4C09E' },
  { value: 'urgent', label: '紧急', color: '#C4A0A0' }
]

const form = reactive({
  title: '',
  description: '',
  dueDate: '',
  dueTime: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  isSpanning: false,
  priority: 'none' as string,
  recurringType: '',
  reminderMinutes: null as number | null,
  selectedTags: [] as string[]
})

// NLP 实时预览
const nlpPreview = reactive({
  visible: false,
  date: '',
  time: '',
  priorityLabel: '',
  recurring: '',
  tag: ''
})

const priorityLabels: Record<string, string> = { none: '', low: '优先级:低', medium: '优先级:中', high: '优先级:高', urgent: '优先级:紧急' }
const recurringLabels: Record<string, string> = { daily: '每天', weekly: '每周', weekdays: '工作日', monthly: '每月', yearly: '每年' }

watch(() => form.title, (val) => {
  if (!val.trim()) { nlpPreview.visible = false; return }
  const parsed = nlpParse(val)
  const hasPreview = parsed.dueDate || parsed.dueTime || parsed.priority || parsed.recurring || parsed.tagName
  nlpPreview.visible = !!hasPreview
  nlpPreview.date = parsed.dueDate || ''
  nlpPreview.time = parsed.dueTime || ''
  nlpPreview.priorityLabel = parsed.priority ? priorityLabels[parsed.priority] || '' : ''
  nlpPreview.recurring = parsed.recurring ? recurringLabels[parsed.recurring] || parsed.recurring : ''
  nlpPreview.tag = parsed.tagName || ''
})

const selectedTagIds = computed(() => form.selectedTags)

function toggleTag(tagId: string) {
  const idx = form.selectedTags.indexOf(tagId)
  if (idx >= 0) form.selectedTags.splice(idx, 1)
  else form.selectedTags.push(tagId)
}

// 自然语言解析快速输入
function handleQuickAdd(e: KeyboardEvent) {
  if (e.shiftKey) return // Shift+Enter 换行
  const parsed = nlpParse(form.title)
  if (parsed.dueDate || parsed.dueTime || parsed.priority || parsed.recurring || parsed.tagName) {
    e.preventDefault()
  }
  if (parsed.dueDate) form.dueDate = parsed.dueDate
  if (parsed.dueTime) form.dueTime = parsed.dueTime
  if (parsed.priority) form.priority = parsed.priority
  if (parsed.recurring) form.recurringType = parsed.recurring
  if (parsed.tagName) {
    const existing = tagStore.getTagByName(parsed.tagName)
    if (existing && !form.selectedTags.includes(existing.id)) {
      form.selectedTags.push(existing.id)
    }
  }
  if (parsed.title && parsed.title !== '新任务') {
    form.title = parsed.title
  }
}

function handleSave() {
  if (!form.title.trim()) return
  emit('save', {
    title: form.title.trim(),
    description: form.description,
    dueDate: form.dueDate || null,
    dueTime: form.dueTime || null,
    startDate: form.isSpanning ? (form.startDate || null) : null,
    startTime: form.isSpanning ? (form.startTime || null) : null,
    endDate: form.isSpanning ? (form.endDate || null) : null,
    endTime: form.isSpanning ? (form.endTime || null) : null,
    isSpanning: form.isSpanning || null,
    priority: form.priority,
    recurring: form.recurringType ? { type: form.recurringType } as any : null,
    reminder: form.reminderMinutes !== null
      ? { type: form.reminderMinutes === 0 ? 'at_time' as const : 'before' as const, minutes: form.reminderMinutes || undefined }
      : null,
    tagIds: [...form.selectedTags]
  })
}

// 编辑模式: 预填表单
watch(() => props.editingTask, (task) => {
  if (task) {
    form.title = task.title
    form.description = task.description || ''
    form.dueDate = task.dueDate || ''
    form.dueTime = task.dueTime || ''
    form.startDate = task.startDate || ''
    form.startTime = task.startTime || ''
    form.endDate = task.endDate || ''
    form.endTime = task.endTime || ''
    form.isSpanning = task.isSpanning || false
    form.priority = task.priority
    form.recurringType = task.recurring?.type || ''
    form.reminderMinutes = task.reminder?.minutes ?? null
    form.selectedTags = [...task.tagIds]
  } else {
    form.title = ''
    form.description = ''
    form.dueDate = ''
    form.dueTime = ''
    form.priority = 'none'
    form.recurringType = ''
    form.reminderMinutes = null
    form.selectedTags = []
  }
})

// 打开时自动聚焦 + 预填日期时间（从日历点击）
watch(() => props.visible, (val) => {
  if (val) {
    // 新建模式且有预填数据 → 填充日期/时间
    if (!props.editingTask && uiStore.newTaskPrefill) {
      const p = uiStore.newTaskPrefill
      if (p.dueDate) form.dueDate = p.dueDate
      if (p.dueTime) form.dueTime = p.dueTime
    }
    nextTick(() => titleInput.value?.focus())
  } else {
    // 关闭后清除预填
    uiStore.newTaskPrefill = null
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 7000;
  padding-top: env(safe-area-inset-top, 0px);
}

.modal-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90vw;
  max-width: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px var(--color-shadow-heavy);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}

.modal-header h3 { font-size: var(--font-size-lg); color: var(--color-text); }
.modal-tabs { display: flex; gap: 0; background: var(--color-bg); border-radius: var(--radius-md); padding: 2px; }
.modal-tab { padding: 4px 16px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
.modal-tab.active { background: var(--color-surface); color: var(--color-text); font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.modal-tab:hover:not(.active) { color: var(--color-text); }

.modal-close {
  color: var(--color-text-muted);
  font-size: 18px;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover { background: var(--color-surface-hover); color: var(--color-text); }

.modal-body {
  padding: var(--spacing-xl);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-group label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.form-group input, .form-group textarea, .form-group select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-md);
  outline: none;
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus {
  border-color: var(--color-primary);
}
.form-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.nlp-preview {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  margin-top: var(--spacing-xs);
}

.nlp-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  white-space: nowrap;
}
.form-row { display: flex; gap: var(--spacing-md); }
.flex-1 { flex: 1; }

/* 持续事件开关 */
.spanning-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  padding: var(--spacing-xs) 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  border-radius: 22px;
  transition: 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: #fff;
  border-radius: 50%;
  transition: 0.2s;
}

.toggle-switch input:checked + .toggle-slider { background: var(--color-primary); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

.priority-group, .tag-group {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.priority-option, .tag-option {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.priority-option.active {
  border-color: var(--opt-color);
  background: color-mix(in srgb, var(--opt-color) 15%, transparent);
  color: var(--opt-color);
}

.tag-option.active {
  border-color: var(--tag-color);
  background: color-mix(in srgb, var(--tag-color) 15%, transparent);
  color: var(--tag-color);
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-top: 1px solid var(--color-border-light);
}

.footer-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.footer-btn.cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}
.footer-btn.confirm {
  background: var(--color-primary);
  border: none;
  color: var(--color-text-on-primary);
}
.footer-btn.confirm:disabled { opacity: 0.5; }
.footer-btn:hover { opacity: 0.9; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* ── 手机端紧凑 ──────────────────────── */
@media (max-width: 767px) {
  .form-row {
    gap: var(--spacing-xs);
  }
  .modal-body {
    padding: var(--spacing-md);
  }
}
</style>
