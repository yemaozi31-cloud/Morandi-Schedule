# 自动纠错记忆 - 莫兰迪日程

> 记录编码过程中遇到的错误及修复方案

## 响应式改造记录（2026-06-09）

### 改造内容：日历三视图手机端横条状适配

**问题**：
日历组件（MonthView/WeekView/DayView）在手机端仍使用桌面端的网格/时间轴布局，格子小、触摸面积不足、内容拥挤。

**改造方案**：

**MonthView 手机端**：
- 网格保持 7 列但压缩（`min-height: 80px → 48px`，`padding: 2px`）
- 隐藏 task-dots 圆点标记，改为显示任务标题横条（`mobile-task-strips`）
- 日期数字缩小（`width: 22px`，`font-size: 11px`）
- 选中日期高亮（`.month-cell.selected`）
- 新增 `selectedDate` prop 用于高亮当前选中日

**WeekView 手机端**：
- 整体从 grid 改为 flex column（`display: flex; flex-direction: column`）
- 顶部周头 sticky 固定（`position: sticky; top: 0; z-index: 5`）
- 每天变为独立圆角卡片（`border-radius: var(--radius-lg)` + `border`）
- 任务项放大（`font-size: var(--font-size-md)`），触摸友好

**DayView 手机端**：
- 时间轴行高从 60px 压缩到 44px
- 标签列宽从 60px 压缩到 44px
- 字号调小（`font-size: 10px`）

**CalendarView 改造**：
- 移除 `isMobile` 条件渲染分支，所有屏幕统一渲染 MonthView/WeekView/DayView
- 手机端视图切换也开放月/周/日三个选项（之前只有月）
- 删除未使用的 MobileDayList.vue 组件
- DayView 的 `current-date` 增加 `selectedDay || currentDate` 后备

**涉及文件**：
- `src/components/calendar/MonthView.vue`
- `src/components/calendar/WeekView.vue`
- `src/components/calendar/DayView.vue`
- `src/views/CalendarView.vue`
- `src/components/calendar/MobileDayList.vue`（已删除）

**预防措施**：
- 新增日历组件时，必须同时添加 `@media (max-width: 767px)` 手机端样式
- 手机端优先使用 flex column + 卡片式布局，避免复杂 grid
- 所有时间轴/网格布局必须考虑触摸目标大小（最小 44px）
- 不可用 `isMobile` 条件渲染替代 CSS 媒体查询，优先使用 CSS 响应式

---

## 初始记忆库（基于项目审查分析）

### 错误类型：CSS 溢出布局错误

**错误描述**：
页面内容溢出导致横向滚动条出现，或 flex 子项在窄屏下被压缩至消失。

**根因**：
1. flex 容器子项未设置 `min-width: 0`，导致 flex 子项在内容过长时溢出
2. 页面容器未设置 `overflow-x: hidden`，导致子元素超出可视区域
3. 弹窗内容过长时未限制 `max-height`，导致弹窗超出屏幕

**修复方案**：
```css
/* 页面根容器 */
.page-container {
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* flex 子项 */
.flex-child {
  min-width: 0;
}

/* 底部弹窗 */
.bottom-modal {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
```

**预防措施**：
- 所有页面根元素加上 `overflow-x: hidden`
- flex 容器的子项默认加 `min-width: 0`
- 底部弹出面板使用 `max-height: 80vh` + flex 布局

---

### 错误类型：TypeScript 类型未定义或隐式 any

**错误描述**：
TypeScript 严格模式下提示 `Parameter implicitly has 'any' type` 或 `Object is possibly 'undefined'`。

**根因**：
1. 函数参数缺少类型标注
2. 可选链操作符（`?.`）未正确处理 undefined 情况
3. IndexedDB 返回值未正确泛型标注

**修复方案**：
```typescript
// 错误：参数隐式 any
// function formatDate(date) { ... }

// 正确：明确类型标注
function formatDate(date: Date | string): string { ... }

// 错误：未处理 undefined
// const name = user.name

// 正确：可选链 + 默认值
const name = user?.name ?? ''

// 正确：IndexedDB 泛型
async function get<T>(storeName: string, key: string): Promise<T | undefined>
```

