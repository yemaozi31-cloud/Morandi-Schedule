/**
 * 跨环境 fetch 工具
 * Tauri 下用 @tauri-apps/plugin-http（绕过 CORS）
 * 浏览器下用 window.fetch（走 Vite 代理）
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

const isTauri = typeof window !== 'undefined' && (
  '__TAURI__' in window ||
  '__TAURI_INTERNALS__' in window ||
  window.location.protocol.startsWith('tauri') ||
  window.location.hostname.includes('tauri')
)

export const safeFetch: typeof window.fetch = isTauri ? tauriFetch : window.fetch.bind(window)
