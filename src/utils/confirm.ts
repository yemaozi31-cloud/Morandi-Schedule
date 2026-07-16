/**
 * 确认弹窗工具函数
 * 不依赖 Naive UI，在任何环境下都能正常工作
 */
import { createApp, ref, type App } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

let currentApp: App | null = null

export function showConfirm(options: {
  title: string
  content: string
  positiveText?: string
  negativeText?: string
}): Promise<boolean> {
  return new Promise((resolve) => {
    // 清理前一个弹窗（如果有）
    if (currentApp) {
      currentApp.unmount()
      currentApp = null
    }

    const show = ref(true)

    const app = createApp(ConfirmDialog, {
      show: true,
      title: options.title,
      content: options.content,
      positiveText: options.positiveText || '确认',
      negativeText: options.negativeText || '取消',
      onConfirm: () => {
        show.value = false
        resolve(true)
        setTimeout(() => {
          app.unmount()
          currentApp = null
          const el = container.parentNode
          if (el) el.removeChild(container)
        }, 300)
      },
      onCancel: () => {
        show.value = false
        resolve(false)
        setTimeout(() => {
          app.unmount()
          currentApp = null
          const el = container.parentNode
          if (el) el.removeChild(container)
        }, 300)
      },
      'onUpdate:show': (v: boolean) => {
        if (!v) {
          resolve(false)
          setTimeout(() => {
            app.unmount()
            currentApp = null
            const el = container.parentNode
            if (el) el.removeChild(container)
          }, 300)
        }
      }
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    app.mount(container)
    currentApp = app
  })
}