**预防措施**：
- 所有函数参数必须标注类型
- 使用 `??` 提供默认值，避免使用 `||`
- IndexedDB 操作函数使用泛型约束

---

### 错误类型：导入路径错误

**错误描述**：
`@/` 别名路径无法正确解析，或相对路径层级错误。

**根因**：
1. `@/` 别名需要在 `vite.config.ts` 和 `tsconfig.json` 中同时配置
2. 组件移动后未更新引用路径

**修复方案**：
- `vite.config.ts` 中配置 `resolve.alias`
- `tsconfig.json` 中配置 `paths`
- 统一使用 `@/` 别名引用 `src` 目录下的模块

**预防措施**：
- src 内部模块引用统一使用 `@/` 别名
- 避免使用深层相对路径（如 `../../../`）

---

### 错误类型：IndexedDB 版本迁移未正确执行

**错误描述**：
新增对象存储（objectStore）后数据库版本未升级，或迁移代码未正确执行。

**根因**：
1. `DB_VERSION` 常量未递增
2. `upgrade` 回调中未处理 `oldVersion` 跳级情况
3. 新增 Store 时未检查 `!db.objectStoreNames.contains()`

**修复方案**：
```typescript
export async function getDB(): Promise<IDBPDatabase> {
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // 逐版本迁移，确保跳级也能正确执行
      if (oldVersion < 1) {
        // 版本 1 的迁移逻辑
      }
      if (oldVersion < 2) {
        // 版本 2 的迁移逻辑
      }
    }
  })
  return dbInstance
}
```

**预防措施**：
- 每次新增 Store 时递增 `DB_VERSION`
- 使用 `if (oldVersion < N)` 逐版本迁移
- 创建 Store 前检查 `!db.objectStoreNames.contains('name')`

---

### 错误类型：Tauri 插件未正确注册

**错误描述**：
调用 Tauri 插件 API 时报错 `plugin is not registered`。

**根因**：
1. `package.json` 安装了 npm 包但 `tauri.conf.json` 未注册插件
2. `Cargo.toml` 未添加对应的 Rust 依赖

**修复方案**：
```json
// tauri.conf.json 中必须注册
{
  "plugins": {
    "notification": { "all": true },
    "globalShortcut": { "all": true }
  }
}
```

**预防措施**：
- 安装 Tauri 插件时同步更新三处：npm 包、Cargo.toml、tauri.conf.json
- Tauri API 调用前使用 `isTauri()` 判断运行环境

---

### 错误类型：Vue 响应式丢失

**错误描述**：
从 Pinia store 解构的数据失去响应性，或 reactive 对象直接赋值后不再触发更新。

**根因**：
1. 从 store 直接解构而非使用 `storeToRefs()`
2. `reactive` 对象整体赋值替代了引用

**修复方案**：
```typescript
// 错误：直接解构丢失响应性
// const { tasks, filter } = taskStore

// 正确：使用 storeToRefs
const { tasks, filter } = storeToRefs(taskStore)

// 错误：reactive 整体赋值
// const state = reactive({ count: 0 })
// state = { count: 1 } // 丢失响应性

// 正确：使用 ref 或逐字段赋值
const count = ref(0)
count.value = 1
```

**预防措施**：
- 从 Pinia store 解构必须使用 `storeToRefs()`
- 避免对 `reactive` 对象进行整体重新赋值
- 优先使用 `ref()` 而非 `reactive()` 定义响应式数据

---

### 错误类型：终端交互式提示未自动处理

**根因**：
- 执行 `npm install` 时未加 `--yes`，触发交互式 "Ok to proceed?" 确认
- `vitest` 检测到缺 `jsdom` 时弹出安装提示

**修复方案**：
- `npm install --yes` 或 `npm install -y` 自动跳过确认
- `npx` 命令使用 `--yes` 或 `--no-interactive` 参数
- 提前安装已知依赖（`npm install -D jsdom`），避免运行时提示

**记录文件**：见 `.trae/rules/003-terminal-auto-approve.md`

---

### 功能链路审查规范（新增规则）

**审查节点**：
- 每次新增功能/修改前必须先做逻辑链审查
- 审查通过后才能编码

**审查清单**：

