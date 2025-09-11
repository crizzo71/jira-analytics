# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Jira Analytics Dashboard.

## Project Overview

The Jira Analytics Dashboard is an advanced analytics and visualization platform for Jira data. It provides real-time dashboards, enhanced CLI tools, and comprehensive reporting capabilities that complement the core Jira Status Builder.

## Key Information

- **Language**: Node.js (ES Modules) + React TypeScript
- **Version**: 1.0.0
- **Node Version**: >=16.0.0
- **Author**: Christina Rizzo <christina.rizzo@redhat.com>
- **License**: MIT

## Development Commands

### Setup
```bash
# Install dependencies
yarn install

# Copy environment template
cp .env.example .env
# Edit .env to add your JIRA_API_TOKEN
```

### Server Commands
```bash
# Start full-featured server with UI
yarn start
yarn dev  # Development mode with hot reload

# Start lightweight dashboard server
yarn simple-server

# Start individual components
yarn server  # Backend only
yarn ui      # Frontend only
```

### Analytics Generation
```bash
# Generate dashboard reports
yarn dashboard:generate --format=all
yarn dashboard:html
yarn dashboard:markdown
yarn dashboard:csv

# CLI-based dashboard
yarn dashboard:cli generate --format=html --output=reports
```

### Enhanced CLI Operations
```bash
# Security and vulnerability tracking
yarn enhanced security cve CVE-2023-1234 OCM
yarn enhanced security software "Apache" OCM

# Bulk operations
yarn enhanced assign "OCM-1,OCM-2" "john.doe"
yarn enhanced assign "OCM-1,OCM-2" x  # Unassign

# Advanced queries
yarn enhanced query "project=OCM AND status='To Do'" --plain
yarn enhanced export "project=OCM" json,csv,plain
```

## Architecture

### Backend Components
- **enhanced-cli.js**: Advanced CLI with jira-cli patterns
- **dashboard-generator.js**: Analytics data generation engine
- **dashboard-cli.js**: Command-line dashboard interface
- **server.js**: Full Express server with Socket.IO
- **simple-dashboard-server.js**: Lightweight HTTP server
- **activity-tracker.js**: User activity and workspace monitoring
- **jira-enhanced-client.js**: Extended Jira API client

