<template>
  <AppLayout>
    <div class="habits-view">
      <MobileBackLink />
      <div class="habits-header">
        <h1>习惯追踪</h1>
        <button class="add-habit-btn" @click="showForm = true"><Icon name="plus" :size="16" /> 新建习惯</button>
      </div>

      <!-- 习惯紧凑列表 -->
      <div class="habits-list">
        <div
          v-for="habit in habitStore.sortedHabits"
          :key="habit.id"
          class="habit-item"
        >
          <HabitCard
            :habit="habit"
            compact
            :expanded="expandedHabits[habit.id]"
            @checked="handleChecked"
            @toggle-expand="toggleExpand(habit.id)"
          />
          <!-- 每个习惯的可折叠热力图 -->
          <transition name="accordion">
            <div v-if="expandedHabits[habit.id]" class="habit-heatmap-wrap">
              <HabitHeatmap
                :habit-id="habit.id"
                :habit-name="habit.name"
                :habit-target="habit.target"
              />
            </div>
          </transition>
        </div>
        <EmptyState
          v-if="habitStore.sortedHabits.length === 0"
          title="还没有习惯"
          description="创建第一个习惯开始追踪"
          :icon="'flame'"
          @action="showForm = true"
        />
      </div>

      <!-- 新建习惯弹窗 -->
      <teleport to="body">
        <transition name="modal-fade">
          <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
            <div class="modal-card">
              <div class="modal-header">
                <h3>新建习惯</h3>
                <button class="modal-close" @click="showForm = false"><Icon name="x" :size="18" /></button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>习惯名称</label>
                  <input v-model="form.name" placeholder="如：每天阅读30分钟" ref="nameInput" />
                </div>
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>频率</label>
                    <select v-model="form.frequency">
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>
                  <div class="form-group flex-1">
                    <label>目标量</label>
                    <input type="number" v-model.number="form.target" min="1" />
                  </div>
                  <div class="form-group flex-1">
                    <label>单位</label>
                    <select v-model="form.unit">
                      <option value="times">次</option>
                      <option value="minutes">分钟</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>颜色</label>
                  <div class="color-picker">
                    <button
                      v-for="c in colors"
                      :key="c"
                      class="color-option"
                      :class="{ active: form.color === c }"
                      :style="{ background: c }"
                      @click="form.color = c"
                    ></button>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="footer-btn cancel" @click="showForm = false">取消</button>
                <button class="footer-btn confirm" @click="handleSave" :disabled="!form.name.trim()">创建</button>
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
import { useHabitStore } from '@/stores/habitStore'
import AppLayout from '@/components/layout/AppLayout.vue'
import HabitCard from '@/components/habits/HabitCard.vue'
import HabitHeatmap from '@/components/habits/HabitHeatmap.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Icon from '@/components/common/Icon.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'

const habitStore = useHabitStore()

const showForm = ref(false)
const expandedHabits = ref<Record<string, boolean>>({})

function toggleExpand(id: string) {
  expandedHabits.value[id] = !expandedHabits.value[id]
}
const nameInput = ref<HTMLInputElement>()

const form = ref({
  name: '',
  frequency: 'daily' as const,
  target: 1,
  unit: 'times' as const,
  color: '#A0B5C4'
})

const colors = [
  '#C4A0A0', '#D4C09E', '#A0C4A0', '#A0B5C4',
  '#8FA8B5', '#B5A8C4', '#A3B5A0', '#D4B0A0'
]

onMounted(async () => {
  await habitStore.loadHabits()
  await habitStore.loadCheckIns()
})

async function handleSave() {
  if (!form.value.name.trim()) return
  try {
    await habitStore.createHabit({
      name: form.value.name.trim(),
      frequency: form.value.frequency,
      target: form.value.target,
      unit: form.value.unit,
      color: form.value.color
    })
    showForm.value = false
    form.value = { name: '', frequency: 'daily', target: 1, unit: 'times', color: '#A0B5C4' }
    window.__message?.success('习惯已创建')
  } catch {
    window.__message?.error('创建习惯失败')
  }
}

function showConfirm(title: string, message: string, onConfirm: () => void) {
  window.__dialog?.warning({
    title,
    content: message,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: onConfirm
  })
}

function handleChecked(habitId: string) {
  void habitId
  // HabitCard 内部已处理打卡/取消的反馈
}
</script>

<style scoped>
.habits-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.habits-header h1 { font-size: var(--font-size-xl); color: var(--color-text); }

.add-habit-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.heatmap-section {
  margin-top: var(--spacing-2xl);
}

.habits-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.habit-item {
  display: flex;
  flex-direction: column;
}

.habit-heatmap-wrap {
  padding: var(--spacing-sm) 0 var(--spacing-sm) var(--spacing-lg);
}

/* 手风琴过渡 */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

.section-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

/* Modal styles (same pattern as TagsView) */
.modal-overlay {
  position: fixed; inset: 0;
  background: var(--color-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 7000;
}
.modal-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90vw; max-width: 480px;
  box-shadow: 0 8px 32px var(--color-shadow-heavy);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}
.modal-header h3 { font-size: var(--font-size-lg); color: var(--color-text); }
.modal-close { color: var(--color-text-muted); font-size: 18px; }
.modal-close:hover { background: var(--color-surface-hover); }
.modal-body { padding: var(--spacing-xl); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-group label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.form-group input, .form-group select {
  width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text);
  font-size: var(--font-size-md); outline: none;
}
.form-row { display: flex; gap: var(--spacing-md); }
.flex-1 { flex: 1; }
.color-picker { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }
.color-option { width: 28px; height: 28px; min-height: 28px; border-radius: var(--radius-full); border: 2px solid transparent; cursor: pointer; }
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
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* 窄屏：表单行换行 */
@media (max-width: 480px) {
  .form-row { flex-wrap: wrap; gap: var(--spacing-sm); }
  .form-row .form-group { flex: 1 1 100%; min-width: 0; }
}
</style>