1. **CRUD 链路完整性**
   - [ ] 用户操作入口 → 事件传递 → Store 调用 → DB 读写 → UI 更新 → 用户反馈
   - [ ] 所有 async 函数必须有 try/catch
   - [ ] 写入操作后必须有用户反馈（Toast / 状态变化）
   - [ ] 删除操作必须有确认对话框或撤销机制

2. **错误处理链路**
   - [ ] DB 写入失败时是否有降级方案？
   - [ ] 网络/存储不可用时用户是否看得到提示？
   - [ ] 所有 `await` 调用是否有 error boundary？

3. **边缘情况**
   - [ ] 空数据时页面是否显示空状态？
   - [ ] 加载中是否有 loading 指示器？
   - [ ] 高频操作（快速点击、连续提交）是否有防抖/节流？
   - [ ] 组件卸载时定时器/事件监听是否清理？

4. **数据一致性**
   - [ ] Store 中的内存数据与 IndexedDB 是否同步？
   - [ ] 多入口修改同一数据是否存在竞态？
   - [ ] 状态变更是否触发所有依赖组件的正确重渲染？

**已知漏洞清单（当前项目待修复）**：

| 优先级 | 问题 | 涉及 | 状态 |
|--------|------|------|------|
| P0 | 看板拖拽到非状态分组写入错误数据 | Kanban | ✅ 已修复 |
| P1 | 日历页未加载任务数据 → 空白 | Calendar | ✅ 已修复 |
| P1 | 关闭页面番茄钟计时丢失 | Pomodoro | ✅ 已修复 |
| P1 | 所有 Store async 方法无 try/catch | 全部功能 | ✅ 已修复 |
| P1 | 多处 CRUD 操作无用户反馈 | 全部功能 | ✅ 已修复 |
| P2 | undoService 已定义但未接入 | 全部功能 | ✅ 已记录 |
| P2 | 习惯无删除入口 | Habits | ✅ 已修复 |
| P2 | SmartFilter dateRange 筛选无效 | Todo | ✅ 已修复 |
| P2 | 删除无确认对话框 | Todo | ✅ 已修复 |
| P2 | 搜索与SmartFilter状态冲突 | Todo | ✅ 已修复 |
| P2 | 打卡不写入DB(虚假成功) | Habits | ✅ 已修复 |
| P2 | 软删除无自动清理 | taskStore | ✅ 已修复 |
| P3 | 搜索无 debounce | Todo | ✅ 已修复 |
| P3 | 标签分组下列名显示 UUID | Kanban | ✅ 已修复 |
| P3 | 键盘快捷键未过滤 select | keyboardService | ✅ 已修复 |
| P3 | Pomodoro暂停未保存状态 | pomodoroStore | ✅ 已修复 |

**代码审查专项修复**（2026-06-08 TRAE-code-review）：
- TaskList 组件导入缺失修复
- handleToggle/handleDelete/handleSave try/catch
- CalendarView openTask 接入编辑弹窗
- updateTask 字段白名单保护
- db.clear try/catch
- keyboardService select 过滤 + 重复注册警告
- pomodoro completeSession 先写DB后更新状态
- toggleComplete 防并发守卫

---

### 布局修复记录（2026-06-08）

**错误类型：AppLayout 缺少 Sidebar 组件导入**

**错误描述**：
AppLayout.vue 的模板中使用了 `<Sidebar />`，但 `<script setup>` 中只导入了未使用的 `TopNav` 而未导入 `Sidebar`。导致桌面端 Sidebar 无法渲染。

**根因**：
1. `Sidebar.vue` 创建后未在 `AppLayout.vue` 中注册
2. Vue 3 `<script setup>` 需要显式 import 组件
3. 旧代码遗留的 `TopNav` import 未被清理

**修复方案**：
```diff
- import TopNav from './TopNav.vue'
+ import Sidebar from './Sidebar.vue'
```

**涉及文件**：`src/components/layout/AppLayout.vue`

---

**错误类型：多个视图页面缺少 AppLayout 包裹导致布局不一致**

**错误描述**：
`TodoView.vue`、`InboxView.vue`、`UpcomingView.vue` 没有用 `<AppLayout>` 包裹，导致桌面端没有 Sidebar、移动端没有底部 Tab 栏。与 `CalendarView`、`KanbanView` 等页面的布局不一致。

