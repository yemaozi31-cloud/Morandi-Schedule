type ShortcutHandler = () => void

const shortcuts = new Map<string, ShortcutHandler>()

let isInitialized = false

function handleKeyDown(e: KeyboardEvent) {
  // 忽略输入框内的快捷键
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
    // 只有 Escape 在输入框中生效
    if (e.key === 'Escape') {
      const handler = shortcuts.get('Escape')
      handler?.()
    }
    return
  }

  const key = e.key.toLowerCase()
  const ctrl = e.ctrlKey || e.metaKey
  const shift = e.shiftKey

  let combo = ''
  if (ctrl) combo += 'Ctrl+'
  if (shift) combo += 'Shift+'
  combo += key

  const handler = shortcuts.get(combo)
  if (handler) {
    e.preventDefault()
    handler()
  }

  // 单键快捷键
  if (!ctrl && !shift) {
    const singleHandler = shortcuts.get(key)
    if (singleHandler) {
      e.preventDefault()
      singleHandler()
    }
  }
}

export function registerShortcut(combo: string, handler: ShortcutHandler) {
  if (shortcuts.has(combo)) {
    console.warn(`Keyboard shortcut "${combo}" is being overwritten`)
  }
  shortcuts.set(combo, handler)
}

export function unregisterShortcut(combo: string) {
  shortcuts.delete(combo)
}

export function initKeyboardService() {
  if (isInitialized) return
  isInitialized = true
  window.addEventListener('keydown', handleKeyDown)
}

export function destroyKeyboardService() {
  isInitialized = false
  shortcuts.clear()
  window.removeEventListener('keydown', handleKeyDown)
}
