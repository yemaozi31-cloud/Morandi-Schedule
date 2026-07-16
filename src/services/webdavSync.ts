/**
 * WebDAV 云同步引擎
 *
 * 数据流：
 *   本地 IndexedDB ←→ webdavSync.ts ←→ WebDAV 服务器（坚果云等）
 *
 * 同步策略：
 *   - 每次双向同步 = Push（上传本地全量）→ Pull（下载云端全量→合并）
 *   - 冲突按每条记录的 updatedAt 时间戳取较新版本
 *   - settings（主题/窗口等）不同步，每台设备独立
 */

import * as db from '@/db'
import { SYNC_FILE_NAME, SYNC_DATA_VERSION, SYNC_STORE_NAMES } from '@/utils/constants'
import type { SyncConfig } from '@/types'
import { encryptSyncData, decryptSyncData } from '@/utils/crypto'

// ─── Tauri 环境下用 @tauri-apps/plugin-http 绕过 CSP ──
const isTauriEnv = typeof window !== 'undefined' && (
  window.location.protocol.startsWith('tauri') ||
  window.location.hostname.includes('tauri')
)

/** 跨环境 fetch：Tauri 下用 HTTP 插件，浏览器直接用原生 fetch */
async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isTauriEnv) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
      return tauriFetch(input as any, init as any)
    } catch {
      // 插件加载失败时回退到原生 fetch
      return fetch(input, init)
    }
  }
  return fetch(input, init)
}

// ─── 写入锁（防止并发同步导致文件损坏）
let pushLock = false
const pendingPushes: (() => Promise<void>)[] = []

// ─── 类型 ─────────────────────────────────────────────────────

/** 云端同步数据包结构 */
interface SyncDataPackage {
  version: number
  deviceId: string
  lastSyncAt: string
  data: {
    tasks: any[]
    tags: any[]
    habits: any[]
    habitCheckIns: any[]
    pomodoroSessions: any[]
  }
}

/** 同步结果 */
export interface SyncResult {
  ok: boolean
  message: string
  stats?: {
    uploaded?: number
    downloaded?: number
    added?: number
    updated?: number
  }
}

// ─── 内部工具 ─────────────────────────────────────────────────

/** 生成 Basic Auth header */
function authHeader(username: string, password: string): Record<string, string> {
  return {
    Authorization: 'Basic ' + btoa(`${username}:${password}`)
  }
}

/** 拼接同步文件完整 URL（自动编码中文路径，开发环境走 Vite 代理绕过 CORS） */
function syncFileUrl(config: SyncConfig): string {
  const base = config.webdavUrl.endsWith('/') ? config.webdavUrl : config.webdavUrl + '/'
  // 用昵称做文件名，没有昵称就用默认 syncFileName
  const nick = config.nickname || 'default'
  const fileName = `${nick}-sync.json`

  // Tauri 桌面端：直连 WebDAV; 浏览器模式：走 Vite 代理
  const isTauri = window.location.protocol.startsWith('tauri') ||
                  window.location.hostname.includes('tauri')
  if (isTauri) {
    return base + fileName
  }
  // 浏览器模式：取 URL 的路径部分，Vite 代理自动补协议和 host
  const parsed = new URL(base)
  return parsed.pathname + fileName
}

/** 获取或生成本设备唯一标识（存 localStorage） */
function getDeviceId(): string {
  const KEY = 'morandi_device_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

/** 判断两条记录哪条更新（按 updatedAt → createdAt 降序） */
function isNewer(a: any, b: any): boolean {
  const aTime = a.updatedAt || a.createdAt || ''
  const bTime = b.updatedAt || b.createdAt || ''
  return aTime > bTime
}

/** 从 IndexedDB 读单条记录 */
async function getFromDB(store: string, id: string): Promise<any | null> {
  try {
    const val = await db.get(store, id)
    return val ?? null
  } catch {
    return null
  }
}

// ─── 公开 API ─────────────────────────────────────────────────

/**
 * 测试 WebDAV 连接是否可用
 * 通过 PROPFIND 请求验证服务器可达性和认证信息
 */
export async function testConnection(config: SyncConfig): Promise<SyncResult> {
  if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
    return { ok: false, message: '请先填写 WebDAV 地址、用户名和密码' }
  }

  try {
    const url = syncFileUrl(config)

    // PROPFIND 是 WebDAV 的标准「ping」方法
    const res = await safeFetch(url, {
      method: 'PROPFIND',
      headers: {
        ...authHeader(config.webdavUsername, config.webdavPassword),
        'Depth': '0'
      }
    })

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: '认证失败：用户名或密码错误（坚果云请使用应用密码）' }
    }
    if (res.ok || res.status === 404) {
      // 404 表示服务器可达但同步文件还不存在——是正常情况
      return { ok: true, message: '连接成功，WebDAV 服务器可用' }
    }

    return { ok: false, message: `服务器返回异常状态：HTTP ${res.status}` }
  } catch (e: any) {
    const msg = e.message || '未知错误'
    // 区分网络错误和地址错误
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return { ok: false, message: '网络不可达：请检查地址和网络连接' }
    }
    return { ok: false, message: `连接失败：${msg}` }
  }
}