### Frontend Components
- **ui/**: React TypeScript application
- **ui/src/pages/Dashboard.tsx**: Main analytics dashboard
- **ui/src/pages/Configuration.tsx**: Settings and config
- **ui/src/pages/ReportGeneration.tsx**: Report creation interface
- **ui/src/components/**: Reusable UI components

### Data Flow
```
Jira API → Enhanced Client → Analytics Engine → Dashboard Server → React UI
                           ↓
                    CLI Reports & Exports
```

## Key Features

### Real-Time Analytics
- **Live Dashboard**: Auto-refreshing metrics and charts
- **WebSocket Updates**: Real-time data streaming
- **Performance Metrics**: Velocity, throughput, burndown
- **Team Analytics**: Contributor performance tracking

### Enhanced CLI Tools
- **Security Tracking**: CVE and vulnerability monitoring
- **Bulk Operations**: Mass assignment, commenting, transitions
- **Advanced Queries**: Custom JQL with multiple output formats
- **Export Capabilities**: JSON, CSV, plain text, raw formats

### Dashboard Features
- **Interactive Charts**: Velocity trends, burndown, distribution
- **Responsive Design**: Works on desktop, tablet, mobile
- **Multiple Themes**: Light, dark, auto-detection
- **Export Reports**: Generate static reports in various formats

## Configuration

### Environment Variables (.env)
```bash
# Jira Configuration
JIRA_BASE_URL=https://issues.redhat.com
JIRA_API_TOKEN=your_personal_access_token_here
JIRA_PROJECT_KEYS=OCM,ROSA,HYPERSHIFT

# Analytics Configuration
ANALYTICS_REFRESH_INTERVAL=300000  # 5 minutes
ANALYTICS_MAX_ISSUES=1000
ANALYTICS_DEFAULT_PERIOD_DAYS=30

# Server Configuration
PORT=3000
ENABLE_REAL_TIME=true
ENABLE_CHARTS=true
```

### Dashboard Configuration
- **Widget Selection**: Choose which metrics to display
- **Refresh Intervals**: Configurable update frequency
- **Chart Types**: Line, bar, pie chart options
- **Theme Preferences**: Light/dark/auto themes

## API Endpoints

### REST API
- **GET /api/analytics**: Complete analytics dataset
- **GET /api/metrics**: Key performance indicators
- **GET /api/velocity**: Sprint velocity data
- **GET /api/contributors**: Team performance metrics
- **GET /health**: Service health check

### WebSocket Events
- **metrics-update**: Real-time metric changes
- **velocity-change**: Sprint velocity updates
- **contributor-update**: Team performance changes

## Common Workflows

### Dashboard Development
```bash
# Start development environment
yarn dev

# Backend changes - server auto-restarts
# Frontend changes - hot module replacement

# Build for production
yarn build
```

### Analytics Generation
```bash
# Generate comprehensive reports
yarn dashboard:generate --format=all --output=reports

# Create specific format
yarn dashboard:html --period=30

# CLI-based analytics
yarn enhanced query "project=OCM" --format=json
```

### Real-Time Monitoring
```bash
# Start dashboard server
yarn start
# Visit http://localhost:3000

# Monitor specific metrics
curl http://localhost:3000/api/velocity
curl http://localhost:3000/api/contributors
```

## Development Guidelines

### Code Style
- **ES Modules**: Use import/export syntax
- **TypeScript**: For UI components with proper typing
- **Async/Await**: For API calls and data processing
- **Error Handling**: Comprehensive try-catch blocks

### API Integration
- **Enhanced Client**: Extended Jira API capabilities
- **Rate Limiting**: Respect Jira API constraints
- **Error Recovery**: Graceful failure handling
- **Data Caching**: Optimize API call frequency

### UI Development
- **React Hooks**: Modern functional components
- **TypeScript**: Strong typing for props and state
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliance

## Performance Considerations

### Backend Optimization
- **Data Caching**: Cache API responses appropriately
- **Efficient Queries**: Optimize JQL for performance
- **Connection Pooling**: Manage API connections
- **Memory Management**: Handle large datasets

### Frontend Optimization
- **Code Splitting**: Lazy load components
- **Memoization**: Prevent unnecessary re-renders
- **Virtual Scrolling**: Handle large data lists
- **Bundle Optimization**: Minimize build size

## Security

### API Security
- **Token Management**: Secure PAT storage
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize user inputs
- **CORS Configuration**: Restrict cross-origin requests

### Data Protection
- **Sensitive Data**: Never log credentials
- **Environment Variables**: Secure configuration
- **Access Controls**: Implement proper permissions

## Testing

### Backend Testing
```bash
# API endpoint testing
curl http://localhost:3000/health
curl http://localhost:3000/api/analytics

# CLI command testing
yarn enhanced query "project=OCM" --plain
```

### Frontend Testing
```bash
# UI development
yarn ui
# Visit http://localhost:5173

# Component testing
# Add tests in ui/src/__tests__/
```

## Deployment

### Production Deployment
```bash
# Build optimized version
yarn build

# Start production server
NODE_ENV=production PORT=8080 yarn start
```

### Docker Deployment
```dockerfile
# Create Dockerfile for containerized deployment
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY . .
RUN yarn build
EXPOSE 3000
CMD ["yarn", "start"]
```

## Integration Patterns

### With Core Jira Status Builder
- **Shared Configuration**: Same .env and credentials
- **Complementary Features**: Analytics enhances basic reporting
- **Data Compatibility**: Compatible Jira API patterns
- **Independent Operation**: Can run separately or together

### With External Systems
- **Webhook Integration**: Receive Jira webhook events
- **Export Integration**: Push data to external systems
- **API Integration**: Consume data from other services

## Troubleshooting

### Common Issues
- **API Authentication**: Check JIRA_API_TOKEN validity
- **Rate Limiting**: Implement proper delays
- **Memory Usage**: Monitor for large datasets
- **CORS Issues**: Configure proper headers

### Debug Mode
```bash
# Enable debugging
DEBUG=true LOG_LEVEL=DEBUG yarn start

# Check API connectivity
yarn enhanced init
```

## Dependencies

### Production Dependencies
- **express**: HTTP server framework
- **socket.io**: Real-time communication
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **handlebars**: Template engine
- **concurrently**: Run multiple commands

### Development Dependencies
- **typescript**: Type checking
- **vite**: Build tool and dev server
- **react**: UI framework

## Related Documentation

- **[Core Jira Status Builder](https://github.com/crizzo71/JSBv2)**: Basic reporting functionality
- **[Red Hat Jira](https://issues.redhat.com)**: Target Jira instance
- **[OCM Project](https://github.com/openshift/api)**: Open Cluster Management context