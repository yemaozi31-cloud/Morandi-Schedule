# 第三轮修复计划

## 问题1：习惯展开按钮白线
**文件**: TodayView.vue
**位置**: 第501行，移动端 `.habits-expand-btn`
**原因**: `border-left: 1px solid var(--color-border-light)` — 左边框把页面切了一刀
**修复**: 去掉 border-left，强制 background: transparent

## 问题2：空习惯占大块位置
**文件**: TodayView.vue
**位置**: 第76行 `<EmptyState>`
**原因**: EmptyState 有 `min-height: 200px`，没有习惯时占了一大块
**修复**: 删除 EmptyState 行，没习惯时展开也不显示东西

## 问题3：侧拉栏被摄像头挡住
**文件**: MobileDrawer.vue
**修复**: 侧拉容器顶部加安全区域间距
