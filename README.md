# Morandi Schedule 🎯

<a href="https://github.com/yemaozi31-cloud/Morandi-Schedule/actions/workflows/build.yml">
  <img src="https://github.com/yemaozi31-cloud/Morandi-Schedule/actions/workflows/build.yml/badge.svg" alt="Build Status">
</a>

> 莫兰迪配色 · 全平台个人日程管理工具

---

## 📥 下载

| 平台 | 安装包 | 说明 |
|------|--------|------|
| **Windows** | [morandi-schedule.exe](https://github.com/yemaozi31-cloud/Morandi-Schedule/releases/latest/download/morandi-schedule.exe) | 免安装，双击运行 |
| **Android** | [app-universal-arm64-v8a-release.apk](https://github.com/yemaozi31-cloud/Morandi-Schedule/releases/latest/download/app-universal-arm64-v8a-release.apk) | 24MB，覆盖 99% 机型 |

> 下载需要登录 GitHub 账号。也可在 [GitHub Releases](https://github.com/yemaozi31-cloud/Morandi-Schedule/releases) 页面查看所有版本。
> 
> 若链接 404，请等待 GitHub Actions 构建完成后刷新。

---

## ✨ 功能

- **任务管理** — 创建/编辑/删除/完成，支持自然语言解析（如"明天下午3点买菜 p1"）
- **日历视图** — 月视图 / 周视图 / 日时间线，跨天持续事件
- **看板视图** — 拖拽管理任务状态
- **习惯追踪** — 每日打卡 / 热力图 / 连续天数，支持共享习惯
- **共享空间** — WebDAV 云端协作，共享习惯 + 团队打卡 + 实时同步
- **番茄钟** — 专注计时 + 任务关联
- **标签系统** — 自定义标签 + 颜色管理
- **提醒通知** — 到期弹窗 / 系统原生通知（提前N分钟/准时）
- **自动同步** — 数据变更实时推送 WebDAV（坚果云等）
- **艾森豪威尔矩阵** — 四象限优先级管理

---

## 🏗 项目架构

```
┌─────────────────────────────────────────────────┐
│                  前端 (Vue 3 + TS)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Today    │ │ Calendar │ │  Habits / Shared │ │
│  │  Upcoming │ │  Month   │ │  Pomodoro / ... │ │
│  │  Inbox    │ │  Week    │ │                  │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │            │                │            │
│  ┌────┴────────────┴────────────────┴─────────┐  │
│  │         Pinia Stores (状态管理)              │  │
│  │  taskStore / habitStore / tagStore / ...    │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴───────────────────────┐  │
│  │         Services (服务层)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │reminder  │ │ autoSync │ │webdavSync│   │  │
│  │  │ (轮询)   │ │ (防抖推) │ │(同步引擎)│   │  │
│  │  └──────────┘ └──────────┘ └──────────┘   │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴───────────────────────┐  │
│  │   IndexedDB (本地存储) ← → WebDAV (云端)    │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────┐
│                Tauri v2 (桌面壳)                  │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ 原生通知  │ │ 托盘图标  │ │ 窗口管理/置顶  │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 数据流转

```
本地操作 → IndexedDB → autoSync(防抖2s) → pushToWebDAV → 坚果云
                                             ↓
其它设备 ← pullFromWebDAV ← 手动点"同步" ← 云端 {昵称}-sync.json
```

### 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 6 |
| 状态管理 | Pinia |
| 本地存储 | IndexedDB (via idb) |
| UI 组件 | Naive UI |
| 桌面壳 | Tauri v2 (Rust) |
| 通知 | @tauri-apps/plugin-notification |
| 云同步 | WebDAV (坚果云/自建) |
| 图标 | Lucide Icons |

---

## 🚀 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动 Tauri 桌面应用（开发模式）
npm run tauri dev

# 打包桌面安装包
npm run tauri build
```

### 环境要求

- Node.js 20+
- Rust 1.77+
- [可选] WebDAV 账号（坚果云等，用于云同步）
- [Android 构建] JDK 17 + Android SDK 34

---

## 📦 构建产物

```
src-tauri/target/release/bundle/
├── msi/    # Windows MSI 安装包
├── nsis/   # Windows NSIS 安装包
├── dmg/    # macOS 磁盘映像
└── deb/    # Linux 安装包
```

---

## 📄 许可证

MIT License © 2026
