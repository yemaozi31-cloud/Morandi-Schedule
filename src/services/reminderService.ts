import type { Task } from '@/types/task'

/** 运行时检测是否为 Tauri 环境 */
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

// ─── 单次通知发送（已有） ──────────────────

type ReminderConfig = {
  title: string
  body?: string
  scheduledAt?: Date
  taskId?: string
}

export async function requestPermission(): Promise<boolean> {
  if (isTauri) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
      const granted = await isPermissionGranted()
      if (!granted) {
        const result = await requestPermission()
        return result === 'granted'
      }
      return true
    } catch {
      return false
    }
  }

  // Web Notification API fallback
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function sendNotification(config: ReminderConfig): Promise<void> {
  if (isTauri) {
    try {
      const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification')
      await tauriNotify({
        title: config.title,
        body: config.body || ''
      })
    } catch (e) {
      console.warn('Tauri notification failed:', e)
    }
    return
  }

  // Web fallback
  if (Notification.permission === 'granted') {
    new Notification(config.title, {
      body: config.body,
      tag: config.taskId
    })
  }
}

import { ref } from 'vue'
export const notifDenied = ref(false)
export function dismissNotifBanner() { notifDenied.value = false }

// ─── 轮询调度器（方案B） ──────────────────

const CHECK_INTERVAL = 30_000 // 30 秒轮询一次
const notifiedTaskIds = new Set<string>()
let intervalId: ReturnType<typeof setInterval> | null = null
let isRunning = false

/**
 * 启动提醒轮询调度器
 * @param getPendingTasks 获取所有待检查任务的函数（从 taskStore 注入）
 */
export function startReminderScheduler(getPendingTasks: () => Task[]): void {
  if (isRunning) return
  isRunning = true

  requestPermission().then(granted => {
    if (!granted) {
      const denied = !isTauri && Notification.permission === 'denied'
      if (denied) {
        notifDenied.value = true
        console.warn('[Reminder] 通知权限已被浏览器拒绝，请在地址栏🔒 → 网站设置中开启通知')
      } else {
        console.warn('[Reminder] 通知权限未授予，点击页面任意位置重试')
        // 浏览器模式下用户点击后重试
        if (!isTauri) {
          const retry = () => {
            document.removeEventListener('click', retry)
            requestPermission().then(g2 => {
              if (g2) { isRunning = false; startReminderScheduler(getPendingTasks) }
            })
          }
          document.addEventListener('click', retry)
        }
      }
      isRunning = false
      return
    }

    console.log('[Reminder] 提醒调度器已启动，每 30 秒检查一次')
    // 立即执行一次检查
    checkReminders(getPendingTasks)
    // 启动定时轮询
    intervalId = setInterval(() => checkReminders(getPendingTasks), CHECK_INTERVAL)
  })
}

/** 停止提醒调度器 */
export function stopReminderScheduler(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  isRunning = false
  notifiedTaskIds.clear()
  console.log('[Reminder] 提醒调度器已停止')
}

/** 清除某条任务的通知记录（用于任务状态变更后重新触发提醒） */
export function clearNotifiedTask(taskId: string): void {
  notifiedTaskIds.delete(taskId)
}

/** 核心：扫描任务并触发到期通知 */
function checkReminders(getPendingTasks: () => Task[]): void {
  const now = Date.now()
  const tasks = getPendingTasks()

  for (const task of tasks) {
    // 只处理 pending + 有 reminder 配置的任务
    if (task.status !== 'pending') continue
    if (!task.reminder) continue
    if (notifiedTaskIds.has(task.id)) continue

    const triggerAt = calcTriggerTime(task)
    if (triggerAt === null) continue

    if (now >= triggerAt) {
      const title = task.title
      const body = formatReminderBody(task)
      sendNotification({ title, body, taskId: task.id })
      notifiedTaskIds.add(task.id)
      console.log(`[Reminder] 已触发通知: "${title}"`)
    }
  }
}

/** 计算提醒触发时间（毫秒时间戳） */
function calcTriggerTime(task: Task): number | null {
  if (!task.dueDate) return null

  // 基准时间：有 dueTime 用 dueTime，没有则默认 09:00
  const baseTime = task.dueTime || '09:00'
  const baseDate = new Date(`${task.dueDate}T${baseTime}:00`)
  if (isNaN(baseDate.getTime())) return null

  if (task.reminder!.type === 'at_time') {
    return baseDate.getTime()
  }

  // 'before' 类型：提前 N 分钟
  const minutes = task.reminder!.minutes || 0
  return baseDate.getTime() - minutes * 60 * 1000
}

/** 格式化通知正文 */
function formatReminderBody(task: Task): string {
  if (task.dueTime) {
    return `提醒：${task.dueTime} · ${task.dueDate}`
  }
  return `提醒：${task.dueDate}`
}
