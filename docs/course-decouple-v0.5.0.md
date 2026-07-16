# 课程与任务解耦计划 v0.5.0

## 目标
课程只出现在手机端周视图，其他所有视图不显示课程

## 数据流
```
activeTasks（全部任务）
  ├── regularTasks（filter !isCourse → 其他所有视图）
  └── activeTasks（原样 → 周视图）
```

## 改动清单

### 1. taskStore.ts — 新增 regularTasks
新增 computed：
```typescript
const regularTasks = computed(() => activeTasks.value.filter(t => !t.isCourse))
```

以下所有 computed 从 `activeTasks.value` 改为 `regularTasks.value`：
- `todayTasks`（今日视图不过滤课程）
- `pendingTasks`（待办计数）
- `filteredTasks`（筛选/搜索/排序）
- `eisenhowerTasks`（艾森豪威尔矩阵）

### 2. CalendarView.vue — 分视图传任务
```html
<!-- 周视图：包含课程 -->
<WeekView :tasks="taskStore.activeTasks" ... />
<!-- 月视图/日视图：不包含课程 -->
<MonthView :tasks="taskStore.regularTasks" ... />
<DayTimeline :tasks="dayTasks" ... />
```
同时 `dayTasks` computed 需要基于 `regularTasks`。

### 3. 版本号 0.4.9 → 0.5.0
四个文件同步

### 4. 不影响
- 导入课表功能
- 删除课表功能
- 周视图课程渲染逻辑
- 周视图溢出处理（...）
- WeekView props 不变（仍用 `activeTasks`）
