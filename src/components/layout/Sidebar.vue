<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <Icon name="check-square" :size="22" class="sidebar-logo" />
      <span class="sidebar-title">Morandi Schedule</span>
    </div>

    <div class="sidebar-quick-add">
      <button class="sidebar-add-btn" @click="openNewTask">
        <Icon name="plus" :size="16" />
        <span>新建任务</span>
      </button>
    </div>

    <nav class="sidebar-nav">
      <!-- 一级导航 -->
      <div class="nav-section" v-for="item in primaryItems" :key="item.key">
        <router-link
          :to="item.path"
          class="nav-item"
          :class="{ active: activeNav === item.key }"
          @click="setActive(item.key)"
        >
          <Icon :name="item.icon" :size="17" />
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </div>

      <div class="nav-separator"></div>

      <!-- 二级导航 -->
      <div class="nav-section-label">功能</div>
      <div class="nav-section" v-for="item in secondaryItems" :key="item.key">
        <router-link
          :to="item.path"
          class="nav-item"
          :class="{ active: activeNav === item.key }"
          @click="setActive(item.key)"
        >
          <Icon :name="item.icon" :size="17" />
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </div>

      <div class="nav-separator"></div>

      <!-- 系统 -->
      <div class="nav-section" v-for="item in systemItems" :key="item.key">
        <router-link
          :to="item.path"
          class="nav-item"
          :class="{ active: activeNav === item.key }"
          @click="setActive(item.key)"
        >
          <Icon :name="item.icon" :size="17" />
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- 同步按钮 -->
      <div class="nav-section">
        <button class="nav-item sync-btn" :disabled="syncing" @click="handleSync">
          <Icon :name="'refresh'" :size="17" :class="{ spinning: syncing }" />
          <span class="nav-label">{{ syncing ? '同步中...' : '同步' }}</span>
        </button>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-btn" @click="toggleTheme" :title="isDark ? '浅色模式' : '深色模式'">
        <Icon :name="isDark ? 'sun' : 'moon'" :size="17" />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { sync } from '@/services/webdavSync'
import { NAV_ITEMS } from '@/utils/constants'
import Icon from '@/components/common/Icon.vue'

const uiStore = useUiStore()
const settingsStore = useSettingsStore()

const activeNav = computed(() => uiStore.activeNav)
const isDark = computed(() => settingsStore.themeMode === 'dark')

const syncing = ref(false)

const primaryItems = computed(() => NAV_ITEMS.filter(i => i.section === 'primary'))
const secondaryItems = computed(() => NAV_ITEMS.filter(i => i.section === 'secondary'))
const systemItems = computed(() => NAV_ITEMS.filter(i => i.section === 'system'))

function setActive(key: string) {
  uiStore.setActiveNav(key)
}

function toggleTheme() {
  settingsStore.toggleTheme()
}

function openNewTask() {
  uiStore.openNewTaskForm()
}

async function handleSync() {
  if (syncing.value) return
  syncing.value = true
  try {
    const result = await sync(settingsStore.syncConfig)
    if (result.ok) {
      window.__message?.success('同步完成')
    } else {
      window.__message?.error(result.message)
    }
  } catch {
    window.__message?.error('同步失败')
  } finally {
    syncing.value = false
  }
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.sidebar-logo {
  color: var(--color-primary);
}

.sidebar-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.sidebar-quick-add {
  padding: var(--spacing-sm) var(--spacing-lg);
}

.sidebar-add-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.sidebar-add-btn:hover {
  background: var(--color-primary-hover);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-section-label {
  font-size: 10px;
  color: var(--color-text-muted);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-bg);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-label { line-height: 1; }

.nav-separator {
  height: 1px;
  background: var(--color-border-light);
  margin: var(--spacing-xs) var(--spacing-sm);
}

.sidebar-footer {
  padding: var(--spacing-sm);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: center;
}

.theme-btn {
  color: var(--color-text-muted);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

/* 同步按钮 */
.sync-btn {
  width: 100%;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  background: none;
  text-align: left;
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
