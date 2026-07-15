<template>
  <div class="month-view">
    <div class="weekday-header">
      <div v-for="day in weekdays" :key="day" class="weekday-cell">{{ day }}</div>
    </div>
    <div class="month-grid">
      <div
        v-for="(day, idx) in days"
        :key="idx"
        class="month-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'has-task': day.visibleTasks.length > 0,
          'selected': day.date === selectedDate
        }"
        @click="handleDayClick(day.date)"
      >
        <span class="day-number">{{ day.day }}</span>

        <div class="spanning-bars">
          <div
            v-for="task in day.spanningTasks"
            :key="task.id"
            class="task-bar"
            :class="[
              'p-' + task.priority,
              {
                'is-spanning': true,
                'span-start': day.isSpanStart(task) && !day.isSpanSingle(task),
                'span-end': day.isSpanEnd(task) && !day.isSpanSingle(task),
                'span-single': day.isSpanSingle(task)
              }
            ]"
            :title="task.title"
            @click.stop="handleTaskClick(task.id)"
          >{{ task.title }}</div>
        </div>

        <div class="task-bars">
          <div
            v-for="task in day.regularTasks.slice(0, Math.max(0, 4 - day.spanningTasks.length))"
            :key="task.id"
            class="task-bar"
            :class="'p-' + task.priority"
            :title="task.title"
            @click.stop="handleTaskClick(task.id)"
          >{{ task.title }}</div>
          <div v-if="day.regularTasks.length > Math.max(0, 4 - day.spanningTasks.length)" class="task-bar-more" @click.stop="handleDayClick(day.date)">
            +{{ day.regularTasks.length - Math.max(0, 4 - day.spanningTasks.length) }}
          </div>
          <div v-if="day.spanningTasks.length === 0 && day.regularTasks.length === 0" class="task-bar-empty"></div>
        </div>
      </div>
    </div>

    <div class="mc-card">
      <div class="mc-body-outer" ref="mcBodyRef">
        <div class="mc-body-scroll">
        <div
          v-for="(day, idx) in monthDayList"
          :key="day.date"
          class="mc-row"
          :class="{ 'mc-today': day.isToday }"
          :data-idx="idx"
        >
          <div class="mc-date-col" @click="handleDayClick(day.date)">
            <div class="mc-dname">{{ day.weekName }}</div>
            <div class="mc-dnum" :class="{ 'mc-dnum-today': day.isToday }">{{ day.dayNum }}</div>
          </div>
          <div class="mc-task-area" @click="emit('createTask', { dueDate: day.date })">
            <div
              v-for="t in day.timeTasks"
              :key="t.id"
              class="mc-strip"
              :class="[t.status === 'completed' ? 'mc-done' : '', 'p-' + (t.priority || 'none'), (t.priority || 'none') === 'none' ? getSection(t.dueTime) : '']"
              :title="t.title + (t.dueTime ? ' ' + t.dueTime : '')"
              @click.stop="handleTaskClick(t.id)"
            >
              <span class="mc-strip-time">{{ t.dueTime ? t.dueTime.slice(0,5) : '' }}</span>
              <span class="mc-strip-title">{{ t.title }}</span>
            </div>
            <div
              v-for="t in day.allDayTasks"
              :key="t.id"
              class="mc-allday-strip"
              :class="'p-' + t.priority"
              @click.stop="handleTaskClick(t.id)"
            ><span class="mc-allday-title">{{ t.title }}</span></div>
          </div>
          <div class="mc-right-col" @click="emit('createTask', { dueDate: day.date })">
            <div
              v-for="t in day.spanningTasks"
              :key="t.id"
              class="mc-span-bar"
              :class="['p-' + t.priority, { 'span-start': t.startDate === day.date && t.dueDate !== day.date, 'span-end': t.dueDate === day.date && t.startDate !== day.date, 'span-single': t.startDate === day.date && t.dueDate === day.date }]"
              @click.stop="handleTaskClick(t.id)"
            ><span v-if="isMidDate(t, day.date)">{{ t.title }}</span></div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { format, parseISO, addMonths, subMonths, getTodayStr } from '@/utils/date'
import Icon from '@/components/common/Icon.vue'
import type { Task } from '@/types'

