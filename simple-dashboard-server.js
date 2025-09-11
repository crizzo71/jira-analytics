#!/usr/bin/env node

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DashboardGenerator } from './dashboard-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple Dashboard Server
 * Lightweight HTTP server for serving analytics dashboards
 */
class SimpleDashboardServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.generator = new DashboardGenerator();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(join(__dirname, 'public')));
    
    // CORS for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'jira-analytics-dashboard'
      });
    });

    // Analytics data API
    this.app.get('/api/analytics', async (req, res) => {
      try {
        const data = await this.generator.generateDashboardData();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Dashboard HTML
    this.app.get('/dashboard', async (req, res) => {
      try {
        const data = await this.generator.generateDashboardData();
        const html = this.generateDashboardHTML(data);
        res.send(html);
      } catch (error) {
        res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
      }
    });

    // Root redirect
    this.app.get('/', (req, res) => {
      res.redirect('/dashboard');
    });
  }

  generateDashboardHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jira Analytics Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #f5f6fa; 
            color: #333;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 2rem; 
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 1.5rem; 
            margin: 2rem 0; 
        }
        .metric-card { 
            background: white; 
            border-radius: 10px; 
            padding: 1.5rem; 
            text-align: center; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .metric-card:hover { transform: translateY(-5px); }
        .metric-number { 
            font-size: 2.5rem; 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 0.5rem;
        }
        .metric-label { color: #666; font-size: 1rem; }
        .chart-section { 
            background: white; 
            border-radius: 10px; 
            padding: 2rem; 
            margin: 2rem 0; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 1rem 0;
        }
        .refresh-btn:hover { background: #5a6fd8; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .timestamp { font-size: 0.9rem; opacity: 0.7; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Jira Analytics Dashboard</h1>
        <p>Real-time insights into your Jira projects</p>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
    </div>

    <div class="container">
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${data.metrics.velocity.current}</div>
                <div class="metric-label">Current Velocity</div>
                <div style="color: ${data.metrics.velocity.trend === 'up' ? '#28a745' : '#dc3545'};">
                    ${data.metrics.velocity.trend === 'up' ? '📈' : '📉'} ${data.metrics.velocity.trend}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${data.metrics.throughput.daily}</div>
                <div class="metric-label">Daily Throughput</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${data.metrics.burndown.completion}%</div>
                <div class="metric-label">Sprint Completion</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${data.metrics.burndown.remaining}</div>
                <div class="metric-label">Issues Remaining</div>
            </div>
        </div>

        <div class="chart-section">
            <h3>📈 Velocity Trend</h3>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin-top: 1rem;">
                ${data.charts.velocity.map(v => 
                    `<div style="display: inline-block; margin: 0 10px; text-align: center;">
                        <div style="height: ${v.completed * 10}px; width: 30px; background: #667eea; margin-bottom: 5px;"></div>
                        <small>${v.period}</small>
                    </div>`
                ).join('')}
            </div>
        </div>

        <div class="chart-section">
            <h3>👥 Top Contributors</h3>
            <table>
                <thead>
                    <tr>
                        <th>Team Member</th>
                        <th>Completed Issues</th>
                        <th>In Progress</th>
                        <th>Total Workload</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.tables.topContributors.map(contributor => `
                    <tr>
                        <td><strong>${contributor.name}</strong></td>
                        <td>✅ ${contributor.completed}</td>
                        <td>🔄 ${contributor.inProgress}</td>
                        <td>${contributor.completed + contributor.inProgress}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="chart-section">
            <h3>📊 Issue Type Distribution</h3>
            <table>
                <thead>
                    <tr>
                        <th>Issue Type</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.tables.issueTypes.map(type => `
                    <tr>
                        <td><strong>${type.type}</strong></td>
                        <td>${type.count}</td>
                        <td>${type.percentage}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="timestamp">
            Last updated: ${new Date(data.timestamp).toLocaleString()}
        </div>
    </div>

    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => location.reload(), 300000);
        
        // Add some interactivity
        document.querySelectorAll('.metric-card').forEach(card => {
            card.addEventListener('click', () => {
                card.style.background = '#e3f2fd';
                setTimeout(() => card.style.background = 'white', 200);
            });
        });
    </script>
</body>
</html>`;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Jira Analytics Dashboard Server running on http://localhost:${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
      console.log(`🔧 API: http://localhost:${this.port}/api/analytics`);
      console.log(`❤️  Health: http://localhost:${this.port}/health`);
    });
  }
}

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  const server = new SimpleDashboardServer(port);
  server.start();
}

export { SimpleDashboardServer };