<template>
  <AppLayout>
    <div class="shared-space">
      <MobileBackLink />
      <h1 class="page-title">共享空间</h1>

      <!-- 配置提示（未配置时显示） -->
      <div v-if="!isConfigured" class="config-hint">
        <p>请先在「设置 → 云同步」中填写昵称和 WebDAV 配置</p>
        <router-link to="/settings">去设置</router-link>
      </div>

      <template v-else>
        <!-- 邀请 + 创建 并排 -->
        <div class="sidebar-row">
          <!-- 区域1：待处理的邀请 -->
          <div class="section sidebar-card">
            <div class="section-header"><span>待处理的邀请</span></div>
            <div v-if="pendingInvites.length === 0" class="empty-state">暂无邀请</div>
            <div v-for="invite in pendingInvites" :key="invite.name" class="invite-card">
              <div class="invite-info">
                <span class="invite-name">{{ invite.name }}</span>
                <span class="invite-meta">由 {{ invite.createdBy }} 邀请你</span>
              </div>
              <div class="invite-actions">
                <button class="accept-btn" @click="handleAccept(invite)">接受</button>
                <button class="ignore-btn" @click="handleIgnore(invite)">忽略</button>
              </div>
            </div>
          </div>

          <!-- 区域3：创建共享习惯 -->
          <div class="section sidebar-card">
            <div class="section-header"><span>创建共享习惯</span></div>
            <div class="create-form">
              <input v-model="newHabitName" placeholder="习惯名称" class="form-input" />
              <!-- 直接显示所有已注册用户 -->
              <div v-if="liveUsers.length > 0" class="user-list">
                <button
                  v-for="u in liveUsers"
                  :key="u"
                  class="user-option"
                  :class="{ selected: invitees.includes(u) }"
                  :disabled="invitees.includes(u) || u === myNick"
                  @click="selectUser(u)"
                >{{ u }}{{ u === myNick ? ' (我)' : '' }}</button>
              </div>
              <p v-if="liveUsers.length === 0" class="form-hint">暂无其他用户，创建后其他人注册时会自动出现</p>
              <div class="invitee-chips">
                <span v-for="n in invitees" :key="n" class="invitee-chip">
                  {{ n }} <button @click="removeInvitee(n)">✕</button>
                </span>
              </div>
              <!-- 打卡时限 -->
              <div class="deadline-row">
                <label class="toggle-switch-sm">
                  <input type="checkbox" v-model="hasDeadline" />
                  <span class="toggle-slider-sm"></span>
                </label>
                <span class="deadline-label-text">打卡时限</span>
              </div>
              <div v-if="hasDeadline" class="deadline-input">
                <MorandiTimePicker v-model="deadlineTime" class="deadline-picker" />
                <span class="deadline-suffix">打卡时间</span>
              </div>
              <button class="create-btn" :disabled="!newHabitName.trim()" @click="handleCreate">创建并邀请</button>
            </div>
          </div>
        </div>

        <!-- 区域2：已加入的共享习惯 -->
        <div class="section">
          <div class="section-header">
            <span>已加入的共享习惯</span>
          </div>
          <div v-if="joinedHabits.length === 0" class="empty-state">还没有加入任何共享习惯</div>
          <div v-for="habit in joinedHabits" :key="habit.name" class="shared-habit-card">
            <div class="habit-header">
              <div class="habit-title-row">
                <span class="habit-name">{{ habit.name }}</span>
                <span class="shared-badge">共享</span>
                <button class="leave-btn" @click="handleLeave(habit)">退出</button>
              </div>
              <span class="habit-meta">成员：{{ habit.members.join('、') }}</span>
            </div>

            <!-- 今日打卡按钮 -->
            <div class="habit-checkin-row">
              <div class="member-status">
                <span v-for="m in habit.members" :key="m" class="member-chip"
                  :class="{ done: didCheckInToday(habit.name, m) }"
                  :title="getCheckInTime(habit.name, m)"
                >
                  {{ m }}
                  <Icon :name="didCheckInToday(habit.name, m) ? 'check-circle' : 'circle'" :size="14" />
                </span>
              </div>
              <button
                class="checkin-btn"
                :class="'btn-' + myCheckInStatus(habit.name)"
                @click="handleSharedCheckIn(habit.name)"
              >{{ didCheckInToday(habit.name, myNick) ? '取消' : '打卡' }}</button>
            </div>

            <!-- 热力图 -->
            <div class="heatmap-section">
              <div class="heatmap-nav">
                <button @click="changeMonth(habit.name, -1)">←</button>
                <span>{{ heatmapDates[habit.name]?.year }}年{{ heatmapDates[habit.name]?.month + 1 }}月</span>
                <button @click="changeMonth(habit.name, 1)">→</button>
              </div>
              <div class="team-heatmap">
                <div v-for="m in habit.members" :key="m" class="member-row">
                  <span class="member-label">{{ m }}</span>
                  <div class="heatmap-grid">
                    <div
                      v-for="(cell, i) in getMemberHeatmap(habit.name, m)"
                      :key="i"
                      class="heatmap-cell"
                      :class="cell.status"
                      :title="cell.date || ''"
                    ></div>
                  </div>
                  <span class="streak-label">{{ getMemberStreak(habit.name, m) }}天</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { getTodayStr } from '@/utils/date'
