<template>
  <div class="empty-state">
    <div class="empty-icon">
      <Icon :name="icon || 'inbox'" :size="48" />
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <slot name="action">
      <button v-if="actionText" class="empty-action" @click="$emit('action')">
        {{ actionText }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/common/Icon.vue'

defineProps<{
  title: string
  description?: string
  icon?: string
  actionText?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl) var(--spacing-lg);
  text-align: center;
  min-height: 200px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.empty-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
}

.empty-desc {
  font-size: var(--font-size-md);
  color: var(--color-text-muted);
  max-width: 280px;
  line-height: 1.5;
  margin-bottom: var(--spacing-lg);
}

.empty-action {
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-md);
  transition: background var(--transition-fast);
}

.empty-action:hover {
  background: var(--color-primary-hover);
}
</style>
