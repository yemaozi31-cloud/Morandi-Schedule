# 导航与功能定义审查 — 实施计划

## 概述

对所有菜单项给出标准定义，对照竞品（Todoist/TickTick/MS To Do/TimeTree）检查功能是否匹配，修复不匹配项。

---

## Phase 1: 当前菜单定义 + 与竞品对比

### 1.1 当前导航结构

```
一级导航（primary）
├── 📥 收件箱   → /inbox    → InboxView.vue
├── ⭐ 今天     → /         → TodoView.vue（viewMode='timeline'）
├── 📅 最近7天  → /upcoming → UpcomingView.vue
├── 📋 所有任务  → /all     → TodoView.vue（viewMode='all'）

二级导航（功能）
├── 📅 日历     → /calendar → CalendarView.vue
├── ▦ 看板      → /kanban   → KanbanView.vue
├── 🏷 标签     → /tags     → TagsView.vue
├── 🎯 习惯     → /habits   → HabitsView.vue

系统
├── ⚙ 设置     → /settings → SettingsView.vue
```

### 1.2 每项的标准定义

| 菜单 | 行业标准含义 | 当前实现 | 是否匹配 |
|------|-------------|---------|---------|
| **收件箱** | GTD 概念：所有未经分类/未指派项目的任务，先收集后整理。Todoist/ TickTick 中新建任务默认进收件箱 | 只显示 `!dueDate && !tagIds.length && pending` → **漏掉了 有dueDate但无tag的任务** | ❌ 过滤条件错误 |
| **今天** | 截止日期=今天的任务 + 过期未完成的任务。Todoist/TickTick 都这么实现 | 使用 `taskStore.todayTasks`，但实际 `/` 和 `/all` 共用同一个 TodoView | ❌ 与"所有任务"共用组件，数据无区别 |
| **最近7天** | 未来 N 天的任务时间线，按天分组。TickTick 付费可看更远，Todoist 叫 Upcoming | 固定7天按天分组 ✅ | ✅ 基本正确 |
| **所有任务** | 全部未删除任务的完整列表 | 使用 `taskStore.activeTasks` | ✅ 基本正确 |
| **日历** | 月/周/日视图展示任务 | 有 Month/Week/Day + MobileDayList | ✅ |
| **看板** | 按状态/优先级/标签分列的拖拽面板 | 按 status/priority/tag 分组，支持拖拽 | ✅ |
| **标签** | 标签 CRUD + 按标签统计任务数 | CRUD + 任务计数 | ✅ |
| **习惯** | 打卡追踪 + 热力图 + 连续天数 | 打卡 + 热力图 + 连续 | ✅ |
| **番茄钟** | 专注计时器 | 只在 Today 页右侧面板 ✅ | ⚠️ 应独立成页 |
| **设置** | 主题/数据/关于 | 主题切换 + 导入导出 + 关于 | ✅ |

### 1.3 发现的关键不匹配

| # | 问题 | 级别 | 详情 |
|---|------|------|------|
| 1 | **收件箱过滤条件错误** | 🔴 P1 | 当前排除有 dueDate 的任务，但行业标准中收件箱任务可以有截止日期 |
| 2 | **今天/所有任务共用组件** | 🔴 P1 | `/` 和 `/all` 都渲染 TodoView，但今天应只显示当日+过期任务 |
| 3 | **番茄钟不是独立页面** | 🟡 P2 | TickTick 中番茄钟是独立导航入口，我们嵌在右面板 |
| 4 | **缺少统计页面** | 🟡 P2 | Todoist 有 Productivity，TickTick 有 Statistics |
| 5 | **最近7天缺少过期任务** | 🟡 P2 | 过期任务应显示在第0天或独立分组（参照 Todoist Upcoming） |
| 6 | **Mobile 导航缺少"最近7天"** | 🟢 P3 | Mobile 底部 Tab 没有 upcoming |

---

## Phase 2: 实施步骤

