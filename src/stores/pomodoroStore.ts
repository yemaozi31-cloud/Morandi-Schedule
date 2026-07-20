import { defineStore } from 'pinia'
import { triggerAutoSync } from '@/services/autoSync'
import { ref, computed } from 'vue'
import type { PomodoroSession } from '@/types'
import * as db from '@/db'
import { generateUUID } from '@/utils/uuid'

export const usePomodoroStore = defineStore('pomodoro', () => {
  const sessions = ref<Map<string, PomodoroSession>>(new Map())
  const isRunning = ref(false)
  const currentTaskId = ref<string | null>(null)
  const remainingSeconds = ref(25 * 60) // 默认25分钟
  const isBreak = ref(false)
  // 最近一次开始计时的总时长（分钟），供 resumeTimer 恢复后用原始值
  let lastDurationMinutes = 25
  let timerInterval: ReturnType<typeof setInterval> | null = null

  const completedSessions = computed(() =>
    Array.from(sessions.value.values()).filter(s => s.completed)
  )

  const todayStats = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todaySessions = completedSessions.value.filter(s =>
      s.startedAt.startsWith(today)
    )
    return {
      count: todaySessions.length,
      totalMinutes: todaySessions.reduce((sum, s) => sum + s.duration, 0)
    }
  })

  async function loadSessions() {
    const data = await db.getAll<PomodoroSession>('pomodoroSessions')
    sessions.value = new Map(data.map(s => [s.id, s]))
    // 页面刷新后恢复上一次未完成的计时状态
    restoreTimerState()
  }

  function startTimer(taskId?: string, durationMinutes: number = 25) {
    if (isRunning.value) return
    isRunning.value = true
    currentTaskId.value = taskId || null
    remainingSeconds.value = durationMinutes * 60
    lastDurationMinutes = durationMinutes

    // 持久化计时状态到 localStorage（关闭页面恢复用）
    saveTimerState(durationMinutes)

    const startTime = Date.now()
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      remainingSeconds.value = Math.max(0, durationMinutes * 60 - elapsed)

      if (remainingSeconds.value <= 0) {
        if (isBreak.value) {
          endBreak()
        } else {
          completeSession(taskId, durationMinutes)
        }
      }
    }, 1000)
  }

  function pauseTimer() {
    isRunning.value = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    // 暂停时保存剩余秒数 + 原始总时长到 localStorage
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        remainingSeconds: remainingSeconds.value,
        durationMinutes: lastDurationMinutes,
        isBreak: isBreak.value,
        taskId: currentTaskId.value,
        isPaused: true
      }))
    } catch (e) { console.warn('[pomodoro] 暂停保存失败:', e) }
  }

  function resumeTimer() {
    if (isRunning.value || remainingSeconds.value <= 0) return
    isRunning.value = true
    const remaining = remainingSeconds.value
    const originalDuration = lastDurationMinutes // 用原始总时长（分钟），不随暂停消耗减少
    const startTime = Date.now()

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      remainingSeconds.value = Math.max(0, remaining - elapsed)

      if (remainingSeconds.value <= 0) {
        completeSession(currentTaskId.value ?? undefined, originalDuration)
      }
    }, 1000)
  }

  async function completeSession(taskId: string | undefined, duration: number) {
    pauseTimer()

    const session: PomodoroSession = {
      id: generateUUID(),
      taskId: taskId || null,
      duration: Math.max(1, duration),
      completed: true,
      startedAt: new Date(Date.now() - duration * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString()
    }

    try {
      await db.set('pomodoroSessions', session)
      triggerAutoSync()
      sessions.value.set(session.id, session)
      clearTimerState()
      window.__message?.success('番茄钟完成')
    } catch (e) {
      console.error('Failed to save pomodoro session:', e)
      window.__message?.error('番茄钟保存失败')
      return
    }

    isBreak.value = true
    remainingSeconds.value = 5 * 60 // 5分钟短休息
  }

  function stopTimer() {
    pauseTimer()
    clearTimerState()
    isRunning.value = false
    currentTaskId.value = null
    remainingSeconds.value = 25 * 60
    isBreak.value = false
    lastDurationMinutes = 25
  }

  function endBreak() {
    pauseTimer()
    clearTimerState()
    isRunning.value = false
    currentTaskId.value = null
    remainingSeconds.value = 25 * 60
    isBreak.value = false
    lastDurationMinutes = 25
  }

  function startBreak(durationMinutes: number = 5) {
    isBreak.value = true
    lastDurationMinutes = durationMinutes
    startTimer(undefined, durationMinutes)
  }

  // localStorage 持久化：跨页面刷新恢复计时状态
  const TIMER_STORAGE_KEY = 'morandi_pomodoro_state'

  function saveTimerState(durationMinutes: number) {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        startedAt: Date.now(),
        durationMinutes,
        isBreak: isBreak.value,
        taskId: currentTaskId.value
      }))
    } catch (e) { console.warn('[pomodoro] 保存番茄钟失败（可能超出配额）:', e) }
  }

  function clearTimerState() {
    try { localStorage.removeItem(TIMER_STORAGE_KEY) } catch (e) { console.warn('[pomodoro] 清除计时器状态失败:', e) }
  }

  // 页面加载时检查是否有未完成的计时
  function restoreTimerState() {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY)
      if (!saved) return
      const state = JSON.parse(saved)

      // 暂停态：直接恢复剩余秒数，不自动开始
      if (state.isPaused) {
        remainingSeconds.value = state.remainingSeconds || 0
        isBreak.value = !!state.isBreak
        currentTaskId.value = state.taskId || null
        return
      }

      // 运行态：根据 elapsed 计算剩余
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000)
      const totalSeconds = state.durationMinutes * 60
      const remaining = totalSeconds - elapsed
      if (remaining > 0) {
        remainingSeconds.value = remaining
        isBreak.value = !!state.isBreak
        currentTaskId.value = state.taskId || null
      } else {
        clearTimerState()
      }
    } catch (e) { console.warn('[pomodoro] 加载计时器状态失败（数据损坏）:', e) }
  }

  return {
    sessions, isRunning, currentTaskId, remainingSeconds, isBreak,
    completedSessions, todayStats,
    loadSessions, startTimer, pauseTimer, resumeTimer, stopTimer, startBreak, endBreak,
    restoreTimerState, clearTimerState
  }
})
