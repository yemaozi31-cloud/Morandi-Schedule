<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div v-if="visible" class="drawer-overlay" @click.self="$emit('close')">
        <transition name="drawer-slide">
          <div v-if="visible" class="drawer-panel">
            <div class="drawer-header">
              <span class="drawer-title">莫兰迪</span>
              <button class="drawer-close" @click="$emit('close')">
                <Icon name="x" :size="18" />
              </button>
            </div>
            <nav class="drawer-nav">
              <div class="drawer-group" v-for="group in navGroups" :key="group.label">
                <div v-if="group.label" class="drawer-group-label">{{ group.label }}</div>
                <router-link
                  v-for="item in group.items"
                  :key="item.key"
                  :to="item.path"
                  class="drawer-item"
                  :class="{ active: activeNav === item.key }"
                  @click="$emit('close')"
                >
                  <Icon :name="item.icon" :size="18" class="drawer-item-icon" />
                  <span class="drawer-item-label">{{ item.label }}</span>
                </router-link>
              </div>
            </nav>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAV_ITEMS } from '@/utils/constants'
import { useUiStore } from '@/stores/uiStore'
import Icon from '@/components/common/Icon.vue'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUiStore()
const activeNav = computed(() => uiStore.activeNav)

const navGroups = computed(() => {
  const groups: { label: string; items: typeof NAV_ITEMS }[] = []
  let currentGroup: typeof NAV_ITEMS = []

  for (const item of NAV_ITEMS) {
    if (item.section === 'separator') {
      if (currentGroup.length > 0) {
        groups.push({ label: '', items: [...currentGroup] })
        currentGroup = []
      }
    } else {
      currentGroup.push(item)
    }
  }
  if (currentGroup.length > 0) {
    groups.push({ label: '', items: currentGroup })
  }

  if (groups.length >= 2) {
    groups[0].label = '核心'
    groups[1].label = '功能'
  }
  if (groups.length >= 3) {
    groups[2].label = '系统'
  }

  return groups
})
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: 6000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 260px;
  height: 100vh;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 16px var(--color-shadow-heavy);
  padding-top: env(safe-area-inset-top, 10px);
  box-sizing: border-box;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.drawer-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary);
}

.drawer-close {
  color: var(--color-text-muted);
  padding: var(--spacing-xs);
  border-radius: var(--radius-full);
}

.drawer-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.drawer-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.drawer-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.drawer-group + .drawer-group {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border-light);
}

.drawer-group-label {
  font-size: 10px;
  color: var(--color-text-muted);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.drawer-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.drawer-item.active {
  background: var(--color-bg);
  color: var(--color-primary);
  font-weight: 500;
}

.drawer-item-icon {
  flex-shrink: 0;
}

/* 过渡动画 */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