import { useSettingsStore } from '@/stores/settingsStore'
import { generateUUID } from '@/utils/uuid'
import * as db from '@/db'
import { useHabitStore } from '@/stores/habitStore'
import {
  createSharedHabit, acceptSharedHabitInvite,
  ignoreSharedHabitInvite, leaveSharedHabit, checkInSharedHabit, cancelCheckIn,
  discoverUsersFromWebDAV,
  type SharedHabitData, type SharedCheckIn
} from '@/services/webdavSync'
import AppLayout from '@/components/layout/AppLayout.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'
import Icon from '@/components/common/Icon.vue'
import MorandiTimePicker from '@/components/common/MorandiTimePicker.vue'

const settingsStore = useSettingsStore()
const habitStore = useHabitStore()
const config = computed(() => settingsStore.syncConfig)
const isConfigured = computed(() => !!config.value.nickname && !!config.value.webdavUrl)
const myNick = computed(() => config.value.nickname || '')

// 共享数据
const sharedData = ref<{ habits: SharedHabitData[]; checkIns: SharedCheckIn[] }>({ habits: [], checkIns: [] })

// 待处理的邀请（invitees 包含我）
const pendingInvites = computed(() =>
  sharedData.value.habits.filter(h => h.invitees.includes(myNick.value))
)

// 已加入的共享习惯
const joinedHabits = computed(() =>
  sharedData.value.habits.filter(h => h.members.includes(myNick.value))
)

// 创建习惯表单
const newHabitName = ref('')
const inviteeName = ref('')
const invitees = ref<string[]>([])
const filteredUsers = ref<string[]>([])
/** 是否开启打卡时限 */
const hasDeadline = ref(false)
/** 打卡时限（分钟） */
const deadlineTime = ref('09:00')

/** 实时扫描发现的用户（每次从 WebDAV PROPFIND 获取） */
const liveUsers = ref<string[]>([])

// 共享数据60秒轮询
setInterval(() => loadSharedData(), 60000)

async function refreshLiveUsers() {
  if (!isConfigured.value) return
  try {
    liveUsers.value = await discoverUsersFromWebDAV(config.value)
  } catch { /* ignore */ }
}

function selectUser(n: string) {
  if (!invitees.value.includes(n) && n !== myNick.value) {
    invitees.value.push(n)
  }
}

function addInvitee() {
  const n = inviteeName.value.trim()
  if (n && !invitees.value.includes(n) && n !== myNick.value) {
    invitees.value.push(n)
  }
  inviteeName.value = ''
}
function removeInvitee(n: string) {
  invitees.value = invitees.value.filter(x => x !== n)
}

// 热力图月份（按习惯名）
const heatmapDates = reactive<Record<string, { year: number; month: number }>>({})

function getHeatmapKey(name: string) {
  if (!heatmapDates[name]) {
    const d = new Date()
    heatmapDates[name] = { year: d.getFullYear(), month: d.getMonth() }
  }
  return heatmapDates[name]
}

function changeMonth(name: string, delta: number) {
  const h = getHeatmapKey(name)
  h.month += delta
  if (h.month < 0) { h.month = 11; h.year-- }
  if (h.month > 11) { h.month = 0; h.year++ }
  // 触发响应式更新
  heatmapDates[name] = { ...h }
}

