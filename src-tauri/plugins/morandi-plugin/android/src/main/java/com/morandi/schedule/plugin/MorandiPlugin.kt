package com.morandi.schedule.plugin

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File

@InvokeArg
class ShareFileArgs {
    var path: String? = null
}

@InvokeArg
class ScheduleReminderArgs {
    var timeMs: Long = 0
    var title: String? = null
    var body: String? = null
    var id: Int = 0
}

@InvokeArg
class CancelReminderArgs {
    var id: Int = 0
}

@TauriPlugin
class MorandiPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun shareFile(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(ShareFileArgs::class.java)
            val filePath = args.path ?: throw Exception("path is required")
            val file = File(filePath)
            if (!file.exists()) {
                invoke.reject("文件不存在: $filePath")
                return
            }
            val uri: Uri = FileProvider.getUriForFile(
                activity, "${activity.packageName}.fileprovider", file
            )
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = activity.contentResolver.getType(uri) ?: "application/json"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(intent, "分享到"))
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject(e.message ?: "分享失败")
        }
    }

    @Command
    fun scheduleReminder(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(ScheduleReminderArgs::class.java)
            val alarmManager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(activity, ReminderReceiver::class.java).apply {
                putExtra("title", args.title ?: "提醒")
                putExtra("body", args.body ?: "")
                putExtra("id", args.id)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                activity, args.id, intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, args.timeMs, pendingIntent)
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject(e.message ?: "设置提醒失败")
        }
    }

    @Command
    fun cancelReminder(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(CancelReminderArgs::class.java)
            val alarmManager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(activity, ReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                activity, args.id, intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
            }
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject(e.message ?: "取消提醒失败")
        }
    }
}
