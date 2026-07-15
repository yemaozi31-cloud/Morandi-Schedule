export interface Task {
  id: string
  title: string
  description?: string
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'completed' | 'cancelled'
  dueDate?: string | null
  dueTime?: string | null
  startDate?: string | null
  startTime?: string | null
  endDate?: string | null
  endTime?: string | null
  isSpanning?: boolean | null
  tagIds: string[]
  recurring?: RecurringRule | null
  reminder?: ReminderConfig | null
  createdAt: string
  updatedAt?: string
  completedAt?: string | null
  deletedAt?: string | null
}

export interface RecurringRule {
  type: 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly'
  interval?: number
  daysOfWeek?: number[]
  endDate?: string
}

export interface ReminderConfig {
  type: 'at_time' | 'before'
  minutes?: number
}
