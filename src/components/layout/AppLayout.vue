<template>
  <div class="app-layout">
    <!-- 桌面端 -->
    <template v-if="!isMobile">
      <Sidebar />
      <main class="main-content">
        <slot />
      </main>
    </template>
    <!-- 移动端 -->
    <template v-else>
      <main class="main-content has-mobile-nav">
        <slot />
      </main>
      <nav class="mobile-nav">
        <router-link
          v-for="item in visibleItems"
          :key="item.key"
          :to="item.path"
          class="mobile-nav-item"
          :class="{ active: uiStore.activeNav === item.key }"
          @click="uiStore.setActiveNav(item.key)"
        >
          <Icon :name="item.icon" class="mobile-nav-icon" />
          <span class="mobile-nav-label">{{ item.label }}</span>
        </router-link>
        <!-- 更多按钮 -->
        <button class="mobile-nav-item more-btn" @click="drawerOpen = true">
          <Icon name="menu" class="mobile-nav-icon" />
          <span class="mobile-nav-label">更多</span>
        </button>
      </nav>
      <MobileDrawer :visible="drawerOpen" @close="drawerOpen = false" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useResponsive } from '@/composables/useResponsive'
import { MOBILE_NAV_ITEMS } from '@/utils/constants'
import Icon from '@/components/common/Icon.vue'
import Sidebar from './Sidebar.vue'
import MobileDrawer from './MobileDrawer.vue'

const uiStore = useUiStore()
const { isMobile } = useResponsive()
const drawerOpen = ref(false)

// 底部 Tab 只显示前 4 个，第 5 个固定为"更多"按钮
const visibleItems = MOBILE_NAV_ITEMS.slice(0, 4)
</script>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: var(--spacing-xl);
  padding-top: max(var(--spacing-xl), env(safe-area-inset-top, 0px));
  min-height: 0;
  background: var(--color-bg);
}

.main-content.has-mobile-nav {
  padding-bottom: calc(72px + var(--spacing-lg));
}

/* 移动端底部导航 */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 4px);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-xs) var(--spacing-sm);
  text-decoration: none;
  color: var(--color-text-muted);
  transition: color var(--transition-fast);
  min-width: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

.mobile-nav-item.active {
  color: var(--color-primary);
}

.mobile-nav-icon {
  font-size: 22px;
  line-height: 1;
}

.mobile-nav-label {
  font-size: 11px;
  line-height: 1;
}

.more-btn {
  color: var(--color-text-muted);
}

.more-btn:hover {
  color: var(--color-text);
}

/* ── 超窄屏：隐藏导航文字，只留图标 ── */
@media (max-width: 360px) {
  .mobile-nav-label { display: none; }
  .mobile-nav-item { gap: 0; padding: 4px; }
  .mobile-nav-icon { font-size: 20px; }
}
</style>
