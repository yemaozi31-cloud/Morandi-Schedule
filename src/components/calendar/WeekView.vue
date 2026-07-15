<template>
  <div class="week-view">
    <!-- 桌面端：7列网格 -->
    <div class="week-grid">
    <!-- 内置周导航 -->
    <div class="week-nav-header">
      <div class="week-nav-left">
        <button class="nav-btn" @click="goPrevWeek" aria-label="上一周">
          <Icon name="chevron-left" :size="18" />
        </button>
        <h3 class="week-nav-title">{{ navTitle }}</h3>
        <button class="nav-btn" @click="goNextWeek" aria-label="下一周">
          <Icon name="chevron-right" :size="18" />
        </button>
        <button class="week-today-btn" @click="goCurrentWeek">今天</button>
      </div>
    </div>
    <div class="week-header">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="week-header-cell"
          :class="{ today: day.isToday, selected: day.date === props.selectedDate }"
          @click="$emit('selectDate', day.date)"
        >
          <div class="weekday-name">{{ day.name }}</div>
          <div class="weekday-number" :class="{ 'today-dot': day.isToday }">{{ day.number }}</div>
        </div>
      </div>

      <div class="week-body">
        <!-- 跨天任务连续大长条（框内首位） -->
        <div v-if="spanningTasksInWeek.length > 0" class="spanning-section">
          <div
            v-for="(item, idx) in spanningTasksInWeek"
            :key="item.task.id"
            class="spanning-bar"
            :class="'p-' + item.task.priority"
            :style="{ gridColumn: item.startCol + ' / ' + item.endCol, gridRow: idx + 1 }"
            @click.stop="$emit('selectTask', item.task.id)"
          >
            <button class="spanning-toggle" @click.stop="$emit('toggleTask', item.task.id)">
              <Icon :name="item.task.status === 'completed' ? 'check-circle-fill' : 'circle'" :size="12" />
            </button>
            <span class="spanning-title">{{ item.task.title }}</span>
            <button class="spanning-delete" @click.stop="$emit('deleteTask', item.task.id)">
              <Icon name="x" :size="10" />
            </button>
          </div>
        </div>
        <div class="week-columns-row">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="week-col"
          :class="{ 'col-selected': day.date === props.selectedDate }"
        >
          <template v-if="getRegularTasksForDate(day.date).length > 0">
            <div
              v-for="task in getRegularTasksForDate(day.date)"
              :key="task.id"
              class="task-card"
              :class="'p-' + task.priority"
              @click="$emit('selectTask', task.id)"
            >
              <div class="task-card-top">
                <button class="task-toggle" @click.stop="$emit('toggleTask', task.id)">
                  <Icon :name="task.status === 'completed' ? 'check-circle' : 'circle'" :size="12" />
                </button>
                <span class="task-title">{{ task.title }}</span>
                <button class="task-delete" @click.stop="$emit('deleteTask', task.id)">
                  <Icon name="x" :size="10" />
                </button>
              </div>
              <div class="task-meta">
                <span v-if="task.dueTime" class="task-time">{{ task.dueTime }}</span>
              </div>
            </div>
          </template>
          <div v-else class="week-col-empty" @click="handleDayClick(day.date)">
            <span>+</span>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 手机端：悬浮卡片，7行×6列大节 -->
    <div class="wc-card">
      <!-- 表头：分组行 + 节次行 -->
      <div class="wc-header">
        <div class="wc-groups">
          <div class="wc-corner">
            <button class="wc-hide-btn" @click.stop="hideLast = !hideLast" :title="hideLast ? '显示晚上' : '隐藏晚上'">{{ hideLast ? '+' : '−' }}</button>
          </div>
          <div v-for="g in displayGroups" :key="g.label" class="wc-group" :class="g.section" :style="{ flex: g.count }">{{ g.label }}</div>
        </div>
        <div class="wc-hcells">
          <div class="wc-corner"><span class="wc-time-label">时间</span></div>
          <div v-for="p in displayPeriods" :key="p.key" class="wc-hcell" :class="p.section">
            <div class="wc-hlabel">{{ p.label }}</div>
          </div>
        </div>
      </div>
      <!-- 7行 -->
      <div class="wc-body">
        <div v-for="row in rowData" :key="row.day.date" class="wc-row" :class="{ 'wc-today': row.day.isToday }">
          <div class="wc-rheader" @click="$emit('selectDate', row.day.date)">
            <div class="wc-dname">{{ row.day.name }}</div>
            <div class="wc-ddate">{{ row.day.number }}日</div>
            <div v-if="row.day.isToday" class="wc-badge">今</div>
          </div>
          <div v-for="cell in row.cells" :key="cell.period.key" class="wc-cell" :class="cell.period.section" @click="handleCellClick(row.day.date, cell.period)">
            <div
              v-for="t in cell.allTasks"
              :key="t.id"
              class="wc-task"
              :class="[t.status === 'completed' ? 'task-done' : '', 'p-' + (t.priority || 'none'), (t.priority || 'none') === 'none' ? cell.period.section : '']"
              @click.stop="$emit('selectTask', t.id)"
            >
              <span class="wc-task-t">{{ t.title }}</span>
            </div>
            <div v-if="cell.allTasks.length === 0" class="wc-empty"></div>
            <div v-if="cell.hiddenCount > 0" class="wc-bubble" @click.stop="handleCellClick(row.day.date, cell.period)">{{ cell.hiddenCount }}+</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Task } from '@/types'
