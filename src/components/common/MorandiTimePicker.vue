<template>
  <div class="morandi-timepicker" ref="containerRef">
    <div class="time-input" :class="{ 'has-value': !!modelValue }" @click="togglePanel">
      <span class="time-text">{{ modelValue || placeholder || '选择时间' }}</span>
      <span class="time-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </span>
      <button v-if="modelValue && clearable" class="time-clear" @click.stop="clearTime">✕</button>
    </div>

    <transition name="panel-slide">
      <div v-if="showPanel" class="time-panel" :style="panelStyle">
        <div class="panel-head">选择时间</div>
        <div class="pick-group">
          <VueScrollPicker
            :options="hours"
            :model-value="selHour"
            class="scroll-picker"
            :wheel-sensitivity="0.2"
            :drag-sensitivity="5"
            @update:model-value="selHour = ($event as number)"
          />
          <span class="pick-colon">:</span>
          <VueScrollPicker
            :options="mins"
            :model-value="selMin"
            class="scroll-picker"
            :wheel-sensitivity="0.2"
            :drag-sensitivity="5"
            @update:model-value="selMin = ($event as number)"
          />
        </div>
        <div class="panel-foot">
          <button class="btn confirm" @click="confirmTime">确认</button>
          <button class="btn cancel" @click="showPanel = false">取消</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { VueScrollPicker } from 'vue-scroll-picker'
import 'vue-scroll-picker/style.css'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  clearable?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>()

const containerRef = ref<HTMLDivElement>()
const showPanel = ref(false)
const selHour = ref(9)
const selMin = ref(0)
const pos = ref({ top: 0, left: 0 })
const panelStyle = computed(() => ({ top: pos.value.top + 'px', left: pos.value.left + 'px' }))

const spacer = { name: '', value: null, disabled: true }
const hours = [
  spacer, spacer, spacer,
  ...Array.from({ length: 24 }, (_, i) => ({ name: String(i).padStart(2, '0'), value: i })),
  spacer, spacer, spacer
]
const mins = [
  spacer, spacer,
  ...[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(v => ({ name: String(v).padStart(2, '0'), value: v })),
  spacer, spacer
]

function togglePanel() {
  showPanel.value = !showPanel.value
  if (!showPanel.value) return
  const r = containerRef.value?.querySelector('.time-input')?.getBoundingClientRect()
  if (r) pos.value = { top: r.bottom + 4, left: r.left }
  if (props.modelValue) {
    const [h, m] = props.modelValue.split(':').map(Number)
    selHour.value = h
    selMin.value = mins.reduce((a, b) => Math.abs(b.value - m) < Math.abs(a.value - m) ? b : a).value
  }
}

function confirmTime() {
  emit('update:modelValue', `${String(selHour.value).padStart(2,'0')}:${String(selMin.value).padStart(2,'0')}`)
  showPanel.value = false
}
function clearTime() { emit('update:modelValue', ''); showPanel.value = false }
function clickOut(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) showPanel.value = false
}
onMounted(() => document.addEventListener('click', clickOut))
onUnmounted(() => document.removeEventListener('click', clickOut))
</script>

<style scoped>
.morandi-timepicker { position: relative; display: inline-block; width: 100%; }
.time-input {
  display: flex; align-items: center; gap: 4px; padding: 4px 8px;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); cursor: pointer; transition: border-color 0.2s;
  min-height: 28px; user-select: none;
  box-sizing: border-box;
}
.time-input:hover, .time-input.has-value { border-color: var(--color-primary); }
.time-text { flex: 1; font-size: var(--font-size-sm); color: var(--color-text); }
.time-input:not(.has-value) .time-text { color: var(--color-text-muted); }
.time-icon { display: flex; color: var(--color-text-muted); flex-shrink: 0; }
.time-icon svg { width: 14px; height: 14px; display: block; }
.time-clear { border: none; background: none; cursor: pointer; color: var(--color-text-muted); font-size: 12px; padding: 0 2px; }

.time-panel {
  position: fixed; z-index: 99999; width: 260px;
  background: var(--color-surface); border: 1px solid var(--color-border-light);
  border-radius: 16px; box-shadow: 0 8px 32px var(--color-shadow-heavy);
  padding: 12px;
}
.panel-head { text-align: center; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); padding-bottom: 8px; }

.pick-group { display: flex; align-items: center; justify-content: center; gap: 0; }
.scroll-picker { width: 90px; height: 160px; }
.pick-colon { font-size: 24px; font-weight: 300; color: var(--color-text-muted); }

.panel-foot { display: flex; gap: 8px; justify-content: center; padding-top: 8px; }
.btn { flex: 1; padding: 8px; border-radius: 10px; font-size: 13px; cursor: pointer; border: none; }
.btn.confirm { background: var(--color-primary); color: #fff; }
.btn.cancel { background: var(--color-bg); color: var(--color-text-secondary); }

.panel-slide-enter-active, .panel-slide-leave-active { transition: opacity 0.15s, transform 0.15s; }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* 莫兰迪主题覆盖 — vue-scroll-picker 样式 */
:deep(.vue-scroll-picker) { height: 200px; }
:deep(.vue-scroll-picker-rotator) { top: calc(50% - 0.6em); }
:deep(.vue-scroll-picker-item) { color: var(--color-text-muted); font-size: 16px; line-height: 1.2em; height: 1.2em; }
:deep(.vue-scroll-picker-item[aria-selected=true]) { color: var(--color-text); font-weight: 600; font-size: 18px; }
:deep(.vue-scroll-picker-layer-top) { height: calc(50% - 0.6em); }
:deep(.vue-scroll-picker-layer-bottom) { height: calc(50% - 0.6em); }
:deep(.vue-scroll-picker-layer-top) { background: linear-gradient(180deg, var(--color-surface) 10%, transparent); border-bottom: 1px solid var(--color-border-light); }
:deep(.vue-scroll-picker-layer-bottom) { background: linear-gradient(0deg, var(--color-surface) 10%, transparent); border-top: 1px solid var(--color-border-light); }

/* ── 手机端紧凑 ──────────────────────── */
@media (max-width: 767px) {
  .time-input {
    padding: 2px 8px;
    min-height: 28px;
    gap: 2px;
  }
  .time-text {
    font-size: 13px;
  }
  .time-icon svg {
    width: 12px;
    height: 12px;
  }
  .time-clear {
    display: none !important;
  }
  /* 手机端时间面板：底部弹出 */
  .time-panel {
    position: fixed !important;
    top: auto !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100vw;
    max-width: 100vw;
    border-radius: 16px 16px 0 0;
    border: none;
    border-top: 1px solid var(--color-border-light);
    box-shadow: 0 -4px 24px var(--color-shadow-heavy);
    padding: 16px 12px;
  }
  .pick-group {
    padding: 8px 0;
  }
  .scroll-picker {
    width: 120px;
    height: 180px;
  }
  .pick-colon {
    font-size: 20px;
  }
  .panel-foot {
    padding: 12px 0 0;
  }
}
</style>
