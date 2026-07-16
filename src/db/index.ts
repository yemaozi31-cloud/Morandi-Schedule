import { openDB, type IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION } from '@/utils/constants'

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // 版本 1: tasks + tags + settings
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
          taskStore.createIndex('status', 'status')
          taskStore.createIndex('priority', 'priority')
          taskStore.createIndex('dueDate', 'dueDate')
          taskStore.createIndex('tagIds', 'tagIds', { multiEntry: true })
          taskStore.createIndex('createdAt', 'createdAt')
        }

        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id' })
          tagStore.createIndex('name', 'name', { unique: true })
          tagStore.createIndex('sortOrder', 'sortOrder')
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' })
        }
      }

      // 版本 2: habits + habitCheckIns + pomodoroSessions
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('habits')) {
          const habitStore = db.createObjectStore('habits', { keyPath: 'id' })
          habitStore.createIndex('frequency', 'frequency')
          habitStore.createIndex('createdAt', 'createdAt')
        }

        if (!db.objectStoreNames.contains('habitCheckIns')) {
          const checkInStore = db.createObjectStore('habitCheckIns', { keyPath: 'id' })
          checkInStore.createIndex('habitId', 'habitId')
          checkInStore.createIndex('date', 'date')
        }

        if (!db.objectStoreNames.contains('pomodoroSessions')) {
          const sessionStore = db.createObjectStore('pomodoroSessions', { keyPath: 'id' })
          sessionStore.createIndex('taskId', 'taskId')
          sessionStore.createIndex('completed', 'completed')
          sessionStore.createIndex('startedAt', 'startedAt')
        }
      }

      // 版本 3: sync_queue（离线操作队列）
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          queueStore.createIndex('createdAt', 'createdAt')
          queueStore.createIndex('status', 'status')
        }
      }
    }
  })

  return dbInstance
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDB()
    return db.getAll(storeName)
  } catch (e) {
    console.error(`DB getAll(${storeName}) failed:`, e)
    return []
  }
}

export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  try {
    const db = await getDB()
    return db.get(storeName, key)
  } catch (e) {
    console.error(`DB get(${storeName}, ${key}) failed:`, e)
    return undefined
  }
}

export async function set(storeName: string, value: any): Promise<void> {
  try {
    const db = await getDB()
    // JSON 序列化/反序列化去除 Vue reactive Proxy 包装
    // 否则 IndexedDB 的 Structured Clone 算法无法克隆 Proxy 对象
    const plain = JSON.parse(JSON.stringify(value))
    await db.put(storeName, plain)
  } catch (e) {
    console.error(`DB set(${storeName}) failed:`, e)
    throw e
  }
}

export async function remove(storeName: string, key: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete(storeName, key)
  } catch (e) {
    console.error(`DB remove(${storeName}, ${key}) failed:`, e)
    throw e
  }
}

export async function clear(storeName: string): Promise<void> {
  try {
    const db = await getDB()
    await db.clear(storeName)
  } catch (e) {
    console.error(`DB clear(${storeName}) failed:`, e)
    throw e
  }
}