/**
 * 将本地全量数据上传（Push）到 WebDAV
 * 读取 IndexedDB 所有 store → 序列化为 JSON → PUT 到云端
 */
async function acquirePushLock(): Promise<void> {
  if (pushLock) {
    return new Promise(resolve => { pendingPushes.push(resolve) })
  }
  pushLock = true
}

function releasePushLock(): void {
  pushLock = false
  const next = pendingPushes.shift()
  if (next) { pushLock = true; next() }
}

export async function pushToWebDAV(config: SyncConfig): Promise<SyncResult> {
  await acquirePushLock()
  try {
    // 1. 读取本地全量数据
    const [tasks, tags, habits, habitCheckIns, pomodoroSessions] = await Promise.all([
      db.getAll<any>('tasks'),
      db.getAll<any>('tags'),
      db.getAll<any>('habits'),
      db.getAll<any>('habitCheckIns'),
      db.getAll<any>('pomodoroSessions')
    ])

    // 2. 打包为同步格式
    const now = new Date().toISOString()
    const syncData: SyncDataPackage = {
      version: SYNC_DATA_VERSION,
      deviceId: getDeviceId(),
      lastSyncAt: now,
      data: { tasks, tags, habits, habitCheckIns, pomodoroSessions }
    }

    // 3. 如果有私有密钥，加密整个数据包
    let body = JSON.stringify(syncData, null, 2)
    if (config.privateKey) {
      body = await encryptSyncData(body, config.privateKey)
    }

    // 4. PUT 上传到 WebDAV
    const url = syncFileUrl(config)
    const res = await safeFetch(url, {
      method: 'PUT',
      headers: {
        ...authHeader(config.webdavUsername, config.webdavPassword),
        'Content-Type': 'application/json'
      },
      body
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, message: `上传失败（HTTP ${res.status}）${text ? ': ' + text.slice(0, 100) : ''}` }
    }

    return {
      ok: true,
      message: `已上传 ${tasks.length} 任务 · ${tags.length} 标签 · ${habits.length} 习惯 · ${habitCheckIns.length} 打卡 · ${pomodoroSessions.length} 番茄钟`,
      stats: { uploaded: tasks.length + tags.length + habits.length + habitCheckIns.length + pomodoroSessions.length }
    }
  } catch (e: any) {
    return { ok: false, message: `上传出错：${e.message || e}` }
  } finally {
    releasePushLock()
  }
}

/**
 * 从 WebDAV 拉取（Pull）云端数据并合并到本地
 * 逐条比对 updatedAt，取较新者
 */
export async function pullFromWebDAV(config: SyncConfig): Promise<SyncResult> {
  try {
    const url = syncFileUrl(config)
    const res = await safeFetch(url, {
      method: 'GET',
      headers: authHeader(config.webdavUsername, config.webdavPassword)
    })

    if (res.status === 404) {
      return { ok: false, message: '云端暂无同步数据，请先在其他设备上传' }
    }
    if (!res.ok) {
      return { ok: false, message: `下载失败（HTTP ${res.status}）` }
    }

    let text = await res.text()

    // 如果有私有密钥且数据是加密格式，先解密
    if (config.privateKey && text.startsWith('$aes$')) {
      const decrypted = await decryptSyncData(text, config.privateKey)
      if (!decrypted) {
        return { ok: false, message: '解密失败：密码错误或数据已损坏' }
      }
      text = decrypted
    }

    const remote: SyncDataPackage = JSON.parse(text)

    // 校验数据版本
    if (!remote.version || !remote.data) {
      return { ok: false, message: '云端数据格式无效，请检查同步文件' }
    }

    // 逐 store 合并
    let added = 0
    let updated = 0
    let skipped = 0

    for (const storeName of SYNC_STORE_NAMES) {
      const items = (remote.data as any)[storeName] || []
      for (const item of items) {
        if (!item.id) continue // 跳过无 id 的脏数据

        const local = await getFromDB(storeName, item.id)
        if (!local) {
          // 本地没有 → 新增
          await db.set(storeName, item)
          added++
        } else if (isNewer(item, local)) {
          // 云端的更新 → 覆盖本地
          await db.set(storeName, item)
          updated++
        } else {
          skipped++
        }
      }
    }

    return {
      ok: true,
      message: `下载合并完成：+${added} 新增 · ${updated} 更新 · ${skipped} 跳过（本地已是最新）`,
      stats: { downloaded: added + updated + skipped, added, updated }
    }
  } catch (e: any) {
    return { ok: false, message: `下载出错：${e.message || e}` }
  }
}

