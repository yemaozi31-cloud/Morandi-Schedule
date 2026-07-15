export function nlpParse(input: string): Partial<{
  title: string
  dueDate: string
  dueTime: string
  endTime: string
  priority: string
  recurring: string
  tagName: string
}> {
  let text = input.trim()
  if (!text) return {}

  const result: ReturnType<typeof nlpParse> = {}

  const priorityMap: Record<string, string> = {
    p1: 'urgent', p2: 'high', p3: 'medium', p4: 'low'
  }

  // === 时间范围匹配 "下午2点到4点" 「2:00~4:00」 ===
  const timeRangeMatch = text.match(
    /(?:从)?(下午|晚上)?\s*(\d{1,2})[：:点时](\d{2})?分?\s*(?:到|至|~|～|-|—)\s*(下午|晚上)?\s*(\d{1,2})[：:点时](\d{2})?分?/
  )
  if (timeRangeMatch) {
    let startHour = parseInt(timeRangeMatch[2])
    if ((timeRangeMatch[1] || timeRangeMatch[4]) && startHour < 12) startHour += 12
    result.dueTime = `${String(startHour).padStart(2, '0')}:${timeRangeMatch[3] ? String(timeRangeMatch[3]).padStart(2, '0') : '00'}`

    let endHour = parseInt(timeRangeMatch[5])
    // 修复：如果结束时间没有指定上午/下午，但开始时间有，则结束时间应继承开始时间的 AM/PM
    // 例如"晚上10点到11点" → 结束 11 点应为 23 点
    const endHasPeriod = !!timeRangeMatch[4]
    const startHasPeriod = !!timeRangeMatch[1]
    if (endHasPeriod && endHour < 12) {
      endHour += 12
    } else if (!endHasPeriod && startHasPeriod && endHour < 12) {
      // 结束小时 < 12 且开始时间是"下午/晚上"时自动加 12
      endHour += 12
    }
    result.endTime = `${String(endHour).padStart(2, '0')}:${timeRangeMatch[6] ? String(timeRangeMatch[6]).padStart(2, '0') : '00'}`
    text = text.replace(timeRangeMatch[0], '').trim()
  } else {
    // 单时间匹配 (下午3点, 15:00, 3点)
    const timeMatch = text.match(/(下午|晚上)?\s*(\d{1,2})[：:点时](\d{2})?分?/)
    if (timeMatch) {
      let hour = parseInt(timeMatch[2])
      if (timeMatch[1] && hour < 12) hour += 12
      result.dueTime = `${String(hour).padStart(2, '0')}:${timeMatch[3] ? String(timeMatch[3]).padStart(2, '0') : '00'}`
      text = text.replace(timeMatch[0], '').trim()
    }
  }

  // === 日期匹配 ===
  // 中文日期 (今天/明天/后天)
  const datePatterns: [RegExp, () => string][] = [
    [/明天|明日/, () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }],
    [/后天/, () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10) }],
    [/今天|今日/, () => new Date().toISOString().slice(0, 10)]
  ]
  for (const [pattern, getDate] of datePatterns) {
    if (pattern.test(text)) {
      result.dueDate = getDate()
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // 优先级匹配
  for (const [key, value] of Object.entries(priorityMap)) {
    if (text.includes(key)) {
      result.priority = value
      text = text.replace(key, '').trim()
      break
    }
  }

  // 标签匹配
  const tagMatch = text.match(/[#＃@]([\w\u4e00-\u9fa5]+)/)
  if (tagMatch) {
    result.tagName = tagMatch[1]
    text = text.replace(tagMatch[0], '').trim()
  }

  // 重复匹配
  if (/每天|每日|天天/.test(text)) {
    result.recurring = 'daily'
    text = text.replace(/每天|每日|天天/g, '').trim()
  } else if (/每周|每星期/.test(text)) {
    result.recurring = 'weekly'
    text = text.replace(/每周|每星期/g, '').trim()
  } else if (/每月|每个月/.test(text)) {
    result.recurring = 'monthly'
    text = text.replace(/每月|每个月/g, '').trim()
  } else if (/工作日/.test(text)) {
    result.recurring = 'weekdays'
    text = text.replace(/工作日/g, '').trim()
  }

  result.title = text.replace(/[，,。.！!？?；;：:、\s]+$/, '').trim() || '新任务'

  return result
}
