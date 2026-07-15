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
          <DataManager />
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
                <span class="about-value">v0.4.0</span>
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
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import AppLayout from '@/components/layout/AppLayout.vue'
import ThemeEditor from '@/components/settings/ThemeEditor.vue'
import SyncSettings from '@/components/settings/SyncSettings.vue'
import DataManager from '@/components/settings/DataManager.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'

const router = useRouter()
const settingsStore = useSettingsStore()

function handleLogout() {
  localStorage.removeItem('morandi_logged_in')
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

</style>
