<template>
  <div class="morandi-number-input">
    <button class="num-btn" @click="stepDown" :disabled="canStepDown === false" type="button" aria-label="减少">
      <Icon name="minus" :size="14" />
    </button>
    <input
      class="num-value"
      type="text"
      inputmode="numeric"
      :value="modelValue"
      @input="onInput"
      @blur="onBlur"
    />
    <button class="num-btn" @click="stepUp" :disabled="canStepUp === false" type="button" aria-label="增加">
      <Icon name="plus" :size="14" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const step = computed(() => props.step ?? 1)

const canStepUp = computed(() => props.max === undefined || props.modelValue < props.max)
const canStepDown = computed(() => props.min === undefined || props.modelValue > props.min)

function stepUp() {
  if (canStepUp.value === false) return
  const next = props.modelValue + step.value
  if (props.max !== undefined && next > props.max) return
  emit('update:modelValue', next)
}

function stepDown() {
  if (canStepDown.value === false) return
  const next = props.modelValue - step.value
  if (props.min !== undefined && next < props.min) return
  emit('update:modelValue', next)
}

function onInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    let clamped = val
    if (props.min !== undefined) clamped = Math.max(clamped, props.min)
    if (props.max !== undefined) clamped = Math.min(clamped, props.max)
    emit('update:modelValue', clamped)
  }
}

function onBlur(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.value || isNaN(parseInt(input.value))) {
    input.value = String(props.modelValue)
  }
}
</script>

<style scoped>
.morandi-number-input {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg);
}

.num-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast);
}
.num-btn:hover:not(:disabled) { background: var(--color-surface-hover); color: var(--color-text); }
.num-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.num-value {
  width: 48px;
  text-align: center;
  border: none;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-xs);
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--color-text);
  background: transparent;
  outline: none;
  -moz-appearance: textfield;
}
.num-value::-webkit-inner-spin-button,
.num-value::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
</style>