import { format, parseISO, addDays, addWeeks, startOfWeek, getTodayStr } from '@/utils/date'
import Icon from '@/components/common/Icon.vue'

/** 大节配置（6个大节，整点划分） */
interface PeriodCfg {
  key: string; label: string; short: string
  group: string
  section: 'morning' | 'afternoon' | 'evening'
  start: string; end: string; defaultTime: string
}
const periods: PeriodCfg[] = [
  { key: 'p12',  label: '8:00', short: '08', group: '上午', section: 'morning',    start: '00:00', end: '10:00', defaultTime: '08:00' },
  { key: 'p34',  label: '10:00', short: '10', group: '上午', section: 'morning',   start: '10:00', end: '12:00', defaultTime: '10:00' },
  { key: 'p56',  label: '14:00', short: '14', group: '下午', section: 'afternoon', start: '12:00', end: '16:00', defaultTime: '14:00' },
  { key: 'p78',  label: '16:00', short: '16', group: '下午', section: 'afternoon', start: '16:00', end: '18:00', defaultTime: '16:00' },
  { key: 'p910', label: '19:00', short: '19', group: '晚上', section: 'evening',   start: '18:00', end: '21:00', defaultTime: '19:00' },
  { key: 'p1112',label: '21:00', short: '21', group: '晚上', section: 'evening',   start: '21:00', end: '24:00', defaultTime: '21:00' },
]
const hideLast = ref(false)
const displayPeriods = computed(() => hideLast.value ? periods.slice(0, 5) : periods)
const displayGroups = computed(() => {
  const all: { label: string; section: 'morning' | 'afternoon' | 'evening'; count: number }[] = [
    { label: '上午', section: 'morning', count: 2 },
    { label: '下午', section: 'afternoon', count: 2 },
    { label: '晚上', section: 'evening', count: hideLast.value ? 1 : 2 },
  ]
  return all
})

interface SpanningTaskItem {
  task: Task
  startCol: number
  endCol: number
}

const props = defineProps<{
  currentDate: string
  tasks: Task[]
  selectedDate?: string
}>()

const emit = defineEmits<{
  (e: 'selectDate', date: string): void
  (e: 'selectTask', id: string): void
  (e: 'createTask', data: { dueDate: string; dueTime?: string }): void
  (e: 'toggleTask', id: string): void
  (e: 'deleteTask', id: string): void
  (e: 'update:currentDate', date: string): void
}>()

const weekDays = computed(() => {
  const start = startOfWeek(parseISO(props.currentDate), { weekStartsOn: 1 })
  const today = format(new Date(), 'yyyy-MM-dd')
  const names = ['一', '二', '三', '四', '五', '六', '日']

  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      date: dateStr,
      name: names[i],
      number: d.getDate(),
      isToday: dateStr === today,
      monthDay: format(d, 'M/d')
    }
  })
})