**根因**：
1. 页面创建时直接使用 `<div>` 根容器，未集成布局组件
2. 布局重构后未同步更新旧页面

**修复方案**：
- 模板外层添加 `<AppLayout>` 包裹
- Script 中添加 `import AppLayout from '@/components/layout/AppLayout.vue'`
- TodoView 因结构复杂，加入 `todo-view-body` 容器分离 flex 布局

**涉及文件**：
- `src/views/TodoView.vue`
- `src/views/InboxView.vue`
- `src/views/UpcomingView.vue`

**预防措施**：
- 所有路由页面的根组件必须是 `<AppLayout>`
- 新增页面时以 `SettingsView` 或 `CalendarView` 为模板
- 代码审查中检查 `.vue` 文件的 `<template>` 第一行是否为 `<AppLayout>`（FloatingView 除外）

---

### 布局修复记录（2026-06-08）- 第二轮

**错误类型：AppLayout 使用 router-view 而非 slot 导致页面内容丢失**

**错误描述**：
AppLayout.vue 的 `<main>` 中使用的是 `<router-view />`，但所有视图页面（KanbanView、CalendarView、TodoView 等）都是将自己的内容放在 `<AppLayout>` 标签之间（作为插槽内容）。由于 AppLayout 没有 `<slot />`，这些内容被 Vue 丢弃，导致所有页面只渲染 Sidebar 和空白区域。导航栏点击后页面切换但内容区始终空白。

**根因**：
1. AppLayout 的设计意图是作为页面布局容器（通过 slot 分发页面内容），但错误地使用了 `<router-view />`
2. `<router-view />` 用于嵌套路由场景，而本项目所有路由都是平级的
3. 之前因为内容空白，Sidebar 的 `router-link` 点击后路由变化了但用户看不到内容，误以为"导航按钮无效果"

**修复方案**：
```diff
- <router-view />
+ <slot />
```

**涉及文件**：`src/components/layout/AppLayout.vue`

**影响范围**：全部 9 个路由页面（P0 级 Bug，所有页面内容均不可见）

**预防措施**：
- AppLayout 作为布局容器必须使用 `<slot />`，不要使用 `<router-view />`
- 区分两种模式：
  - 布局容器（如 Sidebar+Main）：用 `<slot />`
  - 嵌套路由出口：用 `<router-view />`
- 新增布局组件时先确认设计意图是"包裹页面内容"还是"嵌套子路由"

---

### 运行时修复记录（2026-06-08）

**错误类型：crypto.randomUUID() 在非安全上下文中抛出 DOMException**

**错误描述**：
通过局域网 IP（如 `192.168.1.61:5173`）访问应用时，新建任务/标签等需要生成 UUID 的操作全部失败，捕获到 "保存失败，请重试"。

**根因**：
`crypto.randomUUID()` 只在安全上下文（Secure Context）中可用：
- ✅ `http://localhost:5173` — 安全上下文
- ❌ `http://192.168.1.61:5173` — 非安全上下文，抛出 `DOMException`

**影响范围**：全部需要 `generateUUID()` 的写入操作（创建任务、创建标签、创建习惯、打卡等）

**修复方案**：
用 `crypto.getRandomValues()` 手动实现 UUID v4 生成，该 API 在所有上下文（包括非安全 HTTP）中可用。

```typescript
export function generateUUID(): string {
  const hex = '0123456789abcdef'
  const chars = new Array(36)
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 16; i++) {
    if (i === 4) chars[8] = '-'
    else if (i === 6) chars[13] = '-'
    else if (i === 8) chars[18] = '-'
    else if (i === 10) chars[23] = '-'
    else { const idx = i > 10 ? i + 1 : i; chars[idx] = hex[arr[i] & 0x0f] }
  }
  chars[14] = '4'
  chars[19] = hex[(arr[6] & 0x0f) | 0x08]
  return chars.join('')
}
```

**涉及文件**：`src/utils/uuid.ts`

**预防措施**：
- 禁止使用 `crypto.randomUUID()`，改用 `crypto.getRandomValues()` 实现
- 本地开发时通过 `localhost` 而非局域网 IP 访问，避免非安全上下文问题
- 所有异步操作必须有 try/catch 兜底

---

### 运行时修复记录（2026-06-08）- 第三轮

