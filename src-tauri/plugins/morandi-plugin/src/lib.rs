use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[allow(unused_variables)]
#[tauri::command]
async fn schedule_reminder<R: Runtime>(
    _app: tauri::AppHandle<R>,
    time_ms: u64,
    title: String,
    body: String,
    id: u32,
) -> Result<(), String> {
    // TODO: Android AlarmManager 原生提醒
    Ok(())
}

#[allow(unused_variables)]
#[tauri::command]
async fn cancel_reminder<R: Runtime>(
    _app: tauri::AppHandle<R>,
    id: u32,
) -> Result<(), String> {
    // TODO: 取消 Android AlarmManager 提醒
    Ok(())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("morandi-plugin")
        .invoke_handler(tauri::generate_handler![schedule_reminder, cancel_reminder])
        .build()
}
