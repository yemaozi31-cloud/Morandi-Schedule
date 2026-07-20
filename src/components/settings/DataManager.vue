<template>
  <div class="data-manager">
    <h3 class="section-title">数据管理</h3>
    <div class="action-group">
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">导出数据</span>
          <span class="action-desc">将所有任务、标签、习惯导出为 JSON</span>
        </div>
        <button class="action-btn" @click="handleExport">导出</button>
      </div>
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">导入数据</span>
          <span class="action-desc">从 JSON 文件导入数据（合并模式）</span>
        </div>
        <label class="action-btn import" for="import-file">导入</label>
        <input id="import-file" type="file" accept=".json" style="display:none" @change="handleImport" />
      </div>
      <div class="action-row">
        <div class="action-info">
          <span class="action-label">清除本地数据</span>
          <span class="action-desc">清除本地的任务、习惯、打卡记录，不可恢复</span>
        </div>
        <button class="action-btn danger-btn" @click="handleClear">清除</button>
      </div>
      <div class="action-row danger">
        <div class="action-info">
          <span class="action-label">清除云端数据</span>
          <span class="action-desc">清空云端同步文件 + 退出共享习惯，账号保留</span>
        </div>
        <button class="action-btn danger-btn" :disabled="clearingCloud" @click="handleClearCloud">
          {{ clearingCloud ? '清除中…' : '清除' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getAll, get, set, clear } from '@/db'
import { deleteAccount } from '@/services/webdavSync'
import { useSettingsStore } from '@/stores/settingsStore'
import { showConfirm as showDialogConfirm } from '@/utils/globalConfirm'

const settingsStore = useSettingsStore()
const clearingCloud = ref(false)

function showConfirm(title: string, message: string, onConfirm: () => void) {
  window.__dialog?.warning({
    title,
    content: message,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: onConfirm
  })
}

async function handleClearCloud() {
  const ok = await showDialogConfirm({
    title: '清除云端数据',
    content: '确认清除所有云端数据？此操作不可恢复！\n\n将清除：\n• 云端同步文件\n• 退出所有共享习惯\n\n本地数据不受影响，账号保持登录。'
  })
  if (!ok) return
  clearingCloud.value = true
  try {
    const result = await deleteAccount(settingsStore.syncConfig)
    if (!result.ok) {
      window.__message?.error(result.message)
      clearingCloud.value = false
      return
    }
    // 清空本地数据
    for (const store of ['tasks', 'tags', 'habits', 'habitCheckIns', 'pomodoroSessions', 'settings']) {
      await clear(store)
    }
    // 重新加载 stores
    const { useTaskStore } = await import('@/stores/taskStore')
    const { useHabitStore } = await import('@/stores/habitStore')
    await useTaskStore().loadTasks()
    await useHabitStore().loadHabits()
    await useHabitStore().loadCheckIns()

    window.__message?.success('云端数据已清除')
    clearingCloud.value = false
  } catch (e) {
    window.__message?.error('清除失败')
    clearingCloud.value = false
  }
}

async function handleExport() {
  try {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks: await getAll('tasks'),
      tags: await getAll('tags'),
      settings: await getAll('settings'),
      habits: await getAll('habits'),
      habitCheckIns: await getAll('habitCheckIns'),
      pomodoroSessions: await getAll('pomodoroSessions')
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `morandi-schedule-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    window.__message?.success('数据已导出')
  } catch (e) {
    window.__message?.error('导出失败')
  }
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.version || !Array.isArray(data.tasks)) {
      throw new Error('无效的数据文件')
    }

    // 写入所有 store
    const storeNames = ['tasks', 'tags', 'settings', 'habits', 'habitCheckIns', 'pomodoroSessions']
    for (const storeName of storeNames) {
      if (Array.isArray(data[storeName]) && data[storeName].length > 0) {
        for (const item of data[storeName]) {
          await set(storeName, item)
        }
      }
    }

    window.__message?.success(`已导入 ${data.tasks.length} 个任务，即将刷新`)
    // C3: 导入后刷新页面以重新加载 stores
    setTimeout(() => location.reload(), 1000)
  } catch (e: any) {
    window.__message?.error(`导入失败: ${e.message}`)
  }

  input.value = ''
}

async function handleClear() {
  showConfirm('清除所有数据', '确认清除所有数据？此操作不可撤销！所有任务、标签、习惯和设置将被永久删除。', async () => {
    try {
      const stores = ['tasks', 'tags', 'settings', 'habits', 'habitCheckIns', 'pomodoroSessions']
      for (const store of stores) {
        await clear(store)
      }
      window.__message?.success('所有数据已清除')
      setTimeout(() => location.reload(), 1000)
    } catch (e) {
      window.__message?.error('清除失败')
    }
  })
}
</script>

<style scoped>
.section-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  padding: var(--spacing-md) var(--spacing-lg);
  margin: 0;
  border-bottom: 1px solid var(--color-border-light);
}

.action-group {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  box-shadow: 0 1px 3px var(--color-shadow);
}

.action-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.action-row:last-child { border-bottom: none; }
.action-row.danger { border-top: 1px solid var(--color-danger); background: color-mix(in srgb, var(--color-danger) 5%, transparent); }

.action-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.action-label { font-size: var(--font-size-md); color: var(--color-text); }
.action-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.action-btn {
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.action-btn.import {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-lg);
  text-align: center;
}

.danger-btn {
  color: var(--color-danger) !important;
  border-color: var(--color-danger) !important;
}
</style>
