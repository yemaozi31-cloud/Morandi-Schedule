@echo off
"C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin\keytool.exe" -genkey -v -keystore D:\Create\Schedule\src-tauri\gen\android\app\release.keystore -alias morandi_release -keyalg RSA -keysize 2048 -validity 10000 -storepass Morandi2026 -keypass Morandi2026 -dname "CN=Morandi, OU=Dev, O=Morandi, L=BJ, ST=BJ, C=CN"
echo EXIT_CODE=%ERRORLEVEL%
