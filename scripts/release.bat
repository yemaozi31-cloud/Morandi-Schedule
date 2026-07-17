@echo off
REM Morandi Schedule Release 上传工具
REM 需要先设置 GH_TOKEN 环境变量（GitHub Personal Access Token）
REM 用法：set GH_TOKEN=xxx && .\scripts\release.bat

set REPO=yemaozi31-cloud/Morandi-Schedule
set TAG=v0.5.2

echo 正在创建 Release...
gh release create %TAG% --repo %REPO% --title "%TAG%" --notes "v0.5.2 修复版本" --clobber

echo 正在上传免安装 exe...
gh release upload %TAG% --repo %REPO% "src-tauri\target\release\morandi-schedule.exe#morandi-schedule.exe" --clobber

echo 正在上传安卓 APK...
gh release upload %TAG% --repo %REPO% "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-arm64-v8a-release.apk#Morandi-Schedule_0.5.2_arm64-v8a.apk" --clobber

echo 完成！
pause
