<template>
  <span v-if="tag" class="tag-badge" :style="{ background: tag.color + '20', color: tag.color }">
    {{ tag.name }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTagStore } from '@/stores/tagStore'

const props = defineProps<{
  tagId: string
}>()

const tagStore = useTagStore()

const tag = computed(() => tagStore.getTagById(props.tagId))
</script>

<style scoped>
.tag-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}
</style>
