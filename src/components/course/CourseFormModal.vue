<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-tabs">
              <span class="modal-tab active">课程</span>
              <span class="modal-tab" @click="switchToTask">任务</span>
            </div>
            <button class="modal-close" @click="$emit('close')"><Icon name="x" :size="18" /></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>课程名称</label>
              <input v-model="form.title" placeholder="如：高等数学" />
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>教师</label>
                <input v-model="form.teacher" placeholder="授课教师" />
              </div>
              <div class="form-group flex-1">
                <label>教室</label>
                <input v-model="form.location" placeholder="A301" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>星期</label>
                <MorandiSelect v-model="form.day" :options="dayOptions" placeholder="选择" />
              </div>
              <div class="form-group flex-1">
                <label>开始</label>
                <MorandiTimePicker v-model="form.startTime" clearable />
              </div>
              <div class="form-group flex-1">
                <label>结束</label>
                <MorandiTimePicker v-model="form.endTime" clearable />
              </div>
            </div>
            <div v-for="(extra, idx) in form.extraDays" :key="idx" class="form-row" style="align-items:flex-end">
              <div class="form-group flex-1">
                <MorandiSelect v-model="extra.day" :options="dayOptions" placeholder="星期" />
              </div>
              <div class="form-group flex-1">
                <MorandiTimePicker v-model="extra.startTime" clearable />
              </div>
              <div class="form-group flex-1">
                <MorandiTimePicker v-model="extra.endTime" clearable />
              </div>
              <button class="remove-btn" @click="removeDay(idx)" title="删除"><Icon name="x" :size="14" /></button>
            </div>
            <button class="add-day-btn" @click="addDay">+ 添加同课程</button>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>生效日期</label>
                <MorandiDatePicker v-model="form.validFrom" clearable />
              </div>
              <div class="form-group flex-1">
                <label>失效日期</label>
                <MorandiDatePicker v-model="form.validTo" clearable />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="footer-btn cancel" @click="$emit('close')">取消</button>
            <button class="footer-btn confirm" @click="handleSave" :disabled="!form.title.trim()">保存</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import Icon from '@/components/common/Icon.vue'
import MorandiDatePicker from '@/components/common/MorandiDatePicker.vue'
import MorandiTimePicker from '@/components/common/MorandiTimePicker.vue'
import MorandiSelect from '@/components/common/MorandiSelect.vue'

const dayOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' }
]

const props = defineProps<{
  visible: boolean
  course?: any | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: any): void
  (e: 'switchTask'): void
}>()

function switchToTask() { emit('switchTask') }

const form = reactive({
  title: '',
  teacher: '',
  location: '',
  day: '' as number | string,
  startTime: '',
  endTime: '',
  validFrom: '',
  validTo: '',
  extraDays: [] as { day: number | string; startTime: string; endTime: string }[]
})

function addDay() {
  form.extraDays.push({ day: '', startTime: '', endTime: '' })
}
function removeDay(idx: number) {
  form.extraDays.splice(idx, 1)
}

watch(() => props.course, (c) => {
  if (c) {
    form.title = c.title || ''
    form.teacher = c.courseTeacher || ''
    form.location = c.courseLocation || ''
    form.day = c.courseDay ?? ''
    form.startTime = c.courseStartTime || ''
    form.endTime = c.courseEndTime || ''
    form.validFrom = c.courseValidFrom || ''
    form.validTo = c.courseValidTo || ''
  } else {
    form.title = ''
    form.teacher = ''
    form.location = ''
    form.day = ''
    form.startTime = ''
    form.endTime = ''
    form.validFrom = ''
    form.validTo = ''
    form.extraDays = []
  }
})

function handleSave() {
  if (!form.title.trim()) return
  const base = {
    title: form.title.trim(),
    courseTeacher: form.teacher || null,
    courseLocation: form.location || null,
    courseValidFrom: form.validFrom || null,
    courseValidTo: form.validTo || null
  }
  const courses = []
  if (form.day || form.startTime) {
    courses.push({
      ...base,
      courseDay: form.day || null,
      courseStartTime: form.startTime || null,
      courseEndTime: form.endTime || null
    })
  }
  for (const extra of form.extraDays) {
    if (extra.day) {
      courses.push({
        ...base,
        courseDay: extra.day,
        courseStartTime: extra.startTime || null,
        courseEndTime: extra.endTime || null
      })
    }
  }
  if (courses.length === 0) return
  emit('save', { courses, isMulti: courses.length > 1 })
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: var(--color-overlay); display: flex; align-items: center; justify-content: center; z-index: 7000; }
.modal-card { background: var(--color-surface); border-radius: var(--radius-lg); width: 90vw; max-width: 500px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px var(--color-shadow-heavy); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-lg) var(--spacing-xl); border-bottom: 1px solid var(--color-border-light); }
.modal-header h3 { font-size: var(--font-size-lg); color: var(--color-text); }
.modal-tabs { display: flex; gap: 0; background: var(--color-bg); border-radius: var(--radius-md); padding: 2px; }
.modal-tab { padding: 4px 16px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
.modal-tab.active { background: var(--color-surface); color: var(--color-text); font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.modal-tab:hover:not(.active) { color: var(--color-text); }
.modal-close { color: var(--color-text-muted); width: 28px; height: 28px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; }
.modal-body { padding: var(--spacing-xl); overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-group label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.form-group input, .form-group select { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); color: var(--color-text); font-size: var(--font-size-md); outline: none; }
.form-row { display: flex; gap: var(--spacing-md); }
.flex-1 { flex: 1; }
.modal-footer { display: flex; gap: var(--spacing-sm); justify-content: flex-end; padding: var(--spacing-lg) var(--spacing-xl); border-top: 1px solid var(--color-border-light); }
.footer-btn { padding: var(--spacing-sm) var(--spacing-xl); border-radius: var(--radius-md); font-size: var(--font-size-md); cursor: pointer; }
.footer-btn.cancel { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
.footer-btn.confirm { background: var(--color-primary); border: none; color: var(--color-text-on-primary); }
.footer-btn.confirm:disabled { opacity: 0.5; }
.extra-row { margin-top: -8px; }
.remove-btn { display: flex; align-items: center; justify-content: center; padding: 2px; cursor: pointer; background: none; border: none; color: var(--color-text-muted); }
.remove-btn:hover { color: var(--color-danger); }
.add-day-btn { width: 100%; padding: var(--spacing-xs); border-radius: var(--radius-md); border: 1px dashed var(--color-border); background: transparent; color: var(--color-primary); font-size: var(--font-size-sm); cursor: pointer; }
.add-day-btn:hover { background: color-mix(in srgb, var(--color-primary) 6%, transparent); }
/* 统一选择器和时间输入框高度 */
:deep(.select-trigger) { height: 36px !important; min-height: 36px !important; padding: 0 12px !important; font-size: 14px !important; box-sizing: border-box !important; }
:deep(.time-input) { height: 36px !important; min-height: 36px !important; padding: 0 12px !important; font-size: 14px !important; box-sizing: border-box !important; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
@media (max-width: 767px) { .form-row { gap: var(--spacing-xs); } }
</style>
