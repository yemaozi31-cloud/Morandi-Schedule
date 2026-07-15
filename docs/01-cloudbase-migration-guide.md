# Schedule 项目迁移到 CloudBase 执行指南

> 本文档供 Schedule 项目的 AI 按照步骤逐一实施

## 一、概述

**目标**：将本项目的本地 IndexedDB 存储迁移到腾讯云 CloudBase，实现三段互通（手机/电脑/网页共用一套数据）

**最终架构**：

```
Schedule (Vue 3 + Tauri)
  ├── 前端部署: CloudBase 静态托管
  ├── 数据库: CloudBase 文档型数据库 (schedule_* 集合)
  ├── 认证: CloudBase Auth (邮箱登录)
  └── 存储: CloudBase 云存储
```

**与 team-collab 共享同一个 CloudBase 环境 ID**：`prod-d6gvd6itt9b8a4354`

**数据隔离方式**：所有集合名以 `schedule_` 为前缀，与 team-collab 的 `teamcollab_` 前缀天然隔离。

---

## 二、环境准备

### 2.1 安装 CloudBase SDK

```bash
npm install @cloudbase/js-sdk
```

### 2.2 配置 cloudbaserc.json

修改 `cloudbaserc.json` 为：

```json
{
  "version": "2.0",
  "envId": "prod-d6gvd6itt9b8a4354",
  "framework": {
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

### 2.3 初始化 CloudBase 客户端

新建文件 `src/lib/cloudbase.ts`：

```typescript
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: 'prod-d6gvd6itt9b8a4354'
})

export const auth = app.auth()
export const db = app.database()
```

---

## 三、接入认证系统

### 3.1 创建登录页

新建 `src/views/LoginView.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { auth } from '@/lib/cloudbase'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const isRegister = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  try {
    if (isRegister.value) {
      await auth.signUpWithEmailAndPassword(email.value, password.value)
    } else {
      await auth.signInWithEmailAndPassword(email.value, password.value)
    }
    // 登录成功后跳转到主页
    router.push('/')
  } catch (e: any) {
    error.value = e.message || '操作失败'
  }
}
</script>

