/**
 * 自动同步器（云端为主模式下，只拉不推）
 * 后台轮询：每 30 秒从云端拉取最新数据覆盖本地
 * 每次操作已在 store 中直接调用 atomicModifyPersonalData 写云端
 */
import { pullFromWebDAV } from './webdavSync'
import { useSettingsStore } from '@/stores/settingsStore'

let timer: ReturnType<typeof setTimeout> | null = null

export function triggerAutoSync(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    timer = null
    try {
      const settingsStore = useSettingsStore()
      const config = settingsStore.syncConfig
      if (!config.webdavUrl || !config.nickname) return
      if (!config.autoSync) return
      await pullFromWebDAV(config)
      console.log('[AutoSync] 拉取完成')
    } catch (e) {
      console.warn('[AutoSync] 拉取失败:', e)
    }
  }, 300)
}

// ─── 后台轮询（每 30 秒拉取云端） ──
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 30 * 1000

export function startBackgroundPolling(): void {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    try {
      const settingsStore = useSettingsStore()
      const config = settingsStore.syncConfig
      if (!config.webdavUrl || !config.autoSync) return
      await pullFromWebDAV(config).catch((e) => { console.warn('[AutoSync] 拉取失败:', e) })
      console.log('[AutoSync] 后台轮询完成')
    } catch (e) { console.warn('[AutoSync] 轮询异常:', e) }
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
