/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { DialogApi } from 'naive-ui'

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
      }
    }
    __message?: {
      success: (msg: string) => void
      error: (msg: string) => void
      warning: (msg: string) => void
      info: (msg: string) => void
    }
    __dialog?: DialogApi
  }
}
