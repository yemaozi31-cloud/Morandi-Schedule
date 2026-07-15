/**
 * 生成 UUID v4
 *
 * 使用 crypto.getRandomValues() 而非 crypto.randomUUID()，
 * 因为 randomUUID() 只在安全上下文（HTTPS / localhost）中可用。
 * 通过网络 IP（如 192.168.x.x）访问时，getRandomValues() 是唯一可靠的 API。
 *
 * UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * 其中: x = 随机 hex, 4 = 版本号, y = 8/9/a/b (变体)
 */
export function generateUUID(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)

  // 第 7 个字节的高 4 位 = 版本号 4 (0x40)
  arr[6] = (arr[6] & 0x0f) | 0x40
  // 第 9 个字节的高 2 位 = 变体 10xx → 0x80-0xbf (即 8/9/a/b)
  arr[8] = (arr[8] & 0x3f) | 0x80

  const hex = (b: number) => b.toString(16).padStart(2, '0')
  return (
    hex(arr[0]) + hex(arr[1]) + hex(arr[2]) + hex(arr[3]) + '-' +
    hex(arr[4]) + hex(arr[5]) + '-' +
    hex(arr[6]) + hex(arr[7]) + '-' +
    hex(arr[8]) + hex(arr[9]) + '-' +
    hex(arr[10]) + hex(arr[11]) + hex(arr[12]) +
    hex(arr[13]) + hex(arr[14]) + hex(arr[15])
  )
}
