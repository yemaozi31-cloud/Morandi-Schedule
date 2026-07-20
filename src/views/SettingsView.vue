<template>
  <AppLayout>
    <div class="settings-view">
      <MobileBackLink />
      <h1 class="page-title">设置</h1>
      <div class="settings-sections">
        <section class="settings-section">
          <ThemeEditor />
        </section>
        <section class="settings-section">
          <SyncSettings />
        </section>
        <section class="settings-section">
          <div class="action-group">
            <h3 class="section-title">课表导入</h3>
            <div class="action-row">
              <div class="action-info">
                <span class="action-label">导入课表</span>
                <span class="action-desc">从教务系统导出的 ICS 文件导入课程</span>
              </div>
              <label class="action-btn" for="course-import">选择文件</label>
              <input id="course-import" type="file" accept=".ics" style="display:none" @change="handleCourseImport" />
            </div>
            <div class="action-row">
              <div class="action-info">
                <span class="action-label">删除课表</span>
                <span class="action-desc">一键清除所有已导入的课程</span>
              </div>
              <button class="action-btn danger-btn" @click="handleDeleteCourses">删除</button>
            </div>
          </div>
        </section>
        <section class="settings-section">
          <DataManager />
        </section>
        <section class="settings-section">
          <div class="action-group">
            <h3 class="section-title">账号</h3>
            <div class="action-row">
              <div class="action-info">
                <span class="action-label">修改密码</span>
                <span class="action-desc">重新加密云端同步数据</span>
              </div>
              <button class="action-btn" @click="showPasswordForm = !showPasswordForm">
                {{ showPasswordForm ? '取消' : '修改' }}
              </button>
            </div>
            <div v-if="showPasswordForm" class="password-form">
              <input v-model="oldPwd" type="password" placeholder="当前密码" class="form-input" />
              <input v-model="newPwd" type="password" placeholder="新密码" class="form-input" />
              <input v-model="confirmPwd" type="password" placeholder="确认新密码" class="form-input" />
              <p v-if="pwdError" class="form-error">{{ pwdError }}</p>
              <button class="action-btn primary-btn" :disabled="changingPwd" @click="handleChangePassword">
                {{ changingPwd ? '修改中...' : '确认修改' }}
              </button>
            </div>
            <div class="action-row" v-if="isTauri">
              <div class="action-info">
                <span class="action-label">开机自启动</span>
                <span class="action-desc">系统启动时自动运行 Morandi Schedule</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" v-model="autoStartEnabled" @change="handleAutoStartChange" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>
        <section class="settings-section">
          <div class="action-group">
            <div class="action-row">
              <div class="action-info">
                <span class="action-label">退出登录</span>
                <span class="action-desc">当前账号：{{ settingsStore.syncConfig.nickname }}</span>
              </div>
              <button class="action-btn danger-btn" @click="handleLogout">退出</button>
            </div>
            <div class="action-row danger" style="border-top: 1px solid var(--color-danger);">
              <div class="action-info">
                <span class="action-label">清除账号数据</span>
                <span class="action-desc">清空本地 + 云端所有数据，账号保留</span>
              </div>
              <button class="action-btn danger-btn" :disabled="clearingData" @click="handleClearAccountData">
                {{ clearingData ? '清除中…' : '清除' }}
              </button>
            </div>
          </div>
        </section>
        <section class="settings-section">
          <div class="about-card">
            <h3 class="section-title">关于</h3>
            <div class="about-content">
              <div class="about-row">
                <span class="about-label">应用名称</span>
                <span class="about-value">Morandi Schedule</span>
              </div>
              <div class="about-row">
                <span class="about-label">版本</span>
                <span class="about-value">v{{ appVersion }}</span>
              </div>
              <div class="about-row">
                <span class="about-label">技术栈</span>
                <span class="about-value">Vue 3 + Tauri v2 + TypeScript</span>
              </div>
              <div class="about-row">
                <span class="about-label">设计</span>
                <span class="about-value">莫兰迪色系 · 本地优先</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { showConfirm } from '@/utils/globalConfirm'
