<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <NaiveBridge />
          <!-- 通知权限提示条 -->
          <div v-if="showNotifBanner" class="notif-banner">
            <span>通知权限未开启，可在浏览器地址栏🔒 → 网站设置中开启通知</span>
            <button class="notif-banner-close" @click="dismissNotifBanner()">✕</button>
          </div>
          <router-view v-if="!loading">
            <template #default="{ Component, route }">
              <transition name="page-fade" mode="out-in">
                <component :is="Component" :key="route.path" />
              </transition>
            </template>
          </router-view>
          <div v-else class="app-loading">
            <div class="loading-spinner"></div>
          </div>
          <ConfirmDialog
            v-if="confirmState.show"
            :show="confirmState.show"
            :title="confirmState.title"
            :content="confirmState.content"
            positive-text="确认"
            negative-text="取消"
            @confirm="handleGlobalConfirm(true)"
            @cancel="handleGlobalConfirm(false)"
            @update:show="(v) => { if (!v) handleGlobalConfirm(false) }"
          />
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { NConfigProvider, NMessageProvider, NNotificationProvider, NDialogProvider, darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import { useHabitStore } from '@/stores/habitStore'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { useUiStore } from '@/stores/uiStore'
import NaiveBridge from '@/components/common/NaiveBridge.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { confirmState } from '@/utils/globalConfirm'
import { startBackgroundPolling, stopBackgroundPolling } from '@/services/autoSync'
import { startOfflineMonitor, stopOfflineMonitor } from '@/services/offlineQueue'
import { initKeyboardService, registerShortcut, destroyKeyboardService } from '@/services/keyboardService'
import { startReminderScheduler, stopReminderScheduler, clearNotifiedTask, notifDenied, dismissNotifBanner } from '@/services/reminderService'
const showNotifBanner = notifDenied // 本地 ref 引用，模板才能用

const settingsStore = useSettingsStore()
const taskStore = useTaskStore()
const tagStore = useTagStore()
const habitStore = useHabitStore()
const pomodoroStore = usePomodoroStore()
const uiStore = useUiStore()

const router = useRouter()
const loading = ref(true)

// 全局错误边界 - 捕获子组件渲染期间的未处理错误
onErrorCaptured((err, instance, info) => {
  console.error('[全局错误]', err, info)
  window.__message?.error('页面出现异常，请刷新重试')
  return false // 阻止错误继续传播
})

// 未捕获的 Promise 异常
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const msg = reason?.message || reason?.toString?.() || '未知错误'
  console.error('[未捕获Promise异常]', reason)
  window.__message?.error(`操作异常: ${msg}`)
})

function handleGlobalConfirm(value: boolean) {
  confirmState.resolve?.(value)
  confirmState.show = false
  confirmState.resolve = null
}

onMounted(async () => {
  // 检查是否已登录（有记住的昵称），未登录则跳转登录页
  const loggedIn = localStorage.getItem('morandi_logged_in')
  if (!loggedIn && router.currentRoute.value.path !== '/login') {
    router.push('/login')
    loading.value = false
    return
  }

  try {
    await settingsStore.loadSettings()
    await settingsStore.loadSyncConfig()
    await Promise.all([
      taskStore.loadTasks(),
      tagStore.loadTags(),
      habitStore.loadHabits(),
      habitStore.loadCheckIns(),
      pomodoroStore.loadSessions()
    ])

    // 启动提醒轮询调度器
    startReminderScheduler(() => taskStore.activeTasks.filter(t => t.reminder))

    // 全局键盘快捷键
    initKeyboardService()
    registerShortcut('Ctrl+n', () => uiStore.openNewTaskForm())
    registerShortcut('Escape', () => uiStore.closeTaskForm())

    // 恢复上次打开的页面
    const lastPage = localStorage.getItem('last_page')
    if (lastPage && lastPage !== '/' && lastPage !== '/login' && lastPage !== '/floating') {
      router.push(lastPage)
    }

    // 自动同步（配置了 autoSync 时）
    if (settingsStore.syncConfig.autoSync && settingsStore.syncConfig.webdavUrl) {
      try {
        const { sync } = await import('@/services/webdavSync')
        sync(settingsStore.syncConfig).catch(() => {})
      } catch {}
    }

    // 启动后台轮询（每 5 分钟拉取远程变更）
    startBackgroundPolling()
    // 启动离线操作队列监控
    startOfflineMonitor()
  } catch (e) {
    console.error('Failed to load initial data:', e)
    window.__message?.error('数据加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  stopReminderScheduler()
  destroyKeyboardService()
  stopBackgroundPolling()
  stopOfflineMonitor()
})

const naiveTheme = computed(() => {
  return settingsStore.themeMode === 'dark' ? darkTheme : null
})

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: '#A3B5A0',
    primaryColorHover: '#B5C7B2',
    bodyColor: settingsStore.themeMode === 'dark' ? '#2A2726' : '#F5F0EB',
    cardColor: settingsStore.themeMode === 'dark' ? '#383534' : '#FAF7F2',
    textColorBase: settingsStore.themeMode === 'dark' ? '#E0DCD8' : '#4A4543',
    textColor1: settingsStore.themeMode === 'dark' ? '#E0DCD8' : '#4A4543',
    textColor2: settingsStore.themeMode === 'dark' ? '#A09B96' : '#8B8580',
    borderColor: settingsStore.themeMode === 'dark' ? '#4A4744' : '#E0D9D0',
    borderRadius: '8px',
    fontSize: '14px'
  }
}))
</script>

<style scoped>
.app-loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.notif-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #FFF3E0;
  border-bottom: 1px solid #FFE0B2;
  font-size: 13px;
  color: #E65100;
  gap: 12px;
}
.notif-banner-close {
  background: none;
  border: none;
  color: #E65100;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.notif-banner-close:hover {
  background: rgba(230,81,0,0.1);
}

/* 页面过渡动画 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
