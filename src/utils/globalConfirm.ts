import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  content: string
}

export const confirmState = reactive<{
  show: boolean
  title: string
  content: string
  resolve: ((value: boolean) => void) | null
}>({
  show: false,
  title: '',
  content: '',
  resolve: null
})

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.show = true
    confirmState.title = options.title
    confirmState.content = options.content
    confirmState.resolve = resolve
  })
}
