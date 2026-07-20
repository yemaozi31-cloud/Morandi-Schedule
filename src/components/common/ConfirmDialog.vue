<template>
  <teleport to="body">
    <transition name="confirm-fade">
      <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
        <transition name="confirm-scale">
          <div v-if="visible" class="confirm-card" role="dialog">
            <button class="confirm-close" @click="handleCancel" aria-label="close">
              <svg viewBox="0 0 12 12" width="12" height="12"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M2.08859116,2.2156945 L2.14644661,2.14644661 C2.32001296,1.97288026 2.58943736,1.95359511 2.7843055,2.08859116 L2.85355339,2.14644661 L6,5.293 L9.14644661,2.14644661 C9.34170876,1.95118446 9.65829124,1.95118446 9.85355339,2.14644661 C10.0488155,2.34170876 10.0488155,2.65829124 9.85355339,2.85355339 L6.707,6 L9.85355339,9.14644661 C10.0271197,9.32001296 10.0464049,9.58943736 9.91140884,9.7843055 L9.85355339,9.85355339 C9.67998704,10.0271197 9.41056264,10.0464049 9.2156945,9.91140884 L9.14644661,9.85355339 L6,6.707 L2.85355339,9.85355339 C2.65829124,10.0488155 2.34170876,10.0488155 2.14644661,9.85355339 C1.95118446,9.65829124 1.95118446,9.34170876 2.14644661,9.14644661 L5.293,6 L2.14644661,2.85355339 C1.97288026,2.67998704 1.95359511,2.41056264 2.08859116,2.2156945 L2.14644661,2.14644661 L2.08859116,2.2156945 Z"></path></g></g></svg>
            </button>
            <div class="confirm-title">
              <svg class="confirm-icon" viewBox="0 0 24 24" width="22" height="22"><g stroke="none" stroke-width="1" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M12,2 C17.523,2 22,6.478 22,12 C22,17.522 17.523,22 12,22 C6.477,22 2,17.522 2,12 C2,6.478 6.477,2 12,2 Z M12.0018002,15.0037242 C11.450254,15.0037242 11.0031376,15.4508407 11.0031376,16.0023869 C11.0031376,16.553933 11.450254,17.0010495 12.0018002,17.0010495 C12.5533463,17.0010495 13.0004628,16.553933 13.0004628,16.0023869 C13.0004628,15.4508407 12.5533463,15.0037242 12.0018002,15.0037242 Z M11.99964,7 C11.4868042,7.00018474 11.0642719,7.38637706 11.0066858,7.8837365 L11,8.00036004 L11.0018003,13.0012393 L11.00857,13.117858 C11.0665141,13.6151758 11.4893244,14.0010638 12.0021602,14.0008793 C12.514996,14.0006946 12.9375283,13.6145023 12.9951144,13.1171428 L13.0018002,13.0005193 L13,7.99964009 L12.9932303,7.8830214 C12.9352861,7.38570354 12.5124758,6.99981552 11.99964,7 Z"></path></g></g></svg>
              {{ title }}
            </div>
            <div class="confirm-content">{{ content }}</div>
            <div class="confirm-actions">
              <button class="confirm-btn cancel" @click="handleCancel">{{ negativeText }}</button>
              <button class="confirm-btn ok" @click="handleConfirm">{{ positiveText }}</button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const visible = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v)
})

function handleConfirm() {
  emit('confirm')
  visible.value = false
}

function handleCancel() {
  emit('cancel')
  visible.value = false
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.confirm-card {
  width: 100%; max-width: 416px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid rgb(239, 239, 245);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  padding: 16px 28px 20px 28px;
  position: relative;
}

.confirm-close {
  position: absolute;
  top: 20px; right: 26px;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  color: #666;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.confirm-close:hover { background: rgba(0,0,0,0.09); }
.confirm-close:active { background: rgba(0,0,0,0.13); }

.confirm-title {
  font-size: 18px; font-weight: 500;
  color: #4A4543;
  display: flex; align-items: center;
  gap: 6px;
  line-height: 1.6;
}

.confirm-icon {
  color: #D4C09E;
  flex-shrink: 0;
}

.confirm-content {
  font-size: 14px;
  color: #8B8580;
  margin: 8px 0 16px 0;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 0 10px;
  height: 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.confirm-btn.cancel {
  background: transparent;
  border: 1px solid #E0D9D0;
  color: #8B8580;
}
.confirm-btn.cancel:hover {
  border-color: #B5C7B2;
  color: #B5C7B2;
}

.confirm-btn.ok {
  background: #D4C09E;
  border: 1px solid #D4C09E;
  color: #fff;
}
.confirm-btn.ok:hover {
  background: #E0CEB0;
  border-color: #E0CEB0;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active { transition: opacity 0.2s ease; }
.confirm-fade-enter-from,
.confirm-fade-leave-to { opacity: 0; }
.confirm-scale-enter-active,
.confirm-scale-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.confirm-scale-enter-from,
.confirm-scale-leave-to { transform: scale(0.95); opacity: 0; }
</style>
