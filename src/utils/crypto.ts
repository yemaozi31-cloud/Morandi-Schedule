/**
 * 简单对称加密工具 - 用于保护 WebDAV 密码
 *
 * 使用浏览器内置 crypto.subtle AES-GCM 加密/解密
 * 密钥随机生成后存储在 localStorage
 */

const KEY_STORAGE = 'morandi_crypto_key'

async function getKey(): Promise<CryptoKey> {
  let stored = localStorage.getItem(KEY_STORAGE)
  if (!stored) {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    const raw = await crypto.subtle.exportKey('raw', key)
    stored = btoa(String.fromCharCode(...new Uint8Array(raw)))
    localStorage.setItem(KEY_STORAGE, stored)
  }
  const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密明文密码
 * 返回 base64 编码的密文（iv + ciphertext）
 */
export async function encryptPassword(plain: string): Promise<string> {
  if (!plain) return ''
  try {
    const key = await getKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(plain)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    return '$aes$' + btoa(String.fromCharCode(...combined))
  } catch {
    // crypto.subtle 不可用（非 HTTPS 环境）时的 fallback
    return '$b64$' + btoa(plain)
  }
}

/**
 * 解密密文密码
 * 接收 base64 编码的密文（iv + ciphertext），返回明文
 */
export async function decryptPassword(encrypted: string): Promise<string> {
  if (!encrypted) return ''

  // 带前缀的加密格式
  if (encrypted.startsWith('$aes$')) {
    try {
      const key = await getKey()
      const combined = Uint8Array.from(atob(encrypted.slice(5)), c => c.charCodeAt(0))
      const iv = combined.slice(0, 12)
      const data = combined.slice(12)
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
      return new TextDecoder().decode(decrypted)
    } catch {
      return ''
    }
  }

  // fallback 编码格式（非 HTTPS 环境）
  if (encrypted.startsWith('$b64$')) {
    try { return atob(encrypted.slice(5)) } catch { return '' }
  }

  // 兼容旧版本明文存储：直接返回
  return encrypted
}

/**
 * 从密码短语派生 AES 密钥（使用 PBKDF2，iterations=600000 参考 OWASP 2023 推荐值）
 */
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password),
    'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  )
}

/**
 * 加密整个同步数据包
 * @param jsonStr 要加密的 JSON 字符串
 * @param password 用户设置的密码短语
 * @returns base64 编码的密文（salt + iv + ciphertext）
 */
export async function encryptSyncData(jsonStr: string, password: string): Promise<string> {
  if (!password) return jsonStr  // 没设密钥就不加密
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKeyFromPassword(password, salt)
  const encoded = new TextEncoder().encode(jsonStr)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  // 打包: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(16 + 12 + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, 16)
  combined.set(new Uint8Array(encrypted), 28)
  return '$aes$' + btoa(String.fromCharCode(...combined))
}

/**
 * 解密整个同步数据包
 * @param encrypted base64 编码的密文（含 salt + iv）
 * @param password 用户设置的密码短语
 * @returns 解密后的 JSON 字符串，失败返回空字符串
 */
export async function decryptSyncData(encrypted: string, password: string): Promise<string> {
  if (!password || !encrypted.startsWith('$aes$')) return encrypted  // 没加密或没密钥直接返回原文
  try {
    const combined = Uint8Array.from(atob(encrypted.slice(5)), c => c.charCodeAt(0))
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const data = combined.slice(28)
    const key = await deriveKeyFromPassword(password, salt)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    return ''  // 解密失败返回空（密码错误）
  }
}