**错误类型：Vue reactive Proxy 数组无法被 IndexedDB Structured Clone 算法克隆**

**错误描述**：
通过表单提交数据时，`tagIds` 字段是 Vue `reactive([])` 创建的 Proxy 包装数组。IndexedDB 的 `put()` 方法使用 Structured Clone 算法序列化数据，该算法无法处理 Proxy 对象，抛出 `DataCloneError: [object Array] could not be cloned`。

**根因**：
1. Pinia 的 setup store 中 `ref(new Map())` 返回的 Map 值是 reactive 的
2. `Map.get()` 返回的对象是 Vue reactive Proxy 包装
3. TaskFormModal 中 `form.selectedTags` 是 `reactive([])` 创建的 Proxy 数组
4. `emit('save', { tagIds: form.selectedTags })` 传递的是 Proxy 而非普通数组
5. IndexedDB 的 Structured Clone 算法无法克隆 Proxy 对象

**修复方案**：

1. **集中修复** — 在 `db.set()` 中对所有写入数据做 JSON 序列化/反序列化，统一去除 Proxy 包装：
```typescript
export async function set(storeName: string, value: any): Promise<void> {
  const plain = JSON.parse(JSON.stringify(value))
  await db.put(storeName, plain)
}
```

2. **表单层修复** — TaskFormModal 传参时展开 Proxy 数组：
```typescript
tagIds: [...form.selectedTags]
```

3. **Store 层修复** — createTask/updateTask 中确保 tagIds 为普通数组：
```typescript
tagIds: data.tagIds ? [...data.tagIds] : []
```

**涉及文件**：
- `src/db/index.ts` — db.set 统一深拷贝
- `src/stores/taskStore.ts` — createTask/updateTask tagIds 防御
- `src/components/todo/TaskFormModal.vue` — tagIds 展开

**影响范围**：全部涉及数组字段的 IndexedDB 写入操作

**预防措施**：
- 永远不要将 Vue reactive 数据直接传给 IndexedDB
- 所有异步写入数据需在存储前深拷贝（JSON roundtrip 或 structuredClone）
- Pinia store 中从 Map.get() 获取的数据需用 `{ ...obj }` 展开后再传给外部 API

---

### UpcomingView 重设计录（2026-06-08）

**修改内容**：
1. 废弃原来的"全展开7天列表"模式（所有天同时展开，空天也占位）
2. 改为 TickTick 风格：顶部水平日期 Tab 条 + 下方选中天任务列表

**数据流**：
```
selectedDate = ref(todayStr)
  ↓
selectedTasks = computed(filter by selectedDate)
  ↓
Tab 条: 过期(红色) + 7天(今天高亮/空天灰色)
  ↓
点击 Tab → selectedDate 更新 → selectedTasks 更新
  ↓
TaskList 渲染 → toggle/delete → Store → DB → Toast
```

**涉及文件**：`src/views/UpcomingView.vue`

**修复的小 Bug**：PomodoroTimer 自定义输入 placeholder "自定" → "自定义"

---

### 全链修复记录（2026-06-08）

**修复范围**：12 条断裂因果链

| ID | 断裂点 | 修复方案 | 涉及文件 |
|----|--------|---------|---------|
| C1 | 删除标签后任务的 tagIds 未清理 | deleteTag 末尾遍历 tasks 移除 tagId | `tagStore.ts` |
| C2 | 主题切换刷新后丢失 | settingsStore 对接 IndexedDB + App.vue 加载时恢复 | `settingsStore.ts`, `App.vue` |
| C3 | 导入数据后界面不同步 | import 实际写入 DB + 自动 reload | `DataManager.vue` |
| C4 | Store 无 try/catch | tagStore(4处) + habitStore(6处) 补全 | `tagStore.ts`, `habitStore.ts` |
| C5 | View toggle catch 为空 | InboxView + UpcomingView 加 Toast | `InboxView.vue`, `UpcomingView.vue` |
| C6 | 创建习惯未 await | handleSave 加 await + try/catch | `HabitsView.vue` |
| C7 | Kanban 拖拽无错误处理 | handleMoveTask 加 await + try/catch | `KanbanView.vue` |
| C8 | FloatingView 虚假成功 Toast | handleQuickAdd + toggleComplete 加 try/catch | `FloatingView.vue` |
| C9 | 批量操作失败无回滚 | 逐项追踪 success/fail，部分失败显示 warning | `TodoView.vue` |
| C10 | 键盘快捷键只在 TodayView | 移到 App.vue 全局注册 | `App.vue` |
| C11 | 清空数据界面不同步 | 已有 reload ✅ | — |
| C12 | undoService 死代码 | 删除未使用文件 | `undoService.ts` 已删除 |

