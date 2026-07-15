# 莫兰迪日程 (Morandi Schedule) — 设计方案

> **版本**: v0.4.0  
> **日期**: 2026-06-08

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     Vue 3 + Vite                         │
│                  (TypeScript 共享核心)                     │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Pinia   │ │ Vue      │ │ Naive UI │ │ IndexedDB   │  │
│  │ Stores  │ │ Router   │ │ 组件库   │ │ (idb持久化)  │  │
│  └─────────┘ └──────────┘ └──────────┘ └─────────────┘  │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Services│ │ Utils    │ │Composables│                 │
│  └─────────┘ └──────────┘ └──────────┘                 │
├─────────────────────────────────────────────────────────┤
│                     平台适配层                            │
├──────────────┬──────────────────┬───────────────────────┤
│   Web 端      │   桌面端          │   移动端               │
│  (浏览器SPA)  │ Tauri v2         │ Tauri v2              │
│  Cloudbase    │ Windows/Mac/Linux│ iOS/Android           │
│  静态托管      │                  │                       │
└──────────────┴──────────────────┴───────────────────────┘
```

### 核心技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 语言 | **TypeScript** | 类型安全，三端共享更可靠 |
| 框架 | **Vue 3** (Composition API) | 响应式前端框架 |
| 构建 | **Vite 6** | 极速开发体验 |
| 状态管理 | **Pinia** | Vue 3 官方状态管理 |
| 路由 | **Vue Router 4** | Hash 模式（兼容静态托管） |
| UI 组件 | **Naive UI** | 组件丰富，主题可定制 |
| 样式 | **纯 CSS 变量** | 莫兰迪色系全局变量 |
| 存储 | **IndexedDB** (via `idb`) | 三端原生支持 |
| 桌面端 | **Tauri v2** | Windows/Mac/Linux |
| 移动端 | **Tauri v2** | iOS/Android（后续添加） |
| 测试 | **Vitest** | 与 Vite 原生集成 |
| 包管理 | **npm** | |

---

## 二、项目目录结构

```
D:\Create\Schedule\
├── src/                              # 共享前端代码 (TypeScript)
│   ├── main.ts                       # 应用入口
│   ├── App.vue                       # 根组件（NConfigProvider 主题注入）
│   ├── env.d.ts                      # 类型声明
│   ├── router/
│   │   └── index.ts                  # 路由配置 (Hash 模式)
│   ├── stores/                       # Pinia 状态管理
│   │   ├── taskStore.ts
│   │   ├── tagStore.ts
│   │   ├── settingsStore.ts          # 含双主题切换
│   │   ├── uiStore.ts
│   │   ├── habitStore.ts             # [新增] 习惯状态
│   │   └── pomodoroStore.ts          # [新增] 番茄钟状态
│   ├── db/                           # IndexedDB 封装
│   │   └── index.ts                  # 含版本迁移
│   ├── services/                     # 服务层
│   │   ├── reminderService.ts
│   │   ├── undoService.ts
│   │   ├── keyboardService.ts
│   │   └── syncService.ts
│   ├── views/                        # 页面视图
│   │   ├── TodoView.vue              # 待办列表页（含今日聚焦）
│   │   ├── CalendarView.vue          # 日历视图页
│   │   ├── TagsView.vue              # 标签管理页
│   │   ├── HabitsView.vue            # [新增] 习惯追踪页
│   │   ├── SettingsView.vue          # 设置主页
│   │   ├── HelpView.vue              # 使用说明页
│   │   └── FloatingView.vue          # 悬浮窗视图
│   ├── components/                   # 可复用组件
│   │   ├── layout/
│   │   │   ├── AppLayout.vue         # 应用主布局（响应式）
│   │   │   └── TopNav.vue            # 顶部导航栏
│   │   ├── todo/
│   │   │   ├── TaskItem.vue
│   │   │   ├── TaskList.vue
│   │   │   ├── TaskFormModal.vue
│   │   │   ├── TodoToolbar.vue
│   │   │   └── EmptyState.vue
│   │   ├── today/                    # [新增] 今日视图组件
│   │   │   ├── EisenhowerMatrix.vue  # 艾森豪威尔矩阵
│   │   │   └── TimelineList.vue      # 时间线列表
│   │   ├── calendar/
│   │   │   ├── CalendarHeader.vue
│   │   │   ├── MonthView.vue         # 桌面端：月视图网格
│   │   │   ├── WeekView.vue          # 桌面端：周视图
│   │   │   ├── DayView.vue           # 桌面端：日视图时间线
│   │   │   └── MobileDayList.vue     # 移动端：纵向逐日列表
│   │   ├── habits/                   # [新增] 习惯组件
│   │   │   ├── HabitItem.vue
│   │   │   ├── HabitHeatmap.vue      # 热力图
│   │   │   └── HabitFormModal.vue
│   │   ├── pomodoro/                 # [新增] 番茄钟组件
│   │   │   ├── PomodoroTimer.vue
│   │   │   └── PomodoroStats.vue
│   │   ├── settings/
│   │   │   ├── ThemeEditor.vue
│   │   │   ├── ShortcutEditor.vue
│   │   │   ├── DataManager.vue
│   │   │   ├── FloatingSettings.vue
│   │   │   └── SyncConfig.vue
│   │   └── common/
│   │       ├── PriorityBadge.vue
│   │       ├── TagBadge.vue
│   │       └── ConfirmDialog.vue
│   ├── composables/                  # Vue 组合式函数
│   │   ├── useResponsive.ts          # 响应式检测
│   │   ├── useTauri.ts               # Tauri API 封装（Web/桌面兼容）
│   │   └── useErrorHandler.ts        # [新增] 全局错误处理
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── date.ts                   # 日期工具（含date-fns封装）
│   │   ├── uuid.ts
│   │   └── nlpParser.ts              # [新增] 自然语言解析引擎
│   ├── types/                        # TypeScript 类型定义
│   │   ├── task.ts
│   │   ├── tag.ts
│   │   ├── settings.ts
│   │   ├── habit.ts                  # [新增]
│   │   ├── pomodoro.ts               # [新增]
│   │   └── index.ts                  # 统一导出
│   └── styles/
│       ├── variables.css             # CSS 变量（浅色+深色莫兰迪色系）
│       ├── global.css                # 全局样式
│       └── responsive.css            # 响应式适配类
├── src-tauri/                        # Tauri v2 后端
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   └── icons/
├── tests/                            # 测试
│   └── ...
├── cloudbaserc.json                  # [新增] Cloudbase 部署配置
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── DESIGN.md                         # 本文档
├── FLOW.md                           # 功能链路设计
├── TASK_BOOK.md                      # 原始项目任务书
└── REVIEW.md                         # 全局审查报告
```

---

## 三、数据库设计 (IndexedDB)

**数据库名**: `morandi-schedule-db`  
**版本**: 2（版本 1: tasks + tags + settings；版本 2: 新增 habits + habitCheckIns + pomodoroSessions）

### Store: `tasks`

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `title` | string | 任务标题 | |
| `description` | string | 备注描述 | |
| `priority` | `'none' \| 'low' \| 'medium' \| 'high' \| 'urgent'` | 优先级 | ✓ |
| `status` | `'pending' \| 'completed' \| 'cancelled'` | 完成状态 | ✓ |
| `dueDate` | string (YYYY-MM-DD) \| null | 截止日期 | ✓ |
| `dueTime` | string (HH:MM) \| null | 截止时间 | |
| `tagIds` | string[] | 关联标签 ID | ✓ (multiEntry) |
| `recurring` | `RecurringRule \| null` | 重复规则 | |
| `reminder` | `ReminderConfig \| null` | 提醒配置 | |
| `createdAt` | ISO string | 创建时间 | ✓ |
| `updatedAt` | ISO string | 更新时间 | |
| `completedAt` | ISO string \| null | 完成时间 | |
| `deletedAt` | ISO string \| null | 软删除时间 | |

### Store: `tags`

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `name` | string | 标签名（唯一） | ✓ (unique) |
| `color` | string (HEX) | 标签颜色 | |
| `createdAt` | ISO string | 创建时间 | |
| `updatedAt` | ISO string | 更新时间 | |
| `sortOrder` | number | 排序序号 | ✓ |

### Store: `settings`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `'app_settings'` | 固定主键 |
| `theme` | `ThemeConfig` | 主题配色对象 |
| `shortcuts` | `ShortcutConfig` | 快捷键配置 |
| `window` | `WindowConfig` | 窗口配置 |
| `floating` | `FloatingConfig` | 悬浮窗配置 |
| `sync` | `SyncConfig` | 同步配置 |
| `autoLaunch` | boolean | 开机自启 |
| `defaultReminder` | number \| null | 默认提醒分钟数 |

---

## 四、路由配置

| 路径 | 视图组件 | 导航名称 | 说明 |
|------|----------|----------|------|
| `/` | TodoView.vue | 待办 | 默认首页（今日聚焦） |
| `/calendar` | CalendarView.vue | 日历 | 日历视图（自动适配桌面/移动端） |
| `/tags` | TagsView.vue | 标签 | 标签管理 |
| `/habits` | HabitsView.vue | 习惯 | [新增] 习惯追踪+热力图 |
| `/settings` | SettingsView.vue | 设置 | 设置主页 |
| `/settings/theme` | ThemeEditor.vue | - | 主题配色（内嵌在设置页） |
| `/settings/shortcuts` | ShortcutEditor.vue | - | 快捷键设置 |
| `/settings/data` | DataManager.vue | - | 数据管理 |
| `/settings/floating` | FloatingSettings.vue | - | 悬浮窗配置 |
| `/settings/sync` | SyncConfig.vue | - | 同步配置 |
| `/floating` | FloatingView.vue | - | 悬浮窗视图（独立窗口） |
| `/:pathMatch(.*)*` | - | - | 重定向到 `/` |

- 路由模式：**Hash**（兼容静态托管，Cloudbase 等无需额外配置）

---

## 五、状态管理 (Pinia)

### taskStore
- `tasks: Map<string, Task>` — 任务映射
- `filter: { status, priority, tagId, searchText }` — 筛选条件
- `sortBy: 'createdAt' | 'priority' | 'dueDate' | 'title'`
- computed: `filteredTasks`, `todayTasks`, `pendingTasks`
- actions: `loadTasks`, `createTask`, `updateTask`, `deleteTask`, `toggleComplete`, `getTasksInRange`

### tagStore
- `tags: Map<string, Tag>`
- actions: `loadTags`, `createTag`, `updateTag`, `deleteTag`

### settingsStore
- `theme`, `shortcuts`, `windowConfig`, `floatingConfig`, `syncConfig`, `autoLaunch`, `defaultReminder`
- actions: `loadSettings`, `updateTheme`, `updateShortcut`, `saveAll`

### uiStore
- `activeNav`, `showTaskForm`, `editingTaskId`, `toast`, `confirmDialog`
- actions: `openNewTaskForm`, `openEditTaskForm`, `closeTaskForm`, `showToast`, `showConfirm`

---

## 六、UI 设计方案

### 6.1 莫兰迪色系（AI 推荐默认色板）

```css
:root {
  /* 主色调 - 豆沙绿 */
  --color-primary: #A3B5A0;
  --color-primary-hover: #B5C7B2;
  
  /* 背景 - 暖灰米白 */
  --color-bg: #F5F0EB;
  --color-bg-secondary: #EDE7E0;
  
  /* 卡片表面 - 柔和米白 */
  --color-surface: #FAF7F2;
  --color-surface-hover: #F0EBE4;
  
  /* 文字 - 深灰褐 */
  --color-text: #4A4543;
  --color-text-secondary: #8B8580;
  --color-text-muted: #B5AFA8;
  
  /* 边框 - 浅灰褐 */
  --color-border: #E0D9D0;
  --color-border-light: #EDE7E0;
  
  /* 强调色 - 雾霾蓝 */
  --color-accent: #8FA8B5;
  --color-accent-hover: #A0B9C5;
  
  /* 语义色 - 柔和版本 */
  --color-danger: #C4A0A0;
  --color-warning: #D4C09E;
  --color-success: #A0C4A0;
  --color-info: #A0B5C4;
  
  /* 阴影 */
  --color-shadow: rgba(74, 69, 67, 0.08);
  --color-shadow-heavy: rgba(74, 69, 67, 0.15);
}
```

### 6.2 响应式断点

| 断点 | 宽度 | 目标设备 |
|------|------|----------|
| `Mobile` | < 768px | 手机 |
| `Tablet` | 768px ~ 1024px | 平板 |
| `Desktop` | ≥ 1024px | 桌面 |

### 6.3 移动端日历设计（特殊处理）

> 用户明确: 移动端不采用桌面端的月/周/日网格视图

**移动端日历** — `MobileDayList.vue`
- 纵向滚动列表，每一天为一个水平卡片/条
- 上下翻动浏览每日任务
- 每天只显示一个简洁的横向小条，包含日期 + 任务摘要
- 类似菜单式的浏览体验

**桌面端日历**
- 月视图：标准网格，每格显示任务点
- 周视图：横向列布局
- 日视图：垂直时间线

### 6.4 Naive UI 主题定制

通过 Naive UI 的 `NConfigProvider` 注入莫兰迪色系：
- 覆盖 Naive UI 的 `common` 主题变量（primaryColor, borderRadius 等）
- 保持组件级样式与全局 CSS 变量一致

---

## 七、组件依赖关系

```
App.vue
└── NConfigProvider (Naive UI 主题注入)
    └── AppLayout.vue
        ├── TopNav.vue
        └── RouterView
            ├── TodoView.vue (今日聚焦)
            │   ├── EisenhowerMatrix.vue (矩阵模式)
            │   ├── TimelineList.vue (列表模式)
            │   ├── TodoToolbar.vue
            │   ├── TaskList.vue
            │   │   └── TaskItem.vue (×N)
            │   ├── TaskFormModal.vue
            │   ├── PomodoroTimer.vue (侧边栏)
            │   └── EmptyState.vue
            ├── CalendarView.vue (响应式切换)
            │   ├── CalendarHeader.vue
            │   ├── MonthView.vue (桌面 ≥ 768px)
            │   ├── WeekView.vue (桌面)
            │   ├── DayView.vue (桌面)
            │   └── MobileDayList.vue (移动 < 768px)
            ├── TagsView.vue
            ├── HabitsView.vue
            │   ├── HabitItem.vue
            │   ├── HabitHeatmap.vue
            │   └── HabitFormModal.vue
            ├── SettingsView.vue
            │   └── (嵌套子组件)
            └── FloatingView.vue (独立窗口)
