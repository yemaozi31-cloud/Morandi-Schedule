<template>
  <AppLayout>
    <div class="pomodoro-view">
      <MobileBackLink />
      <PomodoroTimer />
      <div class="history-section">
        <h3 class="section-title">今日专注历史</h3>
        <div v-if="pomodoroStore.todayStats.count > 0" class="stats-cards">
          <div class="stat-card">
            <span class="stat-label">完成番茄</span>
            <span class="stat-value">{{ pomodoroStore.todayStats.count }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">总专注</span>
            <span class="stat-value">{{ pomodoroStore.todayStats.totalMinutes }} 分钟</span>
          </div>
        </div>
        <EmptyState v-else title="今日暂无专注" icon="timer" />
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import AppLayout from '@/components/layout/AppLayout.vue'
import PomodoroTimer from '@/components/pomodoro/PomodoroTimer.vue'
import MobileBackLink from '@/components/common/MobileBackLink.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const pomodoroStore = usePomodoroStore()

onMounted(async () => {
  await pomodoroStore.loadSessions()
})
</script>

<style scoped>
.pomodoro-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  max-width: 400px;
  margin: 0 auto;
}

.history-section {
  width: 100%;
}

.section-title {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.stats-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border-light);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
}
</style>
