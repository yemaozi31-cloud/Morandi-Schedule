import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'today',
    component: () => import('@/views/TodayView.vue'),
    meta: { title: '今天', nav: true }
  },
  {
    path: '/inbox',
    name: 'inbox',
    component: () => import('@/views/InboxView.vue'),
    meta: { title: '随记', nav: true }
  },
  {
    path: '/upcoming',
    name: 'upcoming',
    component: () => import('@/views/UpcomingView.vue'),
    meta: { title: '本周', nav: true }
  },
  {
    path: '/all',
    name: 'all',
    component: () => import('@/views/TodoView.vue'),
    meta: { title: '所有任务', nav: true }
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { title: '日历', nav: true }
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/TagsView.vue'),
    meta: { title: '标签', nav: true }
  },
  {
    path: '/habits',
    name: 'habits',
    component: () => import('@/views/HabitsView.vue'),
    meta: { title: '习惯', nav: true }
  },
  {
    path: '/kanban',
    name: 'kanban',
    component: () => import('@/views/KanbanView.vue'),
    meta: { title: '看板', nav: true }
  },
  {
    path: '/pomodoro',
    name: 'pomodoro',
    component: () => import('@/views/PomodoroView.vue'),
    meta: { title: '番茄钟', nav: true }
  },
  {
    path: '/shared',
    name: 'shared',
    component: () => import('@/views/SharedSpace.vue'),
    meta: { title: '共享', nav: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置', nav: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/floating',
    name: 'floating',
    component: () => import('@/views/FloatingView.vue'),
    meta: { title: '悬浮窗' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
