/**
 * 离线操作队列
 *
 * 当网络不可用时，用户操作排入 IndexedDB 队列。
 * 网络恢复后按序重放，全部完成后触发一次同步。
 *
 * 数据流：
 *   用户操作时检测 isOnline
 *   ├── 在线 → 正常执行 + triggerAutoSync()
 *   └── 离线 → enqueue(op) → IndexedDB(sync_queue)
 *                ↓
 *           online 事件 → processQueue() → 按序重放
 *                ↓
 *           全部完成 → triggerAutoSync() 双向同步
 */

import * as db from '@/db'
import { useTaskStore } from '@/stores/taskStore'

export type QueueOperationType = 'create' | 'update' | 'delete'

export interface QueuedOperation {
  id: string
  type: QueueOperationType
  /** 对应的 store 名称，如 'tasks' */
  storeName: string
  /** 操作数据（create/update 时传递） */
  data?: any
  /** 记录 ID（delete 时使用） */
  recordId?: string
  createdAt: string
  /** 重试次数，超过上限标记 failed */
  retryCount: number
  status: 'pending' | 'failed'
}

const MAX_RETRIES = 3
let isProcessing = false
let onlineListeners: (() => void)[] = []

/** 当前在线状态（响应式不可用，用 getter） */
export function isOnline(): boolean {
  return navigator.onLine
}

/** 将操作加入离线队列 */
export async function enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<void> {
  const item: QueuedOperation = {
    ...op,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending'
  }
  await db.set('sync_queue', item)
  console.log('[OfflineQueue] 已入队:', op.type, op.storeName, op.recordId || op.data?.id)
}

/** 获取队列长度 */
export async function getQueueLength(): Promise<number> {
  const all = await db.getAll<QueuedOperation>('sync_queue')
  return all.filter(q => q.status === 'pending').length
}

/** 处理队列：按序重放所有 pending 操作 */
export async function processQueue(): Promise<{ success: number; failed: number }> {
  if (isProcessing) return { success: 0, failed: 0 }
  isProcessing = true

  try {
    const all = await db.getAll<QueuedOperation>('sync_queue')
    const pending = all.filter(q => q.status === 'pending').sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt)
    )

    let success = 0
    let failed = 0

    for (const op of pending) {
      try {
        await replayOperation(op)
        await db.remove('sync_queue', op.id)
        success++
      } catch (e) {
        console.error('[OfflineQueue] 重放失败:', op.id, e)
        op.retryCount++
        if (op.retryCount >= MAX_RETRIES) {
          op.status = 'failed'
        }
        await db.set('sync_queue', op)
        failed++
      }
    }

    // 全部完成后，触发一次完整同步
    if (success > 0) {
      const { triggerAutoSync } = await import('@/services/autoSync')
      triggerAutoSync()
    }

    return { success, failed }
  } finally {
    isProcessing = false
  }
}

/** 重放单个操作 */
async function replayOperation(op: QueuedOperation): Promise<void> {
  const taskStore = useTaskStore()

  switch (op.type) {
    case 'create':
      // 检查是否已存在（防止重复创建）
      if (op.data?.id && taskStore.getTaskById(op.data.id)) {
        return // 已存在，跳过
      }
      await taskStore.createTask(op.data || {})
      break

    case 'update':
      if (!op.recordId) throw new Error('update 操作缺少 recordId')
      await taskStore.updateTask(op.recordId, op.data || {})
      break

    case 'delete':
      if (!op.recordId) throw new Error('delete 操作缺少 recordId')
      // 检查是否已删除
      const existing = taskStore.getTaskById(op.recordId)
      if (!existing || existing.deletedAt) {
        return // 已删除，跳过
      }
      await taskStore.deleteTask(op.recordId)
      break

    default:
      throw new Error(`未知操作类型: ${op.type}`)
  }
}

/** 清理失败的操作 */
export async function clearFailedOps(): Promise<void> {
  const all = await db.getAll<QueuedOperation>('sync_queue')
  const failed = all.filter(q => q.status === 'failed')
  for (const op of failed) {
    await db.remove('sync_queue', op.id)
  }
}

/** 启动在线/离线监控 */
export function startOfflineMonitor(): void {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  console.log('[OfflineQueue] 离线监控已启动')
}

/** 停止监控 */
export function stopOfflineMonitor(): void {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  console.log('[OfflineQueue] 离线监控已停止')
}

async function handleOnline() {
  console.log('[OfflineQueue] 网络已恢复，处理离线队列...')
  const result = await processQueue()
  if (result.success > 0 || result.failed > 0) {
    console.log(`[OfflineQueue] 队列处理完成：${result.success} 成功，${result.failed} 失败`)
  }
  onlineListeners.forEach(fn => fn())
}

function handleOffline() {
  console.log('[OfflineQueue] 网络已断开')
}

/** 注册在线回调 */
export function onOnline(fn: () => void): void {
  onlineListeners.push(fn)
}

/** 注销在线回调 */
export function offOnline(fn: () => void): void {
  onlineListeners = onlineListeners.filter(f => f !== fn)
}
