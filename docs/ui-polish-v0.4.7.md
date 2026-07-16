# UI 优化计划 v0.4.7

## 问题清单

### P1: 任务卡片（TaskCard）压扁 + 背景色铺满
- **文件**: `src/components/calendar/TaskCard.vue`
- **目标**：高度减半、背景色用优先级颜色铺满整个条、间距缩小
- **改动**：
  - `padding` 从 `6px var(--spacing-sm)` → `3px var(--spacing-sm)`
  - 手机端 `padding` 从 `8px var(--spacing-sm)` → `4px var(--spacing-sm)`
  - 手机端 `min-height` 从 `40px` → `28px`
  - `.task-card.p-urgent` 等：从 `border-left-color` 改为 `background` 铺满
  - 卡片 `gap` 从 `var(--spacing-xs)` → `2px`

### P2: TaskCard 优先级背景色
- 当前：优先级颜色只做左边框 3px 彩色
- 改为：背景也用优先级颜色（透明度版本）
- 例如：p-urgent → `background: color-mix(in srgb, var(--priority-urgent-bg) 20%, var(--color-surface))`

### P3: TaskItem 删除按钮统一
- **文件**: `src/components/todo/TaskItem.vue`
- TodayView 用 TaskCard（有 X 按钮），InboxView/TodoView 用 TaskItem（可能没 X 按钮）
- 检查 TaskItem 中是否有删除按钮，没有就加上

### P4: 习惯卡片手机端按钮溢出
- **文件**: `src/components/habits/HabitCard.vue`
- 窄屏下按钮被撑出框外
- 缩小按钮尺寸，确保不溢出

### P5: 番茄钟自定义输入框统一
- **文件**: `src/components/pomodoro/PomodoroTimer.vue`
- 自定义框样式和预设按钮不一致
- 去掉"自定义"文字，只保留框

## 实施步骤

| 步 | 文件 | 改动 |
|:--:|------|------|
| 1 | `TaskCard.vue` | 缩小 padding/min-height、背景色铺满、间距缩小 |
| 2 | `TaskItem.vue` | 检查并统一删除按钮 |
| 3 | `HabitCard.vue` | 手机端按钮尺寸缩小，防止溢出 |
| 4 | `PomodoroTimer.vue` | 自定义输入框样式统一 |
| 5 | 版本号 | 0.4.6 → 0.4.7（四个文件） |

## 不影响
- 任何功能逻辑
- 数据流
- 事件绑定
- store/API 调用
