# 完整逻辑链·功能链·因果链

## 一、全局数据流骨架

```
用户操作（点击/输入/拖拽）
    │
    ▼
视图层 (View)
    │ emit / router-link
    ▼
组件层 (Component)     ← 含确认弹窗、Toast
    │ 调用 Store 方法
    ▼
状态层 (Pinia Store)   ← 内存 Map
    │ db.set / db.get / db.remove
    ▼
持久层 (IndexedDB)     ← 6 个 objectStore
    │ 异步回调
    ▼
Store 更新内存 Map     ← computed 响应式触发
    │
    ▼
视图层自动重渲染
    │
    ▼
用户看到结果 + Toast
```

---

## 二、全功能互联拓扑

```
                        ╔═══════════════════════╗
                        ║     IndexedDB 6 库    ║
                        ║  ┌─────┐             ║
                        ║  │tasks│←── 中心数据  ║
                        ║  ├─────┤             ║
                        ║  │tags │←── 被 tasks 引用║
                        ║  ├─────┤             ║
                        ║  │habits│            ║
                        ║  ├─────┤             ║
                        ║  │habitCheckIns│     ║
                        ║  ├─────┤             ║
                        ║  │settings│ ←── 未使用 ║
                        ║  ├─────┤             ║
                        ║  │pomodoroSessions│  ║
                        ║  └─────┘             ║
                        ╚═══════════════════════╝
                               │
          ┌────────────────────┼──────────────────────┐
          ▼                    ▼                      ▼
   ╔══════════════╗   ╔══════════════╗   ╔══════════════╗
   ║  taskStore   ║   ║  tagStore    ║   ║  habitStore  ║
   ╚══════════════╝   ╚══════════════╝   ╚══════════════╝
          │                  │                    │
          │    ┌─────────────┘                    │
          │    │         tagIds[] 引用             │
          │    │                                  │
          ▼    ▼                                  ▼
   ╔════════════════════════════╗   ╔════════════════════╗
   ║      任务相关视图          ║   ║    习惯相关视图    ║
   ║                            ║   ║                    ║
   ║  TodayView                 ║   ║  TodayView 右面板   ║
   ║    ├─ TimelineList         ║   ║    └─ HabitCard    ║
   ║    └─ 右面板(Pomodoro区)   ║   ║                    ║
   ║                            ║   ║  HabitsView         ║
   ║  InboxView                 ║   ║    ├─ HabitCard     ║
   ║    └─ TaskList             ║   ║    └─ HabitHeatmap  ║
   ║                            ║   ║                    ║
   ║  UpcomingView (本周)        ║   ║                    ║
   ║    ├─ 周导航头 (←/→/今天)   ║   ║                    ║
   ║    ├─ QuickAddBar            ║   ║                    ║
   ║    └─ WeekView               ║   ║                    ║
   ║         ├─ spanning-section  ║   ║                    ║
   ║         └─ week-columns-row  ║   ║                    ║
   ║  CalendarView              ║   ║                    ║
   ║    ├─ CalendarHeader       ║   ║                    ║
   ║    │  (prev/next/today     ║   ║                    ║
   ║    │   + 月/周/日切换)     ║   ║                    ║
   ║    ├─ MonthView            ║   ║                    ║
   ║    ├─ WeekView             ║   ║                    ║
   ║    ├─ DayView              ║   ║                    ║
   ║    └─ TaskFormModal        ║   ║                    ║
   ║                            ║   ║                    ║
   ║  KanbanView                ║   ║                    ║
   ║    └─ KanbanColumns        ║   ║                    ║
   ║                            ║   ║                    ║
   ║  TodoView (所有任务)       ║   ║                    ║
   ║    ├─ SmartFilter          ║   ║                    ║
   ║    ├─ TaskList             ║   ║                    ║
   ║    └─ EisenhowerMatrix     ║   ║                    ║
   ║                            ║   ║                    ║
   ║  FloatingView(悬浮窗)      ║   ║                    ║
   ╚════════════════════════════╝   ╚════════════════════╝

   ╔══════════════╗   ╔══════════════════════════════╗
   ║ pomodoroStore║   ║       settingsStore          ║
   ╚══════════════╝   ╚══════════════════════════════╝
          │                       │
          ▼                       ▼
   ╔════════════════════╗   ╔════════════════════════╗
   ║  PomodoroView      ║   ║  SettingsView           ║
   ║    └─ PomodoroTimer║   ║    ├─ ThemeEditor       ║
   ║                    ║   ║    └─ DataManager       ║
   ║  TodayView 紧凑按钮 ║   ║       ├─ 导出           ║
   ║                    ║   ║       ├─ 导入           ║
   ╚════════════════════╝   ║       └─ 清空           ║
                             ╚════════════════════════╝
```

---

## 三、核心因果链（增删改的连锁反应）

### 3.1 创建一条任务 → 影响 6 个视图

