# 云端同步重构计划书 v0.4.3

## 1. 当前问题

```
每次变更 → triggerAutoSync() → 防抖2s → pushToWebDAV（只上传）
用户手动 → sync() → pushToWebDAV → pullFromWebDAV（全量双向）

问题：
  1. 防抖 2s 太长：连续操作要等 2s 没动静才上传
  2. 单向上传：自动同步只 push，其他设备的变更永远拉不下来
  3. 无后台轮询：不开 App 就收不到远程变更
  4. 无离线支持：断网时操作直接失败，丢了就丢了
```

## 2. 目标架构

```
在线操作 → store方法 → 乐观更新UI → 防抖300ms → push上传 + pull下载（双向）
                                                          ↓
                                                    WebDAV云端
                                                          ↑
后台轮询 → 每5分钟 → pull下载合并（不 push）

离线操作 → 存入 IndexedDB 队列 → 上线后按序重放 → 全部完成后触发一次 sync()
```

## 3. 核心策略

| 项 | 旧值 | 新值 | 理由 |
|----|------|------|------|
| 防抖 | 2000ms | **300ms** | 大厂普遍无防抖或极短。300ms 能合并同一次连续操作，又不会让用户等 |
| 方向 | 只 push | **双向 push + pull** | push 后立刻 pull，其他设备的变更立刻能看到 |
| 后台轮询 | 无 | **每 5 分钟 pull 一次** | 用户不操作时也能收到远程变更 |
| 离线队列 | 无 | **IndexedDB 队列 + 上线重放** | 断网不丢操作，类似 Notion/Todoist 的离线模式 |
| 冲突策略 | LWW（不变） | LWW（不变） | 按 updatedAt 取新，当前方案已够用 |

## 4. 数据流图

```
用户操作
  │
  ├── 在线 ──→ store.createTask/updateTask/deleteTask
  │                  │
  │                  ├── 乐观更新 UI（立即响应）
  │                  │
  │                  └── triggerAutoSync()
  │                          │
  │                  防抖 300ms（合并连续操作）
  │                          │
  │                  并发锁 acquirePushLock
  │                          │
  │                  ┌── pushToWebDAV（上传本地全量）
  │                  │
  │                  └── pullFromWebDAV（拉取远程变更合并）
  │                              │
  │                       更新 IndexedDB + 更新内存
  │
  ├── 离线 ──→ offlineQueue.enqueue(operation)
  │                  │
  │               存入 IndexedDB `sync_queue` 表
  │                  │
  │          监听 online 事件后：
  │                  │
  │          按序重放 queue 中所有操作
  │                  │
  │          全部完成后 → triggerAutoSync()
  │
  └── 后台轮询 ──→ setInterval(5min)
                        │
                   pullFromWebDAV（只下拉，不 push）
                        │
                   有变更 → 更新 IndexedDB + 内存
                   无变更 → 跳过
```

## 5. 改动文件清单

### 5.1 autoSync.ts — 防抖 + 双向同步

```
改动点：
  - DEBOUNCE_MS: 2000 → 300
  - triggerAutoSync() 内部: push + pull 改为 push 后立即 pull
  - 导出 startBackgroundPolling() / stopBackgroundPolling()
  - 轮询间隔 5 分钟（300000ms）
  - 轮询只 pull，不 push（避免无意义上传）

影响：
  - 所有数据写操作都会触发更快的双向同步
  - 后台轮询独立于用户操作
```

### 5.2 webdavSync.ts — 轻量 pull

```
改动点：
  - 新增 pullOnly() 函数：只下载不上传
  - 用于后台轮询，减少不必要的上传
  - 复用现有 pullFromWebDAV 逻辑

影响：
  - 无，纯新增函数
```

### 5.3 新建 src/services/offlineQueue.ts

```
设计：

interface QueuedOperation {
  id: string              // uuid
  type: 'create' | 'update' | 'delete' | 'toggleComplete'
  storeName: string       // 'tasks' | 'habits' | ...
  data?: any              // 操作数据
  createdAt: string       // 入队时间
  retryCount: number      // 重试次数，超3次标记失败
}

功能：
  - enqueue(op): 将操作存入 IndexedDB `sync_queue`
  - processQueue(): 按序重放所有队列操作
  - startOfflineMonitor(): 监听 online/offline 事件
  - stopOfflineMonitor(): 停止监听
  - isOnline: Ref<boolean> 响应式在线状态
  - getQueueLength(): 队列长度
  - clearFailedOps(): 清理失败操作

数据流：
  offline → enqueue → IndexedDB(`sync_queue`)
  online  → processQueue → 按序重放
         → 全部成功 → triggerAutoSync()
         → 有失败 → 失败次数+1，保留队列，下次重试
```

### 5.4 db.ts — 新增 sync_queue 表

```
改动点：
  - 在 IndexedDB schema 中新增 sync_queue 表
  - keyPath: id
  - 可在 openDB 时 upgrade 处理

影响：
  - 数据库版本号需要 +1
  - 现有数据不受影响
```

### 5.5 DB_VERSION 常量更新

```
文件: src/utils/constants.ts
改动: DB_VERSION 2 → 3（因为新增 sync_queue 表）
```

### 5.6 App.vue — 启动后台服务

```
改动点：
  - onMounted 中启动后台轮询: startBackgroundPolling()
  - 启动离线监控: startOfflineMonitor()
  - onUnmounted 中停止

影响：
  - 应用启动时自动拉起后台服务
```

## 6. 风险 & 回滚

| 风险 | 概率 | 应对 |
|------|:----:|------|
| 防抖变短导致频繁 HTTP 请求 | 中 | 300ms 只防连续输入，保存操作由用户节奏决定，不会显著增加 |
| 每次 push 后 pull 增加流量 | 中 | pull 是按 updatedAt 取新，不是全量下载 |
| 离线队列重放导致重复操作 | 低 | 每次重放前检查操作是否已生效（根据 id/updatedAt 去重） |
| 数据库 upgrade 出错 | 低 | schema 变更只有新增表，不涉及现有表结构修改 |

## 7. 实施步骤

| 步 | 内容 | 文件 | 预计 |
|----|------|------|:----:|
| 1 | autoSync.ts: 防抖 2s → 300ms + push后pull | `autoSync.ts` | 小 |
| 2 | webdavSync.ts: 新增 pullOnly() | `webdavSync.ts` | 小 |
| 3 | constants.ts: DB_VERSION 2→3 | `constants.ts` | 极小 |
| 4 | db.ts: 新增 sync_queue 表 | `db.ts` | 小 |
| 5 | **新建** offlineQueue.ts: 完整离线队列服务 | `offlineQueue.ts` | 中 |
| 6 | App.vue: 启动后台轮询 + 离线监控 | `App.vue` | 小 |

总计 6 步，不影响现有功能，全在同步层改动，不涉及 UI 组件。
