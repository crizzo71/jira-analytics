import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class ActivityTracker {
  constructor() {
    this.activityFile = path.join(__dirname, 'workspace-activity.json')
    this.configFile = path.join(__dirname, 'jira-workspace-config.json')
    this.agentId = this.generateAgentId()
  }

  generateAgentId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async loadActivity() {
    try {
      const data = await fs.readFile(this.activityFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.warn('No existing activity file found, creating new one')
      return this.getDefaultActivity()
    }
  }

  async loadConfig() {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.warn('No workspace config found')
      return null
    }
  }

  getDefaultActivity() {
    return {
      workspace: {
        created: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        version: "1.0.0",
        agent_id: this.agentId
      },
      projects: {},
      activity_log: [],
      metrics: {
        total_api_calls: 0,
        total_reports_generated: 0,
        average_report_time: 0,
        success_rate: 100
      }
    }
  }

  async logActivity(type, details, projectKey = null) {
    const activity = await this.loadActivity()
    
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      agent_id: this.agentId,
      type: type,
      project_key: projectKey,
      details: details,
      duration_ms: details.duration_ms || null,
      success: details.success !== false
    }

    activity.activity_log.push(logEntry)
    activity.workspace.last_activity = new Date().toISOString()
    activity.workspace.agent_id = this.agentId

    // Update metrics
    if (type === 'api_call') {
      activity.metrics.total_api_calls++
    } else if (type === 'report_generated') {
      activity.metrics.total_reports_generated++
      if (details.duration_ms) {
        const current_avg = activity.metrics.average_report_time
        const total_reports = activity.metrics.total_reports_generated
        activity.metrics.average_report_time = 
          (current_avg * (total_reports - 1) + details.duration_ms) / total_reports
      }
    }

    // Update project info
    if (projectKey) {
      if (!activity.projects[projectKey]) {
        activity.projects[projectKey] = {
          last_report: null,
          total_reports: 0,
          last_sync: null,
          boards: [],
          status: "active"
        }
      }

      if (type === 'report_generated') {
        activity.projects[projectKey].last_report = new Date().toISOString()
        activity.projects[projectKey].total_reports++
      } else if (type === 'project_sync') {
        activity.projects[projectKey].last_sync = new Date().toISOString()
      }
    }

    // Keep only last 1000 log entries
    if (activity.activity_log.length > 1000) {
      activity.activity_log = activity.activity_log.slice(-1000)
    }

    await this.saveActivity(activity)
    return logEntry
  }

  async saveActivity(activity) {
    await fs.writeFile(this.activityFile, JSON.stringify(activity, null, 2))
  }

  async logApiCall(endpoint, method, success, duration_ms, projectKey = null) {
    return await this.logActivity('api_call', {
      endpoint,
      method,
      success,
      duration_ms
    }, projectKey)
  }

  async logReportGeneration(format, success, duration_ms, projectKey, details = {}) {
    return await this.logActivity('report_generated', {
      format,
      success,
      duration_ms,
      ...details
    }, projectKey)
  }

  async logProjectSync(projectKey, boards, success = true) {
    return await this.logActivity('project_sync', {
      boards,
      success
    }, projectKey)
  }

  async logManualInput(projectKey, inputType, success = true) {
    return await this.logActivity('manual_input', {
      input_type: inputType,
      success
    }, projectKey)
  }

  async getActivitySummary(days = 7) {
    const activity = await this.loadActivity()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentActivity = activity.activity_log.filter(
      log => new Date(log.timestamp) > cutoffDate
    )

    const summary = {
      total_activities: recentActivity.length,
      api_calls: recentActivity.filter(log => log.type === 'api_call').length,
      reports_generated: recentActivity.filter(log => log.type === 'report_generated').length,
      projects_active: [...new Set(recentActivity.map(log => log.project_key).filter(Boolean))],
      success_rate: recentActivity.length > 0 ? 
        (recentActivity.filter(log => log.success).length / recentActivity.length * 100).toFixed(1) : 100,
      avg_report_time: activity.metrics.average_report_time,
      last_activity: activity.workspace.last_activity
    }

    return summary
  }

  async getProjectStatus(projectKey) {
    const activity = await this.loadActivity()
    return activity.projects[projectKey] || null
  }

  async getAllProjects() {
    const activity = await this.loadActivity()
    return activity.projects
  }
}