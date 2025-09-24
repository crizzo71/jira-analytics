# Contributing to Jira Analytics Dashboard

Thank you for your interest in contributing to the Jira Analytics Dashboard! This project provides advanced analytics and reporting capabilities for Red Hat Jira instances, focusing on teams like OCM, ROSA, and HYPERSHIFT.

## 🎯 Project Overview

This dashboard offers:
- Real-time Jira analytics and metrics
- Interactive team performance tracking  
- Advanced CLI tools for Jira operations
- Responsive web interface with React/TypeScript
- WebSocket-based live updates
- Multiple export formats (HTML, Markdown, CSV, JSON)

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0 or **yarn** >= 1.22.0
- **Git**
- **Jira API Token** (for testing with real data)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/jira-analytics.git
   cd jira-analytics
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Jira credentials
   ```

4. **Start Development Environment**
   ```bash
   # Option 1: Full development (backend + frontend)
   yarn dev

   # Option 2: Backend only
   yarn server

   # Option 3: Simple dashboard server
   yarn start
   ```

5. **Access the Application**
   - Main Dashboard: http://localhost:3000
   - Configuration: http://localhost:3000/configuration
   - API Health: http://localhost:3000/health

## 📁 Project Structure

```
jira-analytics/
├── server.js                  # Main Express server
├── enhanced-cli.js            # Advanced CLI operations
├── dashboard-generator.js     # Analytics data generation
├── jira-client.js            # Jira API client
├── ui/                       # React frontend
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── templates/               # Handlebars report templates
└── README.md
```

## 🛠️ Development Guidelines

### Code Standards

**JavaScript/Node.js:**
- Use ES6+ features and ES modules (`import`/`export`)
- Follow consistent naming conventions (camelCase for variables/functions)
- Include JSDoc comments for functions
- Use async/await for asynchronous operations

**TypeScript/React:**
- Use TypeScript strict mode
- Define proper interfaces and types
- Follow React functional components with hooks
- Use Material-UI components consistently

**General:**
- Maximum line length: 100 characters
- Use 2 spaces for indentation
- Include descriptive commit messages
- Write self-documenting code with clear variable names

### Example Code Style

```javascript
// Good: Clear function with JSDoc
/**
 * Fetches velocity data for a specific board
 * @param {number} boardId - The Jira board ID
 * @param {number} periods - Number of periods to analyze
 * @returns {Promise<Object>} Velocity metrics
 */
async function calculateVelocity(boardId, periods = 6) {
  try {
    const client = new JiraClient(baseUrl, token);
    return await client.calculateVelocity(boardId, periods);
  } catch (error) {
    console.error(`Failed to calculate velocity for board ${boardId}:`, error);
    throw error;
  }
}
```

```typescript
// Good: TypeScript interface definition
interface VelocityMetrics {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  average: number;
  periods: VelocityPeriod[];
}
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Test Your Changes**
   ```bash
   # Start the server and verify functionality
   yarn start
   
   # Test CLI commands
   yarn enhanced --help
   
   # Verify configuration page works
   curl http://localhost:3000/configuration
   ```

3. **Update Documentation**
   - Update README.md if adding new features
   - Add/update JSDoc comments
   - Update API documentation if applicable

### Pull Request Guidelines

1. **PR Title Format**
   - `✨ Add: New feature description`
   - `🐛 Fix: Bug fix description`
   - `📚 Doc: Documentation updates`
   - `🎨 Style: Code formatting/styling`
   - `♻️ Refactor: Code restructuring`

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Performance improvement

   ## Testing
   - [ ] Tested locally with sample data
   - [ ] Configuration page loads correctly
   - [ ] Dashboard displays analytics properly
   - [ ] CLI commands work as expected

   ## Screenshots (if applicable)
   Add screenshots of UI changes

   ## Related Issues
   Closes #issue-number
   ```

3. **Review Process**
   - All PRs require at least one review
   - Address reviewer feedback promptly
   - Ensure CI checks pass (when implemented)
   - Keep PRs focused and reasonably sized

## 🐛 Issue Reporting

### Bug Reports

Use the following template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [Windows/Mac/Linux]
- Node.js version: 
- Browser (if applicable):
- Jira instance: [Red Hat/other]

**Additional Context**
Any other relevant information
```

### Feature Requests

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed? What problem does it solve?

**Proposed Solution**
How would you like this implemented?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Mock-ups, references, examples
```

## 🧪 Testing Guidelines

### Manual Testing Checklist

**Dashboard Functionality:**
- [ ] Dashboard loads with sample data
- [ ] Metrics display correctly (velocity, throughput, completion)
- [ ] Charts render properly
- [ ] Auto-refresh works
- [ ] Export functions work

**Configuration Page:**
- [ ] Team selection dropdown works
- [ ] Quick-select buttons function
- [ ] Kanban board ID input accepts various formats
- [ ] Form validation works
- [ ] Configuration saves and loads

**CLI Tools:**
- [ ] Enhanced CLI commands execute successfully
- [ ] Report generation works in all formats
- [ ] Error handling displays helpful messages

**API Endpoints:**
- [ ] Health check responds
- [ ] Analytics API returns valid data
- [ ] Authentication works properly

### Testing with Real Data

```bash
# Test with OCM project (if you have access)
JIRA_PROJECT_KEYS=OCM yarn start

# Test CLI report generation
yarn enhanced report --format=markdown

# Test dashboard generation
yarn dashboard:generate --format=html
```

## 📚 Documentation

### Required Documentation Updates

**For New Features:**
- Update README.md with usage examples
- Add JSDoc comments to all functions
- Update API documentation if applicable
- Include configuration options

**For Bug Fixes:**
- Document the fix in commit messages
- Update troubleshooting section if relevant

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Keep examples up-to-date

## 🏗️ Architecture Considerations

### Adding New Features

**Backend (Node.js):**
- Follow existing patterns in `server.js`
- Add new routes with proper error handling
- Use existing Jira client patterns
- Implement WebSocket events for real-time features

**Frontend (React/TypeScript):**
- Create reusable components
- Follow Material-UI design patterns
- Implement proper TypeScript types
- Use React hooks appropriately

**CLI Tools:**
- Extend `enhanced-cli.js` for new commands
- Follow existing argument parsing patterns
- Provide helpful error messages
- Include usage examples

### Performance Considerations

- Cache Jira API responses appropriately
- Implement pagination for large datasets
- Use WebSocket for real-time updates efficiently
- Optimize dashboard rendering for large teams

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Share knowledge and best practices

### Communication

- Use clear, professional language
- Be patient with questions and reviews
- Provide detailed explanations for complex changes
- Ask for help when needed

### Red Hat Integration

This project is designed for Red Hat Jira instances:
- Test with OCM, ROSA, HYPERSHIFT projects when possible
- Follow Red Hat development practices
- Consider enterprise security requirements
- Respect data privacy and access controls

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor statistics

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community support
- **Email**: christina.rizzo@redhat.com for project-related inquiries

## 🔗 Useful Links

- [GitHub Repository](https://github.com/crizzo71/jira-analytics)
- [Live Demo](https://crizzo71.github.io/jira-analytics/)
- [Red Hat Jira](https://issues.redhat.com)
- [Jira REST API Documentation](https://developer.atlassian.com/server/jira/platform/rest-apis/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Thank you for contributing to the Jira Analytics Dashboard! Your contributions help improve analytics and reporting capabilities for Red Hat engineering teams. 🚀
