# 全量问题修复计划

## P0 — 影响使用的Bug

### Bug 1: 删除弹窗显示"删除失败" (TaskDetailModal)
**原因**: `handleDelete()` 在 dialog 的 `onPositiveClick` 回调中才取 `task.value!.id`，此时可能已变化
**修复**: 在调用 dialog 之前先把 id 存到局部变量
```typescript
// 改前
function handleDelete() {
  if (!task.value) return
  window.__dialog?.warning({
    onPositiveClick: async () => {
      await taskStore.deleteTask(task.value!.id)  // task.value 可能已变
    }
  })
}

// 改后
function handleDelete() {
  if (!task.value) return
  const id = task.value.id  // 先存下来
  window.__dialog?.warning({
    onPositiveClick: async () => {
      await taskStore.deleteTask(id)
    }
  })
}
```

### Bug 2: 退出登录清空密码 (SettingsView)
**原因**: handleLogout 清空了 webdavPassword 和 privateKey
**修复**: 只清除 nickname 登录态，不清密码
```typescript
// 改前
settingsStore.syncConfig.webdavPassword = ''
settingsStore.syncConfig.privateKey = ''
settingsStore.syncConfig.nickname = ''
settingsStore.saveSyncConfig()

// 改后
settingsStore.syncConfig.nickname = ''
settingsStore.saveSyncConfig()
```

---

## P1 — UI优化

### 优化 3: 登录页加齿轮按钮（防回滚）
**位置**: LoginView.vue 右下角
**方案**: 添加 SVG 齿轮图标，点击跳转到配置界面
- 在模板底部添加 `<button class="gear-btn"><svg>...</svg></button>`
- 点击跳转到设置页 (router.push('/settings'))

### 优化 4: 顶部 notch 安全区域
**位置**: AppLayout.vue 的 app-layout 容器
**方案**: 加 CSS
```css
padding-top: env(safe-area-inset-top, 0);
```

### 优化 5: 底部导航栏窄屏适配
**位置**: AppLayout.vue 的 mobile-nav
**方案**: 在窄屏下 (<360px) 隐藏文字仅显示图标
```css
@media (max-width: 360px) {
  .mobile-nav-label { display: none; }
  .mobile-nav-item { gap: 0; padding: 4px; }
}
```

### 优化 6: 日历顶部导航压缩
**位置**: CalendarHeader.vue
**问题**: "月/周/日" + 日期 + 搜索栏 被挤成两行
**方案**: 放不下时搜索栏缩成图标，点击展开

### 优化 7: 任务页工具栏压缩
**位置**: TodoToolbar.vue
**问题**: "矩阵/列表/新建"按钮跑到下一行，搜索框太长
**方案**: 按钮只留图标省略文字，搜索框 max-width 限制

### 优化 8: 看板卡片文字优化
**位置**: KanbanView.vue 的 task card
**问题**: 卡片文字被挤成两行，上下不齐
**方案**: 标题单行截断 + 按钮高度至少 44px

---

## 执行计划

| Agent | 文件 | 改动 |
|-------|------|------|
| Agent A | `TaskDetailModal.vue` | 修复删除Bug |
| Agent A | `SettingsView.vue` | 退出不清密码 |
| Agent B | `LoginView.vue` | 加齿轮按钮 |
| Agent B | `AppLayout.vue` | safe area + 底部导航适配 |
| Agent C | `CalendarHeader.vue` + `TodoToolbar.vue` + `KanbanView.vue` | 工具栏/卡片压缩 |
