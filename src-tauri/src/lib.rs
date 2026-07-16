// ==================== 桌面端特有功能 ====================
#[cfg(desktop)]
mod desktop {
    use tauri::Manager;
    use tauri::image::Image;
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;

    /// 通过 eval 执行 JS 命令
    pub fn tray_exec(app: &tauri::AppHandle, cmd: &str) {
        if let Some(window) = app.get_webview_window("main") {
            let safe_cmd = cmd.replace('\'', "\\'");
            let js = format!("window.__trayCmd?.('{}')", safe_cmd);
            let _ = window.eval(&js);
        }
    }

    /// Windows 窗口圆角
    #[cfg(target_os = "windows")]
    /// # Safety
    /// `hwnd` 必须是有效的窗口句柄（HWND），指向一个已创建的窗口。
    /// 调用方必须保证窗口未被销毁，且调用发生在正确的 UI 线程上下文中。
    unsafe fn set_win_round_corners(hwnd: *mut std::ffi::c_void) {
        use windows_sys::Win32::Graphics::Dwm::{
            DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
        };
        let pref = DWMWCP_ROUND;
        DwmSetWindowAttribute(
            hwnd, DWMWA_WINDOW_CORNER_PREFERENCE as u32,
            &pref as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        );
    }

    pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
        // 托盘菜单
        let menu = MenuBuilder::new(app)
            .item(&MenuItemBuilder::with_id("show", "显示窗口").build(app)?)
            .item(&MenuItemBuilder::with_id("new_task", "新建任务").build(app)?)
            .separator()
            .item(&MenuItemBuilder::with_id("goto_today", "今天").build(app)?)
            .item(&MenuItemBuilder::with_id("goto_calendar", "日历").build(app)?)
            .item(&MenuItemBuilder::with_id("goto_settings", "设置").build(app)?)
            .separator()
            .item(&MenuItemBuilder::with_id("quit", "退出").build(app)?)
            .build()?;

        // 托盘图标（加载失败时跳过设置图标，使用默认图标）
        let tray_builder = TrayIconBuilder::new();
        let tray_builder = match Image::from_bytes(include_bytes!("../icons/icon.png")) {
            Ok(img) => tray_builder.icon(img),
            Err(e) => {
                eprintln!("[WARN] 托盘图标加载失败: {e}，使用默认图标");
                tray_builder
            }
        };
        tray_builder
            .menu(&menu)
            .tooltip("Morandi Schedule")
            .on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                    "new_task" => tray_exec(app, "tray-new-task"),
                    "goto_today" => tray_exec(app, "tray-goto-today"),
                    "goto_calendar" => tray_exec(app, "tray-goto-calendar"),
                    "goto_settings" => tray_exec(app, "tray-goto-settings"),
                    "quit" => { app.exit(0); }
                    _ => {}
                }
            })
            .build(app)?;

        // Win11 圆角
        #[cfg(target_os = "windows")]
        if let Some(w) = app.get_webview_window("main") {
            if let Ok(hwnd) = w.hwnd() {
                unsafe { set_win_round_corners(std::mem::transmute(hwnd)) }
            }
        }

        // 显示窗口
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show(); let _ = w.set_focus();
        }
        Ok(())
    }

    pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window.hide();
        }
        #[cfg(target_os = "windows")]
        if let tauri::WindowEvent::Resized(_) = event {
            if let Ok(hwnd) = window.hwnd() {
                unsafe { set_win_round_corners(std::mem::transmute(hwnd)) }
            }
        }
    }
}

// ==================== 移动端特有功能 ====================
#[cfg(mobile)]
mod mobile {
    pub fn setup(_app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
        Ok(())
    }
    pub fn on_window_event(_window: &tauri::Window, _event: &tauri::WindowEvent) {}
}

// ==================== 移动端导出命令 ====================
#[cfg(mobile)]
#[tauri::command]
async fn export_data_mobile(app: tauri::AppHandle, json_data: String) -> Result<String, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file_path = dir.join("morandi-schedule-export.json");
    std::fs::write(&file_path, &json_data).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

// ==================== 主入口 ====================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(morandi_plugin::init());

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![]),
        ))
        .plugin(tauri_plugin_window_state::Builder::new().build());

    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![export_data_mobile]);

    builder
        .setup(|app| {
            #[cfg(desktop)]
            { desktop::setup(app)?; }
            #[cfg(mobile)]
            { mobile::setup(app)?; }
            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            { desktop::on_window_event(window, event); }
            #[cfg(mobile)]
            { mobile::on_window_event(window, event); }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