// 周导航标题
const navTitle = computed(() => {
  const d = parseISO(props.currentDate)
  const mon = startOfWeek(d, { weekStartsOn: 1 })
  const sun = addDays(mon, 6)
  const monMonth = mon.getMonth()
  const sunMonth = sun.getMonth()
  if (monMonth === sunMonth) return `${format(mon, 'M月d日')} - ${format(sun, 'd日')}`
  return `${format(mon, 'M月d日')} - ${format(sun, 'M月d日')}`
})

function goPrevWeek() {
  const prev = format(addWeeks(parseISO(props.currentDate), -1), 'yyyy-MM-dd')
  emit('update:currentDate', prev)
  emit('selectDate', prev)
}

function goNextWeek() {
  const next = format(addWeeks(parseISO(props.currentDate), 1), 'yyyy-MM-dd')
  emit('update:currentDate', next)
  emit('selectDate', next)
}

function goCurrentWeek() {
  const today = getTodayStr()
  emit('update:currentDate', today)
  emit('selectDate', today)
}

// 本周内需要显示为连续长条的跨天任务
const spanningTasksInWeek = computed(() => {
  const days = weekDays.value
  if (days.length === 0) return []
  const weekStart = days[0].date
  const weekEnd = days[days.length - 1].date
  const result: SpanningTaskItem[] = []

  for (const task of props.tasks) {
    if (task.deletedAt || task.status === 'completed') continue
    if (!task.isSpanning || !task.startDate || !task.dueDate) continue
    // 检查是否与本周有交集
    if (task.startDate > weekEnd || task.dueDate < weekStart) continue

    // 计算在本周中的列范围（CSS grid 1-indexed）
    let startCol = -1, endCol = -1
    for (let i = 0; i < days.length; i++) {
      if (days[i].date >= task.startDate && days[i].date <= task.dueDate) {
        if (startCol === -1) startCol = i + 1
        endCol = i + 2 // end 是 exclusive
      }
    }
    if (startCol === -1) continue
    result.push({ task, startCol, endCol })
  }

  return result
})

function formatDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'M月d日')
}

