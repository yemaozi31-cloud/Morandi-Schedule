<template>
  <nav class="top-nav">
    <div class="nav-brand">
      <Icon name="check-square" :size="20" />
      <span>Morandi Schedule</span>
    </div>
    <div class="nav-links">
      <template v-for="item in navItems" :key="item.key">
        <router-link
          :to="item.path"
          class="nav-link"
          :class="{ active: uiStore.activeNav === item.key }"
          @click="uiStore.setActiveNav(item.key)"
        >
          <Icon :name="item.icon" :size="16" />
          {{ item.label }}
        </router-link>
      </template>
    </div>
    <div class="nav-actions">
      <button class="theme-toggle" @click="settingsStore.toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
        <Icon :name="isDark ? 'sun' : 'moon'" :size="18" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { NAV_ITEMS } from '@/utils/constants'
import Icon from '@/components/common/Icon.vue'

const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const navItems = NAV_ITEMS

const isDark = computed(() => settingsStore.themeMode === 'dark')
</script>

<style scoped>
.top-nav {
  height: var(--nav-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-lg);
  gap: var(--spacing-lg);
  flex-shrink: 0;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

.nav-links {
  display: flex;
  gap: 2px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.nav-link.active {
  background: var(--color-bg);
  color: var(--color-primary);
  font-weight: 500;
}

.theme-toggle {
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
}

.theme-toggle:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}
</style>
