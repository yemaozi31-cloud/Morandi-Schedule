<template>
  <div class="todo-toolbar">
    <div class="toolbar-left">
      <button class="toolbar-btn" :class="{ active: viewMode === 'matrix' }" @click="$emit('update:viewMode', 'matrix')" title="艾森豪威尔矩阵">
        <Icon name="grid" :size="16" /> <span class="btn-label">矩阵</span>
      </button>
      <button class="toolbar-btn" :class="{ active: viewMode === 'list' }" @click="$emit('update:viewMode', 'list')" title="列表">
        <Icon name="layers" :size="16" /> <span class="btn-label">列表</span>
      </button>
    </div>
    <div class="toolbar-center">
      <div class="search-wrapper">
        <Icon name="search" :size="15" class="search-icon" />
        <input
          class="toolbar-search"
          :value="localText"
          @input="onInput"
          placeholder="搜索任务..."
        />
      </div>
    </div>
    <div class="toolbar-right">
      <button class="toolbar-btn batch-btn" :class="{ active: batchMode }" @click="$emit('toggleBatch')" title="批量操作">
        <Icon name="check-square" :size="16" /> <span class="btn-label">多选</span>
      </button>
      <button class="toolbar-btn primary" @click="$emit('addTask')" title="添加任务">
        <Icon name="plus" :size="16" /> <span class="btn-label">新建</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  viewMode: string
  searchText: string
  batchMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:viewMode', mode: 'matrix' | 'list'): void
  (e: 'update:searchText', text: string): void
  (e: 'addTask'): void
  (e: 'toggleBatch'): void
}>()

const localText = ref(props.searchText)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.searchText, (val) => {
  localText.value = val
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  localText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:searchText', val)
  }, 300)
}
</script>

<style scoped>
.todo-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 2px;
}

.toolbar-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.toolbar-btn.active {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-primary);
  font-weight: 500;
}

.toolbar-btn.primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
}

.toolbar-btn.primary:hover {
  background: var(--color-primary-hover);
}

.toolbar-center {
  flex: 1;
  min-width: 120px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--spacing-sm);
  color: var(--color-text-muted);
  pointer-events: none;
}

.toolbar-search {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-md) var(--spacing-xs) calc(var(--spacing-md) + 18px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.toolbar-search:focus {
  border-color: var(--color-primary);
}

.toolbar-right {
  display: flex;
  gap: 2px;
}

/* ── 窄屏：隐藏按钮文字，只留图标 ── */
@media (max-width: 767px) {
  .btn-label { display: none; }
  .toolbar-btn { padding: var(--spacing-xs) var(--spacing-sm); }
  .toolbar-search { max-width: 120px; }
}
</style>
