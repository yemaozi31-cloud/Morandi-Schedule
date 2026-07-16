# 课表插件 - 接口规范 & 数据流

## 1. 数据模型（Task 扩展字段）

```typescript
// src/types/task.ts 追加
export interface Task {
  // ...现有字段
  isCourse?: boolean         // 是否是课程
  courseDay?: number          // 周几: 1=周一..5=周五
  courseStartTime?: string    // 上课时间 "08:00"
  courseEndTime?: string      // 下课时间 "09:35"
  courseLocation?: string     // 教室 "A301"
  courseValidFrom?: string    // 生效日期 "2026-09-01"
  courseValidTo?: string      // 失效日期 "2027-01-15"
}
```

## 2. ICS 解析器接口

```typescript
// src/services/courseImporter.ts

interface ImportedCourse {
  title: string
  dayOfWeek: number          // 1-5
  startTime: string          // "08:00"
  endTime: string            // "09:35"
  location: string
  validFrom: string          // "2026-09-01"
  validTo: string            // "2027-01-15"
  description?: string
}

// 解析 ICS 文件内容 → 课程列表
function parseICS(icsContent: string): ImportedCourse[]

// 批量导入课程 → 创建 isCourse 任务
async function importCourses(courses: ImportedCourse[]): Promise<{ success: number; skipped: number }>
```

## 3. 数据流

```
用户选择 .ics 文件
  ↓
FileReader.readAsText() → icsContent (string)
  ↓
parseICS(icsContent) → ImportedCourse[]
  ↓
展示预览列表（用户确认）
  ↓
importCourses(courses) → 逐条 taskStore.createTask({
    title: course.title,
    isCourse: true,
    dueDate: null,
    dueTime: null,
    courseDay: course.dayOfWeek,
    courseStartTime: course.startTime,
    courseEndTime: course.endTime,
    courseLocation: course.location,
    courseValidFrom: course.validFrom,
    courseValidTo: course.validTo,
    recurring: { type: 'weekly' }
  })
  ↓
IndexedDB 存储 → 周视图自动刷新
```

## 4. 周视图渲染规则

```
WeekView 每个时间格的渲染顺序：

for each day (周一~周五):
  for each time slot (08:00~21:00):
    1. 筛选该时段的 isCourse 任务 → 渲染课程块（无勾选、固定）
    2. 筛选该时段的普通任务 → 渲染任务块（可勾选、可拖动）
    3. 如果总数超过 3 个 → 多余的缩成 [···] 小圆点
    4. 点击 [···] → 弹出该时段全部列表
```

## 5. ICS → 课程字段映射

| ICS 字段 | 解析逻辑 | 课程字段 |
|---------|---------|---------|
| `SUMMARY` | 直接取值 | `title` |
| `DTSTART` | 取 weekday → `courseDay`，取 time → `courseStartTime`，取 date → `validFrom` |
| `DTEND` | 取 time | `courseEndTime` |
| `RRULE:UNTIL=` | 取截止日期 | `courseValidTo` |
| `LOCATION` | 直接取值 | `courseLocation` |
| `DESCRIPTION` | 直接取值 | `description`（可选） |

## 6. 涉及文件清单

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `package.json` | 添加 `ical.js` 依赖 | P0 |
| `src/types/task.ts` | Task 接口添加课程字段 | P0 |
| `src/services/courseImporter.ts` | **新建** ICS 解析 + 导入引擎 | P0 |
| `src/views/SettingsView.vue` | 添加"导入课表"入口 | P0 |
| `src/components/calendar/WeekView.vue` | 课程块渲染 + 溢出小圆点 | P0 |
| `src/views/CalendarView.vue` | 周视图菜单添加"添加课程" | P1 |
| `src/components/todo/TaskFormModal.vue` | 课程表单（教室/起止日期） | P1 |
