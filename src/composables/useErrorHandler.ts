import { ref } from 'vue'

export function useErrorHandler() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function tryAction<T>(fn: () => Promise<T>, fallback?: T): Promise<T | undefined> {
    loading.value = true
    error.value = null
    try {
      const result = await fn()
      return result
    } catch (e: any) {
      error.value = e?.message || '操作失败，请重试'
      console.error('[ErrorHandler]', e)
      return fallback
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return { error, loading, tryAction, clearError }
}