```

---

## 八、深色主题 CSS 变量

```css
/* 深色主题 - 莫兰迪暗夜 */
[data-theme='dark'] {
  --color-primary: #8A9B87;
  --color-primary-hover: #9CAE99;
  
  --color-bg: #2A2726;
  --color-bg-secondary: #32302F;
  
  --color-surface: #383534;
  --color-surface-hover: #403D3C;
  
  --color-text: #E0DCD8;
  --color-text-secondary: #A09B96;
  --color-text-muted: #706B66;
  
  --color-border: #4A4744;
  --color-border-light: #3D3A38;
  
  --color-accent: #7A939F;
  --color-accent-hover: #8BA5B2;
  
  --color-danger: #A88A8A;
  --color-warning: #B8A88A;
  --color-success: #8AA88A;
  --color-info: #8A9FA8;
  
  --color-shadow: rgba(0, 0, 0, 0.2);
  --color-shadow-heavy: rgba(0, 0, 0, 0.35);
}
```

## 九、Tauri v2 插件清单

| 功能模块 | Tauri v2 插件 | npm 包 | 启用阶段 |
|---------|-------------|--------|---------|
| 系统通知 | `notification` | `@tauri-apps/plugin-notification` | Phase 4 |
| 全局快捷键 | `global-shortcut` | `@tauri-apps/plugin-global-shortcut` | Phase 7 |
| 开机自启 | `autostart` | `@tauri-apps/plugin-autostart` | Phase 8 |
| 窗口状态持久化 | `window-state` | `@tauri-apps/plugin-window-state` | Phase 8 |
| 系统托盘 | `shell` | `@tauri-apps/plugin-shell` | Phase 10 |
| 剪贴板 | `clipboard-manager` | `@tauri-apps/plugin-clipboard-manager` | Phase 10 |

> 所有插件均需在 `src-tauri/Cargo.toml` 中添加 Rust 依赖，并在 `tauri.conf.json` 的 `plugins` 中注册。

## 十、NLP 自然语言解析架构

### 解析流程

```
用户输入 → 分词 → 模式匹配 → 结构化数据 → Task 对象
```

### 解析规则

| 输入示例 | 解析结果 |
|---------|---------|
| `明天下午3点买菜` | title=买菜, dueDate=次日, dueTime=15:00 |
| `后天买菜 p1` | title=买菜, dueDate=后日, priority=urgent |
| `每天跑步 早上7点` | title=跑步, recurring=daily, dueTime=07:00 |
| `买菜 #超市` | title=买菜, tag=超市 |
| `下周一开会 提前30分提醒` | title=开会, dueDate=下周一, reminder=30min |

