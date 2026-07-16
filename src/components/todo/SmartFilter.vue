<template>
  <div class="smart-filter" :class="{ expanded }">
    <div class="filter-header">
      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: mode === 'visual' }"
          @click="mode = 'visual'"
        >
          <Icon name="grid" :size="15" /> 可视化
        </button>
        <button
          class="filter-tab"
          :class="{ active: mode === 'syntax' }"
          @click="mode = 'syntax'"
        >
          <Icon name="filter" :size="15" /> 语法
        </button>
      </div>
      <button class="filter-toggle" @click="expanded = !expanded">
        {{ expanded ? '收起' : '筛选' }} {{ activeCount > 0 ? `(${activeCount})` : '' }}
      </button>
    </div>

    <transition name="filter-expand">
      <div v-if="expanded" class="filter-body">
        <!-- 可视化模式 -->
        <template v-if="mode === 'visual'">
          <div class="filter-row">
            <label>状态</label>
            <MorandiSelect v-model="localFilters.status" class="select-wrapper" :options="[
              { value: '', label: '全部' },
              { value: 'pending', label: '未完成' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' }
            ]" placeholder="筛选状态" />
          </div>
          <div class="filter-row">
            <label>优先级</label>
            <MorandiSelect v-model="localFilters.priority" class="select-wrapper" :options="[
              { value: '', label: '全部' },
              { value: 'urgent', label: '紧急' },
              { value: 'high', label: '高' },
              { value: 'medium', label: '中' },
              { value: 'low', label: '低' },
              { value: 'none', label: '无' }
            ]" placeholder="筛选优先级" />
          </div>
          <div class="filter-row">
            <label>标签</label>
            <MorandiSelect v-model="localFilters.tagId" class="select-wrapper" :options="tagOptions" placeholder="筛选标签" />
          </div>
          <div class="filter-row">
            <label>日期</label>
            <MorandiSelect v-model="localFilters.dateRange" class="select-wrapper" :options="[
              { value: '', label: '全部' },
              { value: 'today', label: '今天' },
              { value: 'tomorrow', label: '明天' },
              { value: 'thisWeek', label: '本周' },
              { value: 'overdue', label: '已过期' },
              { value: 'noDate', label: '无日期' }
            ]" placeholder="筛选日期" />
          </div>
        </template>

        <!-- 语法模式 -->
        <template v-else>
          <div class="syntax-input-wrapper">
            <input
              v-model="syntaxInput"
              class="syntax-input"
              placeholder='筛选命令: today p1 @工作 !completed'
              @input="parseSyntax"
            />
            <p class="syntax-hint">
              关键词: today | tomorrow | thisWeek | overdue | noDate |
              p1~p4 | @标签名 | !completed
            </p>
          </div>
          <div class="syntax-chips">
            <span
              v-for="chip in activeChips"
              :key="chip"
              class="syntax-chip"
              @click="syntaxInput = chip; parseSyntax()"
            >
              {{ chip }}
            </span>
          </div>
        </template>

        <div class="filter-actions">
          <button class="filter-btn apply" @click="applyFilters">应用</button>
          <button class="filter-btn reset" @click="resetFilters">重置</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { useTagStore } from '@/stores/tagStore'
import Icon from '@/components/common/Icon.vue'
import MorandiSelect from '@/components/common/MorandiSelect.vue'

const taskStore = useTaskStore()
const tagStore = useTagStore()

const expanded = ref(false)
const mode = ref<'visual' | 'syntax'>('visual')
const syntaxInput = ref('')

const localFilters = reactive({
  status: '',
  priority: '',
  tagId: '',
  dateRange: ''
})

const tagOptions = computed(() => [
  { value: '', label: '全部' },
  ...tagStore.sortedTags.map(t => ({ value: t.id, label: t.name }))
])

const activeChips = ['today', 'p1', '@工作', 'overdue', '!completed', 'tomorrow', 'noDate']

const activeCount = computed(() => {
  let count = 0
  if (localFilters.status) count++
  if (localFilters.priority) count++
  if (localFilters.tagId) count++
  if (localFilters.dateRange) count++
  return count
})

/** 词边界匹配：确保关键字独立出现，不会误伤 "step1" 或 "mapp1ing" */
function hasWord(text: string, word: string): boolean {
  return new RegExp(
    `(?:^|[^a-zA-Z0-9_\\u4e00-\\u9fa5])${word}(?:$|[^a-zA-Z0-9_\\u4e00-\\u9fa5])`
  ).test(text)
}

