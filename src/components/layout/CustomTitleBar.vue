<template>
  <div class="titlebar" @dblclick="toggleMaximize">
    <!-- 左侧：应用图标 + 标题 + 拖动区域 -->
    <div class="titlebar-drag" @mousedown="startDrag">
      <svg class="titlebar-icon" viewBox="0 0 200 200" width="18" height="18">
        <rect x="10" y="10" width="180" height="180" rx="42" fill="#E8E5DF" />
        <rect x="35" y="45" width="130" height="120" rx="16" fill="#FBF9F6" />
        <path d="M 35 61 Q 35 45 51 45 L 149 45 Q 165 45 165 61 L 165 85 L 35 85 Z" fill="#9BA49D" />
        <rect x="60" y="32" width="12" height="26" rx="6" fill="#D2CDC4" />
        <rect x="128" y="32" width="12" height="26" rx="6" fill="#D2CDC4" />
        <text x="100" y="71" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#FFF" text-anchor="middle" letter-spacing="1.5">MORANDI</text>
      </svg>
      <span class="titlebar-title">Morandi Schedule</span>
    </div>

    <!-- 右侧：窗口按钮 -->
    <div class="titlebar-controls">
      <button class="titlebar-btn titlebar-btn-min" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="5.5" width="10" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <button class="titlebar-btn titlebar-btn-max" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.3" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="3" y="0.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" />
          <rect x="0.5" y="3" width="8" height="8" rx="1" fill="var(--color-surface)" />
          <rect x="0.5" y="3" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
      <button class="titlebar-btn titlebar-btn-close" @click="closeWindow" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
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
let unlistenResize: (() => void) | null = null

onMounted(async () => {
  try {
    isMaximized.value = await win.isMaximized()
    unlistenResize = await listen('tauri://resize', async () => {
      isMaximized.value = await win.isMaximized()
    })
  } catch { /* 非Tauri环境忽略 */ }
})

onUnmounted(() => {
  unlistenResize?.()
})

function minimize() {
  try { win.minimize() } catch {}
}

function toggleMaximize() {
  try { win.toggleMaximize() } catch {}
}

function closeWindow() {
  try { win.close() } catch {}
}

function startDrag(e: MouseEvent) {
  // 只对左键拖动
  if (e.button !== 0) return
  try { win.startDragging() } catch {}
}
</script>

<style scoped>
.titlebar {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  user-select: none;
  flex-shrink: 0;
  position: relative;
  z-index: 1000;
}

/* 左侧拖动区域 */
.titlebar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 100%;
  flex: 1;
  min-width: 0;
  cursor: default;
}

.titlebar-icon {
  flex-shrink: 0;
  display: block;
}

.titlebar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧窗口控制按钮 */
.titlebar-controls {
  display: flex;
  height: 100%;
  align-items: stretch;
}

.titlebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.titlebar-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

/* 关闭按钮特殊处理 */
.titlebar-btn-close:hover {
  background: #E81123;
  color: #FFFFFF;
}

/* 最大化按钮 - 悬停浅色 */
.titlebar-btn-max:hover {
  background: var(--color-surface-hover);
}
</style>
