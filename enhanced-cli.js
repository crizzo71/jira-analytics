#!/usr/bin/env node

import { JiraEnhancedClient } from './jira-enhanced-client.js';
import { ReportGenerator } from './report-generator.js';
import { ManualInputCollector } from './manual-input.js';
import { ProjectSelector } from './project-selector.js';
import { config } from './config.js';
import { readFileSync, existsSync } from 'fs';

/**
 * Enhanced CLI with jira-cli usage patterns
 * Based on: https://github.com/ciaranRoche/claude-workflow/blob/main/.claude/context/jira-cli-usage.md
 */

// Utility function for date handling
const moment = (date) => {
  const d = date ? new Date(date) : new Date();
  return {
    format: (fmt) => {
      if (fmt === 'YYYY-MM-DD') return d.toISOString().split('T')[0];
      if (fmt === 'YYYY-MM-DD HH:mm:ss') return d.toISOString().replace('T', ' ').split('.')[0];
      if (fmt === 'MMM DD') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (fmt === 'MMM DD, YYYY') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return d.toISOString();
    },
    subtract: (num, unit) => {
      const newD = new Date(d);
      if (unit === 'weeks') newD.setDate(newD.getDate() - (num * 7));
      return moment(newD);
    }
  };
};

class EnhancedJiraCLI {
  constructor() {
    this.jiraClient = new JiraEnhancedClient();
    this.reportGenerator = new ReportGenerator();
    this.inputCollector = new ManualInputCollector();
    this.projectSelector = new ProjectSelector(this.jiraClient);
  }

  async parseArguments() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    // Parse flags
    const flags = {
      format: this.extractFlag(args, '--format') || 'markdown',
      raw: args.includes('--raw'),
      plain: args.includes('--plain'),
      noInput: args.includes('--no-input'),
      help: args.includes('--help') || args.includes('-h')
    };
    