function getMemberHeatmap(habitName: string, nick: string): { status: string; date: string }[] {
  const h = getHeatmapKey(habitName)
  const daysInMonth = new Date(h.year, h.month + 1, 0).getDate()
  const monthStr = `${h.year}-${String(h.month + 1).padStart(2, '0')}`
  const result: { status: string; date: string }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
    let checked = sharedData.value.checkIns.some(c => c.habitName === habitName && c.nick === nick && c.date === dateStr)
    if (!checked) {
      result.push({ status: 'empty', date: '' })
    } else {
      const s = getCheckInStatus(habitName, nick, dateStr)
      result.push({ status: s === 'normal' ? 'checked' : s, date: dateStr })
    }
  }
  return result
}

function getMemberStreak(habitName: string, nick: string): number {
  const checkIns = sharedData.value.checkIns.filter(c => c.habitName === habitName && c.nick === nick)
  if (checkIns.length === 0) return 0
  const dates = [...new Set(checkIns.map(c => c.date))].sort().reverse()
  let streak = 1
  const today = new Date()
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) streak++
    else break
  }
  return streak
}

function didCheckInToday(habitName: string, nick: string): boolean {
  const today = getTodayStr()
  return sharedData.value.checkIns.some(c => c.habitName === habitName && c.nick === nick && c.date === today)
}

function getCheckInTime(habitName: string, nick: string): string {
  const today = getTodayStr()
  const ci = sharedData.value.checkIns.find(
    c => c.habitName === habitName && c.nick === nick && c.date === today
  )
  return ci ? `${ci.time} 打卡` : ''
}

type CheckInStatus = 'normal' | 'late15' | 'late30' | 'late60' | 'none'

function getCheckInStatus(habitName: string, nick: string, date?: string): CheckInStatus {
  const habit = sharedData.value.habits.find(h => h.name === habitName)
  if (!habit?.checkinDeadline) return 'normal' // 不限时
  const targetDate = date || getTodayStr()
  const ci = sharedData.value.checkIns.find(
    c => c.habitName === habitName && c.nick === nick && c.date === targetDate
  )
  if (!ci) return 'none'
  // 比较打卡时间与截止时间
  const [dh, dm] = habit.checkinDeadline.split(':').map(Number)
  const deadlineMinutes = dh * 60 + dm
  const [ch, cm] = ci.time.split(':').map(Number)
  const checkInMinutes = ch * 60 + cm
  const diff = checkInMinutes - deadlineMinutes
  if (diff <= 0) return 'normal'       // 截止前打卡
  if (diff <= 15) return 'late15'      // 迟到15分钟内
  if (diff <= 30) return 'late30'      // 迟到30分钟内
  return 'late60'                      // 迟到超30分
}

/** 获取当前用户对某个共享习惯的打卡状态（简化调用） */
function myCheckInStatus(habitName: string): CheckInStatus {
  return getCheckInStatus(habitName, myNick.value)
}

async function loadSharedData() {
  if (!isConfigured.value) return
  try {
    // 从云端拉取共享数据
    const { fetchSharedData } = await import('@/services/webdavSync')
    const data = await fetchSharedData(config.value)
    sharedData.value = data
    await refreshLiveUsers()
  } catch { /* 静默失败 */ }
}

async function handleCreate() {
  if (!newHabitName.value.trim() || !myNick.value) return
  const ok = await createSharedHabit(
    config.value,
    newHabitName.value.trim(),
    myNick.value,
    invitees.value,
    hasDeadline.value ? deadlineTime.value : undefined
  )
  if (ok) {
    window.__message?.success('共享习惯已创建')
    // 创建者也加到本地习惯列表
    await habitStore.acceptSharedHabit({ name: newHabitName.value.trim(), createdBy: myNick.value })
    newHabitName.value = ''
    invitees.value = []
    hasDeadline.value = false
    deadlineTime.value = '09:00'
    await loadSharedData()
  } else {
    window.__message?.error('创建失败')
  }
}

async function handleAccept(invite: SharedHabitData) {
  const ok = await acceptSharedHabitInvite(config.value, invite.name, myNick.value)
  if (ok) {
    await habitStore.acceptSharedHabit({ name: invite.name, createdBy: invite.createdBy })
    window.__message?.success('已加入共享习惯')
    await loadSharedData()
  } else {
    window.__message?.error('操作失败')
  }
}

async function handleIgnore(invite: SharedHabitData) {
  const ok = await ignoreSharedHabitInvite(config.value, invite.name, myNick.value)
  if (ok) {
    window.__message?.info('已忽略')
    await loadSharedData()
  } else {
    window.__message?.error('操作失败')
  }
}