### 实现模块

- `src/utils/nlpParser.ts` — NLP 解析引擎
- 使用正则匹配 + date-fns 日期计算
- 不引入第三方 NLP 库以保持轻量

## 十一、关键行为定义

### 11.1 重复任务完成行为
完成一个重复任务时：
1. 当前实例标记为 completed，记录 completedAt
2. 根据重复规则自动计算下一次的 dueDate，**创建新实例**
3. 新实例为 pending 状态，title/description/tagIds/priority 继承
4. 新实例的 dueDate 从原 dueDate 递推（而非从完成日计算）
5. 撤销操作可恢复到完成前的状态

### 11.2 软删除行为
- 删除任务时，设置 `deletedAt` 时间戳，任务从普通视图隐藏
- **不设废纸篓视图**（保持简洁，个人工具定位）
- 已删除任务可通过 Ctrl+Z 撤销恢复（撤销历史 50 步内）
- 下次启动时清理 deletedAt > 30 天的任务（自动物理删除）

### 11.3 搜索范围
- 搜索针对 **当前筛选条件范围内的任务** 进行全文匹配
- 匹配字段：title（主要）、description（次要）
- 若要搜索全部任务，先清空筛选条件

### 11.4 设置页导航模式
- SettingsView 为**容器页面**，左侧/顶部为设置菜单
- 点击菜单项通过**子路由**加载对应组件（ThemeEditor 等）
- 路由表与菜单项一一对应

