<template>
  <div class="sync-settings">
    <h3 class="section-title">云同步（WebDAV）</h3>

    <!-- 表单 -->
    <div class="action-group">
      <!-- WebDAV 地址 -->
      <div class="form-row">
        <div class="form-info">
          <span class="form-label">WebDAV 地址</span>
          <span class="form-desc">
            坚果云地址固定为 <code>https://dav.jianguoyun.com/dav/</code><br />
            注意：文件实际存储在"我的坚果云"目录下，<br />
            所以 URL 要填 <code>https://dav.jianguoyun.com/dav/我的坚果云/</code>
          </span>
        </div>
        <input
          v-model="form.webdavUrl"
          class="form-input"
          type="url"
          placeholder="https://dav.jianguoyun.com/dav/我的坚果云/"
          @input="markDirty"
        />
      </div>

      <!-- 用户名 -->
      <div class="form-row">
        <div class="form-info">
          <span class="form-label">用户名</span>
          <span class="form-desc">坚果云为注册邮箱</span>
        </div>
        <input
          v-model="form.webdavUsername"
          class="form-input"
          type="text"
          placeholder="user@example.com"
          autocomplete="username"
          @input="markDirty"
        />
      </div>

      <!-- 密码 -->
      <div class="form-row">
        <div class="form-info">
          <span class="form-label">密码</span>
          <span class="form-desc">坚果云请使用「应用密码」，非登录密码</span>
        </div>
        <div class="password-row">
          <input
            v-model="form.webdavPassword"
            class="form-input"
            :type="showPassword ? 'text' : 'password'"
            placeholder="应用密码 / 授权码"
            autocomplete="current-password"
            @input="markDirty"
          />
          <button class="icon-btn" @click="showPassword = !showPassword" :title="showPassword ? '隐藏密码' : '显示密码'">
            <Icon :name="showPassword ? 'eye' : 'eye-off'" :size="16" />
          </button>
        </div>
      </div>

      <!-- 昵称 -->
      <div class="form-row">
        <div class="form-info">
          <span class="form-label">昵称</span>
          <span class="form-desc">用于共享打卡标识，其他协作者能看到</span>
        </div>
        <input
          v-model="form.nickname"
          class="form-input"
          type="text"
          placeholder="你的昵称"
          @input="markDirty"
        />
      </div>

      <!-- 私有密钥 -->
      <div class="form-row">
        <div class="form-info">
          <span class="form-label">私有密钥</span>
          <span class="form-desc">加密同步文件，其他人不知道密钥则无法解密你的数据</span>
        </div>
        <div class="password-row">
          <input
            v-model="form.privateKey"
            class="form-input"
            :type="showKey ? 'text' : 'password'"
            placeholder="设置一个密码短语"
            @input="markDirty"
          />
          <button class="icon-btn" @click="showKey = !showKey" :title="showKey ? '隐藏' : '显示'">
            <Icon :name="showKey ? 'eye' : 'eye-off'" :size="16" />
          </button>
        </div>
      </div>

      <!-- 测试连接 -->
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">测试连接</span>
          <span class="action-desc">验证 WebDAV 地址和认证信息是否可用</span>
        </div>
        <div class="test-result-row">
          <span v-if="testResult" class="test-status" :class="{ success: testResult.ok, fail: !testResult.ok }">
            {{ testResult.message }}
          </span>
          <button
            class="action-btn"
            :disabled="testing || !formValid"
            @click="handleTestConnection"
          >
            {{ testing ? '测试中…' : '测试' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 同步状态 & 操作 -->
    <div class="action-group" style="margin-top: var(--spacing-md)">
      <!-- 上次同步时间 -->
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">上次同步</span>
          <span class="action-desc">
            {{ lastSyncTimeText }}
          </span>
        </div>
        <span v-if="syncing" class="sync-spinner"></span>
      </div>

      <!-- 立即同步 -->
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">立即同步</span>
          <span class="action-desc">上传本地数据 → 下载并合并云端变更</span>
        </div>
        <button
          class="action-btn primary"
          :disabled="syncing || !configReady"
          @click="handleSync"
        >
          {{ syncing ? '同步中…' : lastSyncAt ? '同步' : '首次同步' }}
        </button>
      </div>

      <!-- 自动同步开关 -->
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">自动同步</span>
          <span class="action-desc">每次变更后自动上传到云端</span>
        </div>
        <label class="toggle-switch">
          <input
            type="checkbox"
            v-model="autoSyncEnabled"
            @change="handleAutoSyncChange"
            :disabled="!configReady"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- 一键导入配置 -->
    <details class="import-collapse">
      <summary>导入配置</summary>
      <textarea v-model="importText" class="import-textarea" placeholder='粘贴配置文本，如：{"url":"...","user":"...","pass":"..."}' rows="2"></textarea>
      <button class="import-btn" @click="handleImportConfig">导入并填充</button>
    </details>

    <!-- 提示 -->
    <p class="sync-hint">
      数据不会发送到第三方服务器，仅存储在您指定的 WebDAV 云盘中。
      <br />
      坚果云用户请在「安全设置」中生成「应用密码」填入上方密码栏。
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { testConnection, sync, type SyncResult } from '@/services/webdavSync'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Icon from '@/components/common/Icon.vue'

const settingsStore = useSettingsStore()

// ─── 表单状态 ────────────────────────────────────────────────

const form = ref({
  webdavUrl: '',
  webdavUsername: '',
  webdavPassword: '',
  nickname: '',
  privateKey: ''
})
const showPassword = ref(false)
const showKey = ref(false)
const configDirty = ref(false)
const importText = ref('')

function handleImportConfig() {
  try {
    const cfg = JSON.parse(importText.value.trim())
    if (cfg.url) form.value.webdavUrl = cfg.url
    if (cfg.user) form.value.webdavUsername = cfg.user
    if (cfg.pass) form.value.webdavPassword = cfg.pass
    importText.value = ''
    markDirty()
    window.__message?.success('配置已导入')
  } catch {
    window.__message?.error('配置格式无效')
  }
}

// ─── 同步状态 ────────────────────────────────────────────────

const testing = ref(false)
const syncing = ref(false)
const testResult = ref<SyncResult | null>(null)
const autoSyncEnabled = ref(false)

// ─── 计算 ─────────────────────────────────────────────────────

/** 表单是否填了必要字段 */
const formValid = computed(() => {
  return form.value.webdavUrl.trim().length > 0
    && form.value.webdavUsername.trim().length > 0
    && form.value.webdavPassword.trim().length > 0
})

/** 配置是否就绪（已保存且有效） */
const configReady = computed(() => {
  return settingsStore.syncConfig.enabled && settingsStore.syncConfig.webdavUrl
})

/** 从 store 读取上次同步时间 */
const lastSyncAt = computed(() => settingsStore.syncConfig.lastSyncAt)

/** 格式化的上次同步时间文本 */
const lastSyncTimeText = computed(() => {
  const t = lastSyncAt.value
  if (!t) return '尚未同步过'
  try {
    return format(new Date(t), 'yyyy-MM-dd HH:mm', { locale: zhCN })
  } catch {
    return t
  }
})

// ─── 方法 ─────────────────────────────────────────────────────

/** 标记配置已修改 */
function markDirty() {
  configDirty.value = true
  testResult.value = null // 配置变了，之前的测试结果失效
}

/** 保存配置到 store 和 IndexedDB */
async function saveConfig() {
  const cfg = settingsStore.syncConfig
  cfg.webdavUrl = form.value.webdavUrl.trim()
  cfg.webdavUsername = form.value.webdavUsername.trim()
  cfg.webdavPassword = form.value.webdavPassword.trim()
  cfg.nickname = form.value.nickname.trim()
  cfg.privateKey = form.value.privateKey.trim()
  cfg.enabled = true
  await settingsStore.saveSyncConfig()
  configDirty.value = false
}

/** 测试连接 */
async function handleTestConnection() {
  testing.value = true
  testResult.value = null
  try {
    // 先自动保存配置
    if (configDirty.value) await saveConfig()
    testResult.value = await testConnection(settingsStore.syncConfig)
  } catch (e: any) {
    testResult.value = { ok: false, message: `测试异常：${e.message}` }
  } finally {
    testing.value = false
  }
}

/** 执行同步 */
async function handleSync() {
  syncing.value = true
  try {
    // 保存最新配置
    if (configDirty.value) await saveConfig()

    const result = await sync(settingsStore.syncConfig)

    // 更新上次同步时间
    settingsStore.syncConfig.lastSyncAt = new Date().toISOString()
    await settingsStore.saveSyncConfig()

    // 显示结果
    if (result.ok) window.__message?.success(result.message); else window.__message?.error(result.message)
  } catch (e: any) {
    window.__message?.error(`同步异常：${e.message}`)
  } finally {
    syncing.value = false
  }
}

/** 自动同步开关变化 */
async function handleAutoSyncChange() {
  settingsStore.syncConfig.autoSync = autoSyncEnabled.value
  await settingsStore.saveSyncConfig()
}

// ─── 初始化 ───────────────────────────────────────────────────

onMounted(() => {
  // 从 store 加载已有配置到表单
  const cfg = settingsStore.syncConfig
  form.value.webdavUrl = cfg.webdavUrl || ''
  form.value.webdavUsername = cfg.webdavUsername || ''
  form.value.webdavPassword = cfg.webdavPassword || ''
  form.value.nickname = cfg.nickname || ''
  form.value.privateKey = cfg.privateKey || ''
  autoSyncEnabled.value = cfg.autoSync
})
</script>

<style scoped>
.section-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

/* ── 表单行 ──────────────────────────────────────────── */
.action-group {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.form-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

.form-row:last-child { border-bottom: none; }

.form-info {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.form-label {
  font-size: var(--font-size-md);
  color: var(--color-text);
}

.form-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.form-desc code {
  font-size: inherit;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  padding: 1px 4px;
  border-radius: 3px;
}

.form-input {
  flex: 0 1 280px;
  min-width: 160px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.6;
}

/* ── 密码行 ──────────────────────────────────────────── */
.password-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 1 280px;
  min-width: 160px;
}

.password-row .form-input {
  flex: 1;
  min-width: 0;
}

.icon-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xs);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: var(--color-text-secondary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: var(--color-border-light);
}

/* ── 操作行 & 按钮 ────────────────────────────────────── */
.action-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.action-row:last-child { border-bottom: none; }

.action-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-label {
  font-size: var(--font-size-md);
  color: var(--color-text);
}

.action-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.primary {
  color: var(--color-text-on-primary);
  background: var(--color-primary);
}

.action-btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* ── 测试结果 ─────────────────────────────────────────── */
.test-result-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.test-status {
  font-size: var(--font-size-sm);
  max-width: 240px;
  line-height: 1.3;
}

.test-status.success { color: var(--color-success, #6B8F71); }
.test-status.fail { color: var(--color-danger); }

/* ── 同步旋转动画 ─────────────────────────────────────── */
.sync-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 开关 ─────────────────────────────────────────────── */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  border-radius: 22px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── 导入配置 ──────────────────────────────────────────── */
.import-collapse {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}

.import-collapse summary {
  padding: var(--spacing-xs) 0;
  color: var(--color-primary);
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

.import-textarea:focus { border-color: var(--color-primary); }

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

/* ── 提示 ─────────────────────────────────────────────── */
.sync-hint {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
  padding: 0 var(--spacing-xs);
}
</style>
