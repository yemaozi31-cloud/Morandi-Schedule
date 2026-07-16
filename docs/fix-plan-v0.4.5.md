# 修复计划 v0.4.5

## 问题清单

### P0: 艾森豪威尔矩阵点击未解耦
- **文件**: `src/components/today/EisenhowerMatrix.vue`
- **症状**: 点击任务框直接触发 toggleComplete，不弹出详情
- **原因**: 自实现了任务卡片，未复用 TaskCard 组件
- **修复**: 改用 TaskCard 组件，保持和 TodayView/CalendarView 一致的行为

### P0: 删除按钮点了无反应
- **文件**: 所有视图 + MorandiSelect.vue
- **症状**: 点击删除X按钮，没有任何反应，确认弹窗不弹出
- **原因**: MorandiSelect overlay(z-index:9000) 未正确销毁，遮挡了按钮
- **修复**: MorandiSelect 关闭时彻底销毁 overlay

### P1: 打勾完成后所有视图统一显示灰色+删除线
- **文件**: DayView.vue / WeekView.vue / MonthView.vue / InboxView.vue（已修复）
- EisenhowerMatrix（本轮修复）

## 实施步骤

### Step 1: EisenhowerMatrix 改用 TaskCard
- 替换自建卡片模板复用 `<TaskCard>`
- @toggle → toggleComplete
- @select → popup TaskDetailModal
- @delete → confirm dialog → deleteTask

### Step 2: MorandiSelect overlay 安全销毁
- close() 加 `open.value = false`
- 关闭后 300ms 确保 DOM 清理

### Step 3: 版本号 0.4.4 → 0.4.5
- package.json / tauri.conf.json / Cargo.toml / SettingsView.vue

## 数据流

EisenhowerMatrix 修复后：
```
用户点击 Eisenhower 任务框
  ├── 小圈 → emit('toggle', id) → TodayView.handleToggle → taskStore.toggleComplete
  ├── 本体 → emit('select', id) → TodayView.openEditTask → uiStore.openDetail
  └── 删除 → emit('delete', id) → TodayView.handleDelete → showConfirm → deleteTask
```

删除按钮修复后：
```
点击X → emit('delete', id) → handleDelete → console.log('删除点击')
  → window.__dialog.warning (或原生 confirm 降级)
  → onPositiveClick → taskStore.deleteTask(id)
  → db.set → tasks.value.set → UI 更新
```
