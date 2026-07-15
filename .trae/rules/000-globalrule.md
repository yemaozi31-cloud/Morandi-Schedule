# 项目全局规则 - 莫兰迪日程 (Morandi Schedule)

> 项目版本: v0.4.0 | 技术栈: Vue 3 + TypeScript + Vite + Tauri v2

## 一、项目概述

莫兰迪日程是一款个人日程管理桌面应用，基于 Vue 3 + TypeScript + Tauri v2 构建，采用本地优先存储（IndexedDB），支持 Web/桌面双端运行。

## 二、技术栈规范

| 层级 | 技术 | 规范要求 |
|------|------|---------|
| 语言 | **TypeScript** | 严格模式，所有类型必须定义 |
| 框架 | **Vue 3** (Composition API) | `<script setup lang="ts">` 语法 |
| 构建 | **Vite 6** | dev port 3000，output dist/ |
| 状态管理 | **Pinia** | defineStore + setup 语法 |
| 路由 | **Vue Router 4** | Hash 模式 |
| UI 组件 | **Naive UI** | 通过 NConfigProvider 注入莫兰迪主题 |
| 样式 | **纯 CSS 变量** | 莫兰迪色系，不使用 CSS 预处理器 |
| 数据持久化 | **IndexedDB** (via `idb`) | 版本号管理 + 迁移策略 |
| 桌面端 | **Tauri v2** | Rust 后端 + 前端构建 |
| 测试 | **Vitest** | 与 Vite 配置集成 |
| 日期处理 | **date-fns** | 函数式导入，按需引用 |

## 三、目录结构规则

```
src/
├── main.ts                    # 应用入口
├── App.vue                    # 根组件（主题注入）
├── env.d.ts                   # 类型声明
├── router/                    # 路由配置（Hash模式）
├── stores/                    # Pinia 状态管理
├── db/                        # IndexedDB 封装（含版本迁移）
├── views/                     # 页面视图
├── components/                # 可复用组件
│   ├── layout/               # 布局组件
│   ├── common/               # 通用组件
│   └── {module}/             # 按模块分目录
├── composables/               # Vue 组合式函数
├── utils/                     # 工具函数
├── types/                     # TypeScript 类型定义
└── styles/                    # CSS 样式
    ├── variables.css          # CSS 变量（浅色+深色）
    ├── global.css             # 全局样式
    └── responsive.css         # 响应式适配
```

## 四、编码规范

### TypeScript
- 使用严格模式（`strict: true`）
- 所有函数参数、返回值必须有类型标注
- 使用 `interface` 定义对象类型，`type` 定义联合类型/工具类型
- 禁止使用 `any`，优先使用 `unknown`
- `@/` 路径别名引用 src 目录

### Vue 组件
- 使用 `<script setup lang="ts">` Composition API
- 组件名使用 PascalCase，文件名使用 PascalCase
- Props 使用 `defineProps<T>()` 泛型语法
- Emits 使用 `defineEmits<T>()` 泛型语法
- 模板中最多嵌套 3 层，超出则提取子组件

### Pinia Store
- 使用 setup function 语法
- 状态使用 `ref()` / `computed()` 定义
- 操作方法使用普通 function
- 按模块拆分，每个 Store 职责单一

### CSS 样式
- 使用 CSS 变量引用莫兰迪色系（定义在 `variables.css`）
- 不使用 CSS 预处理器（SCSS/Less）
- 响应式断点：Mobile < 768px | Tablet 768-1024px | Desktop ≥ 1024px
- flex 子项必须加 `min-width: 0` 防止溢出
- 页面容器必须加 `overflow-x: hidden`

### IndexedDB 操作
- 通过 `db/index.ts` 封装的工具函数操作
- 数据库版本变更必须编写对应的 `upgrade` 迁移逻辑
- 所有 Store 名称使用常量定义（`constants.ts`）

### Tauri 相关
- Web 端与 Tauri 端通过 `useTauri` composable 解耦
- Tauri API 调用必须包裹在 `isTauri()` 判断内
- 插件需同时在 `package.json` 和 `tauri.conf.json` 中注册

## 五、命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件文件 | PascalCase | `TaskItem.vue` |
| Vue 组件名 | PascalCase | `TaskItem` |
| 工具函数 | camelCase | `formatDate()` |
| Store | camelCase + Store 后缀 | `taskStore` |
| 类型接口 | PascalCase | `Task`, `TaskFilter` |
| CSS 变量 | kebab-case + `--` 前缀 | `--color-primary` |
| 目录名 | kebab-case | `calendar/`, `components/layout/` |

## 六、Git 提交规范

提交信息格式: `type(scope): description`

- `feat`: 新功能
- `fix`: 修复
- `refactor`: 重构
- `style`: 样式调整
- `docs`: 文档
- `chore`: 构建/依赖

## 七、环境依赖

- Node.js v24.15.0+
- npm 11.12.1+
- Rust 1.96.0+（Tauri 构建时需）
- Windows WebView2（Windows 10+ 内置）

## 八、构建与部署

- `npm run dev` — 启动 Vite 开发服务器 (port 3000)
- `npm run build` — TypeScript 检查 + Vite 构建
- `npm run test:run` — Vitest 测试
- `npm run tauri dev` — Tauri 桌面端开发
- `npm run tauri build` — Tauri 桌面端构建打包

## 九、强制流程规范（每次修改必须执行）

每次编码修改结束后，必须按以下流程执行，**缺一不可**：

### 9.1 自检
- 执行 `npx vite build` 确认 0 错误
- 执行 GetDiagnostics 确认 0 诊断错误
- 按修改范围勾选功能链路自检

### 9.2 更新日志
- 将本次修改写入 `.trae/rules/001-error-memory.md`
- 必须包含：修改内容、涉及文件、修复方案、预防措施

### 9.3 术语说明
- **日志**：指 `001-error-memory.md`（错误记忆文件/三链记录）
- **三链**：CRUD链路、错误处理链路、数据一致性链路
- **更新日志**：即向 `001-error-memory.md` 追加修改记录

> 详细自检清单见 `.trae/rules/004-self-check-hook.md`
