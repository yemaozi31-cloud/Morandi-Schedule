# 共享习惯数据流重构

## 现状问题

| 问题 | 后果 |
|------|------|
| 每个 HabitCard 各自拉取 shared.json | 5个卡片 = 5×3=15个请求 |
| fetchSharedData 读一次就 PUT 一次 | 每次刷新都多一次写入 |
| 打卡数据不在本地持久化 | 每次都要从云端读，速度慢 |

## 目标

共享习惯的打卡数据读写方式和普通习惯统一：**本地优先，云端同步**

## 数据流（改后）

```
打卡时：
  habitStore.checkIn(habitId)    ← 写入本地 IndexedDB（立即生效）
  checkInSharedHabit()           ← PUT shared.json 同步到云端

读取时：
  habitStore.getCheckInsForHabit(habitId)  ← 从本地 IndexedDB 读（HTTP 0请求）

定时拉取：
  fetchSharedData → 合并到本地 IndexedDB（每5分钟一次，而不是每个卡片各自拉）
```

## 改动清单

### 1. webdavSync.ts — 去掉自动写 + 新增同步到本地
- `fetchSharedData` 中**去掉** 第434行的 `saveSharedData(config, data)`
  → 避免读一次就写一次的浪费
- `syncSharedToLocal(config)` — 新增函数，从云端拉取 shared.json 并写入 habitStore

### 2. HabitCard.vue — 改为本地读取
- `refreshSharedStatus()` → 改为从 `habitStore.getCheckInsForHabit()` 读取
- 打卡时：`habitStore.checkIn()`（本地） + `checkInSharedHabit()`（云端）
- 取消打卡：`habitStore.deleteCheckIn()`（本地） + `cancelCheckIn()`（云端）
- 去掉 `_fetchingShared` 锁（因为不再各自发请求）

### 3. habitStore.ts — 保证 checkIn/deleteCheckIn 正常工作
- 已有 `checkIn(habitId, value, note?)` → 直接使用
- 已有 `deleteCheckIn(habitId, date)` → 直接使用

### 4. SharedSpace.vue — 改为本地读取
- `loadSharedData()` → 调用 `syncSharedToLocal()` 拉取云端数据到本地
- `getMemberHeatmap()` → 从 `habitStore.getCheckInsForHabit()` 读取
- `getMemberStreak()` → 从 `habitStore.getCheckInsForHabit()` 读取

## 效果

| 指标 | 改前 | 改后 |
|------|:----:|:----:|
| 习惯页面加载时的请求数 | 5×3=15 | 0 |
| 打卡后的请求数 | PUT+立即GET=2 | PUT=1 |
| 数据读取速度 | 等待云端响应 | 本地即时 |
