import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as db from '@/db'
import { DEFAULT_SYNC_CONFIG } from '@/utils/constants'
import type { SyncConfig } from '@/types'
import { encryptPassword, decryptPassword } from '@/utils/crypto'

export const useSettingsStore = defineStore('settings', () => {
  const themeMode = ref<'light' | 'dark'>('light')

  /** WebDAV 同步配置 */
  const syncConfig = reactive<SyncConfig>({ ...DEFAULT_SYNC_CONFIG })

  // ─── 主题 ────────────────────────────────────────────────

  async function loadSettings() {
    try {
      const saved = await db.get<{ id: string; theme: string }>('settings', 'theme')
      if (saved && (saved.theme === 'dark' || saved.theme === 'light')) {
        themeMode.value = saved.theme
      }
    } catch {
      // 首次加载无数据，保持默认 light
    }
    applyTheme()
  }

  async function saveTheme(mode: 'light' | 'dark') {
    await db.set('settings', { id: 'theme', theme: mode })
  }

  async function toggleTheme() {
    themeMode.value = themeMode.value === 'light' ? 'dark' : 'light'
    applyTheme()
    try {
      await saveTheme(themeMode.value)
      window.__message?.success(themeMode.value === 'light' ? '已切换为浅色主题' : '已切换为深色主题')
    } catch {
      window.__message?.error('主题保存失败')
    }
  }

  async function setTheme(mode: 'light' | 'dark') {
    themeMode.value = mode
    applyTheme()
    try {
      await saveTheme(mode)
      window.__message?.success(mode === 'light' ? '已切换为浅色主题' : '已切换为深色主题')
    } catch {
      window.__message?.error('主题保存失败')
    }
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', themeMode.value)
  }

  // ─── 同步配置 ────────────────────────────────────────────

  /** 从 IndexedDB 加载同步配置（自动解密密码） */
  async function loadSyncConfig() {
    try {
      const saved = await db.get<{ id: string; config: SyncConfig }>('settings', 'syncConfig')
      if (saved?.config) {
        Object.assign(syncConfig, saved.config)
        // 解密持久化时加密的密码，store 内存中保持明文供用户编辑
        if (syncConfig.webdavPassword) {
          syncConfig.webdavPassword = await decryptPassword(syncConfig.webdavPassword)
        }
      }
    } catch {
      // 首次使用，保持默认
    }
  }

  /** 将同步配置持久化到 IndexedDB（自动加密密码） */
  async function saveSyncConfig() {
    try {
      const configToSave = { ...syncConfig }
      // 持久化时加密密码，不存明文
      if (configToSave.webdavPassword) {
        configToSave.webdavPassword = await encryptPassword(configToSave.webdavPassword)
      }
      await db.set('settings', { id: 'syncConfig', config: configToSave })
    } catch {
      window.__message?.error('同步配置保存失败')
    }
  }

  return {
    themeMode,
    syncConfig,
    loadSettings,
    toggleTheme,
    setTheme,
    loadSyncConfig,
    saveSyncConfig
  }
})