async function handleLeave(habit: SharedHabitData) {
  const ok = await leaveSharedHabit(config.value, habit.name, myNick.value)
  if (ok) {
    // 删除所有同名共享习惯的本地副本（用 Array.from 保证 Pinia ref Map 遍历可靠）
    const allHabits = Array.from(habitStore.habits.values())
    let count = 0
    for (const h of allHabits) {
      if (h.sharedHabitName === habit.name) {
        await habitStore.deleteHabit(h.id)
        count++
      }
    }
    // 重新从云端拉取 + 从 IndexedDB 重新加载 habitStore
    await loadSharedData()
    await habitStore.loadHabits()
    await habitStore.loadCheckIns()
    window.__message?.info(`已退出「${habit.name}」，清理 ${count} 条本地记录`)
  } else {
    window.__message?.error('操作失败')
  }
}

/** 获取本地共享习惯 ID */
function getLocalHabitId(sharedName: string): string | null {
  const all = Array.from(habitStore.habits.entries())
  for (const [id, h] of all) {
    if (h.sharedHabitName === sharedName) return id
  }
  return null
}

async function handleSharedCheckIn(habitName: string) {
  const today = getTodayStr()
  const localId = getLocalHabitId(habitName)
  const alreadyCheckedIn = sharedData.value.checkIns.some(
    c => c.habitName === habitName && c.nick === myNick.value && c.date === today
  )
  if (alreadyCheckedIn) {
    // 取消打卡（云端+本地：直接删本地记录）
    const ok = await cancelCheckIn(config.value, habitName, myNick.value)
    if (ok) {
      if (localId) {
        const allCheckIns = Array.from(habitStore.checkIns.entries())
        for (const [id, c] of allCheckIns) {
          if (c.habitId === localId && c.date === today) {
            await db.remove('habitCheckIns', id)
            habitStore.checkIns.delete(id)
          }
        }
      }
      window.__message?.info('已取消打卡')
      await loadSharedData()
    } else {
      window.__message?.error('取消失败')
    }
  } else {
    // 打卡（云端+本地：直接 set value=1，不经过 habitStore.checkIn）
    const ok = await checkInSharedHabit(config.value, habitName, myNick.value)
    if (ok) {
      if (localId) {
        // 清除今日所有本地记录后重建为 value=1
        for (const [id, c] of habitStore.checkIns) {
          if (c.habitId === localId && c.date === today) {
            await db.remove('habitCheckIns', id)
            habitStore.checkIns.delete(id)
          }
        }
        const newCI = {
          id: generateUUID(), habitId: localId, date: today,
          value: 1, createdAt: new Date().toISOString()
        }
        await db.set('habitCheckIns', newCI)
        habitStore.checkIns.set(newCI.id, newCI)
      }
      window.__message?.success('打卡成功')
      await loadSharedData()
    } else {
      window.__message?.error('打卡失败')
    }
  }
}

onMounted(() => {
  loadSharedData()
  // 60 秒刷新一次（避免开发环境下 Vite 代理过于频繁）
  setInterval(loadSharedData, 60000)
})
</script>

<style scoped>
.shared-space {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.page-title {
  padding: 6px 12px;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  text-align: left;
  white-space: nowrap;
}
/* ── 配置提示 ──────────────────────────── */
.config-hint {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
  color: var(--color-text-muted);
  font-size: var(--font-size-md);
}
.config-hint a {
  display: inline-block;
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  transition: filter var(--transition-fast);
}
.config-hint a:hover {
  filter: brightness(1.1);
}

/* ── 区块容器 ──────────────────────────── */
/* 邀请 + 创建 并排行 */
.sidebar-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.sidebar-card {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .sidebar-row {
    flex-direction: column;
  }
}

.section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  margin-bottom: var(--spacing-lg);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
}

/* ── 空状态 ────────────────────────────── */
.empty-state {
  padding: var(--spacing-xl) var(--spacing-lg);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* ════════════════════════════════════════════
   区域1：邀请卡片
   ════════════════════════════════════════════ */
.invite-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}
.invite-card:last-child {
  border-bottom: none;
}

.invite-info {
  flex: 1;
  min-width: 0;
}
.invite-name {
  display: block;
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--color-text);
}
.invite-meta {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: 2px;
}

.invite-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

