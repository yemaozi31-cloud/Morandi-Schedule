# Changelog

## [0.5.3] - 2026-07-17

### Fixed
- 托盘菜单无响应：Rust eval + 前端 __trayCmd 注册
- 标签页/数据管理弹窗：Naive UI 改用全局 ConfirmDialog
- 本周导航强制周视图：?view=week 参数隔离，不影响日历视图记忆
- 同步策略：pull-first + 统一文件名

## [0.5.2] - 2026-07-17

### Fixed
- 同步任务数量异常：pushToWebDAV 过滤软删除任务（deletedAt）
- 超过30天的软删除任务自动清理
- Tauri ACL 权限缺失导致删除弹"操作异常"（morandi-plugin 添加 cancelReminder/scheduleReminder 命令）
- 全局 ConfirmDialog 事件顺序错误（confirm 先于 update:show 触发）
- 共享习惯退出后本地数据残留（Array.from 替代 for...of 遍历 Pinia ref Map）
- autoSync 同步顺序改为 push-first（修复删除数据被云端恢复）

### Changed
- 代码清理：删除旧文档/调试 console.log/Gradle 缓存
- .gitignore 增加安卓编译产物/APK/AAB 过滤

### Project
- 新增 MIT License
- 新增 CHANGELOG.md
- 新增 .editorconfig
- README.md 规范化改造

## [0.5.1] - 2026-07-15

### Added
- 课表导入功能（ICS 解析 + 周视图课程块）
- 课程详情弹窗 CourseDetailModal
- 课程表单 CourseFormModal（支持多日选择）
- 桌面端 Tauri 编译支持

### Fixed
- 共享打卡时区问题（toISOString → localDateStr）
- 共享习惯退出未清理本地数据
- 热力图刷新/艾森豪威尔连续任务拖拽

## [0.5.0] - 2026-07-10

### Added
- 共享习惯打卡系统
- 艾森豪威尔矩阵
- 看板视图 Kanban

### Fixed
- 月视图完成态样式
- 过期任务分离显示
- 手机端 TaskCard 布局

## [0.4.0] - 2026-07-01

### Added
- 基础任务管理（CRUD）
- 习惯追踪（打卡/热力图）
- WebDAV 云同步
- 番茄钟
- 标签系统