import AppLayout from '@/components/layout/AppLayout.vue'
import ThemeEditor from '@/components/settings/ThemeEditor.vue'
import SyncSettings from '@/components/settings/SyncSettings.vue'
import DataManager from '@/components/settings/DataManager.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { encryptSyncData, decryptSyncData } from '@/utils/crypto'
import { version as pkgVersion } from '../../package.json'

const appVersion = pkgVersion
const router = useRouter()
const settingsStore = useSettingsStore()
const isTauri = window.location.protocol.startsWith('tauri') ||
                window.location.hostname.includes('tauri')
const safeFetch = isTauri ? tauriFetch : window.fetch.bind(window)

// 开机自启动
const autoStartEnabled = ref(false)

onMounted(async () => {
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    autoStartEnabled.value = await isEnabled()
  } catch {
    // 非 Tauri 环境忽略
  }
})

async function handleAutoStartChange() {
  try {
    const { enable, disable } = await import('@tauri-apps/plugin-autostart')
    if (autoStartEnabled.value) {
      await enable()
    } else {
      await disable()
    }
  } catch (e) {
    autoStartEnabled.value = !autoStartEnabled.value // 回滚
    console.error('自启动设置失败:', e)
  }
}

// 密码修改
const showPasswordForm = ref(false)
const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')
const pwdError = ref('')
const changingPwd = ref(false)

function getAuthHeaders() {
  const cfg = settingsStore.syncConfig
  return { Authorization: 'Basic ' + btoa(`${cfg.webdavUsername}:${cfg.webdavPassword}`) }
}

function getFileUrl() {
  const cfg = settingsStore.syncConfig
  const base = cfg.webdavUrl.endsWith('/') ? cfg.webdavUrl : cfg.webdavUrl + '/'
  return base + (cfg.nickname || 'default') + '-sync.json'
}

async function handleChangePassword() {
  pwdError.value = ''
  if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
    pwdError.value = '请填写所有字段'
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  if (newPwd.value === oldPwd.value) {
    pwdError.value = '新密码不能与旧密码相同'
    return
  }

  changingPwd.value = true
  try {
    const url = getFileUrl()
    const headers = getAuthHeaders()
    const res = await safeFetch(url, { headers })
    if (!res.ok) {
      pwdError.value = '无法读取云端数据（HTTP ' + res.status + '）'
      return
    }
    const text = await res.text()
    const decrypted = await decryptSyncData(text, oldPwd.value)
    if (!decrypted) {
      pwdError.value = '旧密码错误'
      return
    }
    // 用新密码重新加密并上传
    const reEncrypted = await encryptSyncData(decrypted, newPwd.value)
    const putRes = await safeFetch(url, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: reEncrypted
    })
    if (!putRes.ok) {
      pwdError.value = '上传失败（HTTP ' + putRes.status + '）'
      return
    }
    // 更新本地保存的密码
    settingsStore.syncConfig.privateKey = newPwd.value
    await settingsStore.saveSyncConfig()
    window.__message?.success('密码修改成功')
    showPasswordForm.value = false
    oldPwd.value = ''
    newPwd.value = ''
    confirmPwd.value = ''
  } catch (e: any) {
    pwdError.value = e.message || '操作失败'
  } finally {
    changingPwd.value = false
  }
}

async function handleCourseImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const { parseICS, importCourses } = await import('@/services/courseImporter')
    const courses = parseICS(text)
    if (courses.length === 0) {
      window.__message?.error('未识别到有效课程')
      return
    }
    if (await showConfirm({ title: '导入课表', content: `识别到 ${courses.length} 门课程，确认导入？` })) {
      const result = await importCourses(courses)
      window.__message?.success(`导入完成：${result.success} 成功，${result.skipped} 跳过`)
    }
  } catch (e) {
    console.error('导入课表失败:', e)
    window.__message?.error('导入失败，请检查文件格式')
  }
  input.value = ''
}

