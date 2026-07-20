import { defineStore } from 'pinia'
import { triggerAutoSync } from '@/services/autoSync'
import { ref, computed } from 'vue'
import type { Habit, HabitCheckIn } from '@/types'
import * as db from '@/db'
import { generateUUID } from '@/utils/uuid'
import { getTodayStr } from '@/utils/date'

export const useHabitStore = defineStore('habits', () => {
  const habits = ref<Map<string, Habit>>(new Map())
  const checkIns = ref<Map<string, HabitCheckIn>>(new Map())

  const sortedHabits = computed(() => {
    const arr: Habit[] = []
    habits.value.forEach(h => arr.push(h))
    return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  })

  async function loadHabits() {
    try {
      const data = await db.getAll<Habit>('habits')
      habits.value = new Map(data.map(h => [h.id, h]))
    } catch (e) {
      console.error('加载习惯失败:', e)
    }
  }

  async function loadCheckIns() {
    try {
      const data = await db.getAll<HabitCheckIn>('habitCheckIns')
      checkIns.value = new Map(data.map(c => [c.id, c]))
    } catch (e) {
      console.error('加载打卡记录失败:', e)
    }
  }

  async function createHabit(data: Partial<Habit>): Promise<Habit> {
    const now = new Date().toISOString()
    const habit: Habit = {
      id: generateUUID(),
      name: data.name || '新习惯',
      description: data.description,
      frequency: data.frequency || 'daily',
      target: data.target || 1,
      unit: data.unit || 'times',
      color: data.color || '#A0B5C4',
      reminderTime: data.reminderTime || null,
      reminderDays: data.reminderDays || null,
      createdAt: now,
      updatedAt: now
    }
    try {
      await db.set('habits', habit)
      triggerAutoSync()
      habits.value.set(habit.id, habit)
    } catch (e) {
      console.error('创建习惯失败:', e)
      throw e
    }
    return habit
  }

  async function updateHabit(id: string, data: Partial<Habit>) {
    const existing = habits.value.get(id)
    if (!existing) return
    const updated: Habit = { ...existing, ...data, id, updatedAt: new Date().toISOString() }
    try {
      await db.set('habits', updated)
      triggerAutoSync()
      habits.value.set(id, updated)
    } catch (e) {
      console.error('更新习惯失败:', e)
      throw e
    }
  }

  async function deleteHabit(id: string) {
    try {
      await db.remove('habits', id)
      triggerAutoSync()
      habits.value.delete(id)
      // 同时软删除关联的打卡记录
      const now = new Date().toISOString()
      const relatedCheckIns = Array.from(checkIns.value.values()).filter(c => c.habitId === id)
      for (const c of relatedCheckIns) {
        const updated = { ...c, deletedAt: now, updatedAt: now }
        await db.set('habitCheckIns', updated)
        checkIns.value.set(c.id, updated)
      }
    } catch (e) {
      console.error('删除习惯失败:', e)
      throw e
    }
  }

  async function checkIn(habitId: string, value: number = 1, note?: string): Promise<HabitCheckIn> {
    const today = getTodayStr()
    const now = new Date().toISOString()
    try {
      const existing = Array.from(checkIns.value.values())
        .find(c => c.habitId === habitId && c.date === today)

      if (existing) {
        const updated = { ...existing, value: existing.value + value, note: note || existing.note }
        await db.set('habitCheckIns', updated)
              triggerAutoSync()
        checkIns.value.set(updated.id, updated)
        return updated
      }

      const checkIn: HabitCheckIn = {
        id: generateUUID(),
        habitId,
        date: today,
        value,
        note,
        createdAt: now,
        updatedAt: now
      }
      await db.set('habitCheckIns', checkIn)
      triggerAutoSync()
      checkIns.value.set(checkIn.id, checkIn)
      return checkIn
    } catch (e) {
      console.error('打卡失败:', e)
      throw e
    }
  }

  /** 软删除指定日期的打卡记录（设 deletedAt，不真删，与 Task 的 deleteTask 一致） */
  async function deleteCheckIn(habitId: string, date: string): Promise<void> {
    try {
      const existing = Array.from(checkIns.value.values())
        .find(c => c.habitId === habitId && c.date === date)
      if (existing) {
        const now = new Date().toISOString()
        const updated = { ...existing, deletedAt: now, updatedAt: now }
        await db.set('habitCheckIns', updated)
        triggerAutoSync()
        checkIns.value.set(existing.id, updated)
      }
    } catch (e) {
      console.error('删除打卡失败:', e)
      throw e
    }
  }

  /** 获取活跃的打卡记录（过滤已软删除的） */
  function getActiveCheckIns(): HabitCheckIn[] {
    return Array.from(checkIns.value.values()).filter(c => !c.deletedAt)
  }

  function getCheckInsForHabit(habitId: string): HabitCheckIn[] {
    return getActiveCheckIns()
      .filter(c => c.habitId === habitId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  function getCheckInsInRange(start: string, end: string, habitId?: string): HabitCheckIn[] {
    return getActiveCheckIns().filter(c =>
      c.date >= start && c.date <= end &&
      (!habitId || c.habitId === habitId)
    )
  }

  // 获取某个习惯在指定周期内的累计值
  function getPeriodValue(habitId: string): number {
    const habit = habits.value.get(habitId)
    if (!habit) return 0
    const today = getTodayStr()
    const d = new Date(today)

    let start: string
    if (habit.frequency === 'weekly') {
      // 本周一
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff)
      start = d.toISOString().slice(0, 10)
    } else if (habit.frequency === 'monthly') {
      // 本月1号
      start = today.slice(0, 7) + '-01'
    } else {
      // daily: 今天
      start = today
    }

    return getCheckInsForHabit(habitId)
      .filter(c => c.date >= start && c.date <= today)
      .reduce((s, c) => s + c.value, 0)
  }

  // 获取周期标签（今日/本周/本月）
  function getPeriodLabel(frequency: string): string {
    if (frequency === 'weekly') return '本周'
    if (frequency === 'monthly') return '本月'
    return '今日'
  }

  function getStreak(habitId: string): number {
    const habit = habits.value.get(habitId)
    if (!habit) return 0

    const allCheckIns = getCheckInsForHabit(habitId)
      .filter(c => c.value >= habit.target)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (allCheckIns.length === 0) return 0

    const today = getTodayStr()

    if (habit.frequency === 'weekly') {
      // 按 ISO 周统计，检查连续周
      return calcWeeklyStreak(allCheckIns, today, habit.target)
    } else if (habit.frequency === 'monthly') {
      // 按月统计
      return calcMonthlyStreak(allCheckIns, today, habit.target)
    } else {
      // 按天统计
      return calcDailyStreak(allCheckIns, today)
    }
  }

  function calcDailyStreak(checkIns: HabitCheckIn[], today: string): number {
    const dateSet = new Set(checkIns.map(c => c.date))
    let streak = 0
    // 今天有打卡 → 从今天开始，否则从昨天开始
    let checkDate = dateSet.has(today) ? today : new Date(new Date(today).getTime() - 86400000).toISOString().slice(0, 10)
    while (dateSet.has(checkDate)) {
      streak++
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().slice(0, 10)
    }
    return streak
  }

  function calcWeeklyStreak(checkIns: HabitCheckIn[], today: string, target: number): number {
    // 按周分组
    const weeklyMap = new Map<string, number>()
    for (const c of checkIns) {
      const weekKey = getWeekKey(c.date)
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + c.value)
    }
    let streak = 0
    let currentWeek = getWeekKey(today)
    while (true) {
      const val = weeklyMap.get(currentWeek) || 0
      if (val < target) break
      streak++
      const d = new Date(currentWeek)
      d.setDate(d.getDate() - 7)
      currentWeek = getWeekKey(d.toISOString().slice(0, 10))
    }
    return streak
  }

  function calcMonthlyStreak(checkIns: HabitCheckIn[], today: string, target: number): number {
    const monthlyMap = new Map<string, number>()
    for (const c of checkIns) {
      const monthKey = c.date.slice(0, 7)
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + c.value)
    }
    let streak = 0
    let currentMonth = today.slice(0, 7)
    while (true) {
      const val = monthlyMap.get(currentMonth) || 0
      if (val < target) break
      streak++
      const d = new Date(currentMonth + '-01')
      d.setMonth(d.getMonth() - 1)
      currentMonth = d.toISOString().slice(0, 7)
    }
    return streak
  }

  function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr)
    // 获取周一
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().slice(0, 10)
  }

  return {
    habits, checkIns, sortedHabits,
    loadHabits, loadCheckIns,
    createHabit, updateHabit, deleteHabit,
    checkIn, deleteCheckIn, getCheckInsForHabit, getCheckInsInRange, getStreak,
    getPeriodValue, getPeriodLabel
  }
})
