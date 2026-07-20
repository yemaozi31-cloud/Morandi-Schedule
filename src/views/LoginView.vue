<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <Icon name="check-square" :size="32" />
        <h1>Morandi Schedule</h1>
      </div>

      <!-- WebDAV 配置（首次使用） -->
      <div v-if="!webdavReady" class="webdav-config">
        <h3>配置 WebDAV 连接</h3>
        <p class="config-desc">数据存储在您的 WebDAV 云盘（如坚果云）</p>
        <input v-model="webdav.url" placeholder="https://dav.jianguoyun.com/dav/我的坚果云/" class="login-input" />
        <input v-model="webdav.user" placeholder="坚果云邮箱" class="login-input" />
        <input v-model="webdav.pass" type="password" placeholder="应用密码（非登录密码）" class="login-input" />
        <p class="config-hint">坚果云用户请在「安全设置」中生成应用密码</p>
        <p v-if="webdavError" class="login-error">{{ webdavError }}</p>
        <button class="login-btn" @click="saveWebDAV">保存并继续</button>

        <!-- 一键导入 -->
        <details class="import-collapse">
          <summary>已有配置文本？点击导入</summary>
          <textarea v-model="importText" class="import-textarea" placeholder="粘贴配置文本..." rows="3"></textarea>
          <button class="import-btn" @click="importConfig">导入配置</button>
        </details>
      </div>

      <!-- 登录/注册 -->
      <template v-else>
        <div class="login-tabs">
          <button :class="{ active: isLogin }" @click="isLogin = true">登录</button>
          <button :class="{ active: !isLogin }" @click="isLogin = false">注册</button>
        </div>

        <form @submit.prevent="handleSubmit" class="login-form">
          <input v-model="form.nickname" placeholder="昵称" class="login-input" required />
          <input v-model="form.password" type="password" placeholder="密码" class="login-input" required />
          <p v-if="error" class="login-error">{{ error }}</p>
          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '处理中...' : isLogin ? '登录' : '注册' }}
          </button>
        </form>
      </template>
    </div>
    <!-- 齿轮按钮：跳转设置页 -->
    <button class="gear-btn" @click="router.push('/settings')" title="设置">
      <Icon name="settings" :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import { useHabitStore } from '@/stores/habitStore'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { decryptSyncData, encryptSyncData } from '@/utils/crypto'
import * as db from '@/db'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import Icon from '@/components/common/Icon.vue'

/** Tauri 环境检测 */
const isTauri = window.location.protocol.startsWith('tauri') ||
                window.location.hostname.includes('tauri')
/** 跨环境 fetch — Tauri 下用插件绕过 CORS */
const safeFetch = isTauri ? tauriFetch : window.fetch.bind(window)

const router = useRouter()
const settingsStore = useSettingsStore()
const taskStore = useTaskStore()
const tagStore = useTagStore()
const habitStore = useHabitStore()
const pomodoroStore = usePomodoroStore()

const isLogin = ref(true)
const loading = ref(false)
const error = ref('')
const form = ref({ nickname: '', password: '' })
const webdavError = ref('')
const importText = ref('')

// WebDAV 配置表单
const webdav = ref({ url: '', user: '', pass: '' })
const webdavReady = computed(() => !!settingsStore.syncConfig.webdavUrl)

const config = computed(() => settingsStore.syncConfig)

async function saveWebDAV() {
  if (!webdav.value.url || !webdav.value.user || !webdav.value.pass) {
    webdavError.value = '请填写所有字段'
    return
  }
  webdavError.value = ''
  const cfg = settingsStore.syncConfig
  cfg.webdavUrl = webdav.value.url.trim()
  cfg.webdavUsername = webdav.value.user.trim()
  cfg.webdavPassword = webdav.value.pass.trim()
  cfg.enabled = true
  await settingsStore.saveSyncConfig()
}

/** 从配置文本导入 WebDAV 配置 */
function importConfig() {
  try {
    const cfg = JSON.parse(importText.value.trim())
    if (cfg.url) webdav.value.url = cfg.url
    if (cfg.user) webdav.value.user = cfg.user
    if (cfg.pass) webdav.value.pass = cfg.pass
    importText.value = ''
  } catch {
    webdavError.value = '配置格式无效'
  }
}