async function handleDeleteCourses() {
  const taskStore = useTaskStore()
  // 课程名称列表（从 ICS 导入的典型课程名）
  const courseNames = ['高等数学', '大学英语', '线性代数', '程序设计基础', '大学物理', '思想政治', '体育', '毛泽东思想', '马克思主义', '微积分', '概率论', '离散数学', '数据结构', '操作系统', '计算机网络', '编译原理']
  // 找 isCourse=true 的 + 标题匹配课程名的普通任务
  const courses = taskStore.activeTasks.filter(t =>
    t.isCourse || courseNames.includes(t.title)
  )
  if (courses.length === 0) {
    window.__message?.info('当前没有导入的课程')
    return
  }
  if (!await showConfirm({ title: '删除课表', content: `确认删除全部 ${courses.length} 门课程？此操作不可撤销。` })) return
  try {
    let count = 0
    for (const c of courses) {
      await taskStore.deleteTask(c.id)
      count++
    }
    window.__message?.success(`已删除 ${count} 门课程`)
  } catch (e) {
    console.error('删除课表失败:', e)
    window.__message?.error('删除失败')
  }
}

const clearingData = ref(false)

async function handleClearAccountData() {
  const ok = await showConfirm({
    title: '清除账号数据',
    content: '确认清除所有数据？不可恢复！\n\n将清除：\n• 本地所有数据（任务、习惯、打卡）\n• 云端同步文件中的全部内容\n• 共享习惯中的记录\n\n账号（昵称）保留，不清除登录状态。'
  })
  if (!ok) return
  clearingData.value = true
  try {
    // 1. 退出所有共享习惯
    const { fetchSharedData, leaveSharedHabit, ignoreSharedHabitInvite } = await import('@/services/webdavSync')
    const cfg = settingsStore.syncConfig
    const nick = cfg.nickname
    if (nick) {
      const sharedData = await fetchSharedData(cfg)
      for (const habit of sharedData.habits) {
        if (habit.members.includes(nick)) {
          await leaveSharedHabit(cfg, habit.name, nick)
        } else if (habit.invitees.includes(nick)) {
          await ignoreSharedHabitInvite(cfg, habit.name, nick)
        }
      }
    }

    // 2. 用空数据覆盖云端同步文件
    const { pushToWebDAV } = await import('@/services/webdavSync')
    await pushToWebDAV(cfg)

    // 3. 清空本地所有数据
    const { clear } = await import('@/db')
    for (const store of ['tasks', 'tags', 'habits', 'habitCheckIns', 'pomodoroSessions', 'settings']) {
      await clear(store)
    }

    // 4. 重新加载 stores（空状态）
    const { useTaskStore } = await import('@/stores/taskStore')
    const { useHabitStore } = await import('@/stores/habitStore')
    const { useTagStore } = await import('@/stores/tagStore')
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    await Promise.all([
      useTaskStore().loadTasks(),
      useHabitStore().loadHabits(),
      useHabitStore().loadCheckIns(),
      useTagStore().loadTags(),
      usePomodoroStore().loadSessions()
    ])

    window.__message?.success('账号数据已全部清除')
    clearingData.value = false
  } catch (e) {
    window.__message?.error('清除失败')
    clearingData.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('morandi_logged_in')
  localStorage.removeItem('last_page')
  // 只清除昵称，保留 WebDAV 密码和私钥不清，方便下次直接使用
  settingsStore.syncConfig.nickname = ''
  settingsStore.saveSyncConfig()
  router.push('/login')
}
</script>

<style scoped>
.settings-view {
  max-width: 640px;
  margin: 0 auto;
}

.page-title {
  font-size: var(--font-size-xl);
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.settings-section {
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.about-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  padding: var(--spacing-lg);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.about-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
  min-width: 0;
}

.about-label {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

.action-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.action-row:last-child { border-bottom: none; }

.action-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.action-label { font-size: var(--font-size-md); color: var(--color-text); }
.action-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.action-btn {
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.danger-btn {
  color: var(--color-danger) !important;
  border-color: var(--color-danger) !important;
}

.about-value {
  font-size: var(--font-size-md);
  color: var(--color-text);
  font-weight: 500;
}

/* 修改密码表单 */
.password-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}
.password-form .form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}
.password-form .form-input:focus {
  border-color: var(--color-primary);
}
.password-form .form-error {
  color: var(--color-danger);
  font-size: 12px;
  margin: 0;
}
.password-form button {
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  border: none;
  cursor: pointer;
}
.password-form button:disabled {
  opacity: 0.5;
}

/* 开机自启动 toggle 开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
  flex-shrink: 0;
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

</style>