// 桌面端网格：排除跨天任务（由 spanning-section 统一显示）
function getRegularTasksForDate(dateStr: string): Task[] {
  return props.tasks
    .filter(t => {
      if (t.deletedAt || t.status === 'completed') return false
      if (t.isSpanning) return false
      return t.dueDate === dateStr
    })
    .sort((a, b) => {
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
      if (a.dueTime && !b.dueTime) return -1
      if (!a.dueTime && b.dueTime) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
}

// 手机端卡片：跨天任务按日期范围显示
function getTasksForDate(dateStr: string): Task[] {
  return props.tasks
    .filter(t => {
      if (t.deletedAt || t.status === 'completed') return false
      if (t.isSpanning && t.startDate && t.dueDate) {
        const s = t.startDate.slice(0, 10)
        const e = t.dueDate.slice(0, 10)
        return dateStr >= s && dateStr <= e
      }
      return (t.dueDate || '').slice(0, 10) === dateStr
    })
    .sort((a, b) => {
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
      if (a.dueTime && !b.dueTime) return -1
      if (!a.dueTime && b.dueTime) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
}

function handleDayClick(date: string) {
  emit('createTask', { dueDate: date })
}


// ── 手机端大节表格 ──────────────────────────
function getTasksInPeriod(dateStr: string, p: PeriodCfg): Task[] {
  return props.tasks.filter(t => {
    if (t.deletedAt || t.status === 'completed') return false
    if (t.isSpanning && t.startDate && t.dueDate) {
      const s = t.startDate.slice(0, 10)
      const e = t.dueDate.slice(0, 10)
      if (dateStr < s || dateStr > e) return false
    } else if ((t.dueDate || '').slice(0, 10) !== dateStr) return false
    if (!t.dueTime) return false
    return t.dueTime >= p.start && t.dueTime < p.end
  }).sort((a, b) => {
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
    if (a.dueTime && !b.dueTime) return -1
    if (!a.dueTime && b.dueTime) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function handleCellClick(date: string, p: PeriodCfg) {
  emit('createTask', { dueDate: date, dueTime: p.defaultTime })
}

/** 每格最多3个任务 */
const MAX_PER_CELL = 3

interface CellData { period: PeriodCfg; allTasks: Task[]; hiddenCount: number }
interface RowData { day: typeof weekDays.value[0]; cells: CellData[] }
const rowData = computed<RowData[]>(() => {
  const dps = displayPeriods.value
  const today = getTodayStr()

  return weekDays.value.map(day => {
    const dateStr = day.date
    // ── 第1步：把所有任务分两类 ──
    const timed: Task[] = []   // A类：有 dueTime
    const untimed: Task[] = [] // B类：无 dueTime（按优先级排序）
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }

    for (const t of props.tasks) {
      if (t.deletedAt || t.status === 'completed') continue
      // 日期匹配
      if (t.isSpanning && t.startDate && t.dueDate) {
        const s = t.startDate.slice(0, 10)
        const e = t.dueDate.slice(0, 10)
        if (dateStr < s || dateStr > e) continue
      } else if ((t.dueDate || '').slice(0, 10) !== dateStr) {
        continue
      }
      if (t.dueTime) timed.push(t)
      else untimed.push(t)
    }
    // 同类排序：A类按时间，B类按优先级
    timed.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''))
    untimed.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4))

    // ── 第2步：A类填入对应时段格子 ──
    const cells: CellData[] = dps.map(p => ({
      period: p,
      allTasks: [] as Task[],
      hiddenCount: 0,
    }))

    for (const t of timed) {
      // 找这个任务属于哪个格子
      const cell = cells.find(c => t.dueTime! >= c.period.start && t.dueTime! < c.period.end)
      if (!cell) continue
      if (cell.allTasks.length < MAX_PER_CELL) {
        cell.allTasks.push(t)
      } else {
        cell.hiddenCount++
      }
    }

    // ── 第3步：B类插入没有A类的格子，每格最多3个 ──
    for (const t of untimed) {
      // 找一个没有A类任务、且还没满的格子
      const cell = cells.find(c =>
        c.allTasks.length < MAX_PER_CELL && !c.allTasks.some(tt => tt.dueTime)
      )
      if (cell) {
        cell.allTasks.push(t)
      } else {
        cells[cells.length - 1].hiddenCount++
      }
    }

    return { day, cells }
  })
})
</script>

<style scoped>
/* ===== 基础容器 ===== */
.week-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* ===== 桌面端网格布局 ===== */
.week-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-border-light);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  overflow: hidden;
  margin-bottom: 1px;
}

.week-header-cell {
  background: var(--color-surface);
  padding: var(--spacing-md) var(--spacing-xs);
  text-align: center;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.week-header-cell:hover { background: var(--color-surface-hover); }
.week-header-cell.selected { background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)); }
.week-header-cell.today { background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface)); }

.weekday-name { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: 2px; }
.weekday-number { font-size: var(--font-size-xl); font-weight: 600; color: var(--color-text); display: flex; align-items: center; justify-content: center; gap: 4px; }
.weekday-number.today-dot::after {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  display: inline-block;
}

/* ===== 内置周导航 ===== */
.week-nav-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) 0;
  background: var(--color-surface);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border-bottom: 1px solid var(--color-border-light);
}

.week-nav-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.week-nav-left .nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.week-nav-left .nav-btn:hover { background: var(--color-surface-hover); }

.week-nav-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
  min-width: 140px;
  text-align: center;
}

.week-today-btn {
  padding: 2px var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  background: transparent;
  margin-left: var(--spacing-xs);
}
.week-today-btn:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }

.week-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--color-surface);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.week-columns-row {
  display: flex;
  flex-direction: row;
  gap: 1px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--color-border-light);
}

