export interface Habit {
  id: string
  name: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  target: number
  unit: 'times' | 'minutes'
  color: string
  reminderTime?: string | null
  reminderDays?: number[] | null
  createdAt: string
  updatedAt?: string
  /** 是否为共享习惯 */
  isShared?: boolean
  /** 共享习惯的名称（对应 shared.json 中的 habitName） */
  sharedHabitName?: string
  /** 创建该共享习惯的人 */
  sharedCreatedBy?: string
}

export interface HabitCheckIn {
  id: string
  habitId: string
  date: string
  value: number
  note?: string
  createdAt: string
  updatedAt?: string
  /** 软删除时间戳，不为空表示已删除（与 Task 的 deletedAt 一致） */
  deletedAt?: string | null
}
