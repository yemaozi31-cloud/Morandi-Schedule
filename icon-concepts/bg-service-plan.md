# Morandi Schedule Android 后台保活方案

## 背景
Android 系统在 App 进入后台后会暂停 WebView 的 JS 定时器，导致：
1. 提醒轮询（30s setInterval）失效
2. 番茄钟倒计时停止
3. WebDAV 自动同步可能被中断

## 技术选型
使用 `tauri-plugin-background-service` v0.7（Tauri 官方生态插件）：
- Android: ForegroundService（START_STICKY + 前台通知）
- iOS: BGTaskScheduler
- Desktop: tokio::spawn
- 通过 Rust tokio 定时器保持进程存活 → WebView JS 定时器正常运行

## 修改文件清单

### Phase 1: Rust 后端
| 文件 | 改动 |
|------|------|
| `src-tauri/Cargo.toml` | 添加 `tauri-plugin-background-service = "0.7"` |
| `src-tauri/src/lib.rs` | 实现 BackgroundService trait + 注册插件 |
| `src-tauri/gen/android/app/src/main/AndroidManifest.xml` | 添加 FOREGROUND_SERVICE 权限 + service 声明 |
| `src-tauri/capabilities/default.json` | 添加 background-service 权限 |
| `src-tauri/gen/android/app/build.gradle.kts` | 保持现有配置 |

### Phase 2: 前端适配
| 文件 | 改动 |
|------|------|
| `package.json` | 添加 `tauri-plugin-background-service` |
| `src/stores/pomodoroStore.ts` | 番茄钟改用 Rust 后台 tick 驱动 |
| `src/services/reminderService.ts` | 提醒检查改用后台 tick 触发 |
| `src/App.vue` | 监听后台服务事件 |
| `src/views/SettingsView.vue` | 添加 "后台运行" 开关 |

## 详细实现

### 1. Cargo.toml
```toml
tauri-plugin-background-service = "0.7"
```

### 2. lib.rs — BackgroundService 实现
```rust
use async_trait::async_trait;
use tauri_plugin_background_service::{BackgroundService, ServiceContext, ServiceError};

struct KeepAliveService;

#[async_trait]
impl<R: tauri::Runtime> BackgroundService<R> for KeepAliveService {
    async fn init(&mut self, _ctx: &ServiceContext<R>) -> Result<(), ServiceError> {
        Ok(())
    }

    async fn run(&mut self, ctx: &ServiceContext<R>) -> Result<(), ServiceError> {
        // 每10秒 tick 一次，保持 WebView 活跃
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
        loop {
            tokio::select! {
                _ = ctx.shutdown.cancelled() => break,
                _ = interval.tick() => {
                    // 发事件到前端，提醒 JS 检查任务
                    let _ = ctx.app.emit("bg://tick", ());
                    // 显示前台通知（Android 必需要求）
                    let _ = ctx.notifier.show("Morandi Schedule", "正在后台运行");
                }
            }
        }
        Ok(())
    }
}
```

### 3. AndroidManifest.xml
在 `<manifest>` 内添加：
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
```

在 `<application>` 内添加 Service 声明：
```xml
<service
    android:name="app.tauri.plugin.background_service.LifecycleService"
    android:foregroundServiceType="dataSync"
    android:stopWithTask="false"
    android:exported="false" />
```

### 4. pomodoroStore.ts — 修改思路
- 新增 `listen('bg://tick', handler)` 监听后台 tick
- 每次 tick 时更新倒计时（不再依赖 setInterval）
- 保留 setInterval 作为桌面端/前台的实时 UI 更新
- 后台 tick 确保计时不会停止

### 5. reminderService.ts — 修改思路
- 新增 `listen('bg://tick', checkReminders)` 
- 后台 tick 触发检查 + 发送通知
- 保留前台 30s 轮询作为 UI 更新

### 6. SettingsView.vue — 新增后台开关
- 添加 "后台运行" 开关
- 调用 `startService()` / `stopService()`
- 只在 Android 端显示（v-if 判断）

## 注意事项
1. 插件需要 `async_trait` crate
2. Android 14+ 需要 foregroundServiceType 声明
3. POST_NOTIFICATIONS 权限已经加了
4. Service 使用 `stopWithTask="false"` + `START_STICKY`
5. 前端通过 `ctx.app.emit("bg://tick", ())` 接收事件