.week-col {
  flex: 1;
  min-width: 0;
  background: var(--color-surface);
  padding: var(--spacing-xs);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  overflow-y: auto;
}
.week-col.col-selected {
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
}

/* 任务卡片 */
.task-card {
  border-radius: var(--radius-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-bg));
}
.task-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.task-card.p-urgent { background: color-mix(in srgb, var(--priority-urgent-bg) 30%, var(--color-bg)); }
.task-card.p-high { background: color-mix(in srgb, var(--priority-high-bg) 30%, var(--color-bg)); }
.task-card.p-medium { background: color-mix(in srgb, var(--priority-medium-bg) 30%, var(--color-bg)); }
.task-card.p-low { background: color-mix(in srgb, var(--priority-low-bg) 30%, var(--color-bg)); }
.task-card.p-none { background: color-mix(in srgb, var(--priority-none-bg) 30%, var(--color-bg)); }

.task-card-top {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.task-toggle {
  display: flex;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 2px;
}
.task-toggle:hover { color: var(--color-primary); }

.task-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-xs);
  color: var(--color-text);
  font-weight: 500;
}

.task-delete {
  display: none;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 2px;
}
.task-card:hover .task-delete { display: flex; }
.task-delete:hover { color: var(--color-danger); }

.task-meta {
  padding-left: 18px;
}
.task-time {
  font-size: 10px;
  color: var(--color-text-muted);
}

.week-col-empty {
  flex: 1;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 22px;
  opacity: 0.4;
  transition: opacity 0.15s;
  border-radius: var(--radius-sm);
}
.week-col-empty:hover { opacity: 1; color: var(--color-primary); }

/* ===== 跨天任务连续长条 ===== */
.spanning-section {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-border-light);
  flex-shrink: 0;
}

.spanning-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  border-radius: 4px;
  transition: opacity 0.12s;
  min-width: 0;
  position: relative;
}

.spanning-bar:hover {
  opacity: 0.85;
}

.spanning-bar.p-urgent { background: var(--priority-urgent-bg); }
.spanning-bar.p-high { background: var(--priority-high-bg); }
.spanning-bar.p-medium { background: var(--priority-medium-bg); }
.spanning-bar.p-low { background: var(--priority-low-bg); }
.spanning-bar.p-none { background: var(--priority-none-bg); }