/* 接受按钮 */
.accept-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-on-primary);
  background: var(--color-primary);
  border: none;
  cursor: pointer;
  transition: filter var(--transition-fast);
  white-space: nowrap;
}
.accept-btn:hover {
  filter: brightness(1.1);
}

/* 忽略按钮 */
.ignore-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.ignore-btn:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

/* ════════════════════════════════════════════
   区域2：共享习惯卡片（带热力图）
   ════════════════════════════════════════════ */
.shared-habit-card {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  background: color-mix(in srgb, #A3B5A0 4%, transparent);
}
.shared-habit-card:last-child {
  border-bottom: none;
}

.habit-header {
  margin-bottom: var(--spacing-md);
}
.habit-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
}
.habit-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}
.shared-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, #A3B5A0 20%, transparent);
  color: #6B8F71;
  font-weight: 500;
}
.leave-btn {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  background: transparent;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.15s;
}
.leave-btn:hover {
  background: var(--color-danger);
  color: #fff;
}
.habit-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* 打卡行 */
.habit-checkin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.member-status {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.member-chip {
  font-size: var(--font-size-sm);
  padding: 4px 8px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-border) 40%, transparent);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.member-chip.done {
  background: color-mix(in srgb, var(--color-success) 25%, transparent);
  color: #5A8F5A;
}

.checkin-btn {
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.checkin-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.checkin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

/* 热力图区域 */
.heatmap-section {
  margin-top: var(--spacing-sm);
}

.heatmap-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.heatmap-nav button {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}
.heatmap-nav button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.team-heatmap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.member-label {
  width: 48px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.heatmap-grid {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  flex: 1;
}
.heatmap-cell {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.heatmap-cell.empty {
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
}
.heatmap-cell.checked {
  background: var(--color-success);
  border: 1px solid color-mix(in srgb, var(--color-success) 70%, transparent);
}
.heatmap-cell.late15 {
  background: #F0D080;
  border: 1px solid #E0C060;
}
.heatmap-cell.late30 {
  background: #D4A060;
  border: 1px solid #C08040;
}
.heatmap-cell.late60 {
  background: #C08080;
  border: 1px solid #A06060;
}

.streak-label {
  width: 36px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-align: right;
  flex-shrink: 0;
}

/* ════════════════════════════════════════════
   区域3：创建表单
   ════════════════════════════════════════════ */
.create-form {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-md);
  outline: none;
  transition: border-color var(--transition-fast);
}
.form-input:focus {
  border-color: var(--color-primary);
}
.form-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.6;
}

/* 被邀请人标签 */
.invitee-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.invitee-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}
.invitee-chip button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}
.invitee-chip button:hover {
  opacity: 1;
}

/* 创建并邀请按钮 */
.create-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  color: var(--color-text-on-primary);
  background: var(--color-primary);
  border: none;
  cursor: pointer;
  transition: filter var(--transition-fast);
  align-self: flex-start;
}
.create-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
/* 用户列表 */
.user-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.user-option {
  padding: 2px 10px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
}

.user-option:hover { border-color: var(--color-primary); color: var(--color-primary); }
.user-option.selected { background: color-mix(in srgb, var(--color-primary) 12%, transparent); border-color: var(--color-primary); color: var(--color-primary); }
.user-option:disabled { opacity: 0.4; cursor: not-allowed; }

.create-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── 打卡时限 ──────────────────────────── */
.deadline-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.toggle-switch-sm {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.toggle-switch-sm input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider-sm {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  border-radius: 20px;
  transition: background 0.2s;
}

.toggle-slider-sm::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch-sm input:checked + .toggle-slider-sm {
  background: var(--color-primary);
}

.toggle-switch-sm input:checked + .toggle-slider-sm::before {
  transform: translateX(16px);
}

.deadline-label-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.deadline-input {
  display: flex;
  align-items: center;
  gap: 6px;
}
.deadline-picker {
  width: 80px;
  flex-shrink: 0;
}
.deadline-suffix {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* ── 打卡迟到颜色（打在按钮上，不标名字） ────── */
.checkin-btn.btn-late15 { border-color: #F0D080; color: #D4A060; background: #FFF8E8; }
.checkin-btn.btn-late30 { border-color: #D4A060; color: #C08040; background: #FFF0D0; }
.checkin-btn.btn-late60 { border-color: #C08080; color: #C04040; background: #FFF0F0; }
</style>