### Step 1: 修复收件箱过滤条件

**文件**: [InboxView.vue](file:///d:/Create/Schedule/src/views/InboxView.vue#L54-L56)

**当前**:
```typescript
const inboxTasks = computed(() =>
  taskStore.activeTasks.filter(t => !t.dueDate && !t.tagIds.length && t.status === 'pending')
)
```

**问题**: 排除了有 dueDate 的任务。行业标准的"Inbox" = 未分类/未指派项目的任务，可以带截止日期。

**修正**: 收件箱应显示所有 `status === 'pending'` 且没有 tag 的任务（不论是否有 dueDate）。等有了"项目/清单"概念后，再加"未指派项目"条件。

```typescript
const inboxTasks = computed(() =>
  taskStore.activeTasks.filter(t => !t.tagIds.length && t.status === 'pending')
)
```

### Step 2: 分离"今天"和"所有任务"视图

**文件**: [router/index.ts](file:///d:/Create/Schedule/src/router/index.ts#L4-L28), 创建 `TodayView.vue`

**当前**: `/` 和 `/all` 都用 TodoView.vue，数据无区别。

**修正**: 
- 创建 `TodayView.vue`，专门显示今天+过期任务
- `/all` 继续使用 TodoView.vue 显示全部
- TodoView.vue 简化为只有"全部视图"（移除 viewMode 切换？不，viewMode 切换留在全部视图中）

**TodayView.vue** 应包含:
- 今日任务列表（dueDate === today, pending）
- 过期任务列表（dueDate < today, pending）
- 快捷添加栏
- 右侧面板（番茄钟 + 今日习惯）

**TodoView.vue** （所有任务）应包含:
- 所有 activeTasks
- Toolbar + SmartFilter + 批量操作
- 快捷添加栏
- viewMode 切换（全部/矩阵/时间线）

### Step 3: 番茄钟提升为独立页面

**文件**: 创建 `PomodoroView.vue`，添加路由 `/pomodoro`，添加到 NAV_ITEMS

**当前**: 番茄钟只在 Today 页面右侧面板。

**修正**: 
- 创建独立 Pomodoro 页面（全屏番茄钟专注体验）
- Today 页面保留小尺寸番茄钟作为快捷入口
- 导航栏添加 "🍅 番茄钟" 到功能区域

### Step 4: UpcomingView 添加过期任务分组

**文件**: [UpcomingView.vue](file:///d:/Create/Schedule/src/views/UpcomingView.vue#L54-L76)

**当前**: 只显示未来7天的 pending 任务。

**修正**: 在第0天之前添加"已过期"分组，显示所有 `dueDate < today && pending` 的任务。

### Step 5: 修正 Today/Timeline 过滤逻辑

**文件**: [taskStore.ts](file:///d:/Create/Schedule/src/stores/taskStore.ts#L29-L35)

**当前**: `todayTasks` 包含 `dueDate === today || dueDate < today` → 即今天+过期。

**问题**: 这是"今天视图"的逻辑，但命名容易混淆。

**修正**: 保持计算属性名称但确认调用方只用对地方。

### Step 6: 添加自动纠错扫描

每次修改完成后扫描:
1. `npm run build` 确认编译无错
2. TS 类型检查
3. 记录到 `001-error-memory.md`

---

## Phase 3: 验证方式

1. 收件箱：创建一个带日期的任务（如"明天买菜"），应出现在收件箱
2. 今天页：只显示今天+过期的任务，不应显示全部
3. 所有任务页：显示全部任务
4. 番茄钟：独立页面可访问
5. 最近7天：过期任务出现在顶部"已过期"分组
6. 构建：`npx vite build` 0 错误

---

## Assumptions & Decisions

- 应用定位参照 **TickTick**（全功能个人任务管理 + 番茄钟 + 习惯追踪）
- 不引入"项目/清单"概念（保持扁平结构，用标签替代分类）
- 不添加用户认证/云端同步（保持纯本地）
