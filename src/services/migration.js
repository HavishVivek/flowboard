import Dexie from 'dexie'
import {
  projectsService,
  contentService,
  tasksService,
  scheduleService,
  settingsService
} from './firestore'

// Open the old Dexie database for migration
const legacyDb = new Dexie('ProjectTrackerDB')
legacyDb.version(1).stores({
  projects: '++id, name, category, status, priority_score, created_at, updated_at',
  content: '++id, title, type, project_id, stage, scheduled_date, published_date, created_at',
  tasks: '++id, title, project_id, content_id, priority, due_date, completed, depends_on, created_at',
  schedule: '++id, date, time_slot, task_id, ai_suggested, created_at',
  settings: 'key'
})

// Check if there is data in Dexie to migrate
export async function hasDexieData() {
  try {
    const projectCount = await legacyDb.projects.count()
    const taskCount = await legacyDb.tasks.count()
    const contentCount = await legacyDb.content.count()
    return projectCount > 0 || taskCount > 0 || contentCount > 0
  } catch (e) {
    console.error('Error checking Dexie data:', e)
    return false
  }
}

// Export all data from Dexie
export async function exportDexieData() {
  try {
    const data = {
      projects: await legacyDb.projects.toArray(),
      content: await legacyDb.content.toArray(),
      tasks: await legacyDb.tasks.toArray(),
      schedule: await legacyDb.schedule.toArray(),
      settings: await legacyDb.settings.toArray(),
      exportedAt: new Date().toISOString()
    }
    return data
  } catch (e) {
    console.error('Error exporting Dexie data:', e)
    throw e
  }
}

// Migrate data from Dexie to Firestore
export async function migrateToFirestore(userId, progressCallback = () => {}) {
  const result = {
    projects: { total: 0, migrated: 0, errors: [] },
    content: { total: 0, migrated: 0, errors: [] },
    tasks: { total: 0, migrated: 0, errors: [] },
    schedule: { total: 0, migrated: 0, errors: [] },
    settings: { total: 0, migrated: 0, errors: [] }
  }

  try {
    // Export data from Dexie
    const data = await exportDexieData()

    // Create a map of old IDs to new IDs for reference updates
    const projectIdMap = new Map()
    const contentIdMap = new Map()
    const taskIdMap = new Map()

    // Step 1: Migrate projects
    progressCallback('Migrating projects...')
    result.projects.total = data.projects.length
    for (const project of data.projects) {
      try {
        const oldId = project.id
        delete project.id
        const newProject = await projectsService.add(userId, {
          ...project,
          created_at: project.created_at || new Date().toISOString(),
          updated_at: project.updated_at || new Date().toISOString()
        })
        projectIdMap.set(oldId, newProject.id)
        result.projects.migrated++
      } catch (e) {
        result.projects.errors.push({ item: project, error: e.message })
      }
    }

    // Step 2: Migrate content
    progressCallback('Migrating content...')
    result.content.total = data.content.length
    for (const item of data.content) {
      try {
        const oldId = item.id
        delete item.id
        // Update project_id reference
        if (item.project_id && projectIdMap.has(item.project_id)) {
          item.project_id = projectIdMap.get(item.project_id)
        } else if (item.project_id) {
          item.project_id = null // Clear invalid reference
        }
        const newContent = await contentService.add(userId, {
          ...item,
          created_at: item.created_at || new Date().toISOString()
        })
        contentIdMap.set(oldId, newContent.id)
        result.content.migrated++
      } catch (e) {
        result.content.errors.push({ item, error: e.message })
      }
    }

    // Step 3: Migrate tasks
    progressCallback('Migrating tasks...')
    result.tasks.total = data.tasks.length
    for (const task of data.tasks) {
      try {
        const oldId = task.id
        delete task.id
        // Update project_id reference
        if (task.project_id && projectIdMap.has(task.project_id)) {
          task.project_id = projectIdMap.get(task.project_id)
        } else if (task.project_id) {
          task.project_id = null
        }
        // Update content_id reference
        if (task.content_id && contentIdMap.has(task.content_id)) {
          task.content_id = contentIdMap.get(task.content_id)
        } else if (task.content_id) {
          task.content_id = null
        }
        const newTask = await tasksService.add(userId, {
          ...task,
          created_at: task.created_at || new Date().toISOString()
        })
        taskIdMap.set(oldId, newTask.id)
        result.tasks.migrated++
      } catch (e) {
        result.tasks.errors.push({ item: task, error: e.message })
      }
    }

    // Step 4: Update task dependencies (depends_on field)
    progressCallback('Updating task dependencies...')
    for (const [oldId, newId] of taskIdMap) {
      const oldTask = data.tasks.find(t => t.id === oldId)
      if (oldTask?.depends_on && taskIdMap.has(oldTask.depends_on)) {
        try {
          await tasksService.update(userId, newId, {
            depends_on: taskIdMap.get(oldTask.depends_on)
          })
        } catch (e) {
          console.error('Error updating task dependency:', e)
        }
      }
    }

    // Step 5: Migrate schedule
    progressCallback('Migrating schedule...')
    result.schedule.total = data.schedule.length
    for (const item of data.schedule) {
      try {
        delete item.id
        // Update task_id reference
        if (item.task_id && taskIdMap.has(item.task_id)) {
          item.task_id = taskIdMap.get(item.task_id)
        } else if (item.task_id) {
          item.task_id = null
        }
        await scheduleService.add(userId, {
          ...item,
          created_at: item.created_at || new Date().toISOString()
        })
        result.schedule.migrated++
      } catch (e) {
        result.schedule.errors.push({ item, error: e.message })
      }
    }

    // Step 6: Migrate settings (except 'initialized')
    progressCallback('Migrating settings...')
    result.settings.total = data.settings.length
    for (const setting of data.settings) {
      if (setting.key === 'initialized') continue
      try {
        await settingsService.add(userId, {
          key: setting.key,
          value: setting.value
        })
        result.settings.migrated++
      } catch (e) {
        result.settings.errors.push({ item: setting, error: e.message })
      }
    }

    progressCallback('Migration complete!')
    return result
  } catch (e) {
    console.error('Migration failed:', e)
    throw e
  }
}

// Clear Dexie data after successful migration
export async function clearDexieData() {
  try {
    await legacyDb.projects.clear()
    await legacyDb.content.clear()
    await legacyDb.tasks.clear()
    await legacyDb.schedule.clear()
    // Keep settings to preserve any app config
  } catch (e) {
    console.error('Error clearing Dexie data:', e)
    throw e
  }
}

// Download data as JSON file
export function downloadAsJson(data, filename = 'project-tracker-export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