**验证结果**：构建 0 错误 + 0 诊断错误，三链全部畅通。详细信息见 `.trae/documents/complete-logic-chain.md`

---

### 颜色选择器椭圆修复 + 自检协议更新（2026-06-08）

**错误**：手机端选择习惯/标签颜色时，颜色圈变成椭圆。

**根因**：`responsive.css` 第 60 行 `@media (max-width: 767px)` 中 `button:not(...) { min-height: 36px }` 覆盖了 `.color-option` 的 `height: 28px`。

**修复**：`.color-option` 加 `min-height: 28px` 明确覆盖全局规则。

**涉及文件**：
- `src/views/HabitsView.vue`（CSS +282）
- `src/views/TagsView.vue`（CSS +265）

**自检协议更新**：`.trae/rules/004-self-check-hook.md` 3.3 节新增 `min-height` 挤压检查项

---

### 跨天任务截止时间显示修复（2026-06-10）

**错误**：
跨天任务（`isSpanning: true`）的截止时间（`dueTime`，如 `18:00`）在周视图、日视图和日历面板中每天都会显示，但截止时间只应该显示在最后一天。

**根因**：
1. **WeekView.vue**：`<span v-if="task.dueTime">` 无条件显示，未区分当前天是否为最后一天
2. **CalendarView.vue** 日面板：同上的无条件显示
3. **DayView.vue**：跨天任务在中间天被分配到时间轴的具体时段（如18:00），但不应该有时间位置

**修复方案**：
1. **WeekView.vue**（桌面+手机）：`v-if="task.dueTime && (!task.isSpanning || task.dueDate === day.date)"` — 只在最后一天显示`dueTime`
2. **CalendarView.vue**（日面板）：`v-if="task.dueTime && (!task.isSpanning || task.dueDate === selectedDay)"`
3. **DayView.vue**：
   - `allDayTasks` 增加 `(t.isSpanning && t.dueDate !== props.currentDate)` — 跨天任务在中间天归入"全天"区
   - `getTasksForHour` 增加 `if (t.isSpanning && t.dueDate !== props.currentDate) return false` — 跨天任务只在最后天显示在时间轴上

**涉及文件**：
- `src/components/calendar/WeekView.vue`
- `src/components/calendar/DayView.vue`
- `src/views/CalendarView.vue`

**预防措施**：
- 跨天任务的 `dueTime` 显示时必须判断当前日期是否等于 `task.dueDate`
- DayView 中跨天任务在中间天应归入"全天"（all-day）区而非时间轴

---

### 本周页面命名统一 + 桌面端高度撑满修复（2026-06-10）

**修改内容**：

1. **"最近7天" → "本周" 统一改名**
   - `src/utils/constants.ts` — 导航标签 `最近7天` → `本周`
   - `src/router/index.ts` — 路由元数据 title `最近7天` → `本周`
   - `src/views/UpcomingView.vue` — 页面标题 `最近7天` → `本周`

2. **桌面端 WeekView 高度撑满修复**

**问题**：
本周页面的 7 列网格在桌面端不填满页面剩余高度，高度由任务内容决定。

**根因**：
`AppLayout.vue` 的 `.main-content` 缺少 `display: flex; flex-direction: column;`，导致子元素（如 `.upcoming-view`）的 `flex: 1` 完全不生效。CSS 中 `flex: 1` 只在父元素为 flex 容器时才有效。

**修复方案**：

- **AppLayout.vue**（核心修复）：`.main-content` 追加 `display: flex; flex-direction: column;`，使 slot 内容能通过 `flex: 1` 填满剩余高度
- **WeekView.vue**：`.week-body` 从 `display: grid; grid-template-rows: 1fr` 改为 `display: flex; flex-direction: row;`，flex 布局的高度传递比 grid 的 `1fr` 更可靠
- **UpcomingView.vue**：`.week-wrapper` 追加 `display: flex; flex-direction: column;`，确保高度沿 flex 链逐级传递

