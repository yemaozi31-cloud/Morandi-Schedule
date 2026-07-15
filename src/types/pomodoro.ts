export interface PomodoroSession {
  id: string
  taskId?: string | null
  duration: number
  completed: boolean
  startedAt: string
  endedAt?: string | null
}
