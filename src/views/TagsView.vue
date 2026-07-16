<template>
  <AppLayout>
    <div class="tags-view">
      <MobileBackLink />
      <div class="tags-header">
        <h1>标签管理</h1>
        <button class="add-tag-btn" @click="showForm = true"><Icon name="plus" :size="16" /> 新建标签</button>
      </div>

      <div class="tags-grid">
        <div v-for="tag in tagStore.sortedTags" :key="tag.id" class="tag-card" :style="{ '--tag-color': tag.color }">
          <div class="tag-color-bar" :style="{ background: tag.color }"></div>
          <div class="tag-body">
            <span class="tag-name">{{ tag.name }}</span>
            <span class="tag-count">{{ getTaskCount(tag.id) }} 个任务</span>
          </div>
          <div class="tag-actions">
            <button class="tag-action-btn" @click="startEdit(tag)" aria-label="编辑">
              <Icon name="edit" :size="14" />
            </button>
            <button class="tag-action-btn delete" @click="confirmDelete(tag)" aria-label="删除">
              <Icon name="x" :size="14" />
            </button>
          </div>
        </div>
        <EmptyState
          v-if="tagStore.sortedTags.length === 0"
          title="暂无标签"
          description="点击右上角创建第一个标签"
          icon="tags"
        />
      </div>

      <!-- 新建/编辑弹窗 -->
      <teleport to="body">
        <transition name="modal-fade">
          <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
            <div class="modal-card">
              <div class="modal-header">
                <h3>{{ editingTag ? '编辑标签' : '新建标签' }}</h3>
                <button class="modal-close" @click="showForm = false" aria-label="关闭">
                  <Icon name="x" :size="18" />
                </button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>标签名称</label>
                  <input v-model="formName" placeholder="输入标签名..." ref="nameInput" />
                </div>
                <div class="form-group">
                  <label>标签颜色</label>
                  <div class="color-picker">
                    <button
                      v-for="c in colors"
                      :key="c"
                      class="color-option"
                      :class="{ active: formColor === c }"
                      :style="{ background: c }"
                      @click="formColor = c"
                    ></button>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="footer-btn cancel" @click="showForm = false">取消</button>
                <button class="footer-btn confirm" @click="handleSave" :disabled="!formName.trim()">
                  {{ editingTag ? '保存' : '创建' }}
                </button>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import { useTaskStore } from '@/stores/taskStore'
import type { Tag } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/common/Icon.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'

const tagStore = useTagStore()
const taskStore = useTaskStore()

const showForm = ref(false)
const editingTag = ref<Tag | null>(null)
const formName = ref('')
const formColor = ref('#A0B5C4')
const nameInput = ref<HTMLInputElement>()

function showConfirm(title: string, message: string, onConfirm: () => void) {
  window.__dialog?.warning({
    title,
    content: message,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: onConfirm
  })
}

const colors = [
  '#C4A0A0', '#D4B0A0', '#D4C09E', '#A0C4A0',
  '#A0B5C4', '#8FA8B5', '#B5A8C4', '#C4A0B5',
  '#A3B5A0', '#B5AFA8'
]

onMounted(async () => {
  await tagStore.loadTags()
})

function startEdit(tag: Tag) {
  editingTag.value = tag
  formName.value = tag.name
  formColor.value = tag.color
  showForm.value = true
  nextTick(() => nameInput.value?.focus())
}

async function handleSave() {
  if (!formName.value.trim()) return
  try {
    if (editingTag.value) {
      await tagStore.updateTag(editingTag.value.id, { name: formName.value.trim(), color: formColor.value })
      window.__message?.success('标签已更新')
    } else {
      await tagStore.createTag(formName.value.trim(), formColor.value)
      window.__message?.success('标签已创建')
    }
    showForm.value = false
    editingTag.value = null
    formName.value = ''
    formColor.value = '#A0B5C4'
  } catch {
    window.__message?.error('保存标签失败')
  }
}

function confirmDelete(tag: Tag) {
  showConfirm('删除标签', `确认删除标签"${tag.name}"？`, async () => {
    try {
      await tagStore.deleteTag(tag.id)
      window.__message?.success('标签已删除')
    } catch {
      window.__message?.error('删除标签失败')
    }
  })
}

function getTaskCount(tagId: string): number {
  return taskStore.activeTasks.filter(t => t.tagIds.includes(tagId)).length
}
</script>

<style scoped>
.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.tags-header h1 { font-size: var(--font-size-xl); color: var(--color-text); }

.add-tag-btn {
  margin-top: 10px;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-md);
}

.tag-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border-light);
  display: flex;
  align-items: stretch;
}

.tag-color-bar { width: 4px; flex-shrink: 0; }

.tag-body {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tag-name { font-size: var(--font-size-md); font-weight: 500; color: var(--color-text); }
.tag-count { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.tag-actions {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border-light);
}

.tag-action-btn {
  flex: 1;
  padding: var(--spacing-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.tag-action-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }
.tag-action-btn.delete:hover { color: var(--color-danger); }

/* Modal styles (same as TaskFormModal) */
.modal-overlay {
  position: fixed; inset: 0;
  background: var(--color-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 7000;
}
.modal-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90vw; max-width: 400px;
  box-shadow: 0 8px 32px var(--color-shadow-heavy);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}
.modal-header h3 { font-size: var(--font-size-lg); color: var(--color-text); }
.modal-close { color: var(--color-text-muted); font-size: 18px; width: 28px; height: 28px; border-radius: var(--radius-full); }
.modal-close:hover { background: var(--color-surface-hover); }
.modal-body { padding: var(--spacing-xl); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-group label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.form-group input {
  width: 100%; padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text);
  font-size: var(--font-size-md); outline: none;
}
.form-group input:focus { border-color: var(--color-primary); }
.color-picker { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }
.color-option {
  width: 28px; height: 28px; min-height: 28px; border-radius: var(--radius-full);
  border: 2px solid transparent; cursor: pointer;
}
.color-option.active { border-color: var(--color-text); }

@media (max-width: 767px) {
  .color-option {
    width: 36px;
    height: 36px;
    min-height: 36px;
  }
}
.modal-footer {
  display: flex; gap: var(--spacing-sm); justify-content: flex-end;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-top: 1px solid var(--color-border-light);
}
.footer-btn {
  padding: var(--spacing-sm) var(--spacing-xl); border-radius: var(--radius-md);
  font-size: var(--font-size-md); cursor: pointer;
}
.footer-btn.cancel { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
.footer-btn.confirm { background: var(--color-primary); border: none; color: var(--color-text-on-primary); }
.footer-btn.confirm:disabled { opacity: 0.5; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