**涉及文件**：
- `src/components/layout/AppLayout.vue`
- `src/components/calendar/WeekView.vue`
- `src/views/UpcomingView.vue`
- `src/utils/constants.ts`
- `src/router/index.ts`

**预防措施**：
- 所有布局容器的直接子元素如需使用 `flex: 1` 撑满空间，父容器必须有 `display: flex; flex-direction: column;`
- 不要依赖多层 flex 链中的 `grid-template-rows: 1fr` 传递高度，改用 flex row 布局
- 新增路由页面时先确认 `.main-content` 是 flex 容器

---

### 周视图跨天任务连续大长条（2026-06-10）

**需求**：
跨天任务在 WeekView 桌面端网格中不再按天拆分为独立卡片，而是渲染为一个整体的连续色条，横跨起始日到截止日的多个列，优先显示在所有普通任务上方。

**实现**：
1. **新增 `spanning-section`** — 位于 week-header 和 week-body 之间的 7列 CSS Grid 区域，`gap: 1px` 保持与 week-body 列对齐
2. **新增 `spanningTasksInWeek` 计算属性** — 遍历任务列表，筛选出与本周有交集的跨天任务，计算其 `startCol/endCol`（CSS grid 列范围）
3. **新增 `getRegularTasksForDate`** — 桌面端网格专用，过滤掉所有 `isSpanning` 任务，避免重复显示
4. **保留 `getTasksForDate`** — 手机端卡片继续使用，跨天任务按日期范围显示在每天卡片中
5. **spanning-bar 样式**：
   - 根据优先级着色（与 task-card 一致）
   - 标题居中（`justify-content: center`）
   - 左侧有完成切换按钮（圆圈），悬停显示右侧删除按钮
   - 多行跨天任务通过 `gridRow: idx + 1` 纵向堆叠

**涉及文件**：
- `src/components/calendar/WeekView.vue`

**预览效果**：
```
|  周一  |  周二  |  周三  |  周四  |  周五  |  周六  |  周日  |
| [◯ 项目开发  ×] ← 连续长条横跨 3 天
| [卡片A] | [卡片B] | [卡片C] | ...普通任务
```

---

### 强制流程规范沉淀（2026-06-10）

**需求**：
用户要求每次修改代码后必须执行自检 + 更新日志，并将此流程沉淀为项目规则。以后用户说"更新日志"就要自动执行。

**修改内容**：
1. **`000-globalrule.md`** 新增"九、强制流程规范"章节：
   - 9.1 自检（构建 + 诊断 + 功能链路）
   - 9.2 更新日志（写入 `001-error-memory.md`）
   - 9.3 术语说明（日志/三链/更新日志的定义）
2. **`004-self-check-hook.md`** 全面重写：
   - 新增"术语定义"章节（日志 = 001-error-memory.md，三链等）
   - 新增"核心原则"（自检+日志缺一不可）
   - Step 4 从"修改记录"改为"更新日志（强制）"
   - 新增"强制提醒"结束前确认清单

**涉及文件**：
- `.trae/rules/000-globalrule.md`
- `.trae/rules/004-self-check-hook.md`

**术语定义**（已固化进规则）：
- **日志** = `001-error-memory.md`
- **三链** = CRUD链路、错误处理链路、数据一致性链路
- **更新日志** = 向 `001-error-memory.md` 追加修改记录

**预防措施**：
- 每次修改结束前，必须完成：构建验证通过 → 诊断通过 → 功能链路自检 → 更新日志
- 用户说"更新日志"即指向 `001-error-memory.md` 写入修改记录

---

### 本周页周导航 + 跨天长条布局修复（2026-06-10）

**修改内容**：

