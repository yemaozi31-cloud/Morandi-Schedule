<template>
  <div class="morandi-datepicker" :class="{ 'transparent-trigger': transparentTrigger }" ref="containerRef">
    <!-- 触发输入框 -->
    <div class="date-input" :class="{ 'has-value': !!modelValue }" @click="togglePanel">
      <span class="date-text">{{ displayText || placeholder || '选择日期' }}</span>
      <span class="date-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </span>
      <button v-if="modelValue && clearable" class="date-clear" @click.stop="clearDate">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- 日历弹出面板 -->
    <transition name="panel-slide">
      <div v-if="showPanel" class="date-panel">
        <!-- 年份/月份导航 -->
        <div class="panel-nav">
          <button class="nav-arrow" @click="prevMonth">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="nav-title" @click="toggleYearPicker">
            <span class="nav-year">{{ viewYear }}年</span>
            <span class="nav-month">{{ viewMonth + 1 }}月</span>
          </div>
          <button class="nav-arrow" @click="nextMonth">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <!-- 年份快速选择 -->
        <div v-if="showYearPicker" class="year-grid">
          <button
            v-for="y in yearRange"
            :key="y"
            class="year-cell"
            :class="{ active: y === viewYear }"
            @click="selectYear(y)"
          >{{ y }}年</button>
        </div>

        <!-- 星期头 -->
        <div v-else class="weekday-header">
          <span v-for="w in weekdays" :key="w" class="weekday-cell">{{ w }}</span>
        </div>

        <!-- 日期网格 -->
        <div v-if="!showYearPicker" class="day-grid">
          <button
            v-for="(d, i) in dayCells"
            :key="i"
            class="day-cell"
            :class="{
              'other-month': !d.isCurrentMonth,
              'today': d.isToday,
              'selected': d.isSelected,
              'disabled': !d.isCurrentMonth
            }"
            :disabled="!d.isCurrentMonth"
            @click="selectDate(d.date)"
          >{{ d.day }}</button>
        </div>

        <!-- 底部操作 -->
        <div class="panel-footer">
          <button class="today-btn" @click="goToday">今天</button>
          <button v-if="modelValue" class="clear-btn" @click="clearDate">清除</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  clearable?: boolean
  /** trigger 区域透明不可见，常用于覆盖在其他元素上点击触发 */
  transparentTrigger?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

// ─── 状态 ────────────────────────────
const containerRef = ref<HTMLDivElement>()
const showPanel = ref(false)
const showYearPicker = ref(false)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// ─── 计算 ────────────────────────────
const displayText = computed(() => {
  if (!props.modelValue) return ''
  const [y, m, d] = props.modelValue.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
})

const yearRange = computed(() => {
  const current = viewYear.value
  const years: number[] = []
  for (let i = current - 8; i <= current + 8; i++) years.push(i)
  return years
})

const dayCells = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0)
  const startPad = firstDay.getDay() // 0=Sun
  function toLocalDateStr(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const todayStr = toLocalDateStr(new Date())
  const selectedStr = props.modelValue || ''
  const cells: { day: number; date: string; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = []

  // 上月补齐
  const prevLast = new Date(viewYear.value, viewMonth.value, 0)
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(viewYear.value, viewMonth.value - 1, prevLast.getDate() - i)
    const ds = toLocalDateStr(d)
    cells.push({ day: d.getDate(), date: ds, isCurrentMonth: false, isToday: ds === todayStr, isSelected: ds === selectedStr })
  }

  // 当月
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(viewYear.value, viewMonth.value, i)
    const ds = toLocalDateStr(d)
    cells.push({ day: i, date: ds, isCurrentMonth: true, isToday: ds === todayStr, isSelected: ds === selectedStr })
  }

  // 下月补齐（6行=42格）
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(viewYear.value, viewMonth.value + 1, i)
    const ds = toLocalDateStr(d)
    cells.push({ day: d.getDate(), date: ds, isCurrentMonth: false, isToday: ds === todayStr, isSelected: ds === selectedStr })
  }

  return cells
})

// ─── 方法 ────────────────────────────
function togglePanel() {
  showPanel.value = !showPanel.value
  if (showPanel.value) {
    showYearPicker.value = false
    if (props.modelValue) {
      const d = new Date(props.modelValue)
      viewYear.value = d.getFullYear()
      viewMonth.value = d.getMonth()
    } else {
      viewYear.value = new Date().getFullYear()
      viewMonth.value = new Date().getMonth()
    }
  }
}

function selectDate(date: string) {
  emit('update:modelValue', date)
  showPanel.value = false
}

function selectYear(y: number) {
  viewYear.value = y
  showYearPicker.value = false
}

function toggleYearPicker() {
  showYearPicker.value = !showYearPicker.value
}

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

