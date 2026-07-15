/**
 * 自动同步器
 * 所有数据写操作完成后触发，防抖 2 秒后 push 到 WebDAV
 */
import { pushToWebDAV } from './webdavSync'
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
      // 配置没变就不重复 push（防抖期间用户可能改了配置）
      await pushToWebDAV(config)
      console.log('[AutoSync] 数据已推送至云端')
    } catch (e) {
      console.warn('[AutoSync] 推送失败:', e)
    }
  }, 2000)
}