/**
 * 双向同步 = Push（上传本地）→ Pull（下载并合并云端）
 * 确保无论从哪台设备发起都能获取到全部最新数据
 */
export async function sync(config: SyncConfig): Promise<SyncResult> {
  // 1. 先上传本地最新数据到云端
  const push = await pushToWebDAV(config)
  if (!push.ok) return push

  // 2. 再从云端拉取（其他设备的变更）
  const pull = await pullFromWebDAV(config)

  if (!pull.ok) {
    // 推送成功但拉取失败的场景（如云端本来就没数据）
    if (pull.message.includes('暂无同步数据')) {
      return { ok: true, message: '首次同步完成，数据已上传至云端' }
    }
    return { ok: true, message: `上传成功，但拉取失败：${pull.message}` }
  }

  return {
    ok: true,
    message: `同步完成\n${push.message}\n${pull.message}`
  }
}

// ─── 共享打卡 ─────────────────────────────────────────────────

export interface SharedCheckIn {
  id: string
  habitName: string
  nick: string
  date: string
  time: string
  message?: string
}

/** 共享习惯元信息 */
export interface SharedHabitData {
  name: string
  createdBy: string
  members: string[]
  invitees: string[]
  createdAt: string
  /** 打卡截止时间，如 "09:00"，空=不限时 */
  checkinDeadline?: string
}

interface SharedData {
  version: number
  habits: SharedHabitData[]
  checkIns: SharedCheckIn[]
  knownUsers: string[]
}

/** 共享文件 URL（与 syncFileUrl 一样处理 Vite 代理） */
function sharedFileUrl(config: SyncConfig): string {
  const base = config.webdavUrl.endsWith('/') ? config.webdavUrl : config.webdavUrl + '/'
  const isTauri = window.location.protocol.startsWith('tauri') ||
                  window.location.hostname.includes('tauri')
  if (isTauri) {
    return base + 'shared.json'
  } else {
    const parsed = new URL(base)
    return parsed.pathname + 'shared.json'
  }
}

/** 扫描 WebDAV 目录下所有 *-sync.json 文件，提取用户名 */
export async function discoverUsersFromWebDAV(config: SyncConfig): Promise<string[]> {
  try {
    const base = config.webdavUrl.endsWith('/') ? config.webdavUrl : config.webdavUrl + '/'
    const isTauri = window.location.protocol.startsWith('tauri') ||
                  window.location.hostname.includes('tauri')
    const url = isTauri ? base : new URL(base).pathname
    const res = await safeFetch(url, {
      method: 'PROPFIND',
      headers: {
        Authorization: 'Basic ' + btoa(`${config.webdavUsername}:${config.webdavPassword}`),
        Depth: '1'
      }
    })
    if (!res.ok) return []
    const text = await res.text()
    // 从 PROPFIND XML 响应中提取 href，匹配 xxx-sync.json
    const matches = text.match(/<d:href>[^<]*\/([^/<]+)-sync\.json<\/d:href>/g)
    if (!matches) return []
    const users = matches.map(m => {
      const name = m.match(/\/([^/<]+)-sync\.json/)?.[1]
      return name ? decodeURIComponent(name) : ''
    }).filter(Boolean)
    // 过滤掉 'default'（昵称为空时的兜底值）和 'shared'
    return [...new Set(users)].filter(u => u !== 'default' && u !== 'shared')
  } catch { return [] }
}

/** 获取完整共享数据（自动发现所有用户） */
export async function fetchSharedData(config: SyncConfig): Promise<SharedData> {
  const url = sharedFileUrl(config)
  try {
    const res = await safeFetch(url, {
      headers: { Authorization: 'Basic ' + btoa(`${config.webdavUsername}:${config.webdavPassword}`) }
    })
    // 从目录扫描所有用户
    const discovered = await discoverUsersFromWebDAV(config)

    if (res.status === 404) {
      const data: SharedData = { version: 1, habits: [], checkIns: [], knownUsers: discovered }
      await saveSharedData(config, data)
      return data
    }
    const data: SharedData = await res.json()
    // 合并 discovered 用户到 knownUsers，过滤掉无效值
    const merged = new Set([...(data.knownUsers || []), ...discovered])
    data.knownUsers = Array.from(merged).filter(u => u && u !== 'default' && u !== 'shared')
    await saveSharedData(config, data)
    return data
  } catch {
    const discovered = await discoverUsersFromWebDAV(config)
    return { version: 1, habits: [], checkIns: [], knownUsers: discovered }
  }
}