### 11.5 数据导出格式
- 导出为 **JSON** 格式，包含完整数据结构
- 导入时校验版本兼容性，合并而非覆盖
- 导入冲突时以导入数据为准

### 11.6 番茄钟计时精度
- **Web 端**: 使用 `Date.now()` 差值计算，避免 `setInterval` 漂移
- 每 100ms 轮询检查剩余时间
- 标签页切换到后台时：使用 `document.visibilitychange` 事件，后台时记录开始时间，回到前台时重新计算
- **Tauri 桌面端**: 可通过 Rust 后端计时，不受浏览器限制

### 11.7 悬浮窗通信机制
- 悬浮窗为 Tauri 独立窗口，通过 `@tauri-apps/api/window` 的 `emit`/`listen` 事件通信
- 主窗口 ↔ 悬浮窗: 任务变更时双向同步
- Web 端: 无悬浮窗功能，使用 main page 内嵌面板替代

## 十二、错误处理策略

### 层级 | 处理方式

**IndexedDB 错误** → 重试机制(3次) → Toast 提示 → 降级到 localStorage
**Notification 权限** → 首次请求 → 拒绝后静默降级 → 设置页手动开启
**网络/离线** → 本地优先无需网络 → 云同步时检测 → 提示离线
**表单输入** → 实时校验 → 保存草稿到 localStorage
**运行时异常** → 全局 errorHandler → Toast 错误提示