<template>
  <div class="login-container">
    <h1>{{ isRegister ? '注册' : '登录' }}</h1>
    <form @submit.prevent="handleSubmit">
      <input v-model="email" type="email" placeholder="邮箱" required />
      <input v-model="password" type="password" placeholder="密码" required />
      <button type="submit">{{ isRegister ? '注册' : '登录' }}</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <button @click="isRegister = !isRegister">
      {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
    </button>
  </div>
</template>
```

### 3.2 在路由中添加登录页

修改 `src/router/index.ts`，添加登录路由：

```typescript
{
  path: '/login',
  name: 'login',
  component: () => import('@/views/LoginView.vue')
}
```

### 3.3 添加认证守卫

修改 `src/App.vue`，在挂载时检查登录状态：

```typescript
import { auth } from '@/lib/cloudbase'

onMounted(async () => {
  // 等待 CloudBase 认证状态初始化
  await auth.getLoginState()
  // 未登录则跳转到登录页
  if (!auth.currentUser) {
    router.push('/login')
  } else {
    // 加载数据...
  }
})
```

---

## 四、替换数据层（核心变更）

### 4.1 新增 CloudBase 数据服务

新建 `src/lib/cloudbase-db.ts`，封装所有数据库操作：

```typescript
import { db } from './cloudbase'

// 所有集合名使用 schedule_ 前缀，与 team-collab 隔离
const COLLECTIONS = {
  tasks: 'schedule_tasks',
  tags: 'schedule_tags',
  habits: 'schedule_habits',
  habitCheckIns: 'schedule_habitCheckIns',
  pomodoroSessions: 'schedule_pomodoroSessions',
  settings: 'schedule_settings'
} as const

// 通用 CRUD
export async function getAll<T>(collectionName: string): Promise<T[]> {
  const res = await db.collection(collectionName).get()
  return res.data as T[]
}

export async function get<T>(collectionName: string, id: string): Promise<T | null> {
  const res = await db.collection(collectionName).doc(id).get()
  return res.data?.[0] as T || null
}

export async function set(collectionName: string, value: any): Promise<void> {
  const { id, ...data } = value
  const existing = await db.collection(collectionName).doc(id).get()
  if (existing.data?.length) {
    await db.collection(collectionName).doc(id).update(data)
  } else {
    await db.collection(collectionName).add({ _id: id, ...data })
  }
}

export async function remove(collectionName: string, id: string): Promise<void> {
  await db.collection(collectionName).doc(id).remove()
}

export async function clear(collectionName: string): Promise<void> {
  const res = await db.collection(collectionName).get()
  const promises = res.data.map((doc: any) =>
    db.collection(collectionName).doc(doc._id).remove()
  )
  await Promise.all(promises)
}

// 查询：按字段匹配
export async function query<T>(
  collectionName: string,
  field: string,
  value: any
): Promise<T[]> {
  const res = await db.collection(collectionName).where({ [field]: value }).get()
  return res.data as T[]
}

export { COLLECTIONS }
```

### 4.2 逐个替换 Pinia Store

以 taskStore 为例，修改 `src/stores/taskStore.ts`：

**修改前**（IndexedDB 版本）：

```typescript
import * as db from '@/db'

async function loadTasks() {
  const data = await db.getAll<Task>('tasks')
  tasks.value = new Map(data.map(t => [t.id, t]))
}

async function createTask(data: Partial<Task>) {
  const task: Task = { /* ... */ }
  await db.set('tasks', task)
  tasks.value.set(task.id, task)
}
```

**修改后**（CloudBase 版本）：

```typescript
import * as cloudDB from '@/lib/cloudbase-db'

async function loadTasks() {
  const data = await cloudDB.getAll<Task>(cloudDB.COLLECTIONS.tasks)
  tasks.value = new Map(data.map(t => [t.id, t]))
}

async function createTask(data: Partial<Task>) {
  const task: Task = { /* ... */ }
  await cloudDB.set(cloudDB.COLLECTIONS.tasks, task)
  tasks.value.set(task.id, task)
}
```

**需要修改的 store 清单**：

| Store 文件 | 替换内容 | 需要处理的集合 |
|-----------|---------|--------------|
| `src/stores/taskStore.ts` | 所有 `db.set/getAll/remove` 调用 | `schedule_tasks` |
| `src/stores/tagStore.ts` | 所有 `db.set/getAll/remove` 调用 | `schedule_tags` |
| `src/stores/habitStore.ts` | 所有 `db.set/getAll/remove` 调用 | `schedule_habits`, `schedule_habitCheckIns` |
| `src/stores/pomodoroStore.ts` | 所有 `db.set/getAll/remove` 调用 | `schedule_pomodoroSessions` |
| `src/stores/settingsStore.ts` | 所有 `db.set/getAll/remove` 调用 | `schedule_settings` |

**修改原则**：

1. 将 `import * as db from '@/db'` 替换为 `import * as cloudDB from '@/lib/cloudbase-db'`
2. 将 `db.getAll<T>('tasks')` 替换为 `cloudDB.getAll<T>(cloudDB.COLLECTIONS.tasks)`
3. 将 `db.set('tasks', value)` 替换为 `cloudDB.set(cloudDB.COLLECTIONS.tasks, value)`
4. 将 `db.remove('tasks', id)` 替换为 `cloudDB.remove(cloudDB.COLLECTIONS.tasks, id)`
5. 将 `db.clear('tasks')` 替换为 `cloudDB.clear(cloudDB.COLLECTIONS.tasks)`

### 4.3 修改 DataManager.vue（导入/导出/清空）

修改 `src/components/settings/DataManager.vue`，将本地 IndexedDB 操作改为 CloudBase 操作：

- 导出：从 CloudBase 读取全部集合数据
- 导入：写入 CloudBase
- 清空：清除 CloudBase 集合

### 4.4 修改 App.vue 数据加载

修改 `src/App.vue` 的 `onMounted` 钩子，数据加载路径不变（store 内部已改为 CloudBase），但需要确保：

1. 先等待认证状态就绪
2. 再加载数据

---

## 五、处理离线场景（重要）

Schedule 是 Tauri 应用，需要考虑离线使用。**建议保留 IndexedDB 作为本地缓存，CloudBase 作为云端同步层**。

实现思路（可选，非必须）：

```
写入时：先写本地 IndexedDB → 再写 CloudBase
读取时：先读本地 IndexedDB（秒开）→ 后台同步 CloudBase
联网时：自动同步
```

如果第一阶段只做纯在线版本，可以暂时去掉 IndexedDB，全部走 CloudBase。

---

## 六、部署

### 6.1 构建

```bash
npm run build
```

### 6.2 部署到 CloudBase

```bash
cd d:\Create\Schedule
npx tcb framework deploy
```

### 6.3 访问地址

部署成功后，CloudBase 会给静态托管分配一个域名，类似：

```
https://prod-d6gvd6itt9b8a4354-xxxxxxxx.tcloudbase.app
```

或配置自定义子域名：`schedule.你的域名.cn`

---

## 七、三段互通说明

迁移完成后，数据流向为：

```
手机（Tauri App）      电脑（Tauri App）       网页（浏览器）
      │                      │                     │
      └──────────────┬───────┴─────────────┘
                     │
           CloudBase 云数据库
           （同一个集合、同一份数据）
                     │
                Auth 认证
           （邮箱登录，识别用户身份）
```

- 所有设备用同一个邮箱登录
- CRUD 操作都指向 CloudBase 同一个集合
- 数据实时同步（CloudBase 数据库写入后，所有客户端刷新即可看到）

---

## 八、注意事项

1. **环境 ID**：确保 `envId` 与 team-collab 用的相同：`prod-d6gvd6itt9b8a4354`
2. **集合前缀**：所有集合名以 `schedule_` 开头，不要和 team-collab 的 `teamcollab_` 混用
3. **Auth 配置**：需要在 CloudBase 控制台开启邮箱登录（身份认证 → 登录方式 → 邮箱登录）
4. **安全规则**：可以给每个集合配置安全规则限制只能登录用户读写
5. **Tauri 兼容**：`@cloudbase/js-sdk` 在浏览器和 Tauri 的 WebView 中都能工作
