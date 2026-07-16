# 课程详情/编辑计划 v0.5.1

## 改动清单

### 1. 课程详情弹窗（新建组件）
新建 `src/components/course/CourseDetailModal.vue`
- 显示：课程名、教师、教室、时间段、起止周
- 底部：编辑按钮、删除按钮
- 不和任务 TaskDetailModal 共用

### 2. 课程编辑弹窗（新建组件）
新建 `src/components/course/CourseFormModal.vue`
- 编辑：课程名、教师、教室、时间、起止日期
- 独立于 TaskFormModal

### 3. WeekView 课程块内容调整
- 课程块显示格式：`[教室] 课程名` → `课程名 · 教师`
 
### 4. 数据模型补充
Task 接口加字段：
- `courseTeacher?: string`

### 5. 版本号 0.5.0 → 0.5.1

## 数据流
```
点击课程块 → CourseDetailModal.show=true
  ├── 编辑 → CourseFormModal 预填课程数据
  │     └── save → taskStore.updateTask(courseId, data)
  └── 删除 → confirm → taskStore.deleteTask(courseId)
```
