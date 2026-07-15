# 莫兰迪日程 - 完整项目任务书

> **项目名称**: 莫兰迪日程 (Morandi Schedule)  
> **版本**: v0.2.0 (原始任务书，已由 v0.4.0 设计文档替代)  
> **📌 注意**: 本文档为原始任务书，最终设计以 [DESIGN.md](./DESIGN.md) 和 [FLOW.md](./FLOW.md) 为准。本文档保留作为功能清单参考。  

---

## 目录

1. [项目概述](#一项目概述)
2. [功能模块清单](#二功能模块清单)
3. [目录结构](#三目录结构)
4. [数据库设计](#四数据库设计)
5. [路由配置](#五路由配置)
6. [状态管理层设计](#六状态管理层设计)
7. [组件开发清单](#七组件开发清单)
8. [服务层设计](#八服务层设计)
9. [Tauri Rust 后端](#九tauri-rust后端)
10. [开发任务列表](#十开发任务列表)
11. [测试校验清单](#十一测试校验清单)

---

## 一、项目概述

莫兰迪日程是一款个人自用型跨端日程&待办管理工具，采用莫兰迪色系设计风格，注重简洁美观的用户体验。

**核心价值：**
- 高效的任务管理体验
- 优雅的视觉设计
- 便捷的悬浮窗交互
- 可靠的数据持久化
- 灵活的自定义配置

---

## 二、功能模块清单

| 模块 | 功能点 | 优先级 | 状态 |
|------|--------|--------|------|
| **待办管理** | 新建任务、编辑任务、删除任务（软删）、完成任务、撤销操作 | P0 | 待开发 |
| **今日聚焦** | 今日视图、艾森豪威尔矩阵、时间线列表、智能推荐 | P0 | 待开发 |
| **日历视图** | 月视图、周视图、日视图、日期导航、今日跳转、移动端日列表 | P0 | 待开发 |
| **标签分类** | 创建标签、编辑标签、删除标签、按标签筛选 | P0 | 待开发 |
| **任务属性** | 优先级、截止时间、重复规则、定时提醒 | P0 | 待开发 |
| **自然语言输入** | 智能解析日期/时间/优先级/标签/重复规则 | P0 | 待开发 |
| **番茄钟** | 任务绑定计时、白噪音、专注/休息周期、统计 | P0 | 待开发 |
| **习惯追踪** | 创建习惯、每日打卡、热力图、连续天数统计 | P0 | 待开发 |
| **智能筛选器** | 可视化构建、高级语法模式、保存筛选条件 | P1 | 待开发 |
| **看板视图** | 按状态/优先级/标签分列展示 | P1 | 待开发 |
| **悬浮窗** | 今日任务列表、快速完成、快速添加、小球模式、拖拽移动 | P1 | 待开发 |
| **系统集成** | 系统托盘、全局快捷键、窗口置顶、开机自启 | P1 | 待开发 |
| **数据管理** | 数据导出、数据导入、本地持久化 | P1 | 待开发 |
| **设置中心** | 主题配色(双主题)、快捷键自定义、悬浮窗配置、云端同步（预留） | P2 | 待开发 |

---

## 三、目录结构

```
D:\Create\schedule\
├── src/                              # 前端 Vue 应用
│   ├── main.js                       # 应用入口
│   ├── App.vue                       # 根组件
│   ├── router/
│   │   └── index.js                  # 路由配置
│   ├── stores/                       # Pinia 状态管理
│   │   ├── taskStore.js              # 任务状态管理
│   │   ├── tagStore.js               # 标签状态管理
│   │   ├── settingsStore.js          # 设置状态管理
│   │   └── uiStore.js                # UI 状态管理
│   ├── db/                           # IndexedDB 封装
│   │   └── index.js                  # 数据库连接与操作
│   ├── services/                     # 服务层
│   │   ├── reminderService.js        # 定时提醒服务
│   │   ├── undoService.js            # 撤销/重做服务
│   │   ├── keyboardService.js        # 键盘快捷键服务
│   │   └── syncService.js            # 云端同步服务
│   ├── views/                        # 页面视图
│   │   ├── TodoView.vue              # 待办列表页
│   │   ├── CalendarView.vue          # 日历视图页
│   │   ├── TagsView.vue              # 标签管理页
│   │   ├── SettingsView.vue          # 设置主页
│   │   ├── HelpView.vue              # 使用说明页
│   │   └── FloatingView.vue          # 悬浮窗视图
│   ├── components/                   # 可复用组件
│   │   ├── layout/
│   │   │   ├── AppLayout.vue         # 应用主布局
│   │   │   └── TopNav.vue            # 顶部导航栏
│   │   ├── todo/
│   │   │   ├── TaskItem.vue          # 任务列表项
│   │   │   ├── TaskList.vue          # 任务列表容器
│   │   │   ├── TaskFormModal.vue     # 任务创建/编辑弹窗
│   │   │   ├── TodoToolbar.vue       # 待办筛选工具栏
│   │   │   └── EmptyState.vue        # 空状态占位
│   │   ├── calendar/
│   │   │   ├── CalendarHeader.vue    # 日历头部导航
│   │   │   ├── MonthView.vue         # 月视图
│   │   │   ├── WeekView.vue          # 周视图
│   │   │   └── DayView.vue           # 日视图
│   │   ├── settings/
│   │   │   ├── ThemeEditor.vue       # 主题配色编辑
│   │   │   ├── ShortcutEditor.vue    # 快捷键编辑
│   │   │   ├── DataManager.vue       # 数据导入/导出
│   │   │   ├── FloatingSettings.vue  # 悬浮窗配置
│   │   │   └── SyncConfig.vue        # 云端同步配置
│   │   └── common/
│   │       ├── ToggleSwitch.vue      # 开关按钮
│   │       ├── PriorityBadge.vue     # 优先级徽章
│   │       ├── TagBadge.vue          # 标签徽章
│   │       ├── ToastNotification.vue # 吐司通知
│   │       └── ConfirmDialog.vue     # 确认对话框
│   ├── utils/
│   │   ├── constants.js              # 全局常量
│   │   ├── date.js                   # 日期工具函数
│   │   └── uuid.js                   # UUID 生成
│   └── styles/
│       ├── variables.css             # CSS 变量（莫兰迪色系）
│       ├── global.css                # 全局样式
│       └── morandi.css               # 默认莫兰迪色值
├── src-tauri/                        # Tauri Rust 后端
│   ├── src/
│   │   └── main.rs                   # 主入口
│   ├── Cargo.toml                    # Rust 依赖配置
│   ├── tauri.conf.json               # Tauri 配置
│   └── icons/                        # 应用图标
├── package.json                      # 前端依赖
├── vite.config.js                    # Vite 构建配置
└── index.html                        # HTML 入口
```

---

## 四、数据库设计

### 4.1 IndexedDB Schema

**数据库名**: `morandi-schedule-db`  
**版本**: 1

#### Store: `tasks`（任务表）

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `title` | string | 任务标题 | |
| `description` | string | 备注描述 | |
| `priority` | 'none' \| 'low' \| 'medium' \| 'high' \| 'urgent' | 优先级 | ✓ |
| `status` | 'pending' \| 'completed' \| 'cancelled' | 完成状态 | ✓ |
| `dueDate` | string (YYYY-MM-DD) \| null | 截止日期 | ✓ |
| `dueTime` | string (HH:MM) \| null | 截止时间 | |
| `tagIds` | string[] | 关联标签 ID 列表 | ✓ (multiEntry) |
| `recurring` | object \| null | 重复规则 | |
| `reminder` | object \| null | 提醒配置 | |
| `createdAt` | ISO string | 创建时间 | ✓ |
| `updatedAt` | ISO string | 更新时间 | |
| `completedAt` | ISO string \| null | 完成时间 | |
| `deletedAt` | ISO string \| null | 软删除时间 | |
| `syncStatus` | 'local' \| 'synced' \| 'modified' \| 'conflict' | 同步状态 | ✓ |
| `syncVersion` | number | 同步版本号 | |

#### Store: `tags`（标签表）

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `name` | string | 标签名（唯一） | ✓ (unique) |
| `color` | string (HEX) | 标签颜色 | |
| `createdAt` | ISO string | 创建时间 | |
| `updatedAt` | ISO string | 更新时间 | |
| `sortOrder` | number | 排序序号 | ✓ |

#### Store: `settings`（设置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | 'app_settings' | 固定主键 |
| `theme` | object | 主题配色对象 |
| `shortcuts` | object | 快捷键配置 |
| `window` | object | 窗口配置 |
| `floating` | object | 悬浮窗配置 |
| `sync` | object | 同步配置 |
| `autoLaunch` | boolean | 开机自启 |
| `defaultReminder` | number \| null | 默认提醒分钟数 |

#### Store: `syncLogs`（同步日志表）

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `taskId` | string | 关联任务 ID | ✓ |
| `action` | 'create' \| 'update' \| 'delete' | 操作类型 | |
| `timestamp` | ISO string | 操作时间 | ✓ |
| `synced` | boolean | 是否已同步 | ✓ |
| `conflict` | boolean | 是否有冲突 | |

#### Store: `habits`（习惯表）— [新增]

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `name` | string | 习惯名称 | |
| `description` | string \| null | 描述 | |
| `frequency` | 'daily' \| 'weekly' \| 'monthly' | 频率 | ✓ |
| `target` | number | 每日/周/月目标量 | |
| `unit` | 'times' \| 'minutes' | 单位 | |
| `color` | string (HEX) | 习惯颜色 | |
| `reminderTime` | string (HH:MM) \| null | 提醒时间 | |
| `reminderDays` | number[] \| null | 提醒日(0=日,1=一...6=六) | |
| `createdAt` | ISO string | 创建时间 | ✓ |
| `updatedAt` | ISO string | 更新时间 | |

#### Store: `habitCheckIns`（习惯打卡表）— [新增]

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `habitId` | string | 关联习惯 ID | ✓ |
| `date` | string (YYYY-MM-DD) | 打卡日期 | ✓ |
| `value` | number | 完成量 | |
| `note` | string \| null | 备注 | |
| `createdAt` | ISO string | 创建时间 | |

#### Store: `pomodoroSessions`（番茄钟记录表）— [新增]

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| `id` | string (UUID) | 主键 | ✓ |
| `taskId` | string \| null | 关联任务 ID | ✓ |
| `duration` | number | 专注时长(分钟) | |
| `completed` | boolean | 是否完成 | ✓ |
| `startedAt` | ISO string | 开始时间 | ✓ |
| `endedAt` | ISO string \| null | 结束时间 | |

数据库版本升级至 **版本 2**（含新增 stores）。

---

## 五、路由配置

| 路径 | 视图组件 | 导航名称 | 说明 |
|------|----------|----------|------|
| `/` | TodoView.vue | 待办 | 默认首页 |
| `/calendar` | CalendarView.vue | 日历 | 日历视图 |
| `/tags` | TagsView.vue | 标签 | 标签管理 |
| `/settings` | SettingsView.vue | 设置 | 设置主页 |
| `/settings/theme` | ThemeEditor.vue | - | 主题配色 |
| `/settings/shortcuts` | ShortcutEditor.vue | - | 快捷键设置 |
| `/settings/data` | DataManager.vue | - | 数据管理 |
| `/settings/floating` | FloatingSettings.vue | - | 悬浮窗配置 |
| `/settings/sync` | SyncConfig.vue | - | 同步配置 |
| `/settings/help` | HelpView.vue | - | 使用说明 |
| `/floating` | FloatingView.vue | - | 悬浮窗视图 |
| `/:pathMatch(.*)*` | - | - | 重定向到 / |

---

## 六、状态管理层设计

### 6.1 taskStore

```javascript
State: {
  tasks: Map<string, Task>,        // 任务映射
  filter: {
    status: null | string,         // 状态筛选
    priority: null | string,       // 优先级筛选
    tagId: null | string,          // 标签筛选
    searchText: string             // 搜索文本
  },
  sortBy: 'createdAt' | 'priority' | 'dueDate' | 'title',
  selectedTaskId: null | string
}

Computed: {
  filteredTasks: Task[],           // 筛选排序后的任务
  todayTasks: Task[],              // 今日待完成任务
  pendingTasks: Task[],            // 待完成任务数
}

Actions: {
  loadTasks()                      // 从 IndexedDB 加载
  createTask(data)                 // 创建任务（含撤销快照）
  updateTask(id, data)             // 更新任务
  deleteTask(id)                   // 软删除任务
  toggleComplete(id)               // 切换完成状态
  getTaskById(id)                  // 获取单个任务
  getTasksInRange(start, end)      // 获取日期范围任务
}
```

### 6.2 tagStore

```javascript
State: {
  tags: Map<string, Tag>           // 标签映射
}

Actions: {
  loadTags()                       // 加载标签
  createTag(name, color)           // 创建标签
  updateTag(id, data)              // 更新标签
  deleteTag(id)                    // 删除标签
  getTagById(id)                   // 获取单个标签
}
```

### 6.3 settingsStore

```javascript
State: {
  theme: {
    primary: string,
    bg: string,
    surface: string,
    text: string,
    textSecondary: string,
    border: string,
    accent: string,
    danger: string,
    shadow: string
  },
  shortcuts: {
    toggleWindow: string,
    newTask: string,
    deleteTask: string,
    undo: string
  },
  windowConfig: {
    width: number,
    height: number,
    x: number|null,
    y: number|null,
    alwaysOnTop: boolean,
    edgeSnap: boolean,
    edgeSnapThreshold: number
  },
  floatingConfig: {
    width: number,
    height: number,
    x: number|null,
    y: number|null,
    opacity: number,
    defaultMinimized: boolean
  },
  syncConfig: {
    enabled: boolean,
    autoSync: boolean,
    lastSyncAt: string|null,
    syncInterval: number,
    provider: 'supabase' | null,
    url: string,
    key: string
  },
  autoLaunch: boolean,
  defaultReminder: number|null
}

Actions: {
  loadSettings()
  updateTheme(colors)
  updateShortcut(action, combo)
  updateSyncConfig(config)
  updateWindow(config)
  updateFloatingConfig(config)
  saveAll()
}
```

### 6.4 uiStore

```javascript
State: {
  activeNav: string,
  showTaskForm: boolean,
  editingTaskId: null | string,
  toast: null | { message, type, duration },
  confirmDialog: { show, title, message, onConfirm } | null
}

Actions: {
  openNewTaskForm()
  openEditTaskForm(taskId)
  closeTaskForm()
  showToast(message, type, duration)
  showConfirm(title, message, onConfirm)
  closeConfirm()
}
```

---

## 七、组件开发清单

### 7.1 布局组件

| 组件 | 功能 | 依赖 |
|------|------|------|
| AppLayout.vue | 应用主布局容器 | TopNav, router-view |
| TopNav.vue | 顶部导航栏，含导航切换 | uiStore, settingsStore |

### 7.2 待办组件

| 组件 | 功能 | 依赖 |
|------|------|------|
| TaskItem.vue | 单个任务展示，支持点击完成、双击编辑 | taskStore, uiStore |
| TaskList.vue | 任务列表容器，渲染多个 TaskItem | taskStore |
| TaskFormModal.vue | 任务创建/编辑弹窗 | taskStore, tagStore, uiStore |
| TodoToolbar.vue | 筛选、排序、搜索工具栏 | taskStore |
| EmptyState.vue | 空状态占位展示 | - |

### 7.3 日历组件

| 组件 | 功能 | 依赖 |
|------|------|------|
| CalendarHeader.vue | 日历导航头部，支持日期切换和视图模式切换 | - |
| MonthView.vue | 月视图网格展示 | taskStore |
| WeekView.vue | 周视图横向展示 | taskStore |
| DayView.vue | 日视图时间线展示 | taskStore |

### 7.4 设置组件

| 组件 | 功能 | 依赖 |
|------|------|------|
| ThemeEditor.vue | 主题配色编辑器 | settingsStore |
| ShortcutEditor.vue | 快捷键配置编辑器 | settingsStore |
| DataManager.vue | 数据导入导出 | taskStore, tagStore, settingsStore |
| FloatingSettings.vue | 悬浮窗配置 | settingsStore |
| SyncConfig.vue | 云端同步配置 | settingsStore, syncService |

### 7.5 通用组件

| 组件 | 功能 | 依赖 |
|------|------|------|
| ToggleSwitch.vue | 开关按钮组件 | - |
| PriorityBadge.vue | 优先级展示徽章 | - |
| TagBadge.vue | 标签展示徽章 | - |
| ToastNotification.vue | 全局吐司通知 | uiStore |
| ConfirmDialog.vue | 全局确认对话框 | uiStore |

---

## 八、服务层设计

### 8.1 keyboardService

```javascript
// 键盘快捷键服务
initKeyboardService()        // 初始化键盘监听
destroyKeyboardService()     // 销毁监听

// 快捷键映射
Ctrl+N       → 新建任务
Ctrl+Delete  → 删除任务
Ctrl+Z       → 撤销
Ctrl+Shift+Z → 重做
Alt+S        → 显隐主窗口（Tauri 全局）
```

### 8.2 reminderService

```javascript
// 定时提醒服务
startReminderService()       // 启动定时检查（每10秒）
stopReminderService()        // 停止服务

// 提醒类型
- 'at_time': 准时提醒
- 'before': 提前 N 分钟提醒（5/10/15/30/60）
```

### 8.3 undoService

```javascript
// 撤销/重做服务
snapshot()                   // 保存当前状态快照
undo()                       // 撤销操作
redo()                       // 重做操作
clearHistory()               // 清空历史

// 历史记录上限：50步
```

### 8.4 syncService

```javascript
// 云端同步服务（预留）
initSyncService(config)      // 初始化同步
startSyncLoop(minutes)       // 启动定时同步
stopSyncLoop()               // 停止同步
doSync()                     // 执行单次同步
testSupabaseConnection(url, key)  // 测试连接
```

---

## 九、Tauri Rust 后端

### 9.1 IPC Commands

| 命令 | 参数 | 返回值 | 功能 |
|------|------|--------|------|
| `set_autostart` | enabled: bool | Result<(), String> | 设置开机自启 |
| `get_autostart_status` | - | Result<bool, String> | 查询自启状态 |
| `toggle_always_on_top` | enabled: bool | Result<(), String> | 设置窗口置顶 |
| `open_floating_window` | - | Result<(), String> | 打开悬浮窗 |
| `close_floating_window` | - | Result<(), String> | 关闭悬浮窗 |
| `save_floating_config` | x, y, width, height | Result<(), String> | 保存悬浮窗配置 |
| `save_always_on_top` | enabled: bool | Result<(), String> | 保存置顶状态 |
| `quit_app` | - | - | 退出程序 |
| `show_main_window` | - | Result<(), String> | 显示主窗口 |

### 9.2 窗口配置

**主窗口**:
- 默认尺寸：800×600
- 最小尺寸：400×500
- 创建时居中显示
- 点击关闭 → 隐藏到托盘

**悬浮窗**:
- 无边框窗口
- 默认尺寸：260×360
- 最小尺寸：200×200
- 始终置顶
- 位置尺寸持久化

### 9.3 系统托盘菜单

```
┌──────────────┐
│   显示窗口    │ → show_main_window()
│   悬浮窗      │ → open_floating_window()
│   退出        │ → quit_app()
└──────────────┘
```

### 9.4 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| Alt+S | 切换主窗口显隐 |

---

## 十、开发任务列表

### Phase 1: 基础环境搭建

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 1.1 | 初始化 Vue 3 + Vite 项目 | AI | 2h | 待开发 |
| 1.2 | 安装依赖：Pinia, Vue Router, idb, lucide-vue-next | AI | 1h | 待开发 |
| 1.3 | 配置 Tauri v2 项目结构 | AI | 2h | 待开发 |
| 1.4 | 创建目录结构和基础配置文件 | AI | 1h | 待开发 |

### Phase 2: 数据库与状态管理

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 2.1 | 实现 IndexedDB 封装（db/index.js） | AI | 4h | 待开发 |
| 2.2 | 实现 taskStore（stores/taskStore.js） | AI | 4h | 待开发 |
| 2.3 | 实现 tagStore（stores/tagStore.js） | AI | 2h | 待开发 |
| 2.4 | 实现 settingsStore（stores/settingsStore.js） | AI | 3h | 待开发 |
| 2.5 | 实现 uiStore（stores/uiStore.js） | AI | 2h | 待开发 |

### Phase 3: 路由与布局

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 3.1 | 配置路由（router/index.js） | AI | 2h | 待开发 |
| 3.2 | 实现 AppLayout 组件 | AI | 2h | 待开发 |
| 3.3 | 实现 TopNav 组件 | AI | 2h | 待开发 |
| 3.4 | 实现全局样式（styles/variables.css, global.css） | AI | 3h | 待开发 |

### Phase 4: 待办管理功能

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 4.1 | 实现 TaskItem 组件 | AI | 3h | 待开发 |
| 4.2 | 实现 TaskList 组件 | AI | 2h | 待开发 |
| 4.3 | 实现 TaskFormModal 组件 | AI | 6h | 待开发 |
| 4.4 | 实现 TodoToolbar 组件 | AI | 3h | 待开发 |
| 4.5 | 实现 TodoView 页面 | AI | 3h | 待开发 |
| 4.6 | 实现 EmptyState 组件 | AI | 1h | 待开发 |

### Phase 5: 日历视图

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 5.1 | 实现 CalendarHeader 组件 | AI | 2h | 待开发 |
| 5.2 | 实现 MonthView 组件 | AI | 4h | 待开发 |
| 5.3 | 实现 WeekView 组件 | AI | 3h | 待开发 |
| 5.4 | 实现 DayView 组件 | AI | 3h | 待开发 |
| 5.5 | 实现 CalendarView 页面 | AI | 2h | 待开发 |

### Phase 6: 标签管理

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 6.1 | 实现 TagBadge 组件 | AI | 1h | 待开发 |
| 6.2 | 实现 TagsView 页面 | AI | 4h | 待开发 |

### Phase 7: 服务层

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 7.1 | 实现 keyboardService | AI | 3h | 待开发 |
| 7.2 | 实现 reminderService | AI | 4h | 待开发 |
| 7.3 | 实现 undoService | AI | 3h | 待开发 |
| 7.4 | 实现 syncService（预留接口） | AI | 2h | 待开发 |

### Phase 8: 设置中心

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 8.1 | 实现 ThemeEditor 组件 | AI | 4h | 待开发 |
| 8.2 | 实现 ShortcutEditor 组件 | AI | 3h | 待开发 |
| 8.3 | 实现 DataManager 组件 | AI | 3h | 待开发 |
| 8.4 | 实现 FloatingSettings 组件 | AI | 2h | 待开发 |
| 8.5 | 实现 SyncConfig 组件 | AI | 2h | 待开发 |
| 8.6 | 实现 HelpView 页面 | AI | 2h | 待开发 |
| 8.7 | 实现 SettingsView 页面 | AI | 2h | 待开发 |

### Phase 9: 悬浮窗功能

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 9.1 | 实现 FloatingView 组件（完整形态） | AI | 6h | 待开发 |
| 9.2 | 实现悬浮小球形态 | AI | 3h | 待开发 |
| 9.3 | 实现拖拽移动功能 | AI | 2h | 待开发 |
| 9.4 | 实现快速添加任务功能 | AI | 2h | 待开发 |

### Phase 10: Tauri 后端

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|----------|
| 10.1 | 实现系统托盘菜单 | AI | 2h | 待开发 |
| 10.2 | 实现全局快捷键（Alt+S） | AI | 2h | 待开发 |
| 10.3 | 实现开机自启功能 | AI | 2h | 待开发 |
| 10.4 | 实现窗口置顶功能 | AI | 2h | 待开发 |
| 10.5 | 实现悬浮窗管理 | AI | 3h | 待开发 |
| 10.6 | 实现窗口关闭→隐藏逻辑 | AI | 1h | 待开发 |

### Phase 11: 通用组件

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 11.1 | 实现 ToggleSwitch 组件 | AI | 1h | 待开发 |
| 11.2 | 实现 PriorityBadge 组件 | AI | 1h | 待开发 |
| 11.3 | 实现 ToastNotification 组件 | AI | 2h | 待开发 |
| 11.4 | 实现 ConfirmDialog 组件 | AI | 2h | 待开发 |

### Phase 12: 测试与构建

| 任务 | 描述 | 负责人 | 预计工时 | 状态 |
|------|------|--------|----------|------|
| 12.1 | 功能测试验证 | AI | 4h | 待开发 |
| 12.2 | 构建测试 | AI | 2h | 待开发 |
| 12.3 | 打包安装程序 | AI | 2h | 待开发 |

---

## 十一、测试校验清单

### 11.1 待办管理

- [ ] 新建任务：标题必填，其他可选
- [ ] 完成任务：点击任务任意位置切换状态
- [ ] 编辑任务：双击打开预填弹窗
- [ ] 删除任务：软删除，可撤销
- [ ] 撤销操作：Ctrl+Z 恢复上一步
- [ ] 筛选：按状态、优先级、标签筛选
- [ ] 排序：按创建时间、优先级、截止日期排序
- [ ] 搜索：按标题搜索

### 11.2 日历视图

- [ ] 月视图：显示整月网格，有任务日期高亮
- [ ] 周视图：显示一周任务列表
- [ ] 日视图：显示当天时间线任务
- [ ] 日期导航：前进后退、今日跳转
- [ ] 视图切换：月/周/日模式切换

### 11.3 标签管理

- [ ] 创建标签：名称+颜色
- [ ] 编辑标签：修改名称/颜色
- [ ] 删除标签：移除任务中的引用
- [ ] 标签筛选：在待办页按标签筛选

### 11.4 任务属性

- [ ] 优先级：无/低/中/高/紧急
- [ ] 截止日期：日期+时间选择
- [ ] 重复规则：每天/每周/工作日/每月/每年
- [ ] 定时提醒：准时/提前提醒

### 11.5 悬浮窗

- [ ] 打开悬浮窗：托盘菜单或快捷键
- [ ] 今日任务列表：显示今天待完成任务
- [ ] 快速完成：点击任务完成
- [ ] 快速添加：底部输入框回车添加
- [ ] 小球模式：双击头部缩小为球
- [ ] 展开悬浮窗：单击小球展开
- [ ] 拖拽移动：按住头部拖动
- [ ] 关闭悬浮窗：点击关闭按钮或 Esc

### 11.6 系统集成

- [ ] 系统托盘：窗口关闭后驻留托盘
- [ ] 全局快捷键：Alt+S 显隐主窗口
- [ ] 窗口置顶：设置开关控制
- [ ] 开机自启：设置开关控制

### 11.7 数据管理

- [ ] 数据导出：导出为 JSON 文件
- [ ] 数据导入：从 JSON 文件恢复
- [ ] 本地持久化：IndexedDB 自动保存

### 11.8 设置中心

- [ ] 主题配色：自定义莫兰迪色系
- [ ] 快捷键自定义：修改各操作快捷键
- [ ] 悬浮窗配置：透明度、尺寸设置

---

**文档版本**: v0.2.0  
**生成日期**: 2026-06-08  
**适用项目**: 莫兰迪日程管理应用