# 布局与 UI 统一化 - 实施计划

## 概述

确保**网页端和桌面端布局一致**：所有页面统一使用 `AppLayout` 包裹（桌面端显示 Sidebar 左侧导航 + 内容区，移动端显示内容区 + 底部 Tab 栏）。修复遗漏的 emoji 残留和 Sidebar 图标映射 Bug。

---

## 当前状态分析

### ✅ 已完成
| 文件 | 修改内容 |
|------|---------|
| `src/components/layout/AppLayout.vue` | 移除未使用的 `TopNav` 导入，改为 `import Sidebar` |
| `src/views/TodoView.vue` | 添加 `AppLayout` 包裹，引入 `todo-view-body` 容器，更新 CSS |
| `src/views/InboxView.vue` | 添加 `AppLayout` 包裹 + import |
| `src/views/UpcomingView.vue` | 添加 `AppLayout` 包裹 + import |
| `src/components/todo/TaskList.vue` | emoji `📋` → Icon `inbox` |
| `src/components/settings/ThemeEditor.vue` | emoji `☀🌙` → Icon 组件 + import |

### ❌ 待修复
1. **PomodoroTimer.vue** — 按钮中仍使用 emoji（`▶ 继续`、`⏸ 暂停`、`⏹ 结束`）
2. **Sidebar.vue 第17行** — Icon name 白名单错误，仅允许 4 个图标名（`inbox star calendar list`），导致 `columns/tags/target/settings` 等图标全部回退为 `check-square`
3. **.trae/rules/001-error-memory.md** — 未记录本次布局修复的 Bug 类型
4. **验证构建** — 修复完成后需要检查是否存在 TS/Vite 构建错误

---

## 实施步骤

### Step 1: 修复 PomodoroTimer.vue 中的 emoji

**文件**: `src/components/pomodoro/PomodoroTimer.vue`

**修改内容**:
- 第9行: `▶ 继续` → 改用文字描述，加 class 图标（或纯文字 `继续` 用 CSS 加箭头符号）
- 第10行: `▶ 开始` → 同上
- 第11行: `⏸ 暂停` → 纯文字 `暂停`
- 第12行: `⏹ 结束` → 纯文字 `结束`

**方案**: 不引入 Icon 组件（避免增加复杂度），直接使用纯文字按钮，利用现有的 CSS 样式。

### Step 2: 修复 Sidebar.vue 图标映射白名单

**文件**: `src/components/layout/Sidebar.vue`

**当前代码 (第17行)**:
```vue
<Icon :name="'inbox star calendar list'.includes(item.icon) ? item.icon : 'check-square'" :size="17" />
```

**问题**: 限制了只有 `inbox`/`star`/`calendar`/`list` 能显示正确图标，其他全部回退为 `check-square`。NAV_ITEMS 中 `columns`/`tags`/`target`/`settings` 图标无法正确显示。

**修改**: 直接使用 `item.icon`，移除白名单判断：
```vue
<Icon :name="item.icon" :size="17" />
```

### Step 3: 更新 001-error-memory.md

**文件**: `.trae/rules/001-error-memory.md`

**新增记录**:
- 布局 Bug 类型：Sidebar 组件在 AppLayout 中未导入
- 布局 Bug 类型：部分视图页面缺少 AppLayout 包裹导致布局不一致
- 修复方案描述

### Step 4: 验证构建

- 运行 `npm run build` 或 `npx vite build` 检查编译错误
- 检查 TypeScript 类型错误（如果有 `npm run typecheck`）

---

## 验证方式

1. 启动 dev server: `npx vite --host 0.0.0.0`
2. 打开浏览器访问 `http://localhost:5173`
3. 检查桌面端（>768px）：左侧 Sidebar 正常显示，图标正确
4. 检查所有路由页面：/（今天）、/inbox、/upcoming、/all、/calendar、/kanban、/tags、/habits、/settings — 全部带 Sidebar
5. 缩小窗口至 <768px：底部 Tab 栏出现，Sidebar 消失
6. 检查 PomodoroTimer 按钮不再显示 emoji