function goToday() {
  const today = new Date().toISOString().slice(0, 10)
  emit('update:modelValue', today)
  showPanel.value = false
}

function clearDate() {
  emit('update:modelValue', '')
  showPanel.value = false
}

// 点击外部关闭
function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    showPanel.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

defineExpose({ togglePanel })
</script>

<style scoped>
.morandi-datepicker {
  position: relative;
  display: inline-block;
  width: 100%;
  font-family: inherit;
}

/* ── 输入框 ──────────────────────────── */
.date-input {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-height: 28px;
  box-sizing: border-box;
  user-select: none;
}

.date-input:hover {
  border-color: var(--color-primary);
}

.date-input.has-value {
  border-color: var(--color-primary);
}

.date-text {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-input:not(.has-value) .date-text {
  color: var(--color-text-muted);
}

/* 透明 trigger 模式：trigger 不可见但可点击，panel 正常显示 */
.morandi-datepicker.transparent-trigger .date-input {
  background: transparent;
  border-color: transparent;
  color: transparent;
  padding: 0;
  min-height: 0;
  position: absolute;
  inset: 0;
  z-index: 1;
}
.morandi-datepicker.transparent-trigger .date-text,
.morandi-datepicker.transparent-trigger .date-icon,
.morandi-datepicker.transparent-trigger .date-clear {
  display: none;
}

.date-icon {
  display: flex;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.date-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}

.date-clear {
  display: flex;
  color: var(--color-text-muted);
  padding: 2px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.date-clear:hover { background: var(--color-surface-hover); color: var(--color-danger); }

/* ── 弹出面板 ────────────────────────── */
.date-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 8000;
  width: min(260px, 90vw);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px var(--color-shadow-heavy);
  padding: var(--spacing-sm);
}

/* ── 导航 ──────────────────────────── */
.panel-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 var(--spacing-xs) 0;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: var(--spacing-xs);
}

.nav-arrow {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.nav-arrow:hover { background: var(--color-surface-hover); color: var(--color-primary); }

.nav-title {
  display: flex; gap: 4px;
  cursor: pointer; padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  user-select: none;
}
.nav-title:hover { background: var(--color-surface-hover); }

.nav-year { color: var(--color-text-secondary); }
.nav-month { color: var(--color-text); }

/* ── 年份选择 ────────────────────────── */
.year-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: var(--spacing-xs) 0;
}

.year-cell {
  padding: 4px 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  border: none; background: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.year-cell:hover { background: var(--color-surface-hover); }
.year-cell.active {
  color: var(--color-text-on-primary);
  background: var(--color-primary);
  font-weight: 500;
}

/* ── 星期头 ──────────────────────────── */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 2px;
}

.weekday-cell {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding: 2px 0;
}

/* ── 日期网格 ────────────────────────── */
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  border: none; background: none;
  cursor: pointer;
  border-radius: var(--radius-full);
  transition: background 0.15s;
}

.day-cell:hover { background: var(--color-surface-hover); }
.day-cell.other-month { color: var(--color-text-muted); opacity: 0.4; }
.day-cell.other-month:hover { opacity: 0.6; }
.day-cell.today {
  font-weight: 600;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}
.day-cell.selected {
  color: var(--color-text-on-primary);
  background: var(--color-primary);
  font-weight: 600;
}
.day-cell.disabled { cursor: default; }
.day-cell.disabled:hover { background: none; }

/* ── 底部 ──────────────────────────── */
.panel-footer {
  display: flex;
  gap: var(--spacing-xs);
  justify-content: center;
  padding-top: var(--spacing-xs);
  margin-top: var(--spacing-xs);
  border-top: 1px solid var(--color-border-light);
}

.today-btn, .clear-btn {
  font-size: var(--font-size-sm);
  padding: 4px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid var(--color-border);
}

.today-btn {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: transparent;
}
.today-btn:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }

.clear-btn {
  color: var(--color-danger);
  border-color: transparent;
  background: transparent;
}
.clear-btn:hover { border-color: var(--color-danger); }

/* ── 动画 ──────────────────────────── */
.panel-slide-enter-active, .panel-slide-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── 手机端紧凑 ──────────────────────── */
@media (max-width: 767px) {
  .date-input {
    padding: 2px 8px;
    min-height: 28px;
    gap: 2px;
  }
  .date-text {
    font-size: 13px;
  }
  .date-icon svg {
    width: 12px;
    height: 12px;
  }
  .date-clear {
    display: none !important;
  }
  .date-panel {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    width: 100vw;
    max-width: 100vw;
    border-radius: 16px 16px 0 0;
    border: none;
    border-top: 1px solid var(--color-border-light);
    box-shadow: 0 -4px 24px var(--color-shadow-heavy);
    padding: 12px;
    max-height: 75vh;
    overflow-y: auto;
  }
  .day-cell {
    font-size: 13px;
  }
}
</style>
