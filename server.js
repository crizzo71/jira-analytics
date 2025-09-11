import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

// Import our existing CLI modules
import { JiraClient } from './jira-client.js'
import { ReportGenerator } from './report-generator.js'
import { ProjectSelector } from './project-selector.js'
import { ManualInputCollector } from './manual-input.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(cors())
app.use(express.json())
app.use('/reports', express.static(path.join(__dirname, 'reports')))
app.use('/data', express.static(path.join(__dirname, 'data')))

// Store active report generation processes
const activeReports = new Map()

// Authentication endpoints
app.post('/api/auth/validate', async (req, res) => {
  try {
    const { token, baseUrl = 'https://issues.redhat.com' } = req.body
    
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' })
    }

    const client = new JiraClient(baseUrl, token)
    const isValid = await client.validateToken()
    
    res.json({ valid: isValid })
  } catch (error) {
    console.error('Token validation error:', error)
    res.status(500).json({ valid: false, error: error.message })
  }
})

// Projects endpoints
app.get('/api/projects', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' })
    }

    const client = new JiraClient('https://issues.redhat.com', token)
    const projects = await client.getAllProjects()
    
    res.json(projects)
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/projects/:key/boards', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' })
    }

    const { key } = req.params
    const client = new JiraClient('https://issues.redhat.com', token)
    const boards = await client.getBoardsForProject(key)
    
    res.json(boards)
  } catch (error) {
    console.error('Get boards error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Helper functions for project selection
async function loadProjectSelection() {
  const data = await fs.readFile('project-selection.json', 'utf-8')
  return JSON.parse(data)
}

async function saveProjectSelection(selection) {
  await fs.writeFile('project-selection.json', JSON.stringify(selection, null, 2))
}

// Project selection endpoints
app.get('/api/selection', async (req, res) => {
  try {
    const selection = await loadProjectSelection()
    res.json(selection)
  } catch (error) {
    res.status(404).json({ error: 'No saved selection found' })
  }
})

app.post('/api/selection', async (req, res) => {
  try {
    const selection = req.body
    await saveProjectSelection(selection)
    res.json({ success: true })
  } catch (error) {
    console.error('Save selection error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Manual input endpoints
app.get('/api/manual-input', async (req, res) => {
  try {
    const collector = new ManualInputCollector()
    const input = await collector.getInputData()
    res.json(input)
  } catch (error) {
    res.status(404).json({ error: 'No manual input found' })
  }
})

app.post('/api/manual-input', async (req, res) => {
  try {
    const input = req.body
    const collector = new ManualInputCollector()
    collector.inputData = input
    await collector.saveInput()
    res.json({ success: true })
  } catch (error) {
    console.error('Save manual input error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Report generation endpoints
app.post('/api/reports/generate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' })
    }

    const {
      projectKey,
      boardIds,
      dateRange,
      velocityPeriods = 6,
      formats = ['markdown'],
      includeManualInput = false
    } = req.body

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Start async report generation
    generateReportAsync(reportId, {
      token,
      projectKey,
      boardIds,
      dateRange,
      velocityPeriods,
      formats,
      includeManualInput
    })

    res.json({ reportId, status: 'started' })
  } catch (error) {
    console.error('Report generation error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/reports/:id/status', (req, res) => {
  const { id } = req.params
  const report = activeReports.get(id)
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' })
  }
  
  res.json(report)
})

app.get('/api/reports', async (req, res) => {
  try {
    const reports = []
    
    // Scan reports directory for generated files
    const formats = ['markdown', 'google-docs', 'plain-text']
    
    for (const format of formats) {
      try {
        const formatPath = path.join(__dirname, 'reports', format)
        const files = await fs.readdir(formatPath)
        
        for (const file of files) {
          const filePath = path.join(formatPath, file)
          const stats = await fs.stat(filePath)
          
          reports.push({
            id: `${format}_${file}`,
            name: file,
            format: format === 'google-docs' ? 'html' : format,
            createdAt: stats.mtime.toISOString(),
            size: stats.size,
            url: `/reports/${format}/${file}`
          })
        }
      } catch (err) {
        // Directory might not exist, continue
      }
    }
    
    // Sort by creation date, newest first
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    res.json(reports)
  } catch (error) {
    console.error('List reports error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Velocity endpoint
app.get('/api/velocity/:boardId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' })
    }

    const { boardId } = req.params
    const { periods = 6 } = req.query

    const client = new JiraClient('https://issues.redhat.com', token)
    const velocity = await client.calculateVelocity(parseInt(boardId), parseInt(periods))
    
    res.json(velocity)
  } catch (error) {
    console.error('Velocity calculation error:', error)
    res.status(500).json({ error: error.message })
  }
})

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Async report generation function
async function generateReportAsync(reportId, config) {
  try {
    activeReports.set(reportId, {
      id: reportId,
      status: 'processing',
      progress: 0,
      currentOperation: 'Initializing...'
    })

    // Emit initial status
    io.emit('report:progress', {
      reportId,
      percentage: 0,
      status: 'processing',
      message: 'Initializing report generation...'
    })

    const client = new JiraClient('https://issues.redhat.com', config.token)
    const reportGenerator = new ReportGenerator()

    // Update progress: Fetching issues
    activeReports.set(reportId, {
      ...activeReports.get(reportId),
      progress: 20,
      currentOperation: 'Fetching issues...'
    })
    io.emit('report:progress', {
      reportId,
      percentage: 20,
      status: 'processing',
      message: 'Fetching issues from Jira...'
    })

    // Fetch issues
    const issues = await client.getIssuesForBoards(config.boardIds, {
      startDate: config.dateRange.start,
      endDate: config.dateRange.end
    })

    // Update progress: Processing data
    activeReports.set(reportId, {
      ...activeReports.get(reportId),
      progress: 60,
      currentOperation: 'Processing data...'
    })
    io.emit('report:progress', {
      reportId,
      percentage: 60,
      status: 'processing',
      message: 'Processing issue data and calculating metrics...'
    })

    // Calculate velocity if needed
    let velocity = null
    if (config.boardIds.length === 1) {
      velocity = await client.calculateVelocity(config.boardIds[0], config.velocityPeriods)
    }

    // Load manual input if requested
    let manualInput = null
    if (config.includeManualInput) {
      try {
        const collector = new ManualInputCollector()
        manualInput = await collector.getInputData()
      } catch (error) {
        console.warn('No manual input found, continuing without it')
      }
    }

    // Update progress: Generating reports
    activeReports.set(reportId, {
      ...activeReports.get(reportId),
      progress: 80,
      currentOperation: 'Generating reports...'
    })
    io.emit('report:progress', {
      reportId,
      percentage: 80,
      status: 'processing',
      message: 'Generating report files...'
    })

    // Generate reports in requested formats
    const reportData = {
      issues,
      velocity,
      manualInput,
      projectKey: config.projectKey,
      boardIds: config.boardIds,
      dateRange: config.dateRange
    }

    const generatedFiles = []
    for (const format of config.formats) {
      const fileName = await reportGenerator.generate(reportData, format)
      generatedFiles.push({
        format,
        fileName,
        url: `/reports/${format}/${fileName}`
      })
    }

    // Complete
    activeReports.set(reportId, {
      ...activeReports.get(reportId),
      status: 'completed',
      progress: 100,
      currentOperation: 'Complete',
      files: generatedFiles
    })

    io.emit('report:complete', {
      reportId,
      files: generatedFiles
    })

  } catch (error) {
    console.error('Report generation failed:', error)
    
    activeReports.set(reportId, {
      ...activeReports.get(reportId),
      status: 'failed',
      error: error.message
    })

    io.emit('report:error', {
      reportId,
      error: error.message,
      retryable: true
    })
  }
}

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})