const props = defineProps<{
  currentDate: string
  taskMap: Map<string, number>
  tasks: Task[]
  selectedDate?: string
}>()

const emit = defineEmits<{
  (e: 'selectDate', date: string): void
  (e: 'selectTask', id: string): void
  (e: 'createTask', data: { dueDate: string }): void
}>()

function handleDayClick(date: string) {
  emit('selectDate', date)
}

function handleTaskClick(taskId: string) {
  emit('selectTask', taskId)
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

function getTasksForDate(dateStr: string): Task[] {
  return props.tasks.filter(t => {
    if (t.deletedAt || t.status === 'completed') return false
    if (!t.isSpanning || !t.startDate) {
      return t.dueDate && t.dueDate.slice(0, 10) === dateStr
    }
    const s = t.startDate.slice(0, 10)
    const e = t.dueDate ? t.dueDate.slice(0, 10) : ''
    return dateStr >= s && dateStr <= e
  })
}

const days = computed(() => {
  const date = parseISO(props.currentDate)
  const year = date.getFullYear()
  const month = date.getMonth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()

  const result: any[] = []

  function makeDayData(d: Date, isCurrentMonth: boolean) {
    const dateStr = format(d, 'yyyy-MM-dd')
    const visibleTasks = getTasksForDate(dateStr)
    const spanningTasks = visibleTasks.filter(t => t.isSpanning)
    const regularTasks = visibleTasks.filter(t => !t.isSpanning)
    return {
      day: d.getDate(),
      date: dateStr,
      isCurrentMonth,
      isToday: dateStr === today,
      taskCount: visibleTasks.length,
      tasks: visibleTasks,
      visibleTasks,
      spanningTasks,
      regularTasks,
      isSpanStart: (task: Task) => task.isSpanning && task.startDate === dateStr,
      isSpanEnd: (task: Task) => task.isSpanning && task.dueDate === dateStr,
      isSpanSingle: (task: Task) => task.isSpanning && task.startDate === task.dueDate
    }
  }

  // 涓婃湀琛ラ綈
  const prevLast = new Date(year, month, 0)
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLast.getDate() - i)
    result.push(makeDayData(d, false))
  }

  // 褰撴湀
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i)
    result.push(makeDayData(d, true))
  }

  // 涓嬫湀琛ラ綈 (6琛?* 7鍒?= 42)
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    result.push(makeDayData(d, false))
  }

  return result
})

// 鈹€鈹€ 鎵嬫満绔湀瑙嗗浘 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const mcBodyRef = ref<HTMLElement | null>(null)
const weekNames = ['日', '一', '二', '三', '四', '五', '六']

/** 鎸夋椂闂村垽鏂墍灞炴椂娈?*/
function isMidDate(task: Task, dateStr: string): boolean {
  if (!task.startDate || !task.dueDate) return true
  const s = new Date(task.startDate)
  const e = new Date(task.dueDate)
  const days = Math.round((e.getTime() - s.getTime()) / 86400000)
  const mid = new Date(s)
  mid.setDate(mid.getDate() + Math.floor(days / 2))
  return dateStr === mid.toISOString().slice(0, 10)
}

function getSection(time: string | null): string {
  if (!time) return 'morning'
  const h = parseInt(time.split(':')[0], 10)
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

/** 褰撳墠鏈堢殑鏃ユ湡鍒楄〃锛堜笉琛ュ墠鍚庢湀锛?*/
const monthDayList = computed(() => {
  const d = parseISO(props.currentDate)
  const year = d.getFullYear()
  const month = d.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = getTodayStr()
  const result: any[] = []

  for (let i = 1; i <= daysInMonth; i++) {
    const dt = new Date(year, month, i)
    const dateStr = format(dt, 'yyyy-MM-dd')
    const allTasks = getTasksForDate(dateStr)
    const timeTasks = allTasks
      .filter(t => !t.isSpanning && t.dueTime)
      .sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''))
    const allDayTasks = allTasks.filter(t => !t.isSpanning && !t.dueTime)
    const spanningTasks = allTasks.filter(t => t.isSpanning)
    result.push({
      date: dateStr,
      weekName: weekNames[dt.getDay()],
      dayNum: i,
      isToday: dateStr === today,
      timeTasks,
      allDayTasks,
      spanningTasks,
      spanCount: spanningTasks.length,
    })
  }
  return result
})

