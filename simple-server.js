// Simple HTTP server without external dependencies
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// In-memory storage for manual input (in production, use a database)
let manualInputData = {
  teamMorale: {
    score: 3,
    explanation: ''
  },
  celebrations: [],
  milestones: [],
  blockers: [],
  forwardPriorities: []
}

// Load existing manual input if available
try {
  const existingData = fs.readFileSync('./manual-input.json', 'utf-8')
  const parsed = JSON.parse(existingData)
  // Convert the existing format to match the new structure
  if (parsed.teamMorale?.assessment) {
    manualInputData = {
      teamMorale: {
        score: 3,
        explanation: parsed.teamMorale.assessment
      },
      celebrations: parsed.celebrations?.teamCelebrations ? [parsed.celebrations.teamCelebrations] : [],
      milestones: [],
      blockers: [],
      forwardPriorities: []
    }
  }
  console.log('Loaded existing manual input data')
} catch (error) {
  console.log('No existing manual input found, using defaults')
}

const server = http.createServer(async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  console.log(`${req.method} ${req.url}`)

  // Helper function to parse JSON body
  const parseBody = (req) => {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  // Simple routing
  if (req.url === '/api/auth/validate' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ valid: true, message: 'Mock validation successful' }))
  } else if (req.url === '/api/projects' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([
      { id: '1', key: 'OCM', name: 'OpenShift Cluster Manager', description: 'OCM Project' },
      { id: '2', key: 'ROSA', name: 'Red Hat OpenShift on AWS', description: 'ROSA Project' }
    ]))
  } else if (req.url?.startsWith('/api/projects/') && req.url.endsWith('/boards')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([
      { id: 1, name: 'Main Board', type: 'scrum' },
      { id: 2, name: 'Kanban Board', type: 'kanban' }
    ]))
  } else if (req.url === '/api/files' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([
      {
        id: 'reports',
        name: 'Reports',
        type: 'folder',
        createdAt: '2025-08-13T10:00:00Z',
        path: '/reports'
      },
      {
        id: 'data',
        name: 'Data Exports',
        type: 'folder',
        createdAt: '2025-08-13T09:00:00Z',
        path: '/data'
      },
      {
        id: 'templates',
        name: 'Templates',
        type: 'folder',
        createdAt: '2025-08-10T15:30:00Z',
        path: '/templates'
      }
    ]))
  } else if (req.url === '/api/manual-input' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(manualInputData))
  } else if (req.url === '/api/manual-input' && req.method === 'POST') {
    try {
      const data = await parseBody(req)
      manualInputData = { ...manualInputData, ...data }
      console.log('Manual input saved:', manualInputData)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, message: 'Manual input saved successfully' }))
    } catch (error) {
      console.error('Error parsing manual input:', error)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON data' }))
    }
  } else if (req.url === '/api/reports/generate' && req.method === 'POST') {
    try {
      const data = await parseBody(req)
      console.log('Generating report with config:', data)
      
      // Simulate report generation
      const reportId = 'report_' + Date.now()
      const userHomeDir = process.env.HOME || process.env.USERPROFILE
      const reportUrl = `file://${path.join(userHomeDir, 'Jira-Reports', 'markdown', `executive-report-${reportId}.md`)}`
      
      // Create a simple mock report
      const reportContent = `# Executive Report - ${new Date().toLocaleDateString()}

## 1.0 Team Performance Metrics

### 1.1 Team Velocity
- **Average Velocity**: 42 items/week
- **Trend**: Stable
- **Period**: ${data.dateRange?.start || 'Last 4 weeks'} to ${data.dateRange?.end || 'Today'}

### 1.2 Key Activities
- Report generated from OCM project
- Multi-board analysis completed
- Team metrics calculated

## 2.0 Manual Input Summary
${manualInputData.teamMorale?.explanation || 'No manual input provided'}

## 3.0 Format Information
- **Formats Generated**: ${data.formats?.join(', ') || 'markdown'}
- **Include Manual Input**: ${data.includeManualInput ? 'Yes' : 'No'}
- **Velocity Periods**: ${data.velocityPeriods || 6}

---
*Report generated by Jira Status Builder*
`

      // Save the mock report to user's local directory
      try {
        const userHomeDir = process.env.HOME || process.env.USERPROFILE
        const userReportsDir = path.join(userHomeDir, 'Jira-Reports')
        if (!fs.existsSync(userReportsDir)) {
          fs.mkdirSync(userReportsDir, { recursive: true })
        }
        const markdownDir = path.join(userReportsDir, 'markdown')
        if (!fs.existsSync(markdownDir)) {
          fs.mkdirSync(markdownDir, { recursive: true })
        }
        const reportFilePath = path.join(markdownDir, `executive-report-${reportId}.md`)
        fs.writeFileSync(reportFilePath, reportContent)
        console.log(`Report saved to: ${reportFilePath}`)
      } catch (error) {
        console.error('Error saving report:', error)
      }

      const response = {
        success: true,
        reportId: reportId,
        files: [
          {
            id: reportId,
            name: `Executive Report ${new Date().toLocaleDateString()}`,
            format: 'markdown',
            url: reportUrl,
            size: reportContent.length,
            createdAt: new Date().toISOString()
          }
        ]
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response))
    } catch (error) {
      console.error('Error generating report:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Report generation failed' }))
    }
  } else if (req.url === '/api/reports' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([
      {
        id: '1',
        name: 'OCM Executive Report',
        format: 'markdown',
        createdAt: '2025-08-13T16:33:00Z',
        size: 45680,
        url: '/reports/markdown/executive-report-OCM-multi-3boards-2025-08-13.md'
      },
      {
        id: '2',
        name: 'OCM HTML Report', 
        format: 'html',
        createdAt: '2025-08-13T16:33:00Z',
        size: 67890,
        url: '/reports/google-docs/executive-report-OCM-multi-3boards-2025-08-13.html'
      }
    ]))
  } else if (req.url?.startsWith('/reports/') || req.url?.startsWith('/data/')) {
    // Serve static files
    const filePath = path.join(__dirname, req.url)
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath)
        if (stat.isFile()) {
          const ext = path.extname(filePath)
          let contentType = 'application/octet-stream'
          
          switch (ext) {
            case '.md': contentType = 'text/markdown'; break
            case '.html': contentType = 'text/html'; break
            case '.txt': contentType = 'text/plain'; break
            case '.json': contentType = 'application/json'; break
            case '.csv': contentType = 'text/csv'; break
          }
          
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Content-Length': stat.size,
            'Content-Disposition': `inline; filename="${path.basename(filePath)}"`
          })
          fs.createReadStream(filePath).pipe(res)
          return
        }
      }
    } catch (error) {
      console.error('File serve error:', error)
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'File not found' }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`)
  console.log(`📝 This is a temporary server until npm dependencies are installed`)
  console.log(`🔧 To fix npm permissions, run: sudo chown -R $(id -u):$(id -g) ~/.npm`)
})