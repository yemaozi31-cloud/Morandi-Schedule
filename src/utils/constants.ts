export const NAV_ITEMS = [
  // 一级导航（核心）
  { key: 'inbox', label: '随记', icon: 'inbox', path: '/inbox', section: 'primary' },
  { key: 'today', label: '今天', icon: 'star', path: '/', section: 'primary' },
  { key: 'upcoming', label: '本周', icon: 'calendar', path: '/calendar?view=week', section: 'primary' },
  { key: 'all', label: '所有任务', icon: 'list', path: '/all', section: 'primary' },
  // 分隔
  { key: 'separator-1', label: '—', icon: '', path: '', section: 'separator' },
  // 二级导航（功能）
  { key: 'calendar', label: '日历', icon: 'calendar', path: '/calendar', section: 'secondary' },
  { key: 'kanban', label: '看板', icon: 'columns', path: '/kanban', section: 'secondary' },
  { key: 'tags', label: '标签', icon: 'tags', path: '/tags', section: 'secondary' },
  { key: 'habits', label: '习惯', icon: 'target', path: '/habits', section: 'secondary' },
  { key: 'pomodoro', label: '番茄钟', icon: 'timer', path: '/pomodoro', section: 'secondary' },
  { key: 'shared', label: '共享', icon: 'users', path: '/shared', section: 'secondary' },
  // 分隔
  { key: 'separator-2', label: '—', icon: '', path: '', section: 'separator' },
  // 系统
  { key: 'settings', label: '设置', icon: 'settings', path: '/settings', section: 'system' },
] as const

export const MOBILE_NAV_ITEMS = [
  { key: 'today', label: '今天', icon: 'star', path: '/' },
  { key: 'inbox', label: '随记', icon: 'inbox', path: '/inbox' },
  { key: 'calendar', label: '日历', icon: 'calendar', path: '/calendar' },
  { key: 'all', label: '任务', icon: 'check-square', path: '/all' },
] as const

export const PRIORITY_OPTIONS = [
  { value: 'none', label: '无', color: '#B5AFA8' },
  { value: 'low', label: '低', color: '#A0B5C4' },
  { value: 'medium', label: '中', color: '#8FA8B5' },
  { value: 'high', label: '高', color: '#D4C09E' },
  { value: 'urgent', label: '紧急', color: '#C4A0A0' }
] as const

export const DB_NAME = 'morandi-schedule-db'
export const DB_VERSION = 3

// ─── WebDAV 同步 ─────────────────────────────────────────────
/** 云端同步文件名 */
export const SYNC_FILE_NAME = 'morandi-schedule-sync.json'
/** 同步数据格式版本 */
export const SYNC_DATA_VERSION = 1
/** 自动同步防抖间隔（ms） */
export const AUTO_SYNC_DEBOUNCE = 30_000
/** 参与同步的数据表列表（不含 settings——每台设备独立） */
export const SYNC_STORE_NAMES = ['tasks', 'tags', 'habits', 'habitCheckIns', 'pomodoroSessions'] as const
/** WebDAV 默认配置 */
export const DEFAULT_SYNC_CONFIG = {
  enabled: false,
  autoSync: true,
  lastSyncAt: null,
  webdavUrl: '',
  webdavUsername: '',
  webdavPassword: '',
  syncFileName: SYNC_FILE_NAME,
  privateKey: '',
  nickname: ''
}
