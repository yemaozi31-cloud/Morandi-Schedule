/**
 * 删除确认弹窗（解耦版）
 * 所有页面统一使用，不再各自实现
 */
import { reactive } from 'vue'
import { useTaskStore } from '@/stores/taskStore'

export function useDeleteTask() {
  const taskStore = useTaskStore()
  const confirm = reactive({
    show: false,
    title: '',
    taskId: '',
    content: ''
  })

  function handleDelete(taskId: string) {
    const task = taskStore.getTaskById(taskId)
    if (!task) return
    confirm.show = true
    confirm.title = task.title
    confirm.taskId = taskId
    confirm.content = `确认删除任务"${task.title}"？此操作不可撤销。`
  }

  async function onDeleteConfirmed(confirmed: boolean) {
    if (!confirmed) {
      confirm.show = false
      return
    }
    try {
      await taskStore.deleteTask(confirm.taskId)
      confirm.show = false
      window.__message?.success('任务已删除')
    } catch {
      confirm.show = false
      window.__message?.error('删除失败，请重试')
    }
  }

  return { confirm, handleDelete, onDeleteConfirmed }
}
