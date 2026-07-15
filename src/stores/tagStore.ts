import { defineStore } from 'pinia'
import { triggerAutoSync } from '@/services/autoSync'
import { ref, computed } from 'vue'
import type { Tag } from '@/types'
import * as db from '@/db'
import { generateUUID } from '@/utils/uuid'

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Map<string, Tag>>(new Map())

  const sortedTags = computed(() =>
    Array.from(tags.value.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  function getTagById(id: string): Tag | undefined {
    return tags.value.get(id)
  }

  function getTagByName(name: string): Tag | undefined {
    return sortedTags.value.find(t => t.name === name)
  }

  async function loadTags() {
    try {
      const data = await db.getAll<Tag>('tags')
      tags.value = new Map(data.map(t => [t.id, t]))
    } catch (e) {
      console.error('加载标签失败:', e)
    }
  }

  async function createTag(name: string, color: string = '#A0B5C4'): Promise<Tag> {
    const tag: Tag = {
      id: generateUUID(),
      name,
      color,
      createdAt: new Date().toISOString(),
      sortOrder: sortedTags.value.length
    }
    try {
      await db.set('tags', tag)
      triggerAutoSync()
      tags.value.set(tag.id, tag)
    } catch (e) {
      console.error('创建标签失败:', e)
      throw e
    }
    return tag
  }

  async function updateTag(id: string, data: Partial<Tag>) {
    const existing = tags.value.get(id)
    if (!existing) return
    const updated: Tag = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    }
    try {
      await db.set('tags', updated)
      triggerAutoSync()
      tags.value.set(id, updated)
    } catch (e) {
      console.error('更新标签失败:', e)
      throw e
    }
  }

  async function deleteTag(id: string) {
    try {
      await db.remove('tags', id)
      triggerAutoSync()
      tags.value.delete(id)

      // C1: 清理所有引用该标签的任务
      try {
        const { useTaskStore } = await import('@/stores/taskStore')
        const taskStore = useTaskStore()
        for (const task of Array.from(taskStore.tasks.values())) {
          if (task.tagIds && task.tagIds.includes(id)) {
            await taskStore.updateTask(task.id, {
              tagIds: task.tagIds.filter(tid => tid !== id)
            })
          }
        }
      } catch (e) {
        console.error('清理任务标签引用失败:', e)
        window.__message?.warning('标签已删除，但部分任务标签引用未清理')
      }
    } catch (e) {
      console.error('删除标签失败:', e)
      throw e
    }
  }

  return {
    tags, sortedTags,
    getTagById, getTagByName,
    loadTags, createTag, updateTag, deleteTag
  }
})
