<template>
  <component :is="iconComponent" :size="size || 18" :stroke-width="strokeWidth || 1.5" :color="color" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckSquare, Calendar, Columns3, Tags, Target, Settings, Plus, X,
  Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, List, Grid3x3, Timer, Flame,
  Search, Inbox, Star, Trash2, Edit3, AlertCircle, Clock,
  ArrowUp, ArrowDown, Filter, LayoutDashboard, Layers,
  Hash, Bookmark, Bell, MoreHorizontal, Sun, Moon,
  Menu, Home, FolderOpen, Flag, AlertTriangle, Zap,
  RefreshCw, FileText, Circle, CheckCircle, HelpCircle, ExternalLink,
  LogOut, User, Palette, Download, Upload,
  Eye, EyeOff, Users
} from 'lucide-vue-next'

const props = defineProps<{
  name: string
  size?: number
  strokeWidth?: number
  color?: string
}>()

const iconMap: Record<string, any> = {
  'check-square': CheckSquare,
  'calendar': Calendar,
  'columns': Columns3,
  'tags': Tags,
  'target': Target,
  'settings': Settings,
  'plus': Plus,
  'x': X,
  'check': Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'list': List,
  'grid': Grid3x3,
  'timer': Timer,
  'flame': Flame,
  'search': Search,
  'inbox': Inbox,
  'star': Star,
  'trash': Trash2,
  'edit': Edit3,
  'alert': AlertCircle,
  'clock': Clock,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'filter': Filter,
  'dashboard': LayoutDashboard,
  'layers': Layers,
  'hash': Hash,
  'bookmark': Bookmark,
  'bell': Bell,
  'more': MoreHorizontal,
  'sun': Sun,
  'moon': Moon,
  'menu': Menu,
  'home': Home,
  'folder': FolderOpen,
  'flag': Flag,
  'warning': AlertTriangle,
  'zap': Zap,
  'refresh': RefreshCw,
  'file': FileText,
  'circle': Circle,
  'check-circle': CheckCircle,
  'help': HelpCircle,
  'external': ExternalLink,
  'logout': LogOut,
  'user': User,
  'palette': Palette,
  'download': Download,
  'upload': Upload,
  'eye': Eye,
  'eye-off': EyeOff,
  'users': Users
}

const iconComponent = computed(() => iconMap[props.name])
</script>
