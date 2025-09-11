#!/usr/bin/env node

// Minimal report generator without dependencies
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

console.log('🚀 Jira Status Builder - Minimal Report Generator');
console.log('================================================\n');

// Load environment variables manually
const envContent = readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...valueParts] = trimmed.split('=');
    env[key] = valueParts.join('=');
  }
});

// Configuration
const config = {
  jira: {
    baseUrl: env.JIRA_BASE_URL || 'https://issues.redhat.com',
    apiToken: env.JIRA_API_TOKEN,
    projectKeys: env.JIRA_PROJECT_KEYS || 'OCM'
  },
  report: {
    weeksBack: parseInt(env.REPORT_WEEKS_BACK || '1'),
    velocitySprints: parseInt(env.VELOCITY_SPRINTS_COUNT || '6')
  }
};

// Date helper
function getDateString(daysBack = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Fetch issues from Jira
async function fetchIssues() {
  const startDate = getDateString(config.report.weeksBack * 7);
  const jql = `project = ${config.jira.projectKeys} AND updated >= "${startDate}" ORDER BY updated DESC`;
  
  console.log(`📋 Fetching issues from ${config.jira.projectKeys} project...`);
  console.log(`📅 Date range: ${formatDate(startDate)} to ${formatDate(getDateString())}`);
  console.log(`🔍 JQL: ${jql}\n`);
  
  const url = `${config.jira.baseUrl}/rest/api/2/search`;
  const params = new URLSearchParams({
    jql: jql,
    fields: 'key,summary,status,assignee,updated,created,priority,resolution,issuetype,issuelinks,parent',
    maxResults: '100'
  });
  
  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${config.jira.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.issues.length} issues\n`);
    
    return data.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
      updated: issue.fields.updated,
      created: issue.fields.created,
      priority: issue.fields.priority ? issue.fields.priority.name : 'None',
      resolution: issue.fields.resolution ? issue.fields.resolution.name : null,
      issuetype: issue.fields.issuetype.name,
      url: `${config.jira.baseUrl}/browse/${issue.key}`
    }));
    
  } catch (error) {
    console.error('❌ Error fetching issues:', error.message);
    throw error;
  }
}

// Categorize issues
function categorizeIssues(issues) {
  const completed = issues.filter(issue => 
    ['Done', 'Resolved', 'Closed'].includes(issue.status)
  );
  
  const inProgress = issues.filter(issue => 
    ['In Progress', 'In Review', 'Testing'].includes(issue.status)
  );
  
  const todo = issues.filter(issue => 
    ['To Do', 'Open', 'New', 'Backlog'].includes(issue.status)
  );
  
  return { completed, inProgress, todo };
}

// Calculate velocity (simple throughput)
function calculateVelocity(completedIssues, weeksBack) {
  const velocity = Math.round(completedIssues.length / weeksBack);
  const trend = velocity > 10 ? 'High' : velocity > 5 ? 'Moderate' : 'Low';
  
  return { velocity, trend, period: weeksBack };
}

// Generate markdown report
function generateMarkdownReport(issues, categories, velocity) {
  const today = new Date();
  const weekStart = new Date();
  weekStart.setDate(today.getDate() - 7);
  
  const report = `# Weekly Team Report: ${formatDate(weekStart.toISOString())} - ${formatDate(today.toISOString())}

## 1.0 Team Performance Metrics

### 1.1 Team Velocity
- **Average Velocity**: ${velocity.velocity} items per ${velocity.period} week${velocity.period > 1 ? 's' : ''}
- **Velocity Trend**: ${velocity.trend}
- **Reporting Period**: ${formatDate(getDateString(config.report.weeksBack * 7))} to ${formatDate(getDateString())}

### 1.2 Issue Summary
- **Total Issues**: ${issues.length}
- **Completed**: ${categories.completed.length} issues
- **In Progress**: ${categories.inProgress.length} issues  
- **To Do**: ${categories.todo.length} issues

## 2.0 Key Activities and Accomplishments

### 2.1 Completed Work (${categories.completed.length} items)
${categories.completed.length > 0 ? 
  categories.completed.map(issue => 
    `- [${issue.key}](${issue.url}) - ${issue.summary}\n  *${issue.issuetype} | ${issue.assignee} | ${formatDate(issue.updated)}*`
  ).join('\n') : 
  '- No completed work in this reporting period'
}

### 2.2 Work In Progress (${categories.inProgress.length} items)
${categories.inProgress.length > 0 ? 
  categories.inProgress.map(issue => 
    `- [${issue.key}](${issue.url}) - ${issue.summary}\n  *${issue.issuetype} | ${issue.assignee} | Status: ${issue.status}*`
  ).join('\n') : 
  '- No work currently in progress'
}

## 3.0 Upcoming Work

### 3.1 Backlog Items (${categories.todo.length} items)
${categories.todo.length > 0 ? 
  categories.todo.slice(0, 10).map(issue => 
    `- [${issue.key}](${issue.url}) - ${issue.summary}\n  *${issue.issuetype} | ${issue.assignee || 'Unassigned'} | Priority: ${issue.priority}*`
  ).join('\n') + (categories.todo.length > 10 ? '\n- *... and ' + (categories.todo.length - 10) + ' more items*' : '') : 
  '- No items in backlog'
}

## 4.0 Team Insights

### 4.1 Issue Types Breakdown
${getIssueTypeBreakdown(issues)}

### 4.2 Team Distribution
${getAssigneeBreakdown(issues)}

---

*Report generated on ${formatDate(today.toISOString())} using Jira Status Builder*
*Project: ${config.jira.projectKeys} | Period: ${config.report.weeksBack} week${config.report.weeksBack > 1 ? 's' : ''}*
`;

  return report;
}

function getIssueTypeBreakdown(issues) {
  const typeCount = {};
  issues.forEach(issue => {
    typeCount[issue.issuetype] = (typeCount[issue.issuetype] || 0) + 1;
  });
  
  return Object.entries(typeCount)
    .sort(([,a], [,b]) => b - a)
    .map(([type, count]) => `- **${type}**: ${count} issues`)
    .join('\n');
}

function getAssigneeBreakdown(issues) {
  const assigneeCount = {};
  issues.forEach(issue => {
    assigneeCount[issue.assignee] = (assigneeCount[issue.assignee] || 0) + 1;
  });
  
  return Object.entries(assigneeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([assignee, count]) => `- **${assignee}**: ${count} issues`)
    .join('\n');
}

// Save report
function saveReport(content, filename) {
  // Create reports directory if it doesn't exist
  if (!existsSync('reports')) {
    mkdirSync('reports');
  }
  if (!existsSync('reports/markdown')) {
    mkdirSync('reports/markdown');
  }
  
  const filepath = `reports/markdown/${filename}`;
  writeFileSync(filepath, content);
  console.log(`📄 Report saved to: ${filepath}`);
  return filepath;
}

// Export data
function exportData(issues, filename) {
  // Create data directory if it doesn't exist
  if (!existsSync('data')) {
    mkdirSync('data');
  }
  
  // Export JSON
  const jsonFilepath = `data/${filename}.json`;
  writeFileSync(jsonFilepath, JSON.stringify(issues, null, 2));
  console.log(`📊 Data exported to: ${jsonFilepath}`);
  
  // Export CSV
  const csvContent = [
    'Key,Summary,Status,Assignee,Type,Priority,Updated,URL',
    ...issues.map(issue => [
      issue.key,
      `"${issue.summary.replace(/"/g, '""')}"`,
      issue.status,
      issue.assignee,
      issue.issuetype,
      issue.priority,
      issue.updated.split('T')[0],
      issue.url
    ].join(','))
  ].join('\n');
  
  const csvFilepath = `data/${filename}.csv`;
  writeFileSync(csvFilepath, csvContent);
  console.log(`📈 CSV exported to: ${csvFilepath}`);
}

