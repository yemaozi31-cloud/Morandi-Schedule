# 最近7天页面重设计划

## 一、逻辑链审查结果

### 当前 UpcomingView 逻辑链

```
用户打开 /upcoming
  ↓
onMounted（无）→ 依赖 taskStore.activeTasks（已在 App.vue 加载）
  ↓
computed: overdueTasks = activeTasks.filter(dueDate < today && pending)
  ↓
computed: nextDays = 未来7天, 每天 filter(dueDate === 该天 && pending)
  ↓
模板渲染: 过期分组 + 7天列表
  ↓
用户点击 select/toggle/delete → Store → DB → UI ← 链路完整
```

**发现的问题**：
1. ✅ CRUD 链路完整，均有 try/catch
2. ✅ 删除有确认对话框
3. ❌ **空的天占用大量空间**：无任务的天仍然渲染整个 day-group（含标题+空状态），7天+过期最多8个分组，页面很长
4. ❌ **视觉层次不足**：所有天使用相同样式，今天/明天没有突出显示
5. ✅ 数据源正确，使用 `taskStore.activeTasks`

### PomodoroTimer 自定义输入检查

- placeholder 应为"自定义"，当前为"自定" ← 需要修复
- 其余逻辑已通过上一轮改为 store 状态驱动 ✅

---

## 二、实施计划

### 修改内容

#### Step 1: 修复 PomodoroTimer placeholder

**文件**: `src/components/pomodoro/PomodoroTimer.vue`  
**修改**: 第27行 `placeholder="自定"` → `placeholder="自定义"`

#### Step 2: 重写 UpcomingView.vue

**设计思路**: 结合 TickTick 的顶部日期条 + 下方选中日任务列表

```
┌─────────────────────────────────────────────┐
│ 最近7天                                      │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 过期 │ 今天 │ 明天 │ 10 │ 11 │ 12 │ 13 │ │  ← 水平日期 Tab 条
│ │  3   │  2   │  1   │  0  │  4  │  0  │ 0 │  │     可横向滚动
│ └──▲──────────────────────────────────────┘ │
│    │                                         │
│ ┌──┴──────────────────────────────────────┐  │
│ │ 今天 6月9日 周一   2项任务              │  │  ← 选中天的任务
│ │ ○ 买菜                            ✕    │  │
│ │ ○ 开会                            ✕    │  │
│ │ ○ 写报告                          ✕    │  │
│ └─────────────────────────────────────────┘  │
│                                             │
│ 过期 Tab 标红、今天 Tab 高亮、空天 Tab 灰色   │
│ 点击 Tab 切换下方任务列表                      │
└─────────────────────────────────────────────┘
```

**关键行为**：
- 默认选中"今天"Tab
- 过期 Tab 始终显示在第一个（红色标红）
- Tab 条可水平滚动（移动端手指滑动，桌面端鼠标滚轮）
- 下方只显示选中天的任务列表
- 空的天 Tab 显示灰色任务数"0"，但不会展开空内容

**数据流**：
```
selectedDate = ref(todayStr)
  ↓
selectedTasks = computed(() =>
  activeTasks.filter(dueDate === selectedDate && pending)
)
  ↓
Tab 条: 过期(overdueTasks) + 7天(nextDays)
  ↓
点击 Tab → selectedDate = day.date → selectedTasks 更新
  ↓
模板渲染 TaskList(:tasks="selectedTasks")
  ↓
select/toggle/delete → Store → DB → Toast ✅
```

---

## 三、验证方式

1. 构建：`npx vite build` 0 错误
2. 诊断：VS Code 0 错误
3. 功能检查：
   - 默认显示"今天"Tab 高亮
   - 过期 Tab 显示过期数量
   - 点击不同 Tab 切换显示对应任务
   - 空的天不展开空内容
   - 移动端 Tab 条可横向滑动
   - Pomodoro 自定义输入显示"自定义"完整文字
4. 记录到 `001-error-memory.md`