1. **WeekView.vue — 跨天长条移入 week-body 内部**
   - 问题：`.spanning-section` 在 `.week-body` 外部，作为独立区域夹在 week-header 和 week-body 之间，长条可能溢出容器的 `border-radius` 裁剪区域
   - 修复：将 `.spanning-section` 移到 `.week-body` 内部（作为首个子元素），新增 `.week-columns-row` 包裹原有 7 列
   - CSS 修改：`.week-body` 从 `flex-direction: row` 改为 `column`，移除 `gap`；`.week-columns-row` 取 `flex: 1` 分配剩余空间；`.spanning-section` 加 `flex-shrink: 0` 避免被压缩
   - 效果：长条在 week-body 的 `overflow: hidden` + `border-radius` 框内，占用自然高度

2. **UpcomingView.vue — 添加周导航**
   - 问题："本周"页面（UpcomingView）嵌入的 WeekView 没有 prev/next 导航，只能看当前周
   - 修复：将静态 `<h2>本周</h2>` 替换为导航头（← 标题 → + "今天"按钮），与 CalendarView 的 CalendarHeader 风格一致
   - 新增 `goPrev/goNext/goToday` 函数和 `headerTitle` 计算属性（显示 "6月1日 - 7日" 格式周范围）
   - 新增 `.week-nav-header` 和 `.nav-btn`/`.today-btn` 样式

**涉及文件**：
- `src/components/calendar/WeekView.vue`
- `src/views/UpcomingView.vue`

**预防措施**：
- 所有用到 WeekView 的页面必须有周导航，不能固定显示当前周
- WeekView 内部的 `.spanning-section` 必须始终在 `.week-body` 内部，避免溢出
- 修改 flex/grid 嵌套结构后必须构建验证，确保模板标签闭合完整

---

### "本周"页面与 WeekView 统一 + 跨天长条截断修复（2026-06-10）

**需求**：
1. "本周"页面（UpcomingView）和"周视图"（CalendarView 中的 week tab）应该是同一个页面，避免逻辑分裂
2. WeekView 的跨天长条被 `.week-body` 的 `overflow: hidden` 截断，应在容器内部正常显示并占用自己的站位
3. CalendarView 去掉冗余的"周"视图选项，由"本周"页面统一提供周视图能力

**修改内容**：

1. **WeekView.vue — 添加内置周导航**
   - 新增 `.week-nav-header` 导航区域（← 标题 → + "今天"按钮）
   - 新增 `navTitle` 计算属性（显示 "6月1日 - 7日" 格式周范围）
   - 新增 `goPrevWeek/goNextWeek/goCurrentWeek` 方法，同时 emit `update:currentDate` 和 `selectDate`
   - 新增 `update:currentDate` emit 声明，父组件监听此事件同步日期状态

2. **WeekView.vue — 修复跨天长条截断**
   - 将 `overflow: hidden` 从 `.week-body` 移至 `.week-columns-row`
   - 跨天长条（`.spanning-section`）不再被 `.week-body` 的 `border-radius` 裁剪
   - `.week-columns-row` 保留 `overflow: hidden` 防止内部任务卡片溢出

3. **UpcomingView.vue — 简化**
   - 移除原有的 `.week-nav-header` 导航头（由 WeekView 自带导航接管）
   - 移除 `headerTitle`、`goPrev/goNext/goToday` 函数
   - 移除 `Icon` 组件导入和 `format/parseISO/addWeeks/addDays/startOfWeek` 日期工具导入
   - 在 `<WeekView>` 上添加 `@update:current-date="currentDate = $event"` 监听

4. **CalendarView.vue — 去除"周"视图**
   - 从 `desktopViews` 和 `mobileViews` 中移除 `{ key: 'week', label: '周' }`
   - 移除模板中的 `WeekView` 使用（`v-else-if="currentView === 'week'"` 分支）
   - 移除 `WeekView` 组件导入
   - 移除 `headerTitle` 中的 week 逻辑，简化为月/日两种
   - 移除 `goPrev/goNext` 中的 week 分支
   - 清理未使用的 `addWeeks`、`startOfWeek` 导入

**涉及文件**：
- `src/components/calendar/WeekView.vue`
- `src/views/UpcomingView.vue`
- `src/views/CalendarView.vue`

**预防措施**：
- WeekView 应该自包含导航，不依赖父组件提供导航控制
- 跨天"连续长条"所在容器不能有 `overflow: hidden`（可下放到子容器）
- CalendarView 的视图选项必须与导航侧边栏的路由去重，避免功能重叠
- 修改 flex/grid 嵌套必须构建验证
