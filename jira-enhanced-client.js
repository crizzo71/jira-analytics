import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { config } from './config.js';

/**
 * Enhanced Jira Client combining REST API and CLI best practices
 * Integrates patterns from: https://github.com/ciaranRoche/claude-workflow/blob/main/.claude/context/jira-cli-usage.md
 */
export class JiraEnhancedClient {
  constructor() {
    this.checkJiraCliInstalled();
    this.selectedProject = null;
    this.selectedBoard = null;
    this.requestDelay = 250; // 250ms delay between requests to avoid rate limiting
    
    // CLI flags for different output modes
    this.cliFlags = {
      automation: '--no-input', // Disable interactive mode for automation
      rawJson: '--raw',         // Output raw JSON instead of formatted results
      plainText: '--plain',     // Output plain text format (useful for saving to files)
      noHeaders: '--no-headers', // Remove headers from table output
      noTruncate: '--no-truncate' // Don't truncate long content
    };
    
    // Security vulnerability tracking patterns
    this.vulnerabilityPatterns = {
      cveTracking: (cveId, projectKey = 'OCM') => 
        `project=${projectKey} AND (issuetype="Vulnerability" OR (issuetype="Bug" and labels="SecurityTracking")) AND (summary~"${cveId}" OR summary~"${cveId.replace('CVE-', '')}")`,
      securityBugs: (projectKey = 'OCM') =>
        `project=${projectKey} AND (issuetype="Vulnerability" OR (issuetype="Bug" and labels="SecurityTracking"))`,
      softwareVulns: (softwareName, projectKey = 'OCM') =>
        `project=${projectKey} AND (issuetype="Vulnerability" OR (issuetype="Bug" and labels="SecurityTracking")) AND summary~"${softwareName}"`
    };
    
    // Issue resolution values from jira-cli documentation
    this.resolutions = [
      'Done', 'Fixed', 'Won\'t Fix', 'Duplicate', 'Incomplete',
      'Cannot Reproduce', 'Won\'t Do', 'Rejected', 'Not a Bug', 'Obsolete'
    ];
    
    // Issue link types from jira-cli documentation
    this.linkTypes = [
      'blocks', 'is blocked by', 'clones', 'is cloned by',
      'duplicates', 'is duplicated by', 'relates to',
      'causes', 'is caused by', 'child-issue', 'parent-issue', 'epic'
    ];
  }

