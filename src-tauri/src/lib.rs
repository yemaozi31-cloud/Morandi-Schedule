#[cfg(desktop)]
use tauri::menu::{MenuBuilder, MenuItemBuilder};
#[cfg(desktop)]
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(desktop)]
#[tauri::command]
fn toggle_window_always_on_top(app: tauri::AppHandle) -> bool {
    if let Some(window) = app.get_webview_window("main") {
        let current = window.is_always_on_top().unwrap_or(false);
        let _ = window.set_always_on_top(!current);
        return !current;
    }
    false
}

pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec![]),
            ))
            .plugin(tauri_plugin_window_state::Builder::new().build());
    }

    builder
        .setup(|app| {
            // Build tray menu
            #[cfg(desktop)]
            {
                let show = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
                let toggle_top = MenuItemBuilder::with_id("toggle_top", "窗口置顶").build(app)?;
                let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

                let menu = MenuBuilder::new(app)
                    .item(&show)
                    .item(&toggle_top)
                    .separator()
                    .item(&quit)
                    .build()?;

                // Build tray icon
                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("Morandi Schedule")
                    .on_menu_event(|app, event| {
                        match event.id().as_ref() {
                            "show" => {
                                show_main_window(app.clone());
                            }
                            "toggle_top" => {
                                toggle_window_always_on_top(app.clone());
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![show_main_window, #[cfg(desktop)] toggle_window_always_on_top])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