.spanning-title {
  font-size: var(--font-size-xs);
  color: var(--color-text-on-primary);
  font-weight: 500;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.spanning-toggle {
  display: flex;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  flex-shrink: 0;
  padding: 1px;
  opacity: 0.6;
  transition: opacity 0.12s;
}
.spanning-toggle:hover { opacity: 1; color: var(--color-text-on-primary); }

.spanning-delete {
  display: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  flex-shrink: 0;
  padding: 1px;
}
.spanning-bar:hover .spanning-delete { display: flex; }
.spanning-delete:hover { color: var(--color-text-on-primary); }

/* ===== 手机端：悬浮卡片，7行×6列大节，均分铺满 ===== */
.wc-card {
  display: none;
}

@media (max-width: 1023px) {
  .week-grid { display: none; }

  .wc-card {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    margin: 2px;
    border-radius: 8px;
    background: var(--color-surface);
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    overflow: hidden;
    border: 1px solid var(--color-border-light);
  }

  /* ── 表头（两行） ── */
  .wc-header {
    flex-shrink: 0;
    background: var(--color-bg);
  }

  .wc-groups, .wc-hcells {
    display: flex;
  }
  .wc-groups { border-bottom: 1px solid var(--color-border); }

  .wc-corner {
    flex: 0 0 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .wc-hide-btn {
    width: 100%;
    height: 100%;
    font-size: 12px;
    color: var(--color-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
  }
  .wc-hide-btn:hover { color: var(--color-text); background: var(--color-surface-hover); }

  .wc-group {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary);
    padding: 3px 0;
    border-left: 1px solid var(--color-border-light);
    min-width: 0;
  }
  .wc-group.morning    { background: color-mix(in srgb, #8DB5D6 10%, var(--color-bg)); }
  .wc-group.afternoon  { background: color-mix(in srgb, #D6B58D 10%, var(--color-bg)); }
  .wc-group.evening    { background: color-mix(in srgb, #B58DD6 10%, var(--color-bg)); }

  .wc-hcell {
    flex: 1;
    min-width: 0;
    padding: 3px 1px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    border-left: 1px solid var(--color-border-light);
    font-size: 9px;
  }
  .wc-hcell.morning    { background: color-mix(in srgb, #8DB5D6 12%, var(--color-bg)); }
  .wc-hcell.afternoon  { background: color-mix(in srgb, #D6B58D 12%, var(--color-bg)); }
  .wc-hcell.evening    { background: color-mix(in srgb, #B58DD6 12%, var(--color-bg)); }
  .wc-hlabel { font-weight: 600; color: var(--color-text); }
  .wc-time-label { font-size: 9px; color: var(--color-text-muted); }

  /* ── 7行 grid 均分 ── */
  .wc-body {
    display: grid;
    grid-template-rows: repeat(7, 1fr);
    flex: 1;
    min-height: 0;
  }

  .wc-row {
    display: flex;
    min-height: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--color-border-light);
  }
  .wc-row:last-child { border-bottom: none; }
  .wc-today { background: color-mix(in srgb, var(--color-primary) 6%, var(--color-bg)); }

  .wc-rheader {
    flex: 0 0 42px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    cursor: pointer;
    font-size: 9px;
    border-right: 1px solid var(--color-border-light);
    background: inherit;
  }
  .wc-dname { font-weight: 600; color: var(--color-text); }
  .wc-ddate { font-size: 8px; color: var(--color-text-muted); }
  .wc-badge {
    font-size: 7px;
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    padding: 0 3px;
    border-radius: 4px;
    line-height: 1.3;
  }

  /* ── 单元格 ── */
  .wc-cell {
    flex: 1;
    min-width: 0;
    padding: 1px;
    border-left: 1px solid var(--color-border-light);
    display: flex;
    flex-direction: column;
    gap: 1px;
    cursor: pointer;
    position: relative;
  }
  .wc-cell.morning    { background: color-mix(in srgb, #B5C8D4 15%, var(--color-bg)); }
  .wc-cell.afternoon  { background: color-mix(in srgb, #D4C4B5 15%, var(--color-bg)); }
  .wc-cell.evening    { background: color-mix(in srgb, #C4B8D4 15%, var(--color-bg)); }

  .wc-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: 11px;
    opacity: 0.15;
  }

  /* ── 任务 ── */
  .wc-task {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    cursor: pointer;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 3px;
    text-align: center;
    line-height: 1.2;
    word-break: break-all;
    min-height: 18px;
    overflow: hidden;
  }
  .wc-task.p-urgent { background: var(--priority-urgent-bg); color: var(--priority-urgent-text); }
  .wc-task.p-high   { background: var(--priority-high-bg); color: var(--priority-high-text); }
  .wc-task.p-medium { background: var(--priority-medium-bg); color: var(--priority-medium-text); }
  .wc-task.p-low    { background: var(--priority-low-bg); color: var(--priority-low-text); }
  .wc-task.p-none   { background: var(--priority-none-bg); color: var(--priority-none-text); }
  .wc-task.p-none.morning    { background: #D0D8DE; color: #4A555C; }
  .wc-task.p-none.afternoon  { background: #DCD0C0; color: #4A4038; }
  .wc-task.p-none.evening    { background: #D0C8D8; color: #403850; }
  .wc-task.task-done { opacity: 0.3; text-decoration: line-through; }

  .wc-task-t {
    display: block;
    width: 100%;
    word-break: break-all;
  }
  .wc-task-time { font-size: 8px; opacity: 0.7; display: block; }

  /* ── 溢出泡泡 ── */
  .wc-bubble {
    position: absolute;
    top: -1px;
    right: -1px;
    background: var(--color-danger);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    line-height: 1;
  }
}

/* 平板 */
@media (min-width: 768px) and (max-width: 1023px) {
  .week-grid { display: none; }
  .wc-card { display: flex; }
}
</style>