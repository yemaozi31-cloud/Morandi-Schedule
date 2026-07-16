# 修复计划 v0.4.8

## 问题清单

### 1. 手机端 TaskCard 没变扁
- **原因**: 手机端 @media 中 `padding: 4px 6px; min-height: 28px;` 可能没覆盖到，或 TaskCard 在手机上被其他父容器 CSS 影响了
- **修复**: 检查 @media 优先级，加 `!important` 或提高选择器特异性

### 2. 艾森豪威尔矩阵拖拽失效
- **原因**: 改用 TaskCard 后，未监听 `@drag-start` 和 `@drag-end` 事件，`draggedTaskId` 始终为 null
- **修复**: 在 EisenhowerMatrix 模板中给 TaskCard 加上 `@drag-start="onDragStart"` 和 `@drag-end="onDragEnd"`

### 3. 月视图已完成任务没划线
- **原因**: MonthView 中已完成任务没有应用 `.completed` 样式
- **修复**: MonthView 中已完成任务的 CSS 加上灰色+删除线

### 4. 版本号 0.4.7 → 0.4.8

## 实施步骤

| 步 | 文件 | 改动 |
|:--:|------|------|
| 1 | `TaskCard.vue` | 手机端 @media + `!important` 保底 |
| 2 | `EisenhowerMatrix.vue` | 添加 `@drag-start` 和 `@drag-end` 监听 |
| 3 | `MonthView.vue` | 已完成任务样式（灰色+删除线） |
| 4 | 版本号 | 0.4.7 → 0.4.8 |
