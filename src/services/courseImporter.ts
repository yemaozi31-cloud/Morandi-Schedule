/**
 * 课表导入引擎
 *
 * 解析 ICS 文件 → 课程数据 → 批量创建 isCourse 任务
 *
 * 数据流:
 *   .ics 文件 → ical.js 解析 → ImportedCourse[]
 *   → 预览 → 确认导入 → taskStore.createTask()
 */

import ICAL from 'ical.js'
import { useTaskStore } from '@/stores/taskStore'

export interface ImportedCourse {
  title: string
  dayOfWeek: number       // 0=周日 .. 6=周六
  startTime: string       // HH:mm
  endTime: string         // HH:mm
  location: string
  validFrom: string       // YYYY-MM-DD
  validTo: string         // YYYY-MM-DD
  description?: string
  teacher?: string        // 从 DESCRIPTION 第一行提取
}

/**
 * 解析 ICS 文件内容为课程列表
 * @param icsContent ICS 文件的文本内容
 * @returns 解析后的课程数组
 */
export function parseICS(icsContent: string): ImportedCourse[] {
  const courses: ImportedCourse[] = []

  try {
    const jcalData = ICAL.parse(icsContent)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)
      const dtstart = event.startDate
      const dtend = event.endDate

      if (!dtstart || !dtend) continue

      // 解析 RRULE 获取截止日期
      let validTo = ''
      try {
        const rrule = vevent.getFirstPropertyValue('rrule') as any
        if (rrule && rrule.until) {
          const until = rrule.until
          validTo = typeof until.toJSDate === 'function'
            ? until.toJSDate().toISOString().slice(0, 10)
            : String(until).slice(0, 10)
        }
      } catch {}

      const validFrom = dtstart.toJSDate().toISOString().slice(0, 10)
      // 没有 UNTIL 就不限制截止日期（设为空，周视图不拦截）
      if (!validTo) validTo = ''

      courses.push({
        title: event.summary || '未命名课程',
        dayOfWeek: dtstart.toJSDate().getDay(), // 0=周日, 1=周一...
        startTime: dtstart.toJSDate().toTimeString().slice(0, 5),
        endTime: dtend.toJSDate().toTimeString().slice(0, 5),
        location: event.location || '',
        validFrom,
        validTo,
        description: event.description || '',
        teacher: event.description ? event.description.split('\\n')[0] : ''
      })
    }
  } catch (e) {
    console.error('[courseImporter] ICS 解析失败:', e)
  }

  return courses
}

/**
 * 批量导入课程
 * @param courses 课程列表
 * @returns 导入结果统计
 */
export async function importCourses(courses: ImportedCourse[]): Promise<{ success: number; skipped: number }> {
  const taskStore = useTaskStore()
  let success = 0
  let skipped = 0

  for (const course of courses) {
    try {
      // 排重检测：同一课程名 + 同一时间段视为重复
      const existing = Array.from(taskStore.tasks.values()).find(t =>
        t.isCourse &&
        t.title === course.title &&
        t.courseDay === course.dayOfWeek &&
        t.courseStartTime === course.startTime
      )
      if (existing) {
        skipped++
        continue
      }

      await taskStore.createTask({
        title: course.title,
        isCourse: true,
        courseDay: course.dayOfWeek,
        courseStartTime: course.startTime,
        courseEndTime: course.endTime,
        courseLocation: course.location,
        courseTeacher: course.teacher,
        courseValidFrom: course.validFrom,
        courseValidTo: course.validTo,
        description: course.description,
        priority: 'none',
        dueDate: null,
        dueTime: null,
        recurring: { type: 'weekly' },
        tagIds: []
      })
      success++
    } catch (e) {
      console.error('[courseImporter] 导入失败:', course.title, e)
      skipped++
    }
  }

  return { success, skipped }
}
