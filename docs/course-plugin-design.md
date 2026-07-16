# 课表插件设计方案 v0.1

## 调研结论

### 开源 ICS 解析库

| 库 | 适用环境 | 特点 |
|---|---------|------|
| **ical.js** (Mozilla) | 浏览器 + Node | 最成熟，支持 RRULE/时区/EXDATE，RFC 5545 完整实现 |
| **node-ical** | Node | 功能丰富，但依赖 Node 原生模块 |
| **cal-parser** | 浏览器 + Node | 轻量，无依赖，功能基础 |

**推荐：ical.js** — 浏览器兼容、功能最全、Mozilla 维护

### 竞品方案参考

| APP | 导入方式 | 课表存储 | 显示方案 |
|-----|---------|---------|---------|
| 星链课表 | 教务系统 WebView 爬取 | 本地 SQLite | 独立周视图 |
| 拾光课程表 | 教务系统爬取 + 脚本 | 本地数据库 | 周视图 + 日视图 |
| Wakeup | 教务导出 ICS | ICS 文件 | 系统日历 |
| **我们的方案** | **ICS 导入 + 手动录入** | **Task 扩展字段** | **周视图内嵌** |

## 数据模型

### Task 新增字段（最小改动）

```typescript
// 在现有 Task 类型中追加
interface Task {
  // ...现有字段
  isCourse?: boolean       // 是否是课程
  courseDay?: number       // 周几：0=周日, 1=周一...6=周六
  courseStartTime?: string // 上课时间 "08:00"
  courseEndTime?: string   // 下课时间 "09:35"
  courseLocation?: string  // 教室
  courseValidFrom?: string // 生效日期 "2026-09-01"
  courseValidTo?: string   // 失效日期 "2027-01-15"
  courseColor?: string     // 课程颜色标记
}
```

### ICS → 课程映射

```
ICS 字段                    →  课程字段
──────────────────────────────────────────────
SUMMARY                    →  title
DTSTART;TZID=Asia/Shanghai →  courseDay + courseStartTime + courseValidFrom
DTEND                      →  courseEndTime
RRULE:FREQ=WEEKLY;UNTIL=   →  courseValidTo
LOCATION                   →  courseLocation
DESCRIPTION                →  description
```

## 周视图渲染优先级（核心改动）

```
一个时间格内的显示优先级：
┌──────────────────────┐
│  🥇 课程块           │ ← 固定位置，始终显示，不可拖动
│  🥈 有时段任务       │ ← 在课程空隙中排列
│  🥉 无时段/全天任务   │ ← 顶部/底部显示
│  📌 溢出 → 小圆点    │ ← 放不下时用 ··· 代替，点击展开全部
└──────────────────────┘
```

### 具体规则

1. **课程永远优先**：一个时间格内，课程占固定位置，其他任务绕着走
2. **任务压缩**：如果课程+有时段任务超过格子高度，多出来的缩成小圆点 `···`
3. **点击展开**：点击小圆点或溢出区域，弹出该时段所有任务+课程的列表
4. **课程不可勾选**：课程块没有打勾按钮，只有教室+课程名
5. **普通任务不变**：有时间任务仍可拖动，无时间任务在顶部折叠

```
┌──────────────────────────────────────────────┐
│              用户操作层                        │
│                                               │
│  ① 点击"导入课表" → 选择 .ics 文件             │
│  ② 周视图长按 → "添加课程" → 手动填写          │
│  ③ 点击课程块 → 编辑/删除                     │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│             课表导入引擎                        │
│                                               │
│  ICS 文件 → ical.js 解析 → 课程数据            │
│           → isCourse 任务写入 IndexedDB        │
│           → 重复检测（按 title + time）         │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│             周视图渲染核心                      │
│                                               │
│  WeekView 中识别 isCourse 任务                  │
│  课程块：不可勾选、固定大小、显示教室            │
│  普通任务：可勾选、可拖动                       │
└──────────────────────────────────────────────┘
```

## 实施步骤

### Step 1: 安装依赖 + 数据模型
```
npm install ical.js
```
- `src/types/task.ts` — 添加课程字段
- `src/utils/constants.ts` — 课程相关常量

### Step 2: ICS 解析器
新建 `src/services/courseImporter.ts`
- `parseICSFile(file: File): Promise<CourseTask[]>` — 解析 ICS 文件
- `detectDuplicate(courses, existing): CourseTask[]` — 去重检测
- `importCourses(courses): Promise<void>` — 写入 IndexedDB

### Step 3: 导入 UI
- 设置页添加"导入课表"入口
- 文件选择器 → 选择 .ics 文件
- 解析后预览 → 确认导入 → 批量创建 isCourse 任务

### Step 4: 周视图改造（核心）
文件: `src/components/calendar/WeekView.vue`

- 每个时间格按优先级渲染：课程 > 有时间任务 > 无时间任务
- 课程块：固定位置、无打勾、显示教室 `[教室名] 课程名`
- 溢出处理：超出部分缩成小圆点 `···`，点击弹出该时段全部列表
- 任务依然可拖动，但不可拖到课程的位置上

### Step 5: 添加课程入口
文件: `src/views/CalendarView.vue`

- 周视图工具栏添加"添加课程"按钮（仅在周视图显示）
- 弹出表单：课程名、时间、教室、生效日期、失效日期
- 创建 `isCourse: true` 的任务

### Step 6: 课程编辑/删除
- 点击课程块 → 弹窗编辑/删除
- 编辑：课程名、时间、教室
- 删除：删除整条 `isCourse` 任务（非软删除）

## 数据流

```
用户选择 .ics 文件
  ↓
FileReader 读取文本
  ↓
ical.js 解析 → 提取 VEVENT 条目
  ↓
转换成 CourseTask[]（逐条映射）
  ↓
去重检测（和已有 isCourse 任务比较）
  ↓
展示预览列表（用户确认）
  ↓
批量 taskStore.createTask({ ...taskData, isCourse: true, ... })
  ↓
周视图自动刷新显示课程块
```

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `package.json` | 添加 `ical.js` 依赖 |
| `src/types/task.ts` | 添加课程字段 |
| `src/services/courseImporter.ts` | **新建** ICS 解析 + 导入引擎 |
| `src/views/SettingsView.vue` | 添加"导入课表"入口 |
| `src/components/calendar/WeekView.vue` | 课程块渲染（不勾选+教室） |
| `src/components/calendar/TaskCard.vue` | 课程模式下隐藏打勾按钮 |