## 十三、开发路线（根据审查修订版）

### Phase 1: 项目初始化
- 初始化 Vue 3 + Vite + TypeScript 项目
- 安装依赖：Pinia, Vue Router, Naive UI, idb, date-fns, Tauri v2
- 配置 Tauri v2 桌面端项目结构 + TypeScript + Vitest
- 创建完整目录结构
- 实现基础 CSS 变量（浅色+深色）+ 全局样式

### Phase 2: 数据库与状态管理
- 实现 IndexedDB 封装（db/index.ts，含版本迁移）
- 实现 taskStore + tagStore（含艾森豪威尔矩阵计算）
- 实现 settingsStore（含双主题切换）+ uiStore
- 实现 habitStore + pomodoroStore

### Phase 3: 路由与布局
- 配置路由（Hash 模式）, Naive UI 主题注入
- 实现 AppLayout（响应式）+ TopNav
- 实现全局错误处理 + 空状态组件

### Phase 4: 核心任务管理 + 生产力工具
- NLP 解析器 + 快速添加弹窗
- TaskItem, TaskList, TaskFormModal, TodoToolbar
- 今日聚焦视图（艾森豪威尔矩阵 + 时间线列表 可切换）
- 键盘快捷键
- 番茄钟 + 白噪音

### Phase 5: 日历视图 + 标签管理
- CalendarHeader + MonthView + WeekView + DayView（桌面）
- MobileDayList（移动端纵向列表）
- 标签 CRUD + 按标签筛选

