<template>
  <div class="theme-editor">
    <h3 class="section-title">主题设置</h3>
    <div class="theme-preview" :class="settingsStore.themeMode">
      <div class="preview-header">
        <span>{{ settingsStore.themeMode === 'dark' ? '深色模式' : '浅色模式' }}</span>
        <button class="toggle-btn" @click="settingsStore.toggleTheme()">
          <Icon :name="settingsStore.themeMode === 'dark' ? 'sun' : 'moon'" :size="14" />
          {{ settingsStore.themeMode === 'dark' ? '切换浅色' : '切换深色' }}
        </button>
      </div>
      <div class="preview-colors">
        <div class="color-swatch" v-for="swatch in swatches" :key="swatch.name">
          <div class="swatch-block" :style="{ background: swatch.value }"></div>
          <span class="swatch-name">{{ swatch.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import Icon from '@/components/common/Icon.vue'

const settingsStore = useSettingsStore()

const theme = computed(() => settingsStore.themeMode)

const swatches = computed(() => [
  { name: 'bg', label: '背景', value: theme.value === 'dark' ? '#2A2726' : '#F5F0EB' },
  { name: 'surface', label: '卡片', value: theme.value === 'dark' ? '#383534' : '#FAF7F2' },
  { name: 'primary', label: '主色', value: '#A3B5A0' },
  { name: 'text', label: '文字', value: theme.value === 'dark' ? '#E0DCD8' : '#4A4543' },
  { name: 'accent', label: '强调', value: '#8FA8B5' },
  { name: 'border', label: '边框', value: theme.value === 'dark' ? '#4A4744' : '#E0D9D0' }
])
</script>

<style scoped>
.section-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  padding: var(--spacing-md) var(--spacing-lg);
  margin: 0;
  border-bottom: 1px solid var(--color-border-light);
}

.theme-preview {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  box-shadow: 0 1px 3px var(--color-shadow);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  font-size: var(--font-size-md);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
}

.toggle-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  background: transparent;
}

.preview-colors {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

.color-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.swatch-block {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.swatch-name { font-size: var(--font-size-sm); color: var(--color-text-muted); }
</style>