/** 获取用户 WebDAV 文件 URL */
function getUserFileUrl(nickname: string): string {
  const base = config.value.webdavUrl.endsWith('/') ? config.value.webdavUrl : config.value.webdavUrl + '/'
  const fileName = `${nickname}-sync.json`
  const fullUrl = base + fileName
  // Tauri: 直连; 浏览器: 走 Vite 代理
  return isTauri ? fullUrl : new URL(fullUrl).pathname
}

/** 生成 WebDAV Basic Auth header */
function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: 'Basic ' + btoa(`${config.value.webdavUsername}:${config.value.webdavPassword}`)
  }
}

/** 检查 WebDAV 配置是否已填写完成 */
function isWebDAVConfigured(): boolean {
  return !!(config.value.webdavUrl && config.value.webdavUsername && config.value.webdavPassword)
}

async function handleSubmit() {
  const nick = form.value.nickname.trim()
  const pwd = form.value.password.trim()
  if (!nick || !pwd) return

  loading.value = true
  error.value = ''

  try {
    // 检查 WebDAV 配置
    if (!isWebDAVConfigured()) {
      error.value = '请先在设置页中配置 WebDAV 同步'
      return
    }

    const url = getUserFileUrl(nick)
    const headers = getAuthHeaders()

    if (isLogin.value) {
      // ── 登录流程 ──────────────────────────────────────
      const res = await safeFetch(url, { headers })
      if (res.status === 404) {
        error.value = '账号不存在，请检查昵称或切换到注册'
        return
      }
      if (!res.ok) {
        error.value = `网络错误（HTTP ${res.status}）`
        return
      }

      let text = await res.text()
      // 调试信息（直接显示在页面上）
      const debugInfo: Record<string, any> = {
        requestUrl: url,
        httpStatus: res.status,
        contentType: res.headers.get('content-type'),
        fileLength: text.length,
        startsWithAes: text.startsWith('$aes$'),
        filePreview: text.slice(0, 100)
      }
      // 用密码解密（decryptSyncData 返回空字符串表示密码错误）
      const decrypted = await decryptSyncData(text, pwd)
      debugInfo.decryptEmpty = !decrypted
      debugInfo.decryptPreview = (decrypted || '').slice(0, 100)
      if (!decrypted) {
        error.value = '密码错误'
        return
      }

      // 解析同步数据
      let data: any
      try {
        data = JSON.parse(decrypted)
      } catch (e) {
        debugInfo.parseError = String(e)
        debugInfo.decryptFull = (decrypted || '').slice(0, 500)
        // 追加写入文件，方便查看
        try { localStorage.setItem('login_debug', JSON.stringify(debugInfo)) } catch {}
        // 页面显示详细错误（完整输出）
        error.value = '调试:' + JSON.stringify(debugInfo, null, 2).slice(0, 1000)
        return
      }

      // 清空 IndexedDB 所有数据
      for (const store of ['tasks', 'tags', 'habits', 'habitCheckIns', 'pomodoroSessions', 'settings']) {
        await db.clear(store)
      }

      // 写入云端下载的数据
      const d = data.data || data
      if (d.tasks) for (const t of d.tasks) await db.set('tasks', t)
      if (d.tags) for (const t of d.tags) await db.set('tags', t)
      if (d.habits) for (const h of d.habits) await db.set('habits', h)
      if (d.habitCheckIns) for (const c of d.habitCheckIns) await db.set('habitCheckIns', c)
      if (d.pomodoroSessions) for (const s of d.pomodoroSessions) await db.set('pomodoroSessions', s)

      // 保存登录状态到 syncConfig
      settingsStore.syncConfig.nickname = nick
      settingsStore.syncConfig.privateKey = pwd
      await settingsStore.saveSyncConfig()
      localStorage.setItem('morandi_logged_in', nick)

      // 重新加载 stores
      await Promise.all([
        taskStore.loadTasks(),
        tagStore.loadTags(),
        habitStore.loadHabits(),
        habitStore.loadCheckIns(),
        pomodoroStore.loadSessions()
      ])

      window.__message?.success('登录成功')
      router.push('/')
    } else {
      // ── 注册流程 ──────────────────────────────────────
      // 用 PROPFIND 检查文件是否已存在
      const check = await safeFetch(url, {
        method: 'PROPFIND',
        headers: { ...headers, Depth: '0' }
      })
      // 200/207 表示文件已存在（账号已被注册）
      if (check.ok) {
        error.value = '该昵称已被注册'
        return
      }
      if (check.status !== 404) {
        // 非 404 的异常响应
        error.value = '无法验证账号状态，请检查网络'
        return
      }

      // 创建初始同步数据包（与 webdavSync.ts 同结构）
      const initialData = {
        version: 1,
        deviceId: crypto.randomUUID(),
        lastSyncAt: new Date().toISOString(),
        data: {
          tasks: [] as any[],
          tags: [] as any[],
          habits: [] as any[],
          habitCheckIns: [] as any[],
          pomodoroSessions: [] as any[]
        }
      }

      const encrypted = await encryptSyncData(JSON.stringify(initialData), pwd)
      const putRes = await safeFetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: encrypted
      })
      if (!putRes.ok) {
        error.value = `注册失败（HTTP ${putRes.status}）`
        return
      }

      // 注册成功后清空本地数据
      for (const store of ['tasks', 'tags', 'habits', 'habitCheckIns', 'pomodoroSessions', 'settings']) {
        await db.clear(store)
      }

      // 保存登录状态
      settingsStore.syncConfig.nickname = nick
      settingsStore.syncConfig.privateKey = pwd
      await settingsStore.saveSyncConfig()
      localStorage.setItem('morandi_logged_in', nick)

      // 重新加载 stores（空数据）
      await Promise.all([
        taskStore.loadTasks(),
        tagStore.loadTags(),
        habitStore.loadHabits(),
        habitStore.loadCheckIns(),
        pomodoroStore.loadSessions()
      ])

      window.__message?.success('注册成功')
      router.push('/')
    }
  } catch (e: any) {
    error.value = e.message || '操作失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

// 如果已记住登录状态，直接跳过进入首页
onMounted(() => {
  if (localStorage.getItem('morandi_logged_in')) {
    router.push('/')
  }
})
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: var(--spacing-xl);
  padding-top: max(var(--spacing-xl), env(safe-area-inset-top, 0px));
  background: var(--color-bg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  padding: var(--spacing-2xl);
  box-shadow: 0 4px 24px var(--color-shadow);
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-2xl);
  color: var(--color-primary);
}

