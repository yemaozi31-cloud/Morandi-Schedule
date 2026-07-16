<template>
  <teleport to="body">
    <transition name="confirm-fade">
      <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
        <transition name="confirm-scale">
          <div v-if="visible" class="confirm-card">
            <div class="confirm-header">
              <span class="confirm-title">{{ title }}</span>
            </div>
            <div class="confirm-body">
              <p class="confirm-message">{{ content }}</p>
            </div>
            <div class="confirm-footer">
              <button class="confirm-btn cancel" @click="handleCancel">{{ negativeText }}</button>
              <button class="confirm-btn confirm" @click="handleConfirm">{{ positiveText }}</button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  content: string
  positiveText?: string
  negativeText?: string
}>()

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const visible = computed(() => props.show)

function handleConfirm() {
  visible.value = false
  emit('update:show', false)
  emit('confirm')
}

function handleCancel() {
  visible.value = false
  emit('update:show', false)
  emit('cancel')
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay, rgba(0,0,0,0.35));
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl, 24px);
}

.confirm-card {
  width: 100%;
  max-width: 360px;
  background: var(--color-surface, #FAF7F2);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 8px 32px var(--color-shadow-heavy, rgba(0,0,0,0.15));
  overflow: hidden;
}

.confirm-header {
  padding: var(--spacing-lg, 16px) var(--spacing-xl, 24px) 0;
}

.confirm-title {
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--color-text, #4A4543);
}

.confirm-body {
  padding: var(--spacing-md, 12px) var(--spacing-xl, 24px);
}

.confirm-message {
  font-size: var(--font-size-md, 14px);
  color: var(--color-text-secondary, #8B8580);
  line-height: 1.5;
  margin: 0;
}

.confirm-footer {
  display: flex;
  gap: var(--spacing-sm, 8px);
  justify-content: flex-end;
  padding: var(--spacing-md, 12px) var(--spacing-xl, 24px) var(--spacing-lg, 16px);
}

.confirm-btn {
  padding: var(--spacing-xs, 4px) var(--spacing-lg, 16px);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-md, 14px);
  font-weight: 500;
  cursor: pointer;
  min-height: 36px;
  border: none;
  transition: opacity 0.15s;
}
.confirm-btn:hover { opacity: 0.85; }
.confirm-btn.cancel {
  background: transparent;
  border: 1px solid var(--color-border, #E0D9D0);
  color: var(--color-text-secondary, #8B8580);
}
.confirm-btn.confirm {
  background: var(--color-primary, #A3B5A0);
  color: var(--color-text-on-primary, #FFFFFF);
}

/* 过渡 */
.confirm-fade-enter-active, .confirm-fade-leave-active { transition: opacity 0.2s ease; }
.confirm-fade-enter-from, .confirm-fade-leave-to { opacity: 0; }
.confirm-scale-enter-active, .confirm-scale-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.confirm-scale-enter-from, .confirm-scale-leave-to { transform: scale(0.95); opacity: 0; }
</style>
