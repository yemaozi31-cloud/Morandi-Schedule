<template>
  <div class="pomodoro-timer" :class="{ running: store.isRunning, break: store.isBreak }">
    <div class="timer-header-row">
      <span class="timer-mode">{{ statusText }}</span>
      <span class="timer-display">{{ displayTime }}</span>
    </div>
    <div class="timer-progress">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
    </div>

    <!-- 空闲态: 显示时长选择器 -->
    <div v-if="isIdle" class="duration-selector">
      <button
        v-for="opt in presets"
        :key="opt"
        class="duration-btn"
        :class="{ active: !customText && requestedMinutes === opt }"
        @click="selectPreset(opt)"
      >
        {{ opt }}分
      </button>
      <div class="custom-duration">
        <input type="number" class="duration-input" v-model="customText" placeholder="自定义" @input="onCustomInput" min="1" max="180" />
        <span class="duration-unit">分</span>
      </div>
    </div>

    <div class="timer-actions">
      <button v-if="isIdle" class="timer-btn primary" @click="handleStart">
        开始 {{ selectedMinutes }}分
      </button>
      <template v-if="isPaused">
        <button class="timer-btn" @click="store.resumeTimer()">继续</button>
        <button class="timer-btn stop" @click="handleStop">结束</button>
      </template>
      <template v-if="store.isRunning">
        <button class="timer-btn" @click="store.pauseTimer()">暂停</button>
        <button class="timer-btn stop" @click="handleStop">结束</button>
      </template>
      <!-- 休息模式按钮 -->
      <template v-if="store.isBreak && !store.isRunning">
        <button class="timer-btn" @click="skipBreak">跳过休息</button>
        <button class="timer-btn primary" @click="startNextPomodoro">开始下一个</button>
      </template>
    </div>

    <div class="timer-stats">
      <span>今日完成: {{ store.todayStats.count }} 个</span>
      <span>总专注: {{ store.todayStats.totalMinutes }} 分钟</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePomodoroStore } from '@/stores/pomodoroStore'

const store = usePomodoroStore()

const presets = [15, 25, 30, 45, 60]
const requestedMinutes = ref(25)
const customText = ref('')

// 选中分钟数：自定义优先，否则用预设
const selectedMinutes = computed(() => {
  if (customText.value) {
    const n = parseInt(customText.value, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return requestedMinutes.value
})

// 空闲 = 未运行 + 不在休息 + 剩余秒数等于默认满值
const isIdle = computed(() =>
  !store.isRunning && !store.isBreak && store.remainingSeconds >= 25 * 60
)

// 暂停 = 未运行 + 不在休息 + 剩余秒数已消耗过
const isPaused = computed(() =>
  !store.isRunning && !store.isBreak && store.remainingSeconds < 25 * 60
)

const statusText = computed(() => {
  if (store.isBreak) return '休息中'
  if (store.isRunning) return '专注中'
  if (isPaused.value) return '已暂停'
  return '准备就绪'
})

const displayTime = computed(() => {
  if (isIdle.value) {
    // 空闲态: 显示选中的预期时长
    return `${String(selectedMinutes.value).padStart(2, '0')}:00`
  }
  // 运行/暂停态: 显示剩余时间
  const mins = Math.floor(store.remainingSeconds / 60)
  const secs = store.remainingSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const progressPercent = computed(() => {
  if (isIdle.value) return 0
  const total = store.isBreak ? 5 * 60 : selectedMinutes.value * 60
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, ((total - store.remainingSeconds) / total) * 100))
})

function selectPreset(mins: number) {
  requestedMinutes.value = mins
  customText.value = ''
}

function onCustomInput() {
  const n = parseInt(customText.value, 10)
  if (!isNaN(n) && n > 0) {
    requestedMinutes.value = 0
  }
}

function handleStart() {
  const mins = selectedMinutes.value
  if (mins <= 0) return
  store.startTimer(undefined, mins)
}

function handleStop() {
  requestedMinutes.value = 25
  customText.value = ''
  store.stopTimer()
}

function skipBreak() {
  store.endBreak()
}

function startNextPomodoro() {
  store.endBreak()
  // endBreak 已将状态重置到空闲，用户点击"开始"即可
}
</script>

<style scoped>
.pomodoro-timer {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  text-align: center;
  border: 1px solid var(--color-border-light);
  height: auto;
  min-height: 160px;
}

.timer-header-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.timer-mode {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.timer-display {
  font-size: 32px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.pomodoro-timer.running .timer-display {
  color: var(--color-danger);
}

.pomodoro-timer.break .timer-display {
  color: var(--color-success);
}

.timer-progress {
  height: 3px;
  background: var(--color-bg);
  border-radius: 2px;
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 1s linear;
}

.duration-selector {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-sm);
}

.duration-btn {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.duration-btn.active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  font-weight: 500;
}

.custom-duration {
  display: flex;
  align-items: center;
  gap: 2px;
}

.duration-input {
  width: 56px;
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 12px;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
}
.duration-input::-webkit-inner-spin-button,
.duration-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.duration-input:focus {
  border-color: var(--color-primary);
}

.duration-unit {
  font-size: 12px;
  color: var(--color-text-muted);
}

.timer-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  margin-bottom: var(--spacing-sm);
}

.timer-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.timer-btn.primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
  min-width: 78px;
}

.timer-btn.stop {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.timer-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  font-size: 12px;
  color: var(--color-text-muted);
}

@media (max-width: 767px) {
  .duration-selector {
    gap: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    justify-content: flex-start;
    padding: 2px 0;
  }
  .duration-btn {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 12px;
  }
  .duration-input {
    width: 56px;
    font-size: 12px;
  }
  .timer-display {
    font-size: 28px;
  }
  .pomodoro-timer {
    padding: var(--spacing-sm);
  }
}
</style>
