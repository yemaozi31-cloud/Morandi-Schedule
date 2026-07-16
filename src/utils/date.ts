import { format, parseISO, isToday, isTomorrow, isYesterday, isPast, addDays, addWeeks, addMonths, subDays, subMonths, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export { format, parseISO, isToday, isTomorrow, isYesterday, isPast, addDays, addWeeks, addMonths, subDays, subMonths, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth }

export function formatDate(date: string | Date, fmt = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: zhCN })
}

export function formatTime(date: string | Date, fmt = 'HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getRelativeDay(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return '今天'
  if (isTomorrow(d)) return '明天'
  if (isYesterday(d)) return '昨天'
  return formatDate(dateStr, 'M月d日')
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function parseDate(text: string): { date?: string; time?: string } | null {
  // 简单NLP日期解析（完整版在nlpParser.ts）
  const now = new Date()
  
  if (text.includes('明天')) {
    const d = addDays(now, 1)
    return { date: format(d, 'yyyy-MM-dd') }
  }
  if (text.includes('后天')) {
    const d = addDays(now, 2)
    return { date: format(d, 'yyyy-MM-dd') }
  }
  if (text.includes('今天') || text.includes('今日')) {
    return { date: format(now, 'yyyy-MM-dd') }
  }

  return null
}
