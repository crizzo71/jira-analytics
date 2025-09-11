import { ActivityTracker } from './activity-tracker.js'
import { JiraCliClient } from './jira-cli-client.js'
import { ReportGenerator } from './report-generator.js'
import { ManualInputCollector } from './manual-input.js'
import fs from 'fs/promises'

export class WorkflowCommands {
  constructor() {
    this.tracker = new ActivityTracker()
  }

  async executeCommand(command, args = {}) {
    const startTime = Date.now()
    let success = true
    let result = null

    try {
      switch (command) {
        case '/jira-prime':
          result = await this.primeWorkspace(args)
          break
        case '/jira-status':
          result = await this.getWorkspaceStatus(args)
          break
        case '/jira-report':
          result = await this.generateReport(args)
          break
        case '/jira-sync':
          result = await this.syncProjects(args)
          break
        case '/jira-health':
          result = await this.healthCheck(args)
          break
        default:
          throw new Error(`Unknown command: ${command}`)
      }
    } catch (error) {
      success = false
      result = { error: error.message }
    }

    const duration = Date.now() - startTime
    await this.tracker.logActivity('workflow_command', {
      command,
      args,
      success,
      duration_ms: duration,
      result: success ? 'completed' : 'failed'
    })

    return { success, result, duration }
  }

  async primeWorkspace(args = {}) {
    console.log('🔧 Priming Jira Workspace...')
    
    // Load configuration
    const config = await this.tracker.loadConfig()
    if (!config) {
      throw new Error('No workspace configuration found. Create jira-workspace-config.json first.')
    }

    const results = {
      instances_checked: 0,
      projects_synced: 0,
      boards_discovered: 0,
      errors: []
    }

    // Check each Jira instance
    for (const instance of config.jira_instances) {
      console.log(`🔍 Checking instance: ${instance.name}`)
      
      try {
        // Test connectivity
        const client = new JiraCliClient()
        const isValid = await client.validateToken()
        
        if (!isValid) {
          results.errors.push(`Authentication failed for ${instance.name}`)
          continue
        }

        results.instances_checked++

        // Sync projects
        for (const project of instance.projects) {
          console.log(`📊 Syncing project: ${project.name}`)
          
          try {
            // Get project boards if not configured
            if (project.boards.length === 0) {
              try {
                const boards = await client.getBoardsForProject(project.key)
                project.boards = boards.map(b => b.id)
                results.boards_discovered += boards.length
              } catch (error) {
                console.warn(`Could not fetch boards for ${project.key}:`, error.message)
              }
            }

            await this.tracker.logProjectSync(project.key, project.boards, true)
            results.projects_synced++
          } catch (error) {
            results.errors.push(`Failed to sync project ${project.key}: ${error.message}`)
            await this.tracker.logProjectSync(project.key, [], false)
          }
        }
      } catch (error) {
        results.errors.push(`Instance ${instance.name} check failed: ${error.message}`)
      }
    }

    // Update configuration with discovered boards
    await fs.writeFile('jira-workspace-config.json', JSON.stringify(config, null, 2))

    console.log('✅ Workspace priming completed')
    console.log(`📈 Results: ${results.projects_synced} projects synced, ${results.boards_discovered} boards discovered`)
    
    if (results.errors.length > 0) {
      console.log('⚠️ Errors encountered:')
      results.errors.forEach(error => console.log(`  - ${error}`))
    }

    return results
  }

  async getWorkspaceStatus(args = {}) {
    console.log('📊 Workspace Status Report')
    console.log('=' .repeat(50))

    const days = args.days || 7
    const summary = await this.tracker.getActivitySummary(days)
    const projects = await this.tracker.getAllProjects()

    console.log(`📅 Activity Summary (Last ${days} days):`)
    console.log(`  🔄 Total Activities: ${summary.total_activities}`)
    console.log(`  🌐 API Calls: ${summary.api_calls}`)
    console.log(`  📄 Reports Generated: ${summary.reports_generated}`)
    console.log(`  ✅ Success Rate: ${summary.success_rate}%`)
    console.log(`  ⏱️ Avg Report Time: ${Math.round(summary.avg_report_time / 1000)}s`)
    console.log(`  🕐 Last Activity: ${new Date(summary.last_activity).toLocaleString()}`)

    console.log(`\\n📊 Project Status:`)
    for (const [key, project] of Object.entries(projects)) {
      const lastReport = project.last_report ? 
        new Date(project.last_report).toLocaleDateString() : 'Never'
      console.log(`  📋 ${key}: ${project.total_reports} reports, last: ${lastReport}`)
    }

    console.log(`\\n🎯 Active Projects: ${summary.projects_active.join(', ') || 'None'}`)

    return {
      summary,
      projects,
      workspace_health: summary.success_rate > 90 ? 'healthy' : 'needs_attention'
    }
  }

