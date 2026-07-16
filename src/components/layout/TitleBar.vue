<template>
  <!--
    Tauri v2 官方自定义标题栏方案：
    - data-tauri-drag-region → 自动处理拖动（不需要手动 startDragging）
    - 无应用名（留给 Sidebar header）
    - 仅窗口按钮
  -->
  <div class="titlebar" data-tauri-drag-region>
    <!-- 拖动区域（占满剩余空间） -->
    <div class="titlebar-spacer"></div>

    <!-- 窗口控制按钮 -->
    <div class="titlebar-controls">
      <button class="tb-btn" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1.5" rx="0.75" fill="currentColor"/></svg>
      </button>
      <button class="tb-btn" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="3.5" y="1" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
          <rect x="1" y="3.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
      <button class="tb-btn-close" @click="closeWindow" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'

const win = getCurrentWindow()
const isMaximized = ref(false)
let unlisten: (() => void) | null = null

onMounted(async () => {
  try {
    isMaximized.value = await win.isMaximized()
    unlisten = await listen('tauri://resize', async () => {
      isMaximized.value = await win.isMaximized()
    })
  } catch { /* 非Tauri */ }
})

onUnmounted(() => unlisten?.())

const minimize = () => win.minimize()
const toggleMaximize = () => win.toggleMaximize()
const closeWindow = () => win.close()
</script>

<style scoped>
.titlebar {
  height: 32px;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  user-select: none;
  flex-shrink: 0;
  z-index: 1000;
}

.titlebar-spacer {
  flex: 1;
  height: 100%;
}

.titlebar-controls {
  display: flex;
  height: 100%;
  align-items: stretch;
}

.tb-btn, .tb-btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.1s;
}

.tb-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.tb-btn-close:hover {
  background: #E81123;
  color: #FFFFFF;
}
</style>