/** 璺ㄥぉ浠诲姟缁濆瀹氫綅闀挎潯 */
interface SpanBar {
  task: Task
  topPx: number
  heightPx: number
  rightPx: number
  widthPx: number
}
const spanningAbsBars = ref<SpanBar[]>([])
const spanVersion = ref(0)

function recalcSpanBars() {
  const list = monthDayList.value
  if (!list.length) { spanningAbsBars.value = []; return }
  const scrollEl = document.querySelector('.mc-body-scroll')
  if (!scrollEl) { spanningAbsBars.value = []; return }
  const rows = scrollEl.querySelectorAll('.mc-row')
  if (!rows.length) { spanningAbsBars.value = []; return }

  // 1) 收集所有跨天任务及其起止索引
  const ranges: { task: Task; startIdx: number; endIdx: number; track: number }[] = []
  const seenId = new Set<string>()
  for (let i = 0; i < list.length; i++) {
    for (const t of list[i].spanningTasks) {
      if (seenId.has(t.id)) continue
      seenId.add(t.id)
      let end = i
      for (let j = i + 1; j < list.length; j++) {
        if (list[j].spanningTasks.some((s: Task) => s.id === t.id)) end = j
        else break
      }
      ranges.push({ task: t, startIdx: i, endIdx: end, track: 0 })
    }
  }

  // 2) 轨道分配（贪心：按开始日排序，找最小可用轨道）
  ranges.sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx)
  for (const r of ranges) {
    let track = 0
    while (true) {
      const conflict = ranges.some(o =>
        o.track === track && o.task.id !== r.task.id &&
        o.startIdx <= r.endIdx && o.endIdx >= r.startIdx
      )
      if (!conflict) break
      track++
    }
    r.track = track
  }

  // 3) 每个任务分段：总轨道数变化处切开
  const rightColW = 68  // 右侧列可用宽度
  const gap = 2
  const result: SpanBar[] = []

  for (const r of ranges) {
    let segStart = r.startIdx
    while (segStart <= r.endIdx) {
      // 计算本段的总轨道数 = 从 segStart 到某点的最大活跃数
      let segEnd = segStart
      while (segEnd <= r.endIdx) {
        // 检查 segEnd 是否应该成为切分点
        const tracksNow = countActiveTracks(ranges, segStart, segEnd)
        const tracksNext = segEnd + 1 <= r.endIdx ? countActiveTracks(ranges, segStart, segEnd + 1) : tracksNow
        if (tracksNext !== tracksNow) break
        segEnd++
      }
      if (segEnd > r.endIdx) segEnd = r.endIdx

      // 计算本段的轨道数（取段内最大活跃数）
      let maxTracks = 0
      for (let d = segStart; d <= segEnd; d++) {
        const n = ranges.filter(o => o.startIdx <= d && o.endIdx >= d).length
        if (n > maxTracks) maxTracks = n
      }
      if (maxTracks < 1) maxTracks = 1
      const w = Math.max(20, Math.floor((rightColW - gap) / maxTracks) - gap)
      const row = rows[Math.min(segStart, rows.length - 1)] as HTMLElement
      const endRow = rows[Math.min(segEnd, rows.length - 1)] as HTMLElement
      result.push({
        task: r.task,
        topPx: row.offsetTop,
        heightPx: (endRow.offsetTop + endRow.offsetHeight) - row.offsetTop,
        rightPx: gap + r.track * (w + gap),
        widthPx: w,
      })
      segStart = segEnd + 1
    }
  }

  spanningAbsBars.value = result
  spanVersion.value++
}

/** 计算一组范围中有多少在 dayIdx 活跃 */
function countActiveTracks(
  ranges: { startIdx: number; endIdx: number }[], dayIdx: number, upToDay: number
): number {
  let n = 0
  for (const r of ranges) {
    if (r.startIdx <= upToDay && r.endIdx >= dayIdx) n++
  }
  return n
}

onMounted(() => {
  nextTick(() => {
    recalcSpanBars()
    // 当天居中
    const scrollEl = document.querySelector('.mc-body-scroll') as HTMLElement | null
    if (scrollEl) {
      const todayRow = scrollEl.querySelector('.mc-today') as HTMLElement | null
      if (todayRow) scrollEl.scrollTop = todayRow.offsetTop - scrollEl.offsetHeight / 2 + todayRow.offsetHeight / 2
    }
  })
})
</script>

<style scoped>
.month-view { width: 100%; display: flex; flex-direction: column; flex: 1; min-height: 0; }

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1px;
}

.weekday-cell {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: var(--spacing-xs) 0;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.month-cell {
  background: var(--color-surface);
  min-height: 80px;
  padding: var(--spacing-xs);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1px;
  transition: background var(--transition-fast);
  overflow: hidden;
}

.month-cell:hover { background: var(--color-surface-hover); }
.month-cell.other-month { background: var(--color-bg); }
.month-cell.other-month .day-number { color: var(--color-text-muted); }
.month-cell.today .day-number {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-radius: var(--radius-full);
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.month-cell.selected {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.month-cell.selected .day-number {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-radius: var(--radius-full);
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.day-number {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0 auto 1px auto;
  flex-shrink: 0;
}

/* ===== 杩炵画浜嬩欢涓撳睘琛岋紙涓嶅彈鎵撴柇锛屽缁堥《缃級 ===== */
.spanning-bars {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
  margin-bottom: 1px;
}

/* ===== 鏅€氫换鍔℃í鏉?===== */
.task-bars {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-height: 0;
}

.task-bar {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  color: var(--color-text-on-primary);
  line-height: 1.5;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
  min-height: 14px;
}

.task-bar:hover {
  opacity: 0.85;
}

.task-bar.p-urgent { background: var(--priority-urgent-bg); }
.task-bar.p-high { background: var(--priority-high-bg); }
.task-bar.p-medium { background: var(--priority-medium-bg); }
.task-bar.p-low { background: var(--priority-low-bg); }
.task-bar.p-none { background: var(--priority-none-bg); }
.task-bar.p-none {
  background: var(--color-primary);
}

/* 鎸佺画浜嬩欢璺ㄥぉ - 宸﹀彸寤朵几鍒板崟鍏冩牸杈圭紭 */
.task-bar.is-spanning {
  border-radius: 0;
  margin: 0 -4px;
  padding: 1px 6px;
}

.task-bar.is-spanning.span-start {
  border-radius: 3px 0 0 3px;
  margin-left: -4px;
  padding-left: 4px;
  margin-right: 0;
  padding-right: 4px;
}

.task-bar.is-spanning.span-end {
  border-radius: 0 3px 3px 0;
  margin-right: -4px;
  padding-right: 4px;
  margin-left: 0;
  padding-left: 4px;
}

/* 褰撳ぉ寮€濮嬪苟缁撴潫鐨勬寔缁簨浠?*/
.task-bar.is-spanning.span-single {
  border-radius: 3px;
  margin: 0 -4px;
  padding: 1px 6px;
}

.task-bar-more {
  font-size: 9px;
  color: var(--color-text-muted);
  padding: 0 2px;
  line-height: 1.6;
  flex-shrink: 0;
}

.task-bar-empty {
  flex: 1;
  min-height: 4px;
}

/* ===== 妗岄潰绔細浠呮樉绀洪鑹叉潯锛屼笉鏄剧ず鏂囧瓧 ===== */
@media (min-width: 1024px) {
  .task-bar {
    font-size: 0;
    color: transparent;
    padding: 3px 4px;
    min-height: 10px;
    line-height: 1;
  }

  .task-bar.is-spanning {
    padding: 3px 6px;
  }

  .task-bar.is-spanning.span-start {
    padding-left: 4px;
    padding-right: 4px;
  }

  .task-bar.is-spanning.span-end {
    padding-left: 4px;
    padding-right: 4px;
  }

  .task-bar.is-spanning.span-single {
    padding: 3px 6px;
  }

  .task-bar-more {
    font-size: 9px;
    color: var(--color-text-muted);
  }
}

/* ===== 鎵嬫満绔揣鍑戞ā寮?===== */
@media (max-width: 767px) {
  .month-cell {
    min-height: 44px;
    padding: 1px;
    gap: 0;
  }

  .day-number {
    font-size: 10px;
    width: 20px;
    height: 20px;
    margin-bottom: 0;
  }

  .month-cell.today .day-number,
  .month-cell.selected .day-number {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }

  .task-bar {
    font-size: 8px;
    padding: 0 3px;
    line-height: 1.4;
    border-radius: 2px;
  }

  .task-bar.is-spanning {
    margin: 0 -1px;
    padding: 0 4px;
  }

  .task-bar.is-spanning.span-start {
    border-radius: 2px 0 0 2px;
    margin-left: -1px;
    padding-left: 3px;
    margin-right: 0;
  }

  .task-bar.is-spanning.span-end {
    border-radius: 0 2px 2px 0;
    margin-right: -1px;
    padding-right: 3px;
    margin-left: 0;
  }

  .task-bar.is-spanning.span-single {
    border-radius: 2px;
    margin: 0 -1px;
    padding: 0 4px;
  }

  .task-bar-more {
    font-size: 8px;
    line-height: 1.4;
  }
}
/* ── 手机端月视图卡片 ─────────────── */
.mc-card { display: none; }

@media (max-width: 1023px) {
  .weekday-header, .month-grid { display: none; }

  .mc-card {
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

  .mc-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-md);
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg);
  }
  .mc-nav-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); min-width: 100px; text-align: center; }
  .mc-nav-btn {
    width: 32px; height: 32px;
    border-radius: var(--radius-full);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-text); cursor: pointer;
  }
  .mc-nav-btn:hover { background: var(--color-surface-hover); }
  .mc-today-btn {
    font-size: var(--font-size-xs);
    padding: 2px 12px;
    border-radius: var(--radius-md);
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    background: transparent;
    margin-left: var(--spacing-xs);
    cursor: pointer;
  }

  .mc-body-outer {
    flex: 1;
    min-height: 0;
  }
  .mc-body-scroll {
    height: 100%;
    overflow-y: auto;
    position: relative;
  }

  .mc-row {
    display: flex;
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg);
  }
  .mc-row:last-child { border-bottom: none; }
  .mc-today { background: color-mix(in srgb, var(--color-primary) 5%, var(--color-bg)); }

  .mc-date-col {
    flex: 0 0 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px 2px;
    cursor: pointer;
    border-right: 1px solid var(--color-border-light);
    font-size: 11px;
    background: inherit;
  }
  .mc-dname { font-weight: 600; color: var(--color-text); font-size: 11px; }
  .mc-dnum { font-size: 12px; color: var(--color-text-muted); }
  .mc-dnum-today {
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-full);
    width: 22px; height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mc-task-area {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: 1px;
    padding: 3px 1px;
  }

  .mc-allday-strip {
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    min-width: 0;
    word-break: break-all;
    text-align: center;
    line-height: 1.3;
    background: var(--priority-none-bg);
    min-height: 24px;
  }
  .mc-allday-strip.p-urgent { background: var(--priority-urgent-bg); color: var(--priority-urgent-text); }
  .mc-allday-strip.p-high   { background: var(--priority-high-bg); color: var(--priority-high-text); }
  .mc-allday-strip.p-medium { background: var(--priority-medium-bg); color: var(--priority-medium-text); }
  .mc-allday-strip.p-low    { background: var(--priority-low-bg); color: var(--priority-low-text); }
  .mc-allday-strip.p-none   { background: var(--priority-none-bg); color: var(--priority-none-text); }

  .mc-strip {
    min-width: 0;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 2px;
    text-align: center;
    line-height: 1.3;
    word-break: break-all;
  }
  .mc-task-area > .mc-strip:only-child {
    font-size: 16px;
    font-weight: 700;
    padding: 12px 4px;
    align-self: stretch;
    justify-content: center;
  }
  .mc-strip.p-urgent { background: var(--priority-urgent-bg); color: var(--priority-urgent-text); }
  .mc-strip.p-high   { background: var(--priority-high-bg); color: var(--priority-high-text); }
  .mc-strip.p-medium { background: var(--priority-medium-bg); color: var(--priority-medium-text); }
  .mc-strip.p-low    { background: var(--priority-low-bg); color: var(--priority-low-text); }
  .mc-strip.p-none   { background: var(--priority-none-bg); color: var(--priority-none-text); }
  .mc-strip.p-none.morning    { background: #D0D8DE; color: #4A555C; }
  .mc-strip.p-none.afternoon  { background: #DCD0C0; color: #4A4038; }
  .mc-strip.p-none.evening    { background: #D0C8D8; color: #403850; }
  .mc-strip.mc-done    { opacity: 0.3; }

  .mc-strip-time, .mc-strip-title, .mc-allday-title {
    display: block;
    width: 100%;
    word-break: break-all;
  }
  .mc-strip-time { font-size: 9px; opacity: 0.85; }

  .mc-right-col {
    flex: 0 0 64px;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 3px;
    padding: 1px;
    border-left: 1px solid var(--color-border-light);
    overflow: hidden;
  }

  .mc-allday {
    font-size: 8px;
    padding: 1px 3px;
    border-radius: 2px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: color-mix(in srgb, var(--color-primary) 15%, var(--color-bg));
    flex-shrink: 0;
  }

  .mc-span-bar {
    flex: 1;
    cursor: pointer;
    color: #fff;
    font-weight: 500;
    font-size: 8px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: -1px 0;
    padding: 2px 0;
  }
  .mc-span-bar.span-start { border-radius: 4px 4px 0 0; margin-top: 0; padding-top: 1px; }
  .mc-span-bar.span-end   { border-radius: 0 0 4px 4px; margin-bottom: 0; padding-bottom: 1px; }
  .mc-span-bar.span-single { border-radius: 4px; margin: 0; padding: 2px 0; }
  .mc-span-bar.p-urgent { background: var(--priority-urgent-bg); }
  .mc-span-bar.p-high   { background: var(--priority-high-bg); }
  .mc-span-bar.p-medium { background: var(--priority-medium-bg); }
  .mc-span-bar.p-low    { background: var(--priority-low-bg); }
  .mc-span-bar.p-none   { background: var(--priority-none-bg); }
  .mc-span-abs.p-urgent { background: var(--priority-urgent-bg); }
  .mc-span-abs.p-high   { background: var(--priority-high-bg); }
  .mc-span-abs.p-medium { background: var(--priority-medium-bg); }
  .mc-span-abs.p-low    { background: var(--priority-low-bg); }
  .mc-span-abs.p-none   { background: var(--priority-none-bg); }

  .mc-span-placeholder { flex-shrink: 0; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .weekday-header, .month-grid { display: none; }
  .mc-card { display: flex; }
}
</style>
/* 鈹€鈹€ 鎵嬫満绔湀瑙嗗浘鍗＄墖 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
.mc-card { display: none; }

@media (max-width: 1023px) {
  .weekday-header, .month-grid { display: none; }

  .mc-card {
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

  .mc-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-md);
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg);
  }
  .mc-nav-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); min-width: 100px; text-align: center; }
  .mc-nav-btn {
    width: 32px; height: 32px;
    border-radius: var(--radius-full);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-text); cursor: pointer;
  }
  .mc-nav-btn:hover { background: var(--color-surface-hover); }
  .mc-today-btn {
    font-size: var(--font-size-xs);
    padding: 2px 12px;
    border-radius: var(--radius-md);
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    background: transparent;
    margin-left: var(--spacing-xs);
    cursor: pointer;
  }

  .mc-body-outer {
    flex: 1;
    min-height: 0;
  }
  .mc-body-scroll {
    height: 100%;
    overflow-y: auto;
    position: relative;
  }

  .mc-row {
    display: flex;
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg);
  }
  .mc-row:last-child { border-bottom: none; }
  .mc-today { background: color-mix(in srgb, var(--color-primary) 5%, var(--color-bg)); }

  .mc-date-col {
    flex: 0 0 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px 2px;
    cursor: pointer;
    border-right: 1px solid var(--color-border-light);
    font-size: 11px;
    background: inherit;
  }
  .mc-dname { font-weight: 600; color: var(--color-text); font-size: 11px; }
  .mc-dnum { font-size: 12px; color: var(--color-text-muted); }
  .mc-dnum-today {
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-full);
    width: 22px; height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mc-task-area {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: 1px;
    padding: 3px 1px;
  }

  .mc-allday-strip {
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    min-width: 0;
    word-break: break-all;
    text-align: center;
    line-height: 1.3;
    background: var(--priority-none-bg);
    min-height: 24px;
  }
  .mc-allday-strip.p-urgent { background: var(--priority-urgent-bg); color: var(--priority-urgent-text); }
  .mc-allday-strip.p-high   { background: var(--priority-high-bg); color: var(--priority-high-text); }
  .mc-allday-strip.p-medium { background: var(--priority-medium-bg); color: var(--priority-medium-text); }
  .mc-allday-strip.p-low    { background: var(--priority-low-bg); color: var(--priority-low-text); }
  .mc-allday-strip.p-none   { background: var(--priority-none-bg); color: var(--priority-none-text); }

  .mc-strip {
    min-width: 0;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 2px;
    text-align: center;
    line-height: 1.3;
    word-break: break-all;
  }
  .mc-task-area > .mc-strip:only-child {
    font-size: 16px;
    font-weight: 700;
    padding: 12px 4px;
    align-self: stretch;
    justify-content: center;
  }
  .mc-strip.p-urgent { background: var(--priority-urgent-bg); color: var(--priority-urgent-text); }
  .mc-strip.p-high   { background: var(--priority-high-bg); color: var(--priority-high-text); }
  .mc-strip.p-medium { background: var(--priority-medium-bg); color: var(--priority-medium-text); }
  .mc-strip.p-low    { background: var(--priority-low-bg); color: var(--priority-low-text); }
  .mc-strip.p-none   { background: var(--priority-none-bg); color: var(--priority-none-text); }
  .mc-strip.p-none.morning    { background: #D0D8DE; color: #4A555C; }
  .mc-strip.p-none.afternoon  { background: #DCD0C0; color: #4A4038; }
  .mc-strip.p-none.evening    { background: #D0C8D8; color: #403850; }
  .mc-strip.mc-done    { opacity: 0.3; }

  .mc-strip-time, .mc-strip-title, .mc-allday-title {
    display: block;
    width: 100%;
    word-break: break-all;
  }
  .mc-strip-time { font-size: 9px; opacity: 0.85; }

  .mc-right-col {
    flex: 0 0 64px;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 3px;
    padding: 1px;
    border-left: 1px solid var(--color-border-light);
    overflow: hidden;
  }

  .mc-allday {
    font-size: 8px;
    padding: 1px 3px;
    border-radius: 2px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: color-mix(in srgb, var(--color-primary) 15%, var(--color-bg));
    flex-shrink: 0;
  }

  .mc-span-bar {
    flex: 1;
    cursor: pointer;
    color: #fff;
    font-weight: 500;
    font-size: 8px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: -1px 0;
    padding: 2px 0;
  }
  .mc-span-bar.span-start { border-radius: 4px 4px 0 0; margin-top: 0; padding-top: 1px; }
  .mc-span-bar.span-end   { border-radius: 0 0 4px 4px; margin-bottom: 0; padding-bottom: 1px; }
  .mc-span-bar.span-single { border-radius: 4px; margin: 0; padding: 2px 0; }
  .mc-span-bar.p-urgent { background: var(--priority-urgent-bg); }
  .mc-span-bar.p-high   { background: var(--priority-high-bg); }
  .mc-span-bar.p-medium { background: var(--priority-medium-bg); }
  .mc-span-bar.p-low    { background: var(--priority-low-bg); }
  .mc-span-bar.p-none   { background: var(--priority-none-bg); }
  .mc-span-abs.p-urgent { background: var(--priority-urgent-bg); }
  .mc-span-abs.p-high   { background: var(--priority-high-bg); }
  .mc-span-abs.p-medium { background: var(--priority-medium-bg); }
  .mc-span-abs.p-low    { background: var(--priority-low-bg); }
  .mc-span-abs.p-none   { background: var(--priority-none-bg); }

  .mc-span-placeholder { flex-shrink: 0; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .weekday-header, .month-grid { display: none; }
  .mc-card { display: flex; }
}