.login-logo h1 {
  font-size: var(--font-size-xl);
  color: var(--color-text);
  margin: 0;
  font-weight: 600;
}

.login-tabs {
  display: flex;
  gap: 0;
  margin-bottom: var(--spacing-xl);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border-light);
}

.login-tabs button {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.login-tabs button.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: 500;
}

.login-tabs button:not(.active):hover {
  background: var(--color-surface-hover);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.login-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-md);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(163, 181, 160, 0.2);
}

.login-input::placeholder {
  color: var(--color-text-muted);
}

.login-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.login-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.login-btn:active:not(:disabled) {
  background: var(--color-primary-pressed);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── WebDAV 配置 ──────────────────────── */
.webdav-config {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.webdav-config h3 {
  font-size: var(--font-size-md);
  color: var(--color-text);
  text-align: center;
  margin: 0;
}

.config-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-align: center;
  margin: 0 0 var(--spacing-xs);
}

.config-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: center;
  margin: 0;
}

.import-collapse {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}

.import-collapse summary {
  text-align: center;
  padding: var(--spacing-xs);
}

.import-textarea {
  width: 100%;
  margin-top: var(--spacing-xs);
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-family: monospace;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.import-textarea:focus {
  border-color: var(--color-primary);
}

.import-btn {
  width: 100%;
  margin-top: var(--spacing-xs);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  cursor: pointer;
}

.login-hint {
  margin-top: var(--spacing-lg);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── 齿轮按钮：跳转设置 ──────────── */
.gear-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 2px 8px var(--color-shadow);
}
.gear-btn:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
}
</style>