function parseSyntax() {
  const input = syntaxInput.value.toLowerCase()

  // 每次重新解析前全部重置
  localFilters.status = ''
  localFilters.priority = ''
  localFilters.dateRange = ''
  localFilters.tagId = ''

  // ── 状态 ──────────────────────────────────────────────
  if (hasWord(input, '!completed')) {
    localFilters.status = 'pending'
  }

  // ── 优先级（词边界，不误伤 "step1"） ─────────────────
  if (hasWord(input, 'p1')) localFilters.priority = 'urgent'
  else if (hasWord(input, 'p2')) localFilters.priority = 'high'
  else if (hasWord(input, 'p3')) localFilters.priority = 'medium'
  else if (hasWord(input, 'p4')) localFilters.priority = 'low'
  else if (hasWord(input, 'p5')) localFilters.priority = 'none'

  // ── 日期范围（中文关键词用 includes，中文没有空格分词） ──
  if (hasWord(input, 'today') || input.includes('今天')) {
    localFilters.dateRange = 'today'
  } else if (hasWord(input, 'tomorrow') || input.includes('明天')) {
    localFilters.dateRange = 'tomorrow'
  } else if (hasWord(input, 'thisweek') || input.includes('本周')) {
    localFilters.dateRange = 'thisWeek'
  } else if (hasWord(input, 'overdue') || input.includes('过期')) {
    localFilters.dateRange = 'overdue'
  } else if (hasWord(input, 'nodate') || input.includes('无日期')) {
    localFilters.dateRange = 'noDate'
  }

  // ── 标签匹配 @标签名（支持中文标签） ──────────────────
  const tagMatch = input.match(/@([\w一-龥]+)/)
  if (tagMatch) {
    const tag = tagStore.getTagByName(tagMatch[1])
    if (tag) localFilters.tagId = tag.id
  }
}

// 监听筛选字段变化，即时生效（不关闭面板）
watch(
  () => [localFilters.status, localFilters.priority, localFilters.tagId, localFilters.dateRange],
  () => {
    applyFilters()
  },
  { deep: false }
)

function applyFilters() {
  taskStore.filter.status = localFilters.status || null
  taskStore.filter.priority = localFilters.priority || null
  taskStore.filter.tagId = localFilters.tagId || null
  taskStore.filter.dateRange = localFilters.dateRange || null
  // 注意：不在这里关闭 expanded，用户手动点击"收起"或外部点击关闭
}

function resetFilters() {
  localFilters.status = ''
  localFilters.priority = ''
  localFilters.tagId = ''
  localFilters.dateRange = ''
  syntaxInput.value = ''
  taskStore.filter.status = null
  taskStore.filter.priority = null
  taskStore.filter.tagId = null
  taskStore.filter.dateRange = null
  taskStore.filter.searchText = ''
}
</script>

<style scoped>
.smart-filter {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
}

.filter-tabs { display: flex; gap: 2px; }
.filter-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
}
.filter-tab.active { background: var(--color-bg); color: var(--color-text); font-weight: 500; }

.filter-toggle {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  padding: var(--spacing-xs) var(--spacing-md);
}

.filter-body {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.filter-row label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  width: 50px;
  flex-shrink: 0;
}

/* ── 莫兰迪风格下拉菜单 ──────────────── */
.filter-row .select-wrapper {
  position: relative;
  flex: 1;
  display: flex;
}

.filter-row select {
  width: 100%;
  padding: 6px 28px 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-row select:hover {
  border-color: var(--color-primary);
}

.filter-row select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

/* 自定义下拉箭头 */
.filter-row .select-wrapper::after {
  content: '';
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: var(--color-text-muted);
  pointer-events: none;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") center/contain no-repeat;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") center/contain no-repeat;
  transition: background 0.2s;
}

.filter-row select:hover + .select-wrapper::after,
.filter-row select:focus + .select-wrapper::after {
  background: var(--color-primary);
}

/* select 内部选项样式（浏览器支持有限，尽力美化） */
.filter-row select option {
  background: var(--color-surface);
  color: var(--color-text);
  padding: 6px 10px;
}

.syntax-input-wrapper { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.syntax-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: monospace;
  font-size: var(--font-size-sm);
}
.syntax-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.syntax-chips { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }
.syntax-chip {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}

.filter-actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-xs); }
.filter-btn {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  border: none;
  cursor: pointer;
}
.filter-btn.apply { background: var(--color-primary); color: var(--color-text-on-primary); }
.filter-btn.reset { background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

.filter-expand-enter-active, .filter-expand-leave-active { transition: all 0.2s ease; }
.filter-expand-enter-from, .filter-expand-leave-to { opacity: 0; max-height: 0; }
</style>