  async delay(ms = this.requestDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  checkJiraCliInstalled() {
    try {
      execSync('jira version', { encoding: 'utf8', stdio: 'pipe' });
      console.log('✓ Jira CLI is installed');
    } catch (error) {
      console.warn('⚠ Jira CLI not found. Using REST API only.');
    }
  }

  /**
   * Enhanced JQL query execution with CLI best practices
   */
  async executeEnhancedQuery(jql, options = {}) {
    const {
      format = 'json',
      useRawOutput = false,
      usePlainText = false,
      maxResults = 100,
      fields = 'key,summary,status,assignee,updated,created,priority,resolution,issuetype,issuelinks,parent,customfield_12311140,epic'
    } = options;

    // Always prefer REST API for reliability, but use CLI patterns for formatting
    try {
      if (useRawOutput || format === 'raw') {
        return await this.executeRawQuery(jql, { maxResults, fields });
      }
      
      if (usePlainText || format === 'plain') {
        return await this.executePlainTextQuery(jql, { maxResults, fields });
      }
      
      return await this.executeDirectApiQuery(jql, { maxResults, fields });
    } catch (error) {
      console.error('Enhanced query execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute query and return raw JSON (equivalent to --raw flag)
   */
  async executeRawQuery(jql, options = {}) {
    const { maxResults = 100, fields } = options;
    
    try {
      const url = `${config.jira.baseUrl}/rest/api/2/search`;
      const params = new URLSearchParams({
        jql: jql,
        fields: fields,
        maxResults: maxResults.toString()
      });
      
      await this.delay();
      
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
      
      return await response.json(); // Return raw Jira API response
    } catch (error) {
      console.error('Raw query execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute query and return plain text format (equivalent to --plain flag)
   */
  async executePlainTextQuery(jql, options = {}) {
    const issues = await this.executeDirectApiQuery(jql, options);
    
    // Convert to plain text format similar to jira-cli --plain output
    let plainText = 'KEY\tSUMMARY\tSTATUS\tASSIGNEE\tUPDATED\tCREATED\tPRIORITY\tRESOLUTION\n';
    
    issues.forEach(issue => {
      plainText += [
        issue.key,
        issue.summary?.replace(/\t/g, ' ') || '',
        issue.status || '',
        issue.assignee || '',
        issue.updated ? new Date(issue.updated).toISOString().split('T')[0] : '',
        issue.created ? new Date(issue.created).toISOString().split('T')[0] : '',
        issue.priority || '',
        issue.resolution || ''
      ].join('\t') + '\n';
    });
    
    return plainText;
  }

  /**
   * Enhanced vulnerability tracking queries
   */
  async trackSecurityVulnerabilities(options = {}) {
    const {
      cveId,
      softwareName,
      projectKey = 'OCM',
      format = 'json'
    } = options;

    let jql;
    
    if (cveId) {
      jql = this.vulnerabilityPatterns.cveTracking(cveId, projectKey);
    } else if (softwareName) {
      jql = this.vulnerabilityPatterns.softwareVulns(softwareName, projectKey);
    } else {
      jql = this.vulnerabilityPatterns.securityBugs(projectKey);
    }

    console.log(`🔍 Tracking security vulnerabilities with: ${jql}`);
    return await this.executeEnhancedQuery(jql, { format });
  }

  /**
   * Bulk issue assignment with CLI patterns
   */
  async bulkAssignIssues(issueKeys, assignee = null) {
    const results = [];
    
    for (const issueKey of issueKeys) {
      try {
        await this.delay(); // Rate limiting
        
        // Use 'x' as placeholder for unassignment (jira-cli pattern)
        const assigneeValue = assignee === null || assignee === 'x' ? null : assignee;
        
        const result = await this.assignIssue(issueKey, assigneeValue);
        results.push({ issueKey, success: true, result });
        
        console.log(`✓ ${issueKey} assigned to ${assigneeValue || 'unassigned'}`);
      } catch (error) {
        results.push({ issueKey, success: false, error: error.message });
        console.error(`✗ Failed to assign ${issueKey}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Enhanced label and component management
   */
  async updateIssueLabelsAndComponents(issueKey, options = {}) {
    const { addLabels = [], removeLabels = [], addComponents = [], removeComponents = [] } = options;
    
    try {
      // Get current issue to retrieve existing labels and components
      const issue = await this.getIssueDetails(issueKey);
      const currentLabels = issue.fields.labels || [];
      const currentComponents = (issue.fields.components || []).map(c => c.name);
      
      // Calculate new labels (add new, remove specified)
      const newLabels = [...currentLabels, ...addLabels]
        .filter(label => !removeLabels.includes(label))
        .filter((label, index, arr) => arr.indexOf(label) === index); // deduplicate
      
      // Calculate new components (add new, remove specified)
      const newComponents = [...currentComponents, ...addComponents]
        .filter(component => !removeComponents.includes(component))
        .filter((component, index, arr) => arr.indexOf(component) === index); // deduplicate
      
      // Update issue
      const updateData = {
        fields: {
          labels: newLabels,
          components: newComponents.map(name => ({ name }))
        }
      };
      
      await this.updateIssue(issueKey, updateData);
      
      console.log(`✓ Updated ${issueKey}: labels=${newLabels.join(',')}, components=${newComponents.join(',')}`);
      return { success: true, labels: newLabels, components: newComponents };
      
    } catch (error) {
      console.error(`✗ Failed to update labels/components for ${issueKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enhanced comment management with markdown support
   */
  async addEnhancedComment(issueKey, comment, options = {}) {
    const { 
      isMarkdown = true,
      isMultiline = false,
      visibility = null // For restricted comments
    } = options;
    
    try {
      let formattedComment = comment;
      
      // Handle multiline comments (preserve line breaks)
      if (isMultiline) {
        formattedComment = comment.replace(/\\n/g, '\n');
      }
      
      // For Jira Cloud, markdown is supported in comments
      const commentData = {
        body: formattedComment
      };
      
      // Add visibility restrictions if specified
      if (visibility) {
        commentData.visibility = visibility;
      }
      
      const url = `${config.jira.baseUrl}/rest/api/2/issue/${issueKey}/comment`;
      
      await this.delay();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`✓ Added comment to ${issueKey}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to add comment to ${issueKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Issue linking with relationship types
   */
  async linkIssues(fromIssue, toIssue, linkType) {
    if (!this.linkTypes.includes(linkType)) {
      throw new Error(`Invalid link type: ${linkType}. Valid types: ${this.linkTypes.join(', ')}`);
    }
    
    try {
      const linkData = {
        type: { name: linkType },
        inwardIssue: { key: fromIssue },
        outwardIssue: { key: toIssue }
      };
      
      const url = `${config.jira.baseUrl}/rest/api/2/issueLink`;
      
      await this.delay();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(linkData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✓ Linked ${fromIssue} ${linkType} ${toIssue}`);
      return true;
      
    } catch (error) {
      console.error(`✗ Failed to link issues: ${error.message}`);
      throw error;
    }
  }

  /**
   * Workflow state management
   */
  async transitionIssue(issueKey, newStatus, resolution = null) {
    try {
      // Get available transitions for the issue
      const transitionsUrl = `${config.jira.baseUrl}/rest/api/2/issue/${issueKey}/transitions`;
      
      await this.delay();
      
      const transitionsResponse = await fetch(transitionsUrl, {
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!transitionsResponse.ok) {
        throw new Error(`Failed to get transitions: HTTP ${transitionsResponse.status}`);
      }
      
      const transitionsData = await transitionsResponse.json();
      const transition = transitionsData.transitions.find(t => 
        t.to.name.toLowerCase() === newStatus.toLowerCase()
      );
      
      if (!transition) {
        throw new Error(`No transition available to status: ${newStatus}. Available: ${transitionsData.transitions.map(t => t.to.name).join(', ')}`);
      }
      
      // Prepare transition data
      const transitionData = {
        transition: { id: transition.id }
      };
      
      // Add resolution if provided and valid
      if (resolution && this.resolutions.includes(resolution)) {
        transitionData.fields = {
          resolution: { name: resolution }
        };
      }
      
      // Execute transition
      const response = await fetch(transitionsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transitionData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✓ Transitioned ${issueKey} to ${newStatus}${resolution ? ` with resolution ${resolution}` : ''}`);
      return true;
      
    } catch (error) {
      console.error(`✗ Failed to transition ${issueKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch export with multiple formats (incorporating CLI best practices)
   */
  async exportIssues(jql, formats = ['json'], filename = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = filename || `jira-export-${timestamp}`;
    const results = {};
    
    for (const format of formats) {
      try {
        let data;
        let extension;
        
        switch (format) {
          case 'raw':
            data = await this.executeRawQuery(jql);
            extension = 'json';
            break;
            
          case 'plain':
            data = await this.executePlainTextQuery(jql);
            extension = 'txt';
            break;
            
          case 'csv':
            const issues = await this.executeDirectApiQuery(jql);
            data = this.convertToCSV(issues);
            extension = 'csv';
            break;
            
          case 'json':
          default:
            data = await this.executeDirectApiQuery(jql);
            extension = 'json';
        }
        
        const fullFilename = `${baseFilename}.${extension}`;
        
        if (typeof data === 'object') {
          writeFileSync(fullFilename, JSON.stringify(data, null, 2));
        } else {
          writeFileSync(fullFilename, data);
        }
        
        results[format] = fullFilename;
        console.log(`✓ Exported ${format} format to ${fullFilename}`);
        
      } catch (error) {
        console.error(`✗ Failed to export ${format} format: ${error.message}`);
        results[format] = { error: error.message };
      }
    }
    
    return results;
  }

  // Helper methods (implementing existing functionality)
  async executeDirectApiQuery(jql, options = {}) {
    // Implementation from your existing jira-cli-client.js
    // This would contain your current REST API query logic
    console.log(`Executing enhanced JQL: ${jql}`);
    // ... existing implementation
  }

  async getIssueDetails(issueKey) {
    const url = `${config.jira.baseUrl}/rest/api/2/issue/${issueKey}`;
    
    await this.delay();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.jira.apiToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async assignIssue(issueKey, assignee) {
    const url = `${config.jira.baseUrl}/rest/api/2/issue/${issueKey}/assignee`;
    
    await this.delay();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.jira.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: assignee
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }

  async updateIssue(issueKey, updateData) {
    const url = `${config.jira.baseUrl}/rest/api/2/issue/${issueKey}`;
    
    await this.delay();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.jira.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }

  convertToCSV(issues) {
    if (!issues || issues.length === 0) return '';
    
    const headers = ['key', 'summary', 'status', 'assignee', 'updated', 'created', 'priority', 'resolution', 'issuetype'];
    const csvRows = [headers.join(',')];
    
    issues.forEach(issue => {
      const row = headers.map(header => {
        const value = issue[header] || '';
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}