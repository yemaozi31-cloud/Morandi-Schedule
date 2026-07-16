<template>
  <teleport to="body">
    <div v-if="course" class="detail-overlay" @click.self="close">
      <div class="detail-card">
        <div class="detail-header">
          <span class="detail-title">{{ course.title }}</span>
          <button class="detail-close" @click="close"><Icon name="x" :size="16" /></button>
        </div>
        <div class="detail-body">
          <div class="detail-row" v-if="course.courseTeacher">
            <span class="detail-label">教师</span>
            <span class="detail-value">{{ course.courseTeacher }}</span>
          </div>
          <div class="detail-row" v-if="course.courseLocation">
            <span class="detail-label">教室</span>
            <span class="detail-value">{{ course.courseLocation }}</span>
          </div>
          <div class="detail-row" v-if="course.courseStartTime">
            <span class="detail-label">时间</span>
            <span class="detail-value">{{ getCourseDayNick(course) }} {{ course.courseStartTime }}~{{ course.courseEndTime }}</span>
          </div>
          <div class="detail-row" v-if="course.courseValidFrom">
            <span class="detail-label">起止</span>
            <span class="detail-value">{{ course.courseValidFrom }} ~ {{ course.courseValidTo || '长期' }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="detail-btn edit-btn" @click="handleEdit">编辑</button>
          <button class="detail-btn delete-btn" @click="handleDelete">删除</button>
        </div>
        <div class="detail-footer" style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border-light);">
          <button class="detail-btn add-btn" style="flex:1" @click="handleAddTask">+ 添加新任务</button>
          <button class="detail-btn add-btn" style="flex:1" @click="handleAddCourse">+ 添加新课程</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import type { Task } from '@/types'
import Icon from '@/components/common/Icon.vue'

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const props = defineProps<{
  course: Task | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'addTask', prefill: { dueDate: string; dueTime?: string }): void
  (e: 'addCourse'): void
}>()

function getCourseDayNick(course: Task | null): string {
  if (!course || course.courseDay === undefined || course.courseDay === null) return ''
  return DAY_NAMES[course.courseDay] || ''
}

function close() { emit('close') }
function handleEdit() { if (props.course) { emit('edit', props.course.id); close() } }
function handleDelete() { if (props.course) { emit('delete', props.course.id); close() } }
function handleAddTask() {
  if (!props.course) return
  const prefill: any = { dueDate: props.course.courseValidFrom || '' }
  if (props.course.courseStartTime) prefill.dueTime = props.course.courseStartTime
  emit('addTask', prefill)
  close()
}
function handleAddCourse() { emit('addCourse'); close() }

</script>

<style scoped>
/* 和 TaskDetailModal 保持一致的 overlay/卡片样式 */
.detail-overlay {
  position: fixed; inset: 0; background: var(--color-overlay); z-index: 8000;
  display: flex; align-items: flex-end; justify-content: center;
}
@media (min-width: 768px) { .detail-overlay { align-items: center; } }
.detail-card {
  width: 100%; max-width: 420px; background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-lg); max-height: 80vh; overflow-y: auto;
}
@media (min-width: 768px) { .detail-card { border-radius: var(--radius-xl); } }
.detail-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-lg);
}
.detail-title { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text); }
.detail-close { color: var(--color-text-muted); display: flex; padding: 4px; border-radius: var(--radius-sm); }
.detail-close:hover { background: var(--color-surface-hover); }
.detail-body { display: flex; flex-direction: column; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
.detail-row { display: flex; gap: var(--spacing-xs); }
.detail-label { font-size: var(--font-size-sm); color: var(--color-text-muted); min-width: 48px; flex-shrink: 0; }
.detail-value { font-size: var(--font-size-sm); color: var(--color-text); font-weight: 500; }
.detail-actions { display: flex; gap: var(--spacing-sm); }
.detail-btn {
  flex: 1; padding: var(--spacing-sm); border-radius: var(--radius-md);
  font-size: var(--font-size-md); cursor: pointer; text-align: center; font-weight: 500;
}
.edit-btn { background: var(--color-primary); color: var(--color-text-on-primary); border: none; }
.delete-btn { background: transparent; color: var(--color-danger); border: 1px solid var(--color-danger); }
</style>
