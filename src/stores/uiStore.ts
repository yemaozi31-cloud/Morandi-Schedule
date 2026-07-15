import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 新建任务时的预填数据 */
export interface TaskPrefill {
  dueDate?: string
  dueTime?: string
}

export const useUiStore = defineStore('ui', () => {
  const activeNav = ref('todo')
  const showTaskForm = ref(false)
  const editingTaskId = ref<string | null>(null)
  /** 任务详情弹窗 */
  const detailTaskId = ref<string | null>(null)
  /** 新建任务时预填充的字段（如从日历点击某天或某时间） */
  const newTaskPrefill = ref<TaskPrefill | null>(null)

  function openNewTaskForm(prefill?: TaskPrefill) {
    editingTaskId.value = null
    newTaskPrefill.value = prefill || null
    showTaskForm.value = true
  }

  function openEditTaskForm(taskId: string) {
    editingTaskId.value = taskId
    newTaskPrefill.value = null
    showTaskForm.value = true
  }

  function closeTaskForm() {
    showTaskForm.value = false
    editingTaskId.value = null
    newTaskPrefill.value = null
  }

  function openDetail(taskId: string) {
    detailTaskId.value = taskId
  }
  function closeDetail() {
    detailTaskId.value = null
  }

  function setActiveNav(name: string) {
    activeNav.value = name
  }

  return {
    activeNav,
    showTaskForm,
    editingTaskId,
    detailTaskId,
    newTaskPrefill,
    openNewTaskForm,
    openEditTaskForm,
    closeTaskForm,
    openDetail,
    closeDetail,
    setActiveNav
  }
})
