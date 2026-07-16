<template>
  <div class="morandi-select" ref="triggerRef">
    <button class="select-trigger" :class="{ active: open }" @click="toggle" :disabled="disabled" type="button">
      <span class="select-value" :class="{ placeholder: !selectedLabel }">{{ selectedLabel || placeholder }}</span>
      <Icon name="chevron-down" :size="14" class="select-arrow" :class="{ rotated: open }" />
    </button>

    <!-- 桌面端：绝对定位下拉 -->
    <div v-if="open && !isMobile" class="select-dropdown">
      <button
        v-for="opt in options"
        :key="String(opt.value)"
        class="select-option"
        :class="{ active: modelValue === opt.value }"
        @click="select(opt.value)"
        type="button"
      >
        <span class="option-label">{{ opt.label }}</span>
        <Icon v-if="modelValue === opt.value" name="check" :size="14" class="option-check" />
      </button>
    </div>

    <!-- 手机端：teleport 底部 sheet -->
    <teleport to="body">
      <transition name="select-fade">
        <div v-if="open && isMobile" class="select-overlay" @click.self="close">
          <transition name="select-slide-up">
            <div v-if="open && isMobile" class="select-sheet">
              <div class="select-sheet-header">
                <span class="select-sheet-title">{{ title || '请选择' }}</span>
                <button class="select-sheet-close" @click="close"><Icon name="x" :size="16" /></button>
              </div>
              <div class="select-sheet-options">
                <button
                  v-for="opt in options"
                  :key="String(opt.value)"
                  class="select-option"
                  :class="{ active: modelValue === opt.value }"
                  @click="select(opt.value)"
                  type="button"
                >
                  <span class="option-label">{{ opt.label }}</span>
                  <Icon v-if="modelValue === opt.value" name="check" :size="14" class="option-check" />
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useResponsive } from '@/composables/useResponsive'
import Icon from '@/components/common/Icon.vue'

export interface SelectOption {
  value: string | number | null
  label: string
}

const props = defineProps<{
  modelValue: string | number | null | undefined
  options: SelectOption[]
  placeholder?: string
  title?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

const { isMobile } = useResponsive()
const open = ref(false)
const triggerRef = ref<HTMLElement>()

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : ''
})

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function close() { open.value = false }

function select(value: string | number | null) {
  emit('update:modelValue', value)
  close()
}

function onClickOutside(e: MouseEvent) {
  if (!open.value || !isMobile.value) return // desktop 用自带行为
  const t = e.target as HTMLElement
  if (triggerRef.value?.contains(t)) return
  // 点击输入框/文本框时不要关闭选择器，防止输入框失焦
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.closest('input, textarea, [contenteditable]')) return
  close()
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.morandi-select { position: relative; }

.select-trigger {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text);
  font-size: var(--font-size-md); cursor: pointer;
  transition: border-color var(--transition-fast);
  min-height: 36px;
}
.select-trigger:hover { border-color: var(--color-primary-hover); }
.select-trigger.active { border-color: var(--color-primary); }
.select-trigger:disabled { opacity: 0.5; cursor: not-allowed; }

.select-value { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.select-value.placeholder { color: var(--color-text-muted); opacity: 0.6; }

.select-arrow { flex-shrink: 0; color: var(--color-text-muted); transition: transform 0.2s; }
.select-arrow.rotated { transform: rotate(180deg); }

/* 桌面端：绝对定位下拉 */
.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  z-index: 100;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px var(--color-shadow-heavy);
  padding: var(--spacing-xs);
  max-height: 200px; overflow-y: auto;
}

/* 手机端：底部 sheet */
.select-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: var(--color-overlay);
  display: flex; align-items: flex-end; justify-content: center;
}
.select-sheet {
  width: 100%; max-width: 500px;
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  max-height: 50vh; overflow-y: auto;
}
.select-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky; top: 0; background: var(--color-surface); z-index: 1;
}
.select-sheet-title { font-size: var(--font-size-md); font-weight: 500; color: var(--color-text); }
.select-sheet-close { color: var(--color-text-muted); display: flex; padding: 4px; border-radius: var(--radius-sm); }

/* 选项列表 */
.select-option {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-md); color: var(--color-text);
  background: transparent; cursor: pointer; border: none; text-align: left;
  min-height: 40px; border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
.select-sheet-options { padding: var(--spacing-sm) 0; }
.select-option:hover { background: var(--color-surface-hover); }
.select-option.active { color: var(--color-primary); font-weight: 500; }
.option-check { color: var(--color-primary); }
.option-label { flex: 1; }

/* 过渡 */
.select-fade-enter-active, .select-fade-leave-active { transition: opacity 0.15s ease; }
.select-fade-enter-from, .select-fade-leave-to { opacity: 0; }
.select-slide-up-enter-active, .select-slide-up-leave-active { transition: transform 0.25s ease; }
.select-slide-up-enter-from, .select-slide-up-leave-to { transform: translateY(100%); }
</style>