    return { command, args: args.slice(1), flags };
  }

  extractFlag(args, flagName) {
    const flagIndex = args.findIndex(arg => arg.startsWith(flagName));
    if (flagIndex === -1) return null;
    
    const flagArg = args[flagIndex];
    if (flagArg.includes('=')) {
      return flagArg.split('=')[1];
    }
    
    return args[flagIndex + 1];
  }

  async run() {
    try {
      const { command, args, flags } = await this.parseArguments();
      
      if (flags.help) {
        this.showHelp(command);
        return;
      }
      
      switch (command) {
        case 'report':
          await this.generateReport(flags);
          break;
          
        case 'security':
          await this.trackSecurityVulnerabilities(args, flags);
          break;
          
        case 'assign':
          await this.bulkAssignIssues(args, flags);
          break;
          
        case 'comment':
          await this.addCommentToIssues(args, flags);
          break;
          
        case 'label':
          await this.manageLabels(args, flags);
          break;
          
        case 'link':
          await this.linkIssues(args, flags);
          break;
          
        case 'transition':
          await this.transitionIssues(args, flags);
          break;
          
        case 'export':
          await this.exportIssues(args, flags);
          break;
          
        case 'query':
          await this.executeCustomQuery(args, flags);
          break;
          
        case 'select':
          await this.selectProject(flags);
          break;
          
        case 'input':
          await this.collectManualInput(flags);
          break;
          
        case 'init':
          await this.initializeJiraCli(flags);
          break;
          
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async generateReport(flags) {
    console.log('🚀 Enhanced Jira Executive Report Generator');
    console.log('==========================================\\n');
    
    // Load project selection
    const selection = this.loadProjectSelection();
    if (!selection) {
      console.log('No project selected. Run "enhanced-cli select" first.');
      return;
    }
    
    // Set up client with selection
    this.jiraClient.selectedProject = selection.project;
    this.jiraClient.selectedBoards = selection.boards;
    
    // Generate reports in requested format(s)
    const formats = flags.format === 'all' ? ['markdown', 'html', 'text'] : [flags.format];
    
    for (const format of formats) {
      await this.generateExecutiveReport(selection.project, selection.boards, format);
    }
  }

  async trackSecurityVulnerabilities(args, flags) {
    console.log('🔒 Security Vulnerability Tracking');
    console.log('=================================\\n');
    
    const [type, value, projectKey] = args;
    const options = { 
      format: flags.raw ? 'raw' : 'json',
      projectKey: projectKey || 'OCM'
    };
    
    let results;
    
    switch (type) {
      case 'cve':
        if (!value) {
          console.error('CVE ID required. Usage: enhanced-cli security cve CVE-2023-1234 [PROJECT]');
          return;
        }
        options.cveId = value;
        results = await this.jiraClient.trackSecurityVulnerabilities(options);
        console.log(`🔍 Found ${results.length} issues for CVE ${value}`);
        break;
        
      case 'software':
        if (!value) {
          console.error('Software name required. Usage: enhanced-cli security software "Apache" [PROJECT]');
          return;
        }
        options.softwareName = value;
        results = await this.jiraClient.trackSecurityVulnerabilities(options);
        console.log(`🔍 Found ${results.length} issues for software ${value}`);
        break;
        
      case 'all':
      default:
        results = await this.jiraClient.trackSecurityVulnerabilities(options);
        console.log(`🔍 Found ${results.length} security-related issues`);
        break;
    }
    
    if (flags.plain) {
      this.printPlainResults(results);
    } else if (flags.raw) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      this.printFormattedResults(results);
    }
  }

  async bulkAssignIssues(args, flags) {
    const [issueKeys, assignee] = args;
    
    if (!issueKeys) {
      console.error('Issue keys required. Usage: enhanced-cli assign "ISSUE-1,ISSUE-2" [assignee]');
      return;
    }
    
    const keys = issueKeys.split(',').map(k => k.trim());
    const targetAssignee = assignee === 'x' ? null : assignee; // jira-cli pattern: 'x' = unassign
    
    console.log(`👥 Bulk assigning ${keys.length} issues to ${targetAssignee || 'unassigned'}`);
    
    const results = await this.jiraClient.bulkAssignIssues(keys, targetAssignee);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\\n✓ Successfully assigned: ${successful}`);
    if (failed > 0) {
      console.log(`✗ Failed assignments: ${failed}`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`  ${r.issueKey}: ${r.error}`);
      });
    }
  }

  async addCommentToIssues(args, flags) {
    const [issueKeys, comment] = args;
    
    if (!issueKeys || !comment) {
      console.error('Usage: enhanced-cli comment "ISSUE-1,ISSUE-2" "Your comment here"');
      return;
    }
    
    const keys = issueKeys.split(',').map(k => k.trim());
    const isMarkdown = !flags.plain;
    const isMultiline = comment.includes('\\n');
    
    console.log(`💬 Adding comments to ${keys.length} issues`);
    
    for (const key of keys) {
      try {
        await this.jiraClient.addEnhancedComment(key, comment, {
          isMarkdown,
          isMultiline
        });
      } catch (error) {
        console.error(`Failed to comment on ${key}: ${error.message}`);
      }
    }
  }

  async manageLabels(args, flags) {
    const [issueKeys, operation, ...labels] = args;
    
    if (!issueKeys || !operation || labels.length === 0) {
      console.error('Usage: enhanced-cli label "ISSUE-1,ISSUE-2" add|remove "label1,label2"');
      return;
    }
    
    const keys = issueKeys.split(',').map(k => k.trim());
    const labelList = labels.join(' ').split(',').map(l => l.trim());
    
    const options = operation === 'add' ? 
      { addLabels: labelList } : 
      { removeLabels: labelList };
    
    console.log(`🏷️  ${operation === 'add' ? 'Adding' : 'Removing'} labels: ${labelList.join(', ')}`);
    
    for (const key of keys) {
      try {
        await this.jiraClient.updateIssueLabelsAndComponents(key, options);
      } catch (error) {
        console.error(`Failed to update labels for ${key}: ${error.message}`);
      }
    }
  }

  async linkIssues(args, flags) {
    const [fromIssue, linkType, toIssue] = args;
    
    if (!fromIssue || !linkType || !toIssue) {
      console.error('Usage: enhanced-cli link ISSUE-1 "blocks" ISSUE-2');
      console.error('Available link types:', this.jiraClient.linkTypes.join(', '));
      return;
    }
    
    console.log(`🔗 Linking ${fromIssue} ${linkType} ${toIssue}`);
    
    await this.jiraClient.linkIssues(fromIssue, toIssue, linkType);
  }

  async transitionIssues(args, flags) {
    const [issueKeys, newStatus, resolution] = args;
    
    if (!issueKeys || !newStatus) {
      console.error('Usage: enhanced-cli transition "ISSUE-1,ISSUE-2" "Done" [resolution]');
      console.error('Available resolutions:', this.jiraClient.resolutions.join(', '));
      return;
    }
    
    const keys = issueKeys.split(',').map(k => k.trim());
    
    console.log(`🔄 Transitioning ${keys.length} issues to ${newStatus}${resolution ? ` with resolution ${resolution}` : ''}`);
    
    for (const key of keys) {
      try {
        await this.jiraClient.transitionIssue(key, newStatus, resolution);
      } catch (error) {
        console.error(`Failed to transition ${key}: ${error.message}`);
      }
    }
  }

  async exportIssues(args, flags) {
    const [jql, ...formatsList] = args;
    
    if (!jql) {
      console.error('Usage: enhanced-cli export "project=OCM" [json,csv,plain]');
      return;
    }
    
    const formats = formatsList.length > 0 ? 
      formatsList.join(' ').split(',').map(f => f.trim()) : 
      ['json'];
    
    console.log(`📤 Exporting issues with JQL: ${jql}`);
    console.log(`📄 Formats: ${formats.join(', ')}`);
    
    const results = await this.jiraClient.exportIssues(jql, formats);
    
    console.log('\\n📁 Export Results:');
    Object.entries(results).forEach(([format, result]) => {
      if (typeof result === 'string') {
        console.log(`  ${format}: ${result}`);
      } else {
        console.log(`  ${format}: ERROR - ${result.error}`);
      }
    });
  }

  async executeCustomQuery(args, flags) {
    const jql = args.join(' ');
    
    if (!jql) {
      console.error('Usage: enhanced-cli query "project=OCM AND status=\\"To Do\\""');
      return;
    }
    
    console.log(`🔍 Executing JQL: ${jql}`);
    
    const options = {
      format: flags.raw ? 'raw' : (flags.plain ? 'plain' : 'json'),
      useRawOutput: flags.raw,
      usePlainText: flags.plain
    };
    
    const results = await this.jiraClient.executeEnhancedQuery(jql, options);
    
    if (flags.raw || flags.plain) {
      console.log(results);
    } else {
      console.log(`\\n📊 Found ${results.length} issues`);
      this.printFormattedResults(results);
    }
  }

  async selectProject(flags) {
    console.log('📋 Project and Board Selection');
    console.log('============================\\n');
    
    const quickSelection = await this.projectSelector.quickSelectFromConfig();
    if (quickSelection) {
      console.log('✓ Project selection loaded from saved configuration');
      return;
    }
    
    await this.projectSelector.selectProject();
  }

  async collectManualInput(flags) {
    console.log('📝 Manual Input Collection');
    console.log('=========================\\n');
    
    await this.inputCollector.collectInput();
  }

  async initializeJiraCli(flags) {
    console.log('⚙️  Jira CLI Initialization');
    console.log('==========================\\n');
    
    // Check configuration
    if (!config.jira.apiToken) {
      console.error('JIRA_API_TOKEN not found in environment');
      console.log('\\n🔧 Setup Instructions:');
      console.log('1. Visit https://issues.redhat.com');
      console.log('2. Go to Account Settings → Security → API Tokens');
      console.log('3. Create new token and add to .env file');
      console.log('4. Set JIRA_API_TOKEN=your_token_here');
      return;
    }
    
    // Test API connectivity
    try {
      const testUrl = `${config.jira.baseUrl}/rest/api/2/myself`;
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log(`✓ API connection successful`);
        console.log(`✓ Authenticated as: ${user.displayName} (${user.emailAddress})`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`✗ API connection failed: ${error.message}`);
    }
  }

  // Helper methods
  loadProjectSelection() {
    try {
      if (existsSync('project-selection.json')) {
        return JSON.parse(readFileSync('project-selection.json', 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load project selection:', error.message);
    }
    return null;
  }

  printFormattedResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      console.log('No results found.');
      return;
    }
    
    console.log('\\n📋 Results:');
    console.log('━'.repeat(80));
    
    results.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.key}] ${issue.summary}`);
      console.log(`   Status: ${issue.status} | Assignee: ${issue.assignee || 'Unassigned'}`);
      console.log(`   URL: ${issue.url}`);
      if (index < results.length - 1) console.log('');
    });
  }

  printPlainResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      console.log('No results found.');
      return;
    }
    
    results.forEach(issue => {
      console.log([
        issue.key,
        issue.summary,
        issue.status,
        issue.assignee || '',
        issue.updated ? new Date(issue.updated).toISOString().split('T')[0] : '',
        issue.priority || ''
      ].join('\\t'));
    });
  }

  showHelp(command = null) {
    if (command) {
      this.showCommandHelp(command);
      return;
    }
    
    console.log(`
🚀 Enhanced Jira CLI - Executive Report Generator
===============================================

Based on jira-cli usage patterns from:
https://github.com/ciaranRoche/claude-workflow/blob/main/.claude/context/jira-cli-usage.md

USAGE:
  enhanced-cli <command> [arguments] [flags]

COMMANDS:
  report              Generate executive reports (original functionality)
  security            Track security vulnerabilities and CVEs
  assign              Bulk assign issues to users
  comment             Add comments to multiple issues
  label               Manage issue labels and components
  link                Link issues with relationships
  transition          Move issues through workflow states
  export              Export issues in multiple formats
  query               Execute custom JQL queries
  select              Interactive project/board selection
  input               Collect manual team input
  init                Initialize and test Jira CLI connection
  help                Show this help message

GLOBAL FLAGS:
  --format=<format>   Output format: markdown, html, text, json, raw, plain, all
  --raw               Output raw JSON (equivalent to jira-cli --raw)
  --plain             Output plain text (equivalent to jira-cli --plain)
  --no-input          Disable interactive prompts (equivalent to jira-cli --no-input)
  --help, -h          Show help for specific command

EXAMPLES:
  enhanced-cli report --format=all
  enhanced-cli security cve CVE-2023-1234 OCM
  enhanced-cli assign "OCM-1,OCM-2" "john.doe"
  enhanced-cli assign "OCM-1,OCM-2" x  # Unassign (jira-cli pattern)
  enhanced-cli query "project=OCM AND status='To Do'" --plain
  enhanced-cli export "project=OCM" json,csv,plain

For detailed help on any command:
  enhanced-cli <command> --help
`);
  }

  showCommandHelp(command) {
    const helpText = {
      security: `
🔒 Security Vulnerability Tracking

USAGE:
  enhanced-cli security <type> [value] [project] [flags]

TYPES:
  cve <cve-id>        Track specific CVE (e.g., CVE-2023-1234)
  software <name>     Track vulnerabilities for software
  all                 List all security-related issues

EXAMPLES:
  enhanced-cli security cve CVE-2023-1234 OCM
  enhanced-cli security software "Apache" OCM --raw
  enhanced-cli security all --plain
`,
      assign: `
👥 Bulk Issue Assignment

USAGE:
  enhanced-cli assign <issue-keys> [assignee] [flags]

ARGUMENTS:
  issue-keys          Comma-separated list of issue keys
  assignee            Username or 'x' to unassign (jira-cli pattern)

EXAMPLES:
  enhanced-cli assign "OCM-1,OCM-2" "john.doe"
  enhanced-cli assign "OCM-1,OCM-2" x  # Unassign
`,
      export: `
📤 Issue Export

USAGE:
  enhanced-cli export <jql> [formats] [flags]

FORMATS:
  json                Standard JSON format (default)
  csv                 Comma-separated values
  plain               Plain text (jira-cli --plain equivalent)
  raw                 Raw Jira API response

EXAMPLES:
  enhanced-cli export "project=OCM" json,csv
  enhanced-cli export "status='To Do'" plain
`
    };
    
    console.log(helpText[command] || `No specific help available for '${command}'. Use 'enhanced-cli help' for general help.`);
  }

  async generateExecutiveReport(project, boards, format) {
    // This would integrate with your existing report generation logic
    // For now, just indicate the enhanced capability
    console.log(`📊 Generating ${format} report for ${project.key}...`);
    // ... existing report generation logic would go here
  }
}

// Run the enhanced CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new EnhancedJiraCLI();
  cli.run().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { EnhancedJiraCLI };