/** 保存完整共享数据 */
async function saveSharedData(config: SyncConfig, data: SharedData): Promise<boolean> {
  const url = sharedFileUrl(config)
  try {
    const res = await safeFetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${config.webdavUsername}:${config.webdavPassword}`)
      },
      body: JSON.stringify(data, null, 2)
    })
    return res.ok
  } catch { return false }
}

/** 拉取共享打卡数据（兼容旧接口） */
export async function fetchSharedCheckIns(config: SyncConfig): Promise<SharedCheckIn[]> {
  const data = await fetchSharedData(config)
  return data.checkIns
}

/** 提交打卡记录 */
export async function submitCheckIn(config: SyncConfig, checkIn: SharedCheckIn): Promise<boolean> {
  const data = await fetchSharedData(config)
  data.checkIns.push(checkIn)
  return saveSharedData(config, data)
}

/** 创建共享习惯并邀请成员 */
export async function createSharedHabit(
  config: SyncConfig,
  habitName: string,
  createdBy: string,
  invitees: string[],
  deadlineTime?: string
): Promise<boolean> {
  const existing = await fetchSharedData(config)
  existing.habits.push({
    name: habitName,
    createdBy,
    members: [createdBy], // 创建者自动加入
    invitees: invitees.filter(n => n !== createdBy),
    createdAt: new Date().toISOString(),
    checkinDeadline: deadlineTime || undefined
  })
  return saveSharedData(config, existing)
}

/** 接受共享习惯邀请 */
export async function acceptSharedHabitInvite(
  config: SyncConfig,
  habitName: string,
  nick: string
): Promise<boolean> {
  const data = await fetchSharedData(config)
  const habit = data.habits.find(h => h.name === habitName)
  if (!habit) return false
  // 从 invitees 移到 members
  habit.invitees = habit.invitees.filter(n => n !== nick)
  if (!habit.members.includes(nick)) {
    habit.members.push(nick)
  }
  return saveSharedData(config, data)
}

/** 忽略共享习惯邀请 */
export async function ignoreSharedHabitInvite(
  config: SyncConfig,
  habitName: string,
  nick: string
): Promise<boolean> {
  const data = await fetchSharedData(config)
  const habit = data.habits.find(h => h.name === habitName)
  if (!habit) return false
  habit.invitees = habit.invitees.filter(n => n !== nick)
  return saveSharedData(config, data)
}

/** 退出共享习惯（从 members 中移除，成员为空则删除习惯） */
export async function leaveSharedHabit(
  config: SyncConfig,
  habitName: string,
  nick: string
): Promise<boolean> {
  const data = await fetchSharedData(config)
  const idx = data.habits.findIndex(h => h.name === habitName)
  if (idx === -1) return false
  const habit = data.habits[idx]
  habit.members = habit.members.filter(n => n !== nick)
  // 同时清理该用户在习惯下的所有打卡记录
  data.checkIns = data.checkIns.filter(c => !(c.habitName === habitName && c.nick === nick))
  if (habit.members.length === 0) {
    data.habits.splice(idx, 1) // 没有成员了，删除习惯
  }
  return saveSharedData(config, data)
}

/** 为共享习惯打卡 */
export async function checkInSharedHabit(
  config: SyncConfig,
  habitName: string,
  nick: string
): Promise<boolean> {
  const ok = await submitCheckIn(config, {
    id: crypto.randomUUID(),
    habitName,
    nick,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })
  return ok
}

/** 取消打卡（删除当日该用户的打卡记录） */
export async function cancelCheckIn(
  config: SyncConfig,
  habitName: string,
  nick: string
): Promise<boolean> {
  const data = await fetchSharedData(config)
  const today = new Date().toISOString().slice(0, 10)
  data.checkIns = data.checkIns.filter(
    c => !(c.habitName === habitName && c.nick === nick && c.date === today)
  )
  return saveSharedData(config, data)
}

/** 获取某个共享习惯的团队打卡热力图数据 */
export function getTeamHeatmap(
  checkIns: SharedCheckIn[],
  members: string[],
  month: string
): { nick: string; dates: string[] }[] {
  return members.map(nick => ({
    nick,
    dates: checkIns
      .filter(c => c.nick === nick && c.date.startsWith(month))
      .map(c => c.date)
  }))
}
