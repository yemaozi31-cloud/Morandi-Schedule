use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[tauri::command]
async fn schedule_reminder<R: Runtime>(
    _app: tauri::AppHandle<R>,
    time_ms: u64,
    title: String,
    body: String,
    id: u32,
) -> Result<(), String> {
    // Android AlarmManager 原生提醒（暂未实现）
    #[cfg(target_os = "android")]
    {
        // TODO: 接入 Android AlarmManager
        let _ = (time_ms, title, body, id);
    }
    let _ = (time_ms, title, body, id);
    Ok(())
}

#[tauri::command]
async fn cancel_reminder<R: Runtime>(
    _app: tauri::AppHandle<R>,
    id: u32,
) -> Result<(), String> {
    // TODO: 取消 Android AlarmManager 提醒
    let _ = id;
    Ok(())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("morandi-plugin")
        .invoke_handler(tauri::generate_handler![schedule_reminder, cancel_reminder])
        .build()
}
