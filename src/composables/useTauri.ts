export function useTauri() {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

  async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
    if (isTauri) {
      return window.__TAURI__!.core.invoke(cmd, args)
    }
    console.warn(`Tauri API not available: ${cmd}`)
    return null
  }

  return { isTauri, invoke }
}
