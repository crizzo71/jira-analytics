#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { DashboardGenerator } from './dashboard-generator.js';

/**
 * Jira Analytics Dashboard CLI
 * Command-line interface for generating analytics dashboards
 */
class DashboardCLI {
  constructor() {
    this.generator = new DashboardGenerator();
  }

  async generateReport(options = {}) {
    const {
      format = 'all',
      output = 'dashboards',
      period = 7,
      boards = null,
      team = null
    } = options;

    console.log('📊 JIRA ANALYTICS DASHBOARD GENERATOR');
    console.log('=' .repeat(50));
    console.log(`📅 Analysis Period: Last ${period} days`);
    console.log(`📁 Output Directory: ${output}`);
    console.log(`📋 Format: ${format}`);
    console.log('');

    try {
      // Generate dashboard data
      console.log('🔄 Generating analytics data...');
      const data = await this.generator.generateDashboardData();

      // Ensure output directory exists
      if (!fs.existsSync(output)) {
        fs.mkdirSync(output, { recursive: true });
      }

      // Generate requested formats
      if (format === 'all' || format === 'html') {
        await this.generateHTMLReport(data, output);
      }

      if (format === 'all' || format === 'markdown') {
        await this.generateMarkdownReport(data, output);
      }

      if (format === 'all' || format === 'json') {
        await this.generateJSONReport(data, output);
      }

      if (format === 'all' || format === 'csv') {
        await this.generateCSVReport(data, output);
      }

      console.log('\\n✅ Dashboard generation completed!');
      console.log(`📁 Reports saved to: ${output}/`);

    } catch (error) {
      console.error('❌ Dashboard generation failed:', error.message);
      process.exit(1);
    }
  }

  async generateHTMLReport(data, outputDir) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics-dashboard-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Jira Analytics Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .chart-container { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Jira Analytics Dashboard</h1>
        <p>Generated on ${data.timestamp}</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-number">${data.metrics.velocity.current}</div>
            <div>Current Velocity</div>
        </div>
        <div class="metric-card">
            <div class="metric-number">${data.metrics.throughput.daily}</div>
            <div>Daily Throughput</div>
        </div>
        <div class="metric-card">
            <div class="metric-number">${data.metrics.burndown.completion}%</div>
            <div>Sprint Completion</div>
        </div>
    </div>
    
    <div class="chart-container">
        <h3>📈 Velocity Trend</h3>
        <p>Chart data: ${JSON.stringify(data.charts.velocity)}</p>
    </div>
    
    <div class="chart-container">
        <h3>👥 Top Contributors</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f8f9fa;">
                <th style="padding: 10px; border: 1px solid #dee2e6;">Name</th>
                <th style="padding: 10px; border: 1px solid #dee2e6;">Completed</th>
                <th style="padding: 10px; border: 1px solid #dee2e6;">In Progress</th>
            </tr>
            ${data.tables.topContributors.map(contributor => `
            <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${contributor.name}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${contributor.completed}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${contributor.inProgress}</td>
            </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>`;

    fs.writeFileSync(filepath, html);
    console.log(`📄 HTML report: ${filename}`);
  }

  async generateMarkdownReport(data, outputDir) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics-report-${timestamp}.md`;
    const filepath = path.join(outputDir, filename);

    const markdown = `# 📊 Jira Analytics Dashboard

Generated on ${data.timestamp}

## 📈 Key Metrics

- **Current Velocity**: ${data.metrics.velocity.current} (${data.metrics.velocity.trend})
- **Daily Throughput**: ${data.metrics.throughput.daily}
- **Sprint Completion**: ${data.metrics.burndown.completion}%

## 👥 Top Contributors

| Name | Completed | In Progress |
|------|-----------|-------------|
${data.tables.topContributors.map(c => `| ${c.name} | ${c.completed} | ${c.inProgress} |`).join('\\n')}

## 📊 Issue Types

| Type | Count | Percentage |
|------|-------|------------|
${data.tables.issueTypes.map(t => `| ${t.type} | ${t.count} | ${t.percentage}% |`).join('\\n')}
`;

    fs.writeFileSync(filepath, markdown);
    console.log(`📄 Markdown report: ${filename}`);
  }

  async generateJSONReport(data, outputDir) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics-data-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`📄 JSON data: ${filename}`);
  }

  async generateCSVReport(data, outputDir) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics-export-${timestamp}.csv`;
    const filepath = path.join(outputDir, filename);

    const csv = [
      'Type,Name,Completed,InProgress',
      ...data.tables.topContributors.map(c => `Contributor,"${c.name}",${c.completed},${c.inProgress}`),
      ...data.tables.issueTypes.map(t => `IssueType,"${t.type}",${t.count},${t.percentage}`)
    ].join('\\n');

    fs.writeFileSync(filepath, csv);
    console.log(`📄 CSV export: ${filename}`);
  }

  parseArguments() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    const options = {};
    args.forEach(arg => {
      if (arg.startsWith('--format=')) {
        options.format = arg.split('=')[1];
      }
      if (arg.startsWith('--output=')) {
        options.output = arg.split('=')[1];
      }
      if (arg.startsWith('--period=')) {
        options.period = parseInt(arg.split('=')[1]);
      }
    });

    return { command, options };
  }

  showHelp() {
    console.log(`
📊 Jira Analytics Dashboard CLI
===============================

USAGE:
  dashboard-cli <command> [options]

COMMANDS:
  generate     Generate analytics dashboard reports
  help         Show this help message

OPTIONS:
  --format=<format>   Output format: html, markdown, json, csv, all (default: all)
  --output=<dir>      Output directory (default: dashboards)
  --period=<days>     Analysis period in days (default: 7)

EXAMPLES:
  dashboard-cli generate --format=html
  dashboard-cli generate --format=all --output=reports
  dashboard-cli generate --period=30 --format=json
`);
  }

  async run() {
    const { command, options } = this.parseArguments();

    switch (command) {
      case 'generate':
        await this.generateReport(options);
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new DashboardCLI();
  cli.run().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { DashboardCLI };