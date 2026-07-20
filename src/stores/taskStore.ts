import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task } from '@/types'
import * as db from '@/db'
import { getTodayStr, addDays, addMonths, parseISO, format } from '@/utils/date'
import { generateUUID } from '@/utils/uuid'
import { atomicModifyPersonalData } from '@/services/webdavSync'
import { useSettingsStore } from '@/stores/settingsStore'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Map<string, Task>>(new Map())
  const filter = ref({
    status: null as string | null,
    priority: null as string | null,
    tagId: null as string | null,
    dateRange: null as string | null,
    searchText: ''
  })
  const sortBy = ref<'createdAt' | 'priority' | 'dueDate' | 'title'>('createdAt')
  const viewMode = ref<'matrix' | 'list'>('matrix')
  const isLoading = ref(false)

  // 防并发守卫
  const pendingToggles = new Set<string>()
  let isCreating = false
  let isUpdating = false
  let isDeleting = false

  // 所有未删除的任务
  const activeTasks = computed(() =>
    Array.from(tasks.value.values()).filter(t => !t.deletedAt)
  )

  // 常规任务（排除课程）
  const regularTasks = computed(() =>
    activeTasks.value.filter(t => !t.isCourse)
  )

  // 今日任务（不包括过期任务，过期任务由 DayTimeline 的过期区块单独显示）
  const todayTasks = computed(() => {
    const today = getTodayStr()
    return regularTasks.value.filter(t => {
      if (t.status === 'cancelled') return false
      if (t.isSpanning && t.startDate && t.dueDate) {
        return today >= t.startDate && today <= t.dueDate
      }
      return t.dueDate === today
    })
  })

  // 待完成任务数
  const pendingTasks = computed(() =>
    regularTasks.value.filter(t => t.status === 'pending').length
  )

  // 筛选后的任务（仅常规任务）
  const filteredTasks = computed(() => {
    let result = regularTasks.value

    if (filter.value.status) {
      result = result.filter(t => t.status === filter.value.status)
    }
    if (filter.value.priority) {
      result = result.filter(t => t.priority === filter.value.priority)
    }
    if (filter.value.tagId) {
      result = result.filter(t => t.tagIds.includes(filter.value.tagId!))
    }
    if (filter.value.searchText) {
      const q = filter.value.searchText.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      )
    }

    // 日期范围筛选
    const today = getTodayStr()
    if (filter.value.dateRange === 'today') {
      result = result.filter(t => {
        if (t.isSpanning && t.startDate && t.dueDate) return today >= t.startDate && today <= t.dueDate
        return t.dueDate === today
      })
    } else if (filter.value.dateRange === 'overdue') {
      result = result.filter(t => {
        if (t.isSpanning && t.startDate && t.dueDate) return t.dueDate < today && t.status !== 'completed'
        return t.dueDate && t.dueDate < today && t.status !== 'completed'
      })
    } else if (filter.value.dateRange === 'tomorrow') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      const tomStr = tomorrow.toISOString().slice(0, 10)
      result = result.filter(t => {
        if (t.isSpanning && t.startDate && t.dueDate) return tomStr >= t.startDate && tomStr <= t.dueDate
        return t.dueDate === tomStr
      })
    } else if (filter.value.dateRange === 'thisWeek') {
      const end = new Date(); end.setDate(end.getDate() + (7 - end.getDay()))
      result = result.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= end.toISOString().slice(0, 10))
    } else if (filter.value.dateRange === 'noDate') {
      result = result.filter(t => !t.dueDate)
    }

    // 排序
    result.sort((a, b) => {
      switch (sortBy.value) {
        case 'priority': {
          const order = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
          return (order[a.priority] ?? 4) - (order[b.priority] ?? 4)
        }
        case 'dueDate': {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.localeCompare(b.dueDate)
        }
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return b.createdAt.localeCompare(a.createdAt)
      }
    })

    return result
  })

  // 艾森豪威尔矩阵 - 基于筛选后的任务（搜索/筛选/日期均生效），排除已完成/已取消
  const eisenhowerTasks = computed(() => {
    const today = getTodayStr()
    const pending = filteredTasks.value.filter(t => t.status === 'pending')

    const isUrgent = (t: Task) =>
      t.priority === 'urgent' ||
      (t.dueDate && t.dueDate <= today)

    const isImportant = (t: Task) =>
      t.priority === 'high' || t.priority === 'medium'

    return {
      q1: pending.filter(t => isUrgent(t) && isImportant(t)),
        q2: pending.filter(t => !isUrgent(t) && isImportant(t)),
        q3: pending.filter(t => isUrgent(t) && !isImportant(t)),
        q4: pending.filter(t => !isUrgent(t) && !isImportant(t))
    }
  })

  async function loadTasks() {
    isLoading.value = true
    try {
      const data = await db.getAll<Task>('tasks')
      tasks.value = new Map(data.map(t => [t.id, t]))
      // 清理30天前的软删除数据
      cleanupDeleted()
    } finally {
      isLoading.value = false
    }
  }

  // 清理超过30天的软删除数据
  function cleanupDeleted() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString()
    for (const [id, task] of tasks.value) {
      if (task.deletedAt && task.deletedAt < cutoff) {
        tasks.value.delete(id)
        db.remove('tasks', id).catch(() => {})
      }
    }
  }

  async function createTask(data: Partial<Task>): Promise<Task> {
    if (isCreating) throw new Error('请勿重复提交')
    isCreating = true
    const now = new Date().toISOString()
    const task: Task = {
      id: generateUUID(),
      title: data.title || '新任务',
      description: data.description,
      priority: data.priority || 'none',
      status: 'pending',
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      startDate: data.startDate || null,
      startTime: data.startTime || null,
      endDate: data.endDate || null,
      endTime: data.endTime || null,
      isSpanning: data.isSpanning || null,
      tagIds: data.tagIds ? [...data.tagIds] : [],
      recurring: data.recurring || null,
      reminder: data.reminder || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      deletedAt: null,
      // ── 课程字段 ──
      isCourse: data.isCourse ?? false,
      courseDay: data.courseDay ?? undefined,
      courseStartTime: data.courseStartTime ?? undefined,
      courseEndTime: data.courseEndTime ?? undefined,
      courseLocation: data.courseLocation ?? undefined,
      courseValidFrom: data.courseValidFrom ?? undefined,
      courseValidTo: data.courseValidTo ?? undefined,
      courseTeacher: data.courseTeacher ?? undefined
    }
    try {
      // 先写云端
      const cfg = useSettingsStore().syncConfig
      const ok = await atomicModifyPersonalData(cfg, (d) => {
        d.data.tasks.push({ ...task } as any)
        return d
      })
      if (!ok) { console.error('createTask: 云端写入失败'); throw new Error('云端写入失败') }
      // 成功后才写本地缓存
      await db.set('tasks', task)
      tasks.value.set(task.id, task)
      scheduleAndroidReminder(task)
      return task
    } catch (e) {
      console.error('createTask failed:', e)
      throw e
    } finally {
      isCreating = false
    }
  }

  async function updateTask(id: string, data: Partial<Task>) {
    if (isUpdating) throw new Error('请勿重复提交')
    isUpdating = true
    const existing = tasks.value.get(id)
    if (!existing) { isUpdating = false; return }
    // 白名单：只允许更新这些字段，保护敏感字段不被意外覆写
    const ALLOWED = ['title', 'description', 'priority', 'status', 'dueDate', 'dueTime', 'startDate', 'startTime', 'endDate', 'endTime', 'isSpanning', 'tagIds', 'recurring', 'reminder', 'deletedAt', 'completedAt', 'isCourse', 'courseDay', 'courseStartTime', 'courseEndTime', 'courseLocation', 'courseValidFrom', 'courseValidTo', 'courseTeacher']
    const sanitized: Partial<Task> = {}
    for (const key of ALLOWED) {
      if (key in data) {
        const val = (data as any)[key]
        // tagIds 必须是普通数组，不能是 Vue reactive Proxy
        sanitized[key as keyof Task] = key === 'tagIds' ? [...(val || [])] : val
      }
    }
    const updated: Task = {
      ...existing,
      ...sanitized,
      id,
      updatedAt: new Date().toISOString()
    }
    try {
      // 先写云端
      const cfg = useSettingsStore().syncConfig
      const ok = await atomicModifyPersonalData(cfg, (d) => {
        const idx = d.data.tasks.findIndex(t => t.id === id)
        if (idx >= 0) d.data.tasks[idx] = { ...updated } as any
        return d
      })
      if (!ok) { console.error('updateTask: 云端写入失败'); throw new Error('云端写入失败') }
      // 成功后才写本地缓存
      await db.set('tasks', updated)
      tasks.value.set(id, updated)
      if (updated.deletedAt || updated.completedAt) {
        cancelAndroidReminder(id)
      } else if (updated.reminder) {
        scheduleAndroidReminder(updated)
      }
    } catch (e) {
      console.error('updateTask failed:', e)
      throw e
    } finally {
      isUpdating = false
    }
  }

  async function deleteTask(id: string) {
    if (isDeleting) {
      console.warn('[taskStore] deleteTask 被并发拦截:', id)
      throw new Error('请勿重复提交')
    }
    isDeleting = true
    try {
      const now = new Date().toISOString()
      await updateTask(id, { deletedAt: now })
      await purgeOldDeletedTasks()
    } catch (e) {
      console.error('[taskStore] deleteTask 失败:', e, 'id:', id)
      throw e
    } finally {
      isDeleting = false
    }
  }

  /** 清理超过30天的软删除任务（从 IndexedDB 彻底删除） */
  async function purgeOldDeletedTasks() {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const all = Array.from(tasks.value.values())
      for (const t of all) {
        if (t.deletedAt && t.deletedAt < cutoff) {
          await db.remove('tasks', t.id)
          tasks.value.delete(t.id)
        }
      }
    } catch (e) {
      console.warn('[taskStore] 清理旧删除记录失败:', e)
    }
  }

  async function toggleComplete(id: string) {
    if (pendingToggles.has(id)) return
    pendingToggles.add(id)
    const task = tasks.value.get(id)
    if (!task) { pendingToggles.delete(id); return }
    const now = new Date().toISOString()
    const originalStatus = task.status
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'

    // 乐观更新：先更新内存，UI 立即响应
    tasks.value.set(id, { ...task, status: newStatus as Task['status'], completedAt: newStatus === 'completed' ? now : null, updatedAt: now })

    try {
      // 先写云端
      const cfg = useSettingsStore().syncConfig
      const updated = tasks.value.get(id)!
      await atomicModifyPersonalData(cfg, (d) => {
        const idx = d.data.tasks.findIndex(t => t.id === id)
        if (idx >= 0) d.data.tasks[idx] = { ...updated } as any
        return d
      })
      await db.set('tasks', updated)
      if (newStatus === 'completed' && task.recurring) {
        await createNextRecurring(task)
      }
    } catch (e) {
      // 回滚
      tasks.value.set(id, { ...task, status: originalStatus as Task['status'], completedAt: task.completedAt, updatedAt: task.updatedAt })
      console.error('toggleComplete failed:', e)
      throw e
    } finally {
      pendingToggles.delete(id)
    }
  }

  async function createNextRecurring(task: Task) {
    // 如果设置了结束日期且已过期，不再生成下一次
    if (task.recurring?.endDate && task.recurring.endDate <= getTodayStr()) {
      return
    }
    const dueDate = task.dueDate ? calculateNextDate(task.dueDate, task.recurring!.type) : null
    // 持续事件同时推进 startDate 和 endDate
    let startDate = null
    let endDate = null
    let startTime = null
    let endTime = null
    if (task.isSpanning && task.startDate && task.endDate) {
      startDate = calculateNextDate(task.startDate, task.recurring!.type)
      endDate = dueDate
      startTime = task.startTime
      endTime = task.endTime
    }
    await createTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      tagIds: task.tagIds,
      dueDate,
      startDate,
      startTime,
      endDate,
      endTime,
      isSpanning: task.isSpanning || null,
      recurring: task.recurring,
      reminder: task.reminder
    })
  }

  function calculateNextDate(currentDate: string, type: string): string {
    const d = parseISO(currentDate)
    switch (type) {
      case 'daily': return format(addDays(d, 1), 'yyyy-MM-dd')
      case 'weekly': return format(addDays(d, 7), 'yyyy-MM-dd')
      case 'weekdays': {
        let next = d
        do { next = addDays(next, 1) } while (next.getDay() === 0 || next.getDay() === 6)
        return format(next, 'yyyy-MM-dd')
      }
      case 'monthly': return format(addMonths(d, 1), 'yyyy-MM-dd')
      case 'yearly': return format(addMonths(d, 12), 'yyyy-MM-dd')
    }
    return format(d, 'yyyy-MM-dd')
  }

  function getTaskById(id: string): Task | undefined {
    return tasks.value.get(id)
  }

  function getTasksInRange(start: string, end: string): Task[] {
    return regularTasks.value.filter(t => {
      if (!t.dueDate) return false
      // 持续事件：只要任务的范围与查询范围有交集就返回
      if (t.isSpanning && t.startDate) {
        return t.startDate <= end && t.dueDate >= start
      }
      // 普通任务：dueDate 在范围内
      return t.dueDate >= start && t.dueDate <= end
    })
  }

  function setViewMode(mode: 'matrix' | 'list') {
    viewMode.value = mode
  }

  // ─── Android 原生闹钟（AlarmManager）对接 ─────────
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    window.location.protocol.startsWith('tauri')
  )

  async function scheduleAndroidReminder(task: Task) {
    if (!isTauri || !task.reminder || !task.dueDate) return
    try {
      const baseDate = new Date(task.dueDate + 'T' + (task.dueTime || '09:00') + ':00')
      if (isNaN(baseDate.getTime())) return
      const triggerMs = task.reminder.type === 'at_time'
        ? baseDate.getTime()
        : baseDate.getTime() - (task.reminder.minutes || 0) * 60_000
      if (triggerMs <= Date.now()) return
      const { invoke } = await import('@tauri-apps/api/core')
      invoke('plugin:morandi-plugin|scheduleReminder', {
        timeMs: triggerMs, title: task.title,
        body: task.dueDate + (task.dueTime ? ' ' + task.dueTime : ''),
        id: Math.abs(Array.from(task.id).reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)) % 100000
      }).catch((e) => { console.warn('[taskStore] 设置提醒失败:', e) })
    } catch (e) { console.warn('[taskStore] 动态导入提醒插件失败:', e) }
  }

  function cancelAndroidReminder(taskId: string) {
    if (!isTauri) return
    try {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        const id = Math.abs(Array.from(taskId).reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)) % 100000
        invoke('plugin:morandi-plugin|cancelReminder', { id }).catch((e) => { console.warn('[taskStore] 取消提醒失败:', e) })
      })
    } catch (e) { console.warn('[taskStore] 动态导入core失败:', e) }
  }

  return {
    tasks, filter, sortBy, viewMode, isLoading,
    activeTasks, regularTasks, todayTasks, pendingTasks, filteredTasks, eisenhowerTasks,
    loadTasks, createTask, updateTask, deleteTask, toggleComplete,
    getTaskById, getTasksInRange, setViewMode
  }
})