```
taskStore.createTask({ title, dueDate, priority, tagIds })
     │
     ├──→ db.set('tasks', task)          写入 DB
     ├──→ tasks Map.set(task.id, task)   更新内存
     │
     ├──→ TodayView.todayTasks
     │        如果 dueDate === today → 过期/今天列表新增 ✅
     │        否则 → 不影响 ✅
     │
     ├──→ InboxView.inboxTasks
     │        如果 !tagIds.length → 收件箱新增 ✅
     │
     ├──→ UpcomingView.nextDays
     │        如果 dueDate 在未来7天内 → 对应天分组新增 ✅
     │
     ├──→ CalendarView 对应日期
     │        匹配日期 → 显示 ✅
     │
     ├──→ KanbanView 对应列
     │        根据 status 分组 → 对应列新增 ✅
     │
     ├──→ FloatingView 今日列表
     │        如果 dueDate === today → 新增 ✅
     │
     └──→ Toast "任务已创建"          用户反馈 ✅
```

### 3.2 删除一个标签 → ✅ 已修复（C1）

```
tagStore.deleteTag('tag-xxx')
     │
     ├──→ db.remove('tags', 'tag-xxx')       DB 删除 ✅
     ├──→ tags Map.delete('tag-xxx')          内存删除 ✅
     ├──→ TagsView 列表消失                   ✅
     │
     ├──→ 所有 tagIds 包含 'tag-xxx' 的任务
     │        ├──→ tagIds 中移除该 id          ✅ 自动清理
     │        ├──→ db.set 更新每个受影响的任务  ✅
     │        ├──→ TagBadge 正常显示           ✅
     │        ├──→ Kanban 按标签分组正常       ✅
     │        └──→ SmartFilter 标签选项: 消失  ✅ (可接受)
     │
     └──→ 任务 tagIds 同步清理完成             ✅ 因果链畅通
```

### 3.3 打勾完成任务 → 影响 5 个视图

```
taskStore.toggleComplete(taskId)
     │
     ├──→ 乐观更新: task.status = 'completed'   内存先变 ✅
     ├──→ db.set('tasks', updatedTask)          持久化
     │
     ├──→ TodayView: 任务从待办列表消失          ✅
     ├──→ InboxView: 任务消失                    ✅
     ├──→ UpcomingView: 从当天分组消失           ✅
     ├──→ CalendarView: 从当天消失               ✅
     ├──→ KanbanView: 移到"已完成"列             ✅
     │
     └──→ db.set 失败 → status 回滚到 'pending'  ✅
     └──→ Toast 反馈                              ✅
```

### 3.4 习惯打卡 → 影响 2 个视图 + 1 个组件

```
habitStore.checkIn(habitId, value)
     │
     ├──→ 今日记录存在 → value 累加                ✅
     ├──→ 今日记录不存在 → 新建 checkIn            ✅
     │
     ├──→ HabitCard.todayValue 更新               ✅
     │     ├──→ 进度条 progressPercent 更新        ✅
     │     └──→ isCompleted 判定 → 按钮变灰        ✅
     │
     ├──→ TodayView 右侧习惯卡片同步              ✅（如已展开）
     ├──→ HabitsView 紧凑行圆点变色               ✅
     └──→ HabitHeatmap 当前月格子变色             ✅
     └──→ Toast "打卡成功"                         ✅
```

### 3.5 切换主题 → ✅ 已修复（C2）

```
settingsStore.toggleTheme()
     │
     ├──→ data-theme="dark"                       ✅ 生效
     ├──→ CSS 变量切换 → 全局颜色变化             ✅
     ├──→ db.set('settings', { id: 'theme' })      ✅ 持久化
     │
     └──→ 刷新页面
           ├──→ loadSettings() 从 DB 恢复          ✅
           ├──→ data-theme 保持 "dark"             ✅
           └──→ IndexedDB settings store 已使用    ✅
```

### 3.6 番茄钟完成 → 影响 2 处

```
pomodoroStore.startTimer(minutes)
     │
     ├──→ remainingSeconds 开始倒计时              ✅
     ├──→ isRunning = true → 按钮切换              ✅
     │
     └──→ 倒计时结束 → completeSession()
           ├──→ db.set('pomodoroSessions', session) ✅
           ├──→ todayStats.count +1                 ✅
           └──→ 进入休息模式                        ✅
```

### 3.7 导入数据 → ✅ 已修复（C3）

```
DataManager 导入 JSON
     │
     ├──→ 读取 JSON 文件                          ✅
     ├──→ 逐 store 逐条 db.set 写入                ✅
     │
     └──→ 写入完成后 location.reload()             ✅
           └──→ App.vue onMounted 重新加载所有 stores ✅
```

### 3.8 日历周视图导航 → ✅ 已补全

