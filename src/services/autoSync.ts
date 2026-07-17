/**
 * 自动同步器
 * 所有数据写操作完成后触发，防抖 2 秒后 push 到 WebDAV
 */
import { pushToWebDAV, pullFromWebDAV } from './webdavSync'
import { useSettingsStore } from '@/stores/settingsStore'

let timer: ReturnType<typeof setTimeout> | null = null
let lastConfig: any = null

export function triggerAutoSync(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    timer = null
    try {
      const settingsStore = useSettingsStore()
      const config = settingsStore.syncConfig
      if (!config.webdavUrl || !config.nickname) return
      if (!config.autoSync) return
      // 先拉取远程变更合并到本地，再上传合并后的完整数据
      // pull-first 确保多设备同步不遗漏其他设备的新增/修改
      // 本地软删除的记录（deletedAt）不会被云端旧数据恢复（按 updatedAt 取较新版本）
      await pullFromWebDAV(config).catch(() => {})
      await pushToWebDAV(config)
      console.log('[AutoSync] 双向同步完成')
    } catch (e) {
      console.warn('[AutoSync] 推送失败:', e)
    }
  }, 300)
}

// ─── 后台轮询（每 5 分钟拉取远程变更） ──
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 5 * 60 * 1000 // 5 分钟

export function startBackgroundPolling(): void {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    try {
      const settingsStore = useSettingsStore()
      const config = settingsStore.syncConfig
      if (!config.webdavUrl || !config.autoSync) return
      // 后台轮询：先拉取远程变更合并，再推送本地数据
      await pullFromWebDAV(config).catch(() => {})
      await pushToWebDAV(config).catch(() => {})
      console.log('[AutoSync] 后台轮询完成')
    } catch {}
  }, POLL_INTERVAL)
  console.log(`[AutoSync] 后台轮询已启动，间隔 ${POLL_INTERVAL / 1000}s`)
}

export function stopBackgroundPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  console.log('[AutoSync] 后台轮询已停止')
}
