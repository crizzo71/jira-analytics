# Jira Analytics Dashboard

Advanced Jira analytics dashboard with real-time metrics, data visualization, and enhanced reporting capabilities. This project provides comprehensive analytics and dashboard features that complement the core [Jira Status Builder](https://github.com/crizzo71/JSBv2).

## 🚀 Quick Start

```bash
# Setup
cp .env.example .env
# Add your JIRA_API_TOKEN to .env
yarn install

# Start dashboard server
yarn start
# Visit http://localhost:3000

# Generate static reports
yarn dashboard:generate --format=all
```

## ✨ Features

### 📊 **Real-Time Analytics Dashboard**
- **Live Metrics**: Real-time velocity, throughput, and completion tracking
- **Interactive Charts**: Velocity trends, burndown charts, and progress visualization
- **Team Analytics**: Contributor performance and workload distribution
- **Auto-Refresh**: Configurable refresh intervals for live data

### 🎯 **Advanced CLI Tools**
- **Enhanced CLI**: Extended Jira operations beyond basic reporting
- **Security Tracking**: CVE and vulnerability monitoring
- **Bulk Operations**: Mass assignment, commenting, and status transitions
- **Custom Queries**: Advanced JQL execution with multiple output formats

### 📱 **Web Interface**
- **React Dashboard**: Modern UI for data exploration
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Export Capabilities**: Generate reports in multiple formats
- **Real-Time Updates**: WebSocket integration for live data

### 📈 **Analytics & Reporting**
- **Multiple Formats**: HTML, Markdown, JSON, CSV export
- **Historical Trends**: Time-series analysis and pattern detection
- **Performance Metrics**: Sprint velocity and team productivity
- **Custom Dashboards**: Configurable widgets and layouts

## 🏗️ Architecture

### Core Components

```
jira-analytics-dashboard/
├── enhanced-cli.js              # Advanced CLI operations
├── dashboard-generator.js       # Analytics data generation
├── dashboard-cli.js            # Dashboard CLI interface
├── server.js                   # Full-featured Express server
├── simple-dashboard-server.js  # Lightweight dashboard server
├── activity-tracker.js         # User activity monitoring
├── jira-enhanced-client.js     # Extended Jira API client
└── ui/                         # React dashboard application
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── Configuration.tsx
    │   │   └── ReportGeneration.tsx
    │   └── components/
    └── package.json
```

### Technology Stack
- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: React, TypeScript, Vite
- **Data**: REST APIs, Real-time WebSockets
- **Charts**: Built-in visualization components

## 🎯 Usage Examples

### Dashboard Server
```bash
# Start full-featured server
yarn start

# Start lightweight server
yarn simple-server

# Custom port
PORT=8080 yarn start
```

### CLI Analytics
```bash
# Enhanced CLI operations
yarn enhanced report --format=all
yarn enhanced security cve CVE-2023-1234 OCM
yarn enhanced assign "OCM-1,OCM-2" "john.doe"
yarn enhanced query "project=OCM AND status='To Do'" --plain

# Dashboard generation
yarn dashboard:generate --format=html
yarn dashboard:all --output=reports --period=30
```

### Web Dashboard
- **Dashboard**: http://localhost:3000/dashboard
- **API**: http://localhost:3000/api/analytics  
- **Health**: http://localhost:3000/health

## 📊 Analytics Features

### Metrics Tracking
- **Velocity**: Sprint-over-sprint completion rates
- **Throughput**: Daily, weekly, monthly issue flow
- **Burndown**: Progress toward sprint goals
- **Cycle Time**: Time from start to completion

### Team Analytics
- **Contributor Performance**: Individual completion rates
- **Workload Distribution**: Issue assignment balance
- **Collaboration Metrics**: Cross-team interactions
- **Productivity Trends**: Historical performance analysis

### Issue Analytics
- **Type Distribution**: Story vs Task vs Bug breakdown
- **Priority Analysis**: Critical vs Normal issue flow
- **Epic Progress**: Parent-child relationship tracking
- **Status Flow**: Workflow bottleneck identification

## 🔧 Configuration

### Environment Variables
```bash
# Jira Configuration
JIRA_BASE_URL=https://issues.redhat.com
JIRA_API_TOKEN=your_personal_access_token_here
JIRA_PROJECT_KEYS=OCM,ROSA,HYPERSHIFT

# Analytics Settings
ANALYTICS_REFRESH_INTERVAL=300000  # 5 minutes
ANALYTICS_MAX_ISSUES=1000
ANALYTICS_DEFAULT_PERIOD_DAYS=30

# Server Configuration
PORT=3000
ENABLE_REAL_TIME=true
ENABLE_CHARTS=true
```

### Dashboard Configuration
```javascript
// Customize dashboard widgets
const dashboardConfig = {
  widgets: ['velocity', 'throughput', 'burndown', 'contributors'],
  refreshInterval: 300000,
  chartTypes: ['line', 'bar', 'pie'],
  themes: ['light', 'dark', 'auto']
};
```

## 🎨 Dashboard Customization

### Widget Configuration
- **Velocity Widget**: Track sprint completion trends
- **Throughput Widget**: Monitor daily/weekly issue flow
- **Team Widget**: Display contributor performance
- **Epic Widget**: Show parent-child progress

### Theme Options
- **Light Theme**: Professional daytime interface
- **Dark Theme**: Comfortable low-light viewing
- **Auto Theme**: System preference detection

## 🔌 API Integration

### REST Endpoints
```bash
GET /api/analytics          # Full analytics data
GET /api/metrics           # Key performance indicators
GET /api/velocity          # Sprint velocity data
GET /api/contributors      # Team performance data
POST /api/refresh          # Trigger data refresh
```

### WebSocket Events
```javascript
// Real-time updates
socket.on('metrics-update', (data) => {
  updateDashboard(data);
});

socket.on('velocity-change', (velocity) => {
  updateVelocityChart(velocity);
});
```

## 📦 Dependencies

### Production Dependencies
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.0",
  "handlebars": "^4.7.8",
  "concurrently": "^8.2.0"
}
```

### UI Dependencies
```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "vite": "^4.0.0"
}
```

## 🚀 Development

### Setup Development Environment
```bash
# Install dependencies
yarn install

# Start development servers
yarn dev  # Runs both backend and frontend

# Development commands
yarn server  # Backend only
yarn ui      # Frontend only
```

### Build for Production
```bash
# Build UI
yarn build

# Start production server
NODE_ENV=production yarn start
```

## 📊 Sample Analytics Output

### Velocity Metrics
```json
{
  "velocity": {
    "current": 12,
    "previous": 8,
    "trend": "up",
    "average": 10.5
  },
  "throughput": {
    "daily": 2.1,
    "weekly": 14.7,
    "monthly": 58.2
  }
}
```

### Team Performance
```json
{
  "topContributors": [
    {
      "name": "Rafael Benevides",
      "completed": 5,
      "inProgress": 2,
      "velocity": 1.2
    }
  ]
}
```

## 🔗 Integration with Core Project

This analytics dashboard is designed to work alongside the [Jira Status Builder](https://github.com/crizzo71/JSBv2):

- **Shared Configuration**: Uses same .env and Jira credentials
- **Complementary Features**: Analytics enhances basic reporting
- **Independent Deployment**: Can run separately or together
- **Data Compatibility**: Shares Jira API patterns and data formats

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🏷️ Related Projects

- **[Jira Status Builder](https://github.com/crizzo71/JSBv2)**: Core executive reporting
- **[Red Hat Jira](https://issues.redhat.com)**: Target Jira instance
- **OCM Project**: Open Cluster Management team workflows