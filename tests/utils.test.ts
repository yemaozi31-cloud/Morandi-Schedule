import { describe, it, expect } from 'vitest'

describe('nlpParser', () => {
  it('should parse empty input', async () => {
    const { nlpParse } = await import('@/utils/nlpParser')
    const result = nlpParse('')
    expect(result).toEqual({})
  })

  it('should parse "明天下午3点买菜"', async () => {
    const { nlpParse } = await import('@/utils/nlpParser')
    const result = nlpParse('明天下午3点买菜')
    expect(result.title).toBe('买菜')
    expect(result.dueTime).toBe('15:00')
    expect(result.dueDate).toBeDefined()
  })

  it('should parse priority syntax p1', async () => {
    const { nlpParse } = await import('@/utils/nlpParser')
    const result = nlpParse('p1 紧急任务')
    expect(result.priority).toBe('urgent')
    expect(result.title).toBe('紧急任务')
  })

  it('should parse recurring "每天"', async () => {
    const { nlpParse } = await import('@/utils/nlpParser')
    const result = nlpParse('每天 跑步')
    expect(result.recurring).toBe('daily')
    expect(result.title).toBe('跑步')
  })

  it('should parse tag syntax', async () => {
    const { nlpParse } = await import('@/utils/nlpParser')
    const result = nlpParse('#工作 写报告')
    expect(result.tagName).toBe('工作')
    expect(result.title).toBe('写报告')
  })
})

describe('date utils', () => {
  it('getTodayStr should return yyyy-MM-dd format', async () => {
    const { getTodayStr } = await import('@/utils/date')
    const today = getTodayStr()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formatDate should format correctly', async () => {
    const { formatDate } = await import('@/utils/date')
    const result = formatDate('2026-06-08', 'yyyy年M月d日')
    expect(result).toBe('2026年6月8日')
  })
})
