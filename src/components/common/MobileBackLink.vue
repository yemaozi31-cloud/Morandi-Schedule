<template>
  <router-link to="/" class="mobile-back-link">
    <Icon name="chevron-left" :size="16" />
    <span>返回</span>
  </router-link>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
</script>

<style scoped>
.mobile-back-link {
  display: none;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-xs) 0;
  color: var(--color-primary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

@media (max-width: 767px) {
  .mobile-back-link {
    display: inline-flex;
  }
}
</style>