// Main execution
async function main() {
  try {
    // Fetch issues
    const issues = await fetchIssues();
    
    if (issues.length === 0) {
      console.log('⚠️  No issues found for the specified criteria');
      console.log('Try adjusting the date range or project settings in .env');
      return;
    }
    
    // Categorize issues
    const categories = categorizeIssues(issues);
    console.log('📊 Issue Categories:');
    console.log(`   Completed: ${categories.completed.length}`);
    console.log(`   In Progress: ${categories.inProgress.length}`);
    console.log(`   To Do: ${categories.todo.length}\n`);
    
    // Calculate velocity
    const velocity = calculateVelocity(categories.completed, config.report.weeksBack);
    console.log(`⚡ Team Velocity: ${velocity.velocity} items per ${velocity.period} week${velocity.period > 1 ? 's' : ''} (${velocity.trend})\n`);
    
    // Generate report
    console.log('📝 Generating report...');
    const report = generateMarkdownReport(issues, categories, velocity);
    
    // Save report with timestamp
    const timestamp = getDateString();
    const filename = `executive-report-${config.jira.projectKeys}-${timestamp}.md`;
    const filepath = saveReport(report, filename);
    
    // Export data
    const dataFilename = `jira-export-${config.jira.projectKeys}-${timestamp}`;
    exportData(issues, dataFilename);
    
    console.log('\n🎉 Report Generation Complete!');
    console.log('================================');
    console.log(`📄 Markdown Report: ${filepath}`);
    console.log(`📊 JSON Data: data/${dataFilename}.json`);
    console.log(`📈 CSV Data: data/${dataFilename}.csv`);
    console.log('\n💡 Next Steps:');
    console.log('- Review the generated report');
    console.log('- Add manual team input with: npm run input (after npm install)');
    console.log('- Generate HTML format for sharing');
    
  } catch (error) {
    console.error('\n❌ Report generation failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Check your API token is valid');
    console.log('- Verify project access permissions');
    console.log('- Ensure network connectivity to Red Hat Jira');
  }
}

// Run the main function
main();