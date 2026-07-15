# 平台兼容规范 - 莫兰迪日程

> 目标平台: Web (SPA) + 桌面 (Tauri v2) | 框架: Vue 3 + TypeScript

## 一、运行环境

| 平台 | 运行时 | 说明 |
|------|--------|------|
| Web | 现代浏览器 (Chrome/Firefox/Edge/Safari) | 通过 Vite 构建为静态 SPA |
| 桌面 | Windows 10+ / macOS / Linux | Tauri v2 嵌入 WebView |
| 移动端 | iOS / Android | Tauri v2 移动端（后续支持） |

## 二、Vue 3 + TypeScript 语法规范

### 2.1 组件定义

- 统一使用 `<script setup lang="ts">` Composition API
- 禁止使用 Options API（`export default { data(), methods: {} }`）

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  title: string
  count?: number
}>()

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()
</script>
```

### 2.2 响应式数据

- 普通数据用 `ref()`，对象数据用 `reactive()`（避免整体赋值）
- 计算属性用 `computed()`
- 从 store 解构时必须使用 `storeToRefs()`
- 禁止对 `reactive` 对象整体重新赋值

### 2.3 生命周期

- `onMounted` / `onUnmounted` 替代 `mounted` / `destroyed`
- 异步操作在 `onMounted` 中执行，清理操作在 `onUnmounted` 中执行
- 避免在 `watch` 中执行副作用，优先使用 `watchEffect`

### 2.4 模板语法

- 使用 `v-if` / `v-else-if` / `v-else` 条件渲染
- 使用 `v-for` 时必须绑定 `:key`
- 禁止在模板中调用复杂函数或方法（应使用计算属性）
- 事件绑定使用 `@click` / `@change` 等简写

## 三、Web 端兼容规则

### 3.1 浏览器兼容

- 目标: Chrome 90+, Firefox 90+, Edge 90+, Safari 15+
- 使用 ES2020 语法（`??`、`?.`、`Promise.allSettled` 等已广泛支持）
- 避免使用较新的 API（如 `Array.fromAsync`、`Iterator` helpers）

### 3.2 SPA 路由

- 必须使用 **Hash 模式** 路由（兼容静态托管平台）
- 不需要配置 404 fallback

### 3.3 响应式适配

```css
/* 响应式断点 */
@media (max-width: 767px) { /* 移动端 */ }
@media (min-width: 768px) and (max-width: 1023px) { /* 平板 */ }
@media (min-width: 1024px) { /* 桌面 */ }
```

- 移动端（< 768px）使用底部 Tab 导航
- 桌面端（≥ 1024px）使用顶部导航栏
- 主布局容器必须同时适配两种模式

### 3.4 无网/离线

- 所有数据存储在 IndexedDB 本地，离线功能完整
- 仅在触发云同步时检查网络状态
- 网络不可用时静默降级，不阻断用户操作

## 四、Tauri 桌面端兼容规则

### 4.1 环境判断与解耦

```typescript
// composables/useTauri.ts
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function useTauriPlugin<T>(pluginName: string, fn: () => Promise<T>): Promise<T | null> {
  if (!isTauri()) return null
  try {
    return await fn()
  } catch (e) {
    console.warn(`Tauri plugin "${pluginName}" not available:`, e)
    return null
  }
}
```

- 所有 Tauri API 调用前必须判断 `isTauri()`
- 在 Web 端使用 mock/fallback 替代 Tauri 功能

### 4.2 Tauri 插件注册规范

每个 Tauri 插件的启用需同步三处：

| # | 位置 | 操作 |
|---|------|------|
| 1 | `package.json` devDependencies | 添加 `@tauri-apps/plugin-xxx` |
| 2 | `src-tauri/Cargo.toml` | 添加 Rust crate 依赖 |
| 3 | `tauri.conf.json` → `plugins` | 注册插件配置 |

### 4.3 窗口管理

- 主窗口: 800×600，最小 400×500
- 悬浮窗: Tauri 独立无边框窗口，通过 `emit`/`listen` 事件通信
- Web 端悬浮窗降级为主页面内嵌面板

### 4.4 系统集成

| 功能 | 实现方式 | Web 端降级 |
|------|---------|-----------|
| 系统通知 | `@tauri-apps/plugin-notification` | Notification API |
| 全局快捷键 | `@tauri-apps/plugin-global-shortcut` | 不支持 |
| 开机自启 | `@tauri-apps/plugin-autostart` | 不支持 |
| 窗口状态 | `@tauri-apps/plugin-window-state` | 不支持 |
| 剪贴板 | `@tauri-apps/plugin-clipboard-manager` | `navigator.clipboard` |
| 系统托盘 | `@tauri-apps/plugin-shell` | 不支持 |

## 五、索引及数据库兼容

### 5.1 IndexedDB 兼容性

- 所有现代浏览器和 Tauri WebView 均支持 IndexedDB
- 封装在 `db/index.ts`，统一通过 `idb` 库操作
- 数据库版本变更使用迁移模式（非破坏性更新）

### 5.2 数据存储限制

- IndexedDB 无大小限制（受磁盘空间约束）
- 单个对象存储建议不超过 10000 条记录
- 定时清理 `deletedAt > 30 天` 的软删除数据

## 六、样式兼容规则

### 6.1 CSS 变量系统

- 所有颜色值通过 CSS 变量引用（定义在 `variables.css`）
- 深色主题通过 `[data-theme='dark']` 选择器覆盖
- 禁止硬编码颜色值

### 6.2 Naive UI 主题覆盖

```typescript
// 通过 NConfigProvider 的 themeOverrides 属性覆盖
const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: 'var(--color-primary)',
    borderRadius: '8px'
  }
}))
```

### 6.3 布局防溢出

```css
/* 每个页面根容器必须应用 */
:root {
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* flex 子项防压缩 */
.flex-item {
  min-width: 0;
}

/* 底部弹窗 */
.modal-bottom {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
```

## 七、测试兼容规则

- 使用 Vitest 作为测试框架
- 组件测试使用 `@vue/test-utils`
- 涉及 IndexedDB 的测试使用 mock 或 `fake-indexeddb`
- Tauri 相关功能在非 Tauri 环境中返回 mock 数据
