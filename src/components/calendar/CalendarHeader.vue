<template>
  <div class="calendar-header">
    <div class="header-left">
      <button class="nav-btn" @click="$emit('prev')" aria-label="上一页">
        <Icon name="chevron-left" :size="18" />
      </button>
      <div class="title-wrapper">
        <h2 class="header-title" :class="{ clickable: datePicker }" @click="handleTitleClick">
          {{ title }}
        </h2>
        <!-- 日期选择器只覆盖标题区域，不遮挡 ← → 和今天按钮 -->
        <MorandiDatePicker
          v-if="datePicker"
          ref="datePickerRef"
          v-model="pickerValue"
          class="header-datepicker"
          transparent-trigger
          @update:model-value="onDateChange"
        />
      </div>
      <button class="nav-btn" @click="$emit('next')" aria-label="下一页">
        <Icon name="chevron-right" :size="18" />
      </button>
      <button class="today-btn" @click="$emit('today')">今天</button>
    </div>
    <div class="header-right">
      <button
        v-for="v in views"
        :key="v.key"
        class="view-btn"
        :class="{ active: currentView === v.key }"
        @click="$emit('update:currentView', v.key)"
      >
        {{ v.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Icon from '@/components/common/Icon.vue'
import MorandiDatePicker from '@/components/common/MorandiDatePicker.vue'

const props = defineProps<{
  title: string
  currentView: string
  views: { key: string; label: string }[]
  datePicker?: boolean
  dateValue?: string
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'today'): void
  (e: 'update:currentView', view: string): void
  (e: 'selectDate', date: string): void
}>()

const datePickerRef = ref<InstanceType<typeof MorandiDatePicker>>()
const pickerValue = ref(props.dateValue || '')

function handleTitleClick() {
  if (props.datePicker && datePickerRef.value) {
    datePickerRef.value.togglePanel()
  }
}

function onDateChange(val: string) {
  if (val) emit('selectDate', val)
}
</script>

<style scoped>
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  position: relative;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.nav-btn:hover { background: var(--color-surface-hover); }

.header-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
  min-width: 120px;
  margin: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
}

.header-title.clickable {
  cursor: pointer;
  transition: color var(--transition-fast);
}
.header-title.clickable:hover { color: var(--color-primary); }

/* 莫兰迪日期选择器——只覆盖标题区域，不遮挡按钮 */
.header-datepicker {
  position: absolute !important;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  z-index: 2;
  pointer-events: auto;
}

.header-datepicker :deep(.date-input) {
  pointer-events: auto;
}

.today-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  background: transparent;
}
.today-btn:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }

.header-right {
  display: flex;
  gap: 2px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2px;
}

.view-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
}
.view-btn.active {
  background: var(--color-bg);
  color: var(--color-text);
  font-weight: 500;
}
</style>