```
CalendarHeader 点击 prev/next/today
     │
     ├──→ CalendarView.goPrev/goNext/goToday 按当前视图类型调度
     │         │
     │         ├──→ currentView === 'week'
     │         │     ├──→ goPrev: addWeeks(currentDate, -1)   ← 上周
     │         │     ├──→ goNext: addWeeks(currentDate, +1)   ← 下周
     │         │     └──→ goToday: currentDate = getTodayStr()
     │         │
     │         ├──→ currentView === 'month'
     │         │     ├──→ goPrev: addMonths(currentDate, -1)  ← 上月
     │         │     └──→ goNext: addMonths(currentDate, +1)  ← 下月
     │         │
     │         └──→ currentView === 'day'
     │               ├──→ goPrev: addDays(currentDate, -1)    ← 昨天
     │               └──→ goNext: addDays(currentDate, +1)    ← 明天
     │
     ├──→ currentDate ref 更新 → 触发 WeekView 重新渲染
     │         │
     │         ├──→ weekDays 根据 startOfWeek(currentDate) 重新计算
     │         │     └──→ 7 天日期范围更新 ✅
     │         ├──→ spanningTasksInWeek 重新筛选 ✅
     │         ├──→ getRegularTasksForDate → 任务卡片更新 ✅
     │         └──→ getTasksForDate (手机端) → 任务列表更新 ✅
     │
     ├──→ headerTitle 更新
     │         └──→ 显示 "6月1日 - 6月7日" 格式周范围 ✅
     │
     └──→ 用户可直观看到前后周的任务分布 ✅
```

### 3.9 日历视图切换 → ✅

```
CalendarHeader 点击 月/周/日 按钮
     │
     ├──→ switchView(view) → currentView = 'week'/'month'/'day'
     │
     ├──→ CalendarView v-if/v-else-if 切换渲染组件
     │     ├──→ MonthView   (currentDate, taskMap, tasks)
     │     ├──→ WeekView    (currentDate, tasks)
     │     └──→ DayView     (selectedDay || currentDate, dayTasks)
     │
     ├──→ headerTitle 按 view 类型格式化标题 ✅
     └──→ Transition 切换动画 ✅
```

### 3.10 本周页导航同步 → ✅

```
UpcomingView 点击 ←/→/今天 按钮
     │
     ├──→ goPrev:  addWeeks(currentDate, -1) ← 上周
     ├──→ goNext:  addWeeks(currentDate, +1) ← 下周
     ├──→ goToday: currentDate = getTodayStr()
     │
     ├──→ headerTitle 更新（显示 "6月1日 - 7日"）
     ├──→ WeekView.props.currentDate 更新
     │     ├──→ weekDays 重新计算 ✅
     │     ├──→ spanningTasksInWeek 重新筛选 ✅
     │     └──→ getRegularTasksForDate → 任务卡片更新 ✅
     └──→ 用户可在"本周"页浏览任意周 ✅
```

---

## 四、已断裂的因果链（待修复清单）

| ID | 触发 | 断点 | 影响 | 修复方案 | 状态 |
|----|------|------|------|---------|------|
| C1 | 删除标签 | 任务的 tagIds 未清理 | TagBadge 破损 + Kanban 列名乱码 | deleteTag 末尾: 遍历 tasks 移除 tagId | ✅ 已修复 |
| C2 | 主题切换 | 未写入 DB | 刷新后丢失 | settingsStore 对接 db.set/db.get | ✅ 已修复 |
| C3 | 导入数据 | 内存不刷新 | 导入后看不到变化 | 导入后写入 DB + reload | ✅ 已修复 |
| C4 | 所有 Store 写入 | 无 try/catch | DB 失败静默 | 补全 try/catch + console.error | ✅ 已修复 |
| C5 | 所有 View toggle | catch 为空 | 失败无反馈 | 补全 catch + Toast | ✅ 已修复 |
| C6 | 创建习惯 | 未 await | 弹窗关闭可能未写入 | await + try/catch + Toast | ✅ 已修复 |
| C7 | Kanban 拖拽 | 无 error 处理 | 失败用户无感知 | 补全 try/catch + Toast | ✅ 已修复 |
| C8 | FloatingView 添加 | 无 try/catch | 虚假成功 Toast | 补全 try/catch | ✅ 已修复 |
| C9 | 批量操作 | 部分失败无回滚 | 虚假成功 Toast | 逐项追踪 success/fail | ✅ 已修复 |
| C10 | 键盘快捷键 | 仅在 TodayView | 其他页面失效 | 移到 App.vue 全局注册 | ✅ 已修复 |
| C11 | 清空数据 | 内存不刷新 | 清空后界面不变 | 已有 location.reload() | ✅ 已修复 |
| C12 | undoService | 未接入 UI | 死代码 | 删除文件 | ✅ 已移除 |

---

## 五、验证策略

每次修改一条因果链后，验证整个回路：

```
改 C1 (删除标签清理 tagIds):
  → 删除标签
  → 检查任务 TagBadge 是否正常显示
  → 检查 Kanban 按标签分组列名
  → 运行 build 确认无类型错误
  → 记录到 error-memory

改 C4 (补全 try/catch):
  → 每个 store 方法挨个过
  → 每个 view 的 handleXxx 挨个过
  → build 0 error
  → 记录到 error-memory
```