  async generateReport(args = {}) {
    const projectKey = args.project || 'OCM'
    const format = args.format || 'markdown'
    const includeManualInput = args.manual_input !== false

    console.log(`📝 Generating ${format} report for ${projectKey}...`)

    const startTime = Date.now()
    
    try {
      // Load project selection (this would need to be adapted to your current system)
      const selection = JSON.parse(await fs.readFile('project-selection.json', 'utf-8'))
      
      // Generate report using existing system
      const generator = new ReportGenerator()
      
      let manualInput = null
      if (includeManualInput) {
        try {
          const collector = new ManualInputCollector()
          manualInput = await collector.getInputData()
        } catch (error) {
          console.warn('No manual input found, continuing without it')
        }
      }

      const reportData = {
        project: selection.project,
        boards: selection.boards,
        manualInput: manualInput,
        format: format
      }

      // This would integrate with your existing report generation
      const result = await generator.generateReport(reportData)
      
      const duration = Date.now() - startTime
      
      await this.tracker.logReportGeneration(format, true, duration, projectKey, {
        boards_count: selection.boards?.length || 0,
        manual_input_included: !!manualInput
      })

      console.log(`✅ Report generated successfully in ${Math.round(duration / 1000)}s`)
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      await this.tracker.logReportGeneration(format, false, duration, projectKey)
      throw error
    }
  }

  async syncProjects(args = {}) {
    console.log('🔄 Syncing project configurations...')
    
    const config = await this.tracker.loadConfig()
    if (!config) {
      throw new Error('No workspace configuration found')
    }

    const results = {
      synced: [],
      errors: []
    }

    for (const instance of config.jira_instances) {
      for (const project of instance.projects) {
        try {
          console.log(`🔄 Syncing ${project.key}...`)
          
          const client = new JiraCliClient()
          const boards = await client.getBoardsForProject(project.key)
          
          await this.tracker.logProjectSync(project.key, boards.map(b => b.id), true)
          results.synced.push(project.key)
          
        } catch (error) {
          await this.tracker.logProjectSync(project.key, [], false)
          results.errors.push(`${project.key}: ${error.message}`)
        }
      }
    }

    console.log(`✅ Sync completed: ${results.synced.length} projects synced`)
    return results
  }

  async healthCheck(args = {}) {
    console.log('🏥 Running workspace health check...')
    
    const health = {
      overall: 'healthy',
      checks: {},
      recommendations: []
    }

    // Check configuration file
    try {
      const config = await this.tracker.loadConfig()
      health.checks.configuration = config ? 'pass' : 'fail'
      if (!config) {
        health.recommendations.push('Create jira-workspace-config.json file')
        health.overall = 'warning'
      }
    } catch (error) {
      health.checks.configuration = 'fail'
      health.overall = 'error'
    }

    // Check activity tracking
    try {
      const activity = await this.tracker.loadActivity()
      health.checks.activity_tracking = 'pass'
      
      const recentActivity = activity.activity_log.filter(
        log => Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
      )
      
      if (recentActivity.length === 0) {
        health.recommendations.push('No recent activity detected - consider running /jira-prime')
      }
    } catch (error) {
      health.checks.activity_tracking = 'fail'
      health.overall = 'error'
    }

    // Check API connectivity
    try {
      if (process.env.JIRA_API_TOKEN) {
        const client = new JiraCliClient()
        const isValid = await client.validateToken()
        health.checks.api_connectivity = isValid ? 'pass' : 'fail'
        if (!isValid) {
          health.recommendations.push('Check JIRA_API_TOKEN environment variable')
          health.overall = 'error'
        }
      } else {
        health.checks.api_connectivity = 'fail'
        health.recommendations.push('Set JIRA_API_TOKEN environment variable')
        health.overall = 'error'
      }
    } catch (error) {
      health.checks.api_connectivity = 'fail'
      health.overall = 'error'
    }

    console.log(`🏥 Health check completed: ${health.overall}`)
    if (health.recommendations.length > 0) {
      console.log('💡 Recommendations:')
      health.recommendations.forEach(rec => console.log(`  - ${rec}`))
    }

    return health
  }
}