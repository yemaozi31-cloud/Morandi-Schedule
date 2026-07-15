export interface ThemeConfig {
  primary: string
  bg: string
  surface: string
  text: string
  textSecondary: string
  border: string
  accent: string
  danger: string
}

export interface ShortcutConfig {
  newTask: string
  toggleWindow: string
  deleteTask: string
  undo: string
  redo: string
}

export interface WindowConfig {
  width: number
  height: number
  x: number | null
  y: number | null
  alwaysOnTop: boolean
}

export interface FloatingConfig {
  width: number
  height: number
  x: number | null
  y: number | null
  opacity: number
  defaultMinimized: boolean
}

/** WebDAV 同步配置 */
export interface SyncConfig {
  enabled: boolean
  autoSync: boolean
  lastSyncAt: string | null
  /** WebDAV 服务器地址，如 https://dav.jianguoyun.com/dav/ */
  webdavUrl: string
  /** WebDAV 用户名（坚果云为邮箱） */
  webdavUsername: string
  /** WebDAV 密码（坚果云请用应用密码，不是登录密码） */
  webdavPassword: string
  /** 云端同步文件名（默认 morandi-schedule-sync.json） */
  syncFileName: string
  /** 私有密钥——加密个人同步文件的密码短语 */
  privateKey?: string
  /** 用户昵称——用于共享打卡标识 */
  nickname?: string
}

export interface AppSettings {
  id: 'app_settings'
  themeMode: 'light' | 'dark'
  theme: ThemeConfig
  shortcuts: ShortcutConfig
  window: WindowConfig
  floating: FloatingConfig
  sync: SyncConfig
  autoLaunch: boolean
  defaultReminder: number | null
}