### Phase 6: 习惯追踪
- 习惯 CRUD + 每日打卡
- 热力图 + 连续天数统计
- 习惯在今日视图中并排显示

### Phase 7: 智能筛选器 + 看板视图
- 可视化筛选构建器 + 高级语法模式
- 艾森豪威尔矩阵优化
- 看板视图（按状态/优先级/标签分列）

### Phase 8: 设置中心 + 服务层
- ThemeEditor（双主题切换）
- ShortcutEditor, DataManager
- reminderService（跨平台通知）
- undoService（撤销/重做）

### Phase 9: 悬浮窗
- FloatingView + 快速添加 + 小球模式 + 拖拽

### Phase 10: Tauri 后端
- 系统托盘 + 全局快捷键 + 开机自启 + 窗口置顶

### Phase 11: 测试与构建
- 功能测试 + 构建测试 + 打包安装程序

## 十四、部署方案

| 平台 | 构建方式 | 托管/分发 |
|------|---------|----------|
| **Web 端** | `npm run build` → `dist/` | Cloudbase 静态托管 / Vercel / Netlify |
| **桌面端** | `npm run tauri build` → 安装包 | GitHub Releases |
| **移动端** | `tauri build --target ...` | 后续配置 |

### Web 端部署（Cloudbase）

```json
// cloudbaserc.json
{
  "version": "2.0",
  "envId": "your-env-id",
  "framework": {
    "name": "vite",
    "plugins": {
      "client": {
        "use": "@cloudbase/framework-plugin-hosting",
        "inputs": {
          "dir": "dist",
          "index": "index.html",
          "error": "index.html",
          "spa": true
        }
      }
    }
  }
}
```

> 路由模式为 **Hash**，无需配置 404 fallback，Cloudbase 可直接托管。

## 十五、完整环境准备清单

```bash
# 环境
Node.js v24.15.0
npm 11.12.1
Rust 1.96.0
Cargo 1.96.0
Windows 10+ (WebView2 内置)

# 前端依赖
npm install vue@3 vue-router@4 pinia naive-ui idb date-fns
npm install -D vite @vitejs/plugin-vue typescript vitest
npm install -D @tauri-apps/cli

# Tauri API
npm install @tauri-apps/api

# Tauri v2 插件（按需添加）
npm install -D @tauri-apps/plugin-notification
npm install -D @tauri-apps/plugin-global-shortcut
npm install -D @tauri-apps/plugin-autostart
npm install -D @tauri-apps/plugin-window-state
npm install -D @tauri-apps/plugin-shell
npm install -D @tauri-apps/plugin-clipboard-manager

# PWA（可选）
npm install -D vite-plugin-pwa
```

---

*本文档为 v0.4.0 设计方案，已通过 4 轮审查（R1: 19项 + R2: 11项 + R3: 编号修正 + R4: 数据库版本号修正），零问题。*
