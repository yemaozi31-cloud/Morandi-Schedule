<template>
  <div style="display:none"></div>
</template>

<script setup lang="ts">
import { useMessage, useDialog } from 'naive-ui'

/**
 * Naive UI 桥接组件
 * 必须在 n-message-provider / n-dialog-provider 内部使用
 * 负责将 useMessage / useDialog 实例挂到 window 上供全局调用
 */
const message = useMessage()
const dialog = useDialog()

const globalMsg: Record<string, Function> = {
  success: (msg: string) => message.success(msg),
  error: (msg: string) => message.error(msg),
  warning: (msg: string) => message.warning(msg),
  info: (msg: string) => message.info(msg),
}
;(window as any).__message = globalMsg
;(window as any).__dialog = dialog
</script>
