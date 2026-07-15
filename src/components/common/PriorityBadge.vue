<template>
  <span class="priority-badge" :class="priority" :style="{ color: colorMap[priority] }">
    {{ labelMap[priority] }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  priority: string
}>()

const colorMap: Record<string, string> = {
  urgent: '#C4A0A0',
  high: '#D4C09E',
  medium: '#8FA8B5',
  low: '#A0B5C4',
  none: '#B5AFA8'
}

const labelMap: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
  none: '无'
}
</script>

<style scoped>
.priority-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: currentColor;
  background-clip: text;
  -webkit-background-clip: text;
  white-space: nowrap;
}
</style>
