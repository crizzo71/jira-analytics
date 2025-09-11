import Handlebars from 'handlebars';
// Using native Date instead of moment for now
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
      if (unit === 'days') newD.setDate(newD.getDate() - num);
      return moment(newD);
    },
    isAfter: (other) => {
      const otherD = other.d || other;
      return d > otherD;
    },
    diff: (other, unit) => {
      const otherD = other.d || other;
      const diffMs = d - otherD;
      if (unit === 'days') return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffMs;
    },
    toISOString: () => d.toISOString(),
    d: d
  };
};
import fs from 'fs/promises';
import path from 'path';

export class ReportGenerator {
  constructor() {
    this.templateCache = new Map();
    this.registerHandlebarsHelpers();
  }

  registerHandlebarsHelpers() {
    // Helper for repeating characters (for progress bars)
    Handlebars.registerHelper('repeat', function(times, char) {
      if (typeof times !== 'number' || times < 0) return '';
      return new Array(Math.floor(times / 10) + 1).join(char || '=');
    });

    // Helper for subtraction
    Handlebars.registerHelper('subtract', function(a, b) {
      return a - b;
    });

    // Helper to check if there are items
    Handlebars.registerHelper('hasItems', function(array) {
      return array && array.length > 0;
    });
  }

  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(templateContent);
    
    this.templateCache.set(templateName, compiledTemplate);
    return compiledTemplate;
  }

  categorizeJiraCliIssues(issues) {
    const now = moment();
    const oneWeekAgo = moment().subtract(7, 'days');
    
    const categorized = {
      // Epic-level items (main report content)
      epics: {
        completed: [],
        inProgress: [],
        newIssues: [],
        needsAttention: []
      },
      // Sub-Epic level items (trend analysis)
      subEpicItems: {
        completed: [],
        inProgress: [],
        newIssues: [],
        needsAttention: [],
        all: []
      },
      // Legacy structure for backward compatibility
      completed: [],
      inProgress: [],
      newIssues: [],
      needsAttention: []
    };

    issues.forEach(issue => {
      const created = moment(issue.created);
      const updated = moment(issue.updated);
      const status = (issue.status || '').toLowerCase();
      const issueType = (issue.issuetype || issue.type || '').toLowerCase();
      
      // Normalize issue data from jira-cli format
      const normalizedIssue = {
        key: issue.key,
        summary: issue.summary,
        status: issue.status,
        assignee: issue.assignee,
        priority: issue.priority,
        issuetype: issue.issuetype || issue.type,
        created: issue.created,
        updated: issue.updated,
        resolution: issue.resolution,
        url: issue.url,
        epic: issue.epic,
        parent: issue.parent
      };
      
      // Determine if this is an Epic-level item
      const isEpicLevel = issueType === 'epic' || issueType === 'initiative' || issueType === 'theme';
      const targetCategory = isEpicLevel ? categorized.epics : categorized.subEpicItems;
      
      // Add to sub-epic items 'all' array for trend analysis
      if (!isEpicLevel) {
        categorized.subEpicItems.all.push(normalizedIssue);
      }
      
      // Check if issue was created this week
      if (created.isAfter(oneWeekAgo)) {
        targetCategory.newIssues.push(normalizedIssue);
        categorized.newIssues.push(normalizedIssue); // Legacy compatibility
      }
      
      // Check completion status
      if (issue.resolution && 
          ['done', 'resolved', 'closed', 'fixed'].some(s => status.includes(s))) {
        targetCategory.completed.push(normalizedIssue);
        categorized.completed.push(normalizedIssue); // Legacy compatibility
      }
      
      // Check in progress
      else if (['in progress', 'in review', 'testing', 'code review'].some(s => status.includes(s))) {
        targetCategory.inProgress.push(normalizedIssue);
        categorized.inProgress.push(normalizedIssue); // Legacy compatibility
      }
      
      // Check for issues needing attention (stale, blocked, etc.)
      const daysSinceUpdate = now.diff(updated, 'days');
      if (daysSinceUpdate > 3 && !issue.resolution) {
        const attentionIssue = {
          ...normalizedIssue,
          lastUpdated: updated.format('YYYY-MM-DD'),
          reason: daysSinceUpdate > 7 ? 'Stale (no updates for over a week)' : 'No recent updates'
        };
        targetCategory.needsAttention.push(attentionIssue);
        categorized.needsAttention.push(attentionIssue); // Legacy compatibility
      }
    });

    // Also provide aliases for template compatibility
    return {
      ...categorized,
      completedIssues: categorized.completed,
      inProgressIssues: categorized.inProgress,
      issuesNeedingAttention: categorized.needsAttention
    };
  }

  calculateVelocityMetrics(velocityData) {
    if (!velocityData || velocityData.length === 0) {
      return {
        average: 0,
        unit: 'items',
        trend: 'No data available',
        data: []
      };
    }

    // Determine if we're using story points or throughput
    const hasStoryPoints = velocityData.some(item => item.storyPoints && item.storyPoints > 0);
    const unit = hasStoryPoints ? 'story points' : 'items';
    
    // Calculate averages
    const values = velocityData.map(item => 
      hasStoryPoints ? item.storyPoints : item.completedCount
    );
    
    const average = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length * 10) / 10;
    
    // Determine trend
    let trend = 'Stable';
    if (values.length >= 2) {
      const recent = values.slice(-2);
      const older = values.slice(0, -2);
      
      if (recent.length >= 2 && older.length >= 1) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) trend = 'Increasing';
        else if (recentAvg < olderAvg * 0.9) trend = 'Decreasing';
      }
    }

    // Format data for template
    const formattedData = velocityData.map(item => ({
      period: item.sprint || item.weekEnding || 'Period',
      value: hasStoryPoints ? item.storyPoints : item.completedCount
    }));

    return {
      average,
      unit,
      trend,
      data: formattedData
    };
  }

  generateSubEpicTrendAnalysis(subEpicItems, velocityData) {
    const trendAnalysis = {
      totalItems: subEpicItems.all.length,
      byType: {},
      byStatus: {},
      completionRate: 0,
      weeklyMetrics: []
    };

    // Analyze by issue type
    subEpicItems.all.forEach(item => {
      const type = item.issuetype || 'Unknown';
      if (!trendAnalysis.byType[type]) {
        trendAnalysis.byType[type] = { total: 0, completed: 0, inProgress: 0 };
      }
      trendAnalysis.byType[type].total++;
      
      if (item.resolution) {
        trendAnalysis.byType[type].completed++;
      } else if (['in progress', 'in review', 'testing', 'code review'].some(s => 
        (item.status || '').toLowerCase().includes(s))) {
        trendAnalysis.byType[type].inProgress++;
      }
    });

    // Analyze by status
    subEpicItems.all.forEach(item => {
      const status = item.status || 'Unknown';
      trendAnalysis.byStatus[status] = (trendAnalysis.byStatus[status] || 0) + 1;
    });

    // Calculate completion rate
    const completedItems = subEpicItems.completed.length;
    trendAnalysis.completionRate = subEpicItems.all.length > 0 
      ? Math.round((completedItems / subEpicItems.all.length) * 100) 
      : 0;

    // Generate weekly metrics from velocity data for sub-epic items
    if (velocityData && velocityData.length > 0) {
      trendAnalysis.weeklyMetrics = velocityData.map(period => ({
        period: period.weekEnding || period.sprint || 'Period',
        completed: period.completedCount || 0,
        storyPoints: period.storyPoints || 0
      }));
    }

    // Create readable summary
    const topIssueTypes = Object.entries(trendAnalysis.byType)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 3)
      .map(([type, data]) => ({
        type,
        total: data.total,
        completed: data.completed,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
      }));

    trendAnalysis.summary = {
      topTypes: topIssueTypes,
      activeItems: subEpicItems.inProgress.length,
      newThisWeek: subEpicItems.newIssues.length,
      needingAttention: subEpicItems.needsAttention.length
    };

    return trendAnalysis;
  }

  async generateExecutiveReport(issues, velocityData, manualInput, project = null, boards = []) {
    const template = await this.loadTemplate('weekly-summary');
    const categorized = this.categorizeJiraCliIssues(issues);
    const velocity = this.calculateVelocityMetrics(velocityData);
    
    const startDate = moment().subtract(1, 'weeks').format('MMM DD');
    const endDate = moment().format('MMM DD, YYYY');
    
    const projectInfo = project ? `${project.key} - ${project.name}` : 'Multi-Cluster Management Engineering';
    
    // Generate team name from boards
    let teamName = 'Multi-Cluster Management Engineering';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        teamName = boards[0].name;
      } else {
        teamName = `${projectInfo} (${boards.length} teams)`;
      }
    } else if (project) {
      teamName = projectInfo;
    }
    
    // Generate board info for display
    let boardInfo = '';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        boardInfo = boards[0].name;
      } else {
        boardInfo = `${boards.length} boards: ${boards.map(b => b.name).join(', ')}`;
      }
    }
    
    // Generate trend analysis for sub-Epic items
    const subEpicTrends = this.generateSubEpicTrendAnalysis(categorized.subEpicItems, velocityData);
    
    const data = {
      dateRange: `${startDate} - ${endDate}`,
      totalIssues: issues.length,
      epicIssues: categorized.epics.completed.length + categorized.epics.inProgress.length + categorized.epics.newIssues.length,
      subEpicIssues: categorized.subEpicItems.all.length,
      generatedOn: moment().format('YYYY-MM-DD HH:mm:ss'),
      projectInfo: projectInfo,
      teamName: teamName,
      boardInfo: boardInfo,
      velocity,
      manualInput: manualInput || {},
      boards: boards || [],
      multiBoard: boards && boards.length > 1,
      subEpicTrends: subEpicTrends,
      // Use Epic-level items for main content
      completed: categorized.epics.completed,
      inProgress: categorized.epics.inProgress,
      newIssues: categorized.epics.newIssues,
      needsAttention: categorized.epics.needsAttention,
      // Include full categorized data for template flexibility
      categorized: categorized
    };

    return template(data);
  }

  groupIssuesByEpic(issues) {
    const epicGroups = new Map();
    const unassociatedIssues = [];
    const processedIssues = new Set(); // Track processed issues to avoid duplicates

    issues.forEach(issue => {
      // Skip if we've already processed this issue
      if (processedIssues.has(issue.key)) {
        return;
      }
      processedIssues.add(issue.key);

      if (issue.epic && issue.epic.key) {
        const epicKey = issue.epic.key;
        
        if (!epicGroups.has(epicKey)) {
          epicGroups.set(epicKey, {
            epic: {
              key: issue.epic.key,
              summary: issue.epic.summary,
              url: issue.epic.url,
              status: 'Unknown', // Will be updated if Epic issue is found
              priority: 'Unknown',
              assignee: null,
              progress: issue.epic.progress || null
            },
            relatedIssues: []
          });
        }
        
        // If this issue IS the Epic, update the Epic info
        if (issue.key === epicKey) {
          const epicGroup = epicGroups.get(epicKey);
          epicGroup.epic.status = issue.status;
          epicGroup.epic.priority = issue.priority;
          epicGroup.epic.assignee = issue.assignee;
        } else {
          // Otherwise add as related issue (check for duplicates)
          const epicGroup = epicGroups.get(epicKey);
          const existingIssue = epicGroup.relatedIssues.find(existing => existing.key === issue.key);
          if (!existingIssue) {
            epicGroup.relatedIssues.push(issue);
          }
        }
      } else {
        unassociatedIssues.push(issue);
      }
    });

    return {
      epicsWithIssues: Array.from(epicGroups.values()),
      unassociatedIssues
    };
  }

  async generateEpicFocusedReport(issues, velocityData, manualInput, project = null, boards = [], jiraClient = null) {
    const template = await this.loadTemplate('epic-focused');
    const categorized = this.categorizeJiraCliIssues(issues);
    const velocity = this.calculateVelocityMetrics(velocityData);
    const epicGrouping = this.groupIssuesByEpic(issues);
    
    const startDate = moment().subtract(1, 'weeks').format('MMM DD');
    const endDate = moment().format('MMM DD, YYYY');
    
    const projectInfo = project ? `${project.key} - ${project.name}` : 'Multi-Cluster Management Engineering';
    
    // Generate team name from boards
    let teamName = 'Multi-Cluster Management Engineering';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        teamName = boards[0].name;
      } else {
        teamName = `${projectInfo} (${boards.length} teams)`;
      }
    } else if (project) {
      teamName = projectInfo;
    }
    
    // Generate trend analysis for sub-Epic items
    const subEpicTrends = this.generateSubEpicTrendAnalysis(categorized.subEpicItems, velocityData);
    
    // Get component name from the jiraClient if in issues mode
    let componentName = null;
    if (jiraClient && jiraClient.dataSourceMode === 'issues' && jiraClient.issuesFilter && jiraClient.issuesFilter.component) {
      componentName = jiraClient.issuesFilter.component;
    }
    
    // Collect Epic hierarchy information
    const hierarchyMap = await this.buildEpicHierarchyMap(epicGrouping.epicsWithIssues, jiraClient);
    
    const data = {
      dateRange: `${startDate} - ${endDate}`,
      totalIssues: issues.length,
      epicIssues: categorized.epics.completed.length + categorized.epics.inProgress.length + categorized.epics.newIssues.length,
      subEpicIssues: categorized.subEpicItems.all.length,
      generatedOn: moment().format('YYYY-MM-DD HH:mm:ss'),
      projectInfo: projectInfo,
      teamName: teamName,
      componentName: componentName,
      velocity,
      manualInput: manualInput || {},
      boards: boards || [],
      multiBoard: boards && boards.length > 1,
      subEpicTrends: subEpicTrends,
      needsAttention: categorized.needsAttention,
      // Epic-focused data
      epicsWithIssues: epicGrouping.epicsWithIssues,
      unassociatedIssues: epicGrouping.unassociatedIssues,
      // Epic hierarchy data
      hierarchyMap: hierarchyMap,
      // Include full categorized data for template flexibility
      categorized: categorized
    };

    return template(data);
  }

  async buildEpicHierarchyMap(epicsWithIssues, jiraClient) {
    if (!jiraClient || !jiraClient.fetchEpicHierarchy) {
      console.log('No jiraClient provided or hierarchy fetch not available');
      return null;
    }

    console.log('🔗 Building Epic hierarchy map...');
    const hierarchyMap = {
      outcomes: new Map(),
      initiatives: new Map(),
      epicHierarchies: [],
      hasHierarchy: false
    };

    try {
      // Fetch hierarchy for each Epic
      for (const epicGroup of epicsWithIssues) {
        const epicKey = epicGroup.epic.key;
        console.log(`  📋 Fetching hierarchy for Epic: ${epicKey}`);
        
        // Add delay to avoid rate limiting
        await jiraClient.delay();
        
        const hierarchy = await jiraClient.fetchEpicHierarchy(epicKey);
        if (hierarchy) {
          // Add Epic info to hierarchy
          hierarchy.epic = {
            ...hierarchy.epic,
            ...epicGroup.epic, // Merge with existing Epic data
            relatedIssuesCount: epicGroup.relatedIssues.length
          };

          hierarchyMap.epicHierarchies.push(hierarchy);

          // Track unique outcomes and initiatives
          if (hierarchy.outcome) {
            hierarchyMap.outcomes.set(hierarchy.outcome.key, hierarchy.outcome);
            hierarchyMap.hasHierarchy = true;
          }
          if (hierarchy.initiative) {
            hierarchyMap.initiatives.set(hierarchy.initiative.key, hierarchy.initiative);
            hierarchyMap.hasHierarchy = true;
          }
        }
      }

      // Convert Maps to Arrays for template use
      hierarchyMap.uniqueOutcomes = Array.from(hierarchyMap.outcomes.values());
      hierarchyMap.uniqueInitiatives = Array.from(hierarchyMap.initiatives.values());

      console.log(`✅ Hierarchy map built: ${hierarchyMap.uniqueOutcomes.length} outcomes, ${hierarchyMap.uniqueInitiatives.length} initiatives, ${hierarchyMap.epicHierarchies.length} epics`);
      
      return hierarchyMap;

    } catch (error) {
      console.warn(`Error building Epic hierarchy map: ${error.message}`);
      return null;
    }
  }

  async saveReport(content, filename, format = 'markdown') {
    const reportsDir = path.join(process.cwd(), 'reports');
    let subDir;
    
    switch (format) {
      case 'html':
      case 'google-docs':
        subDir = 'google-docs';
        break;
      case 'text':
      case 'plain-text':
        subDir = 'plain-text';
        break;
      case 'markdown':
      default:
        subDir = 'markdown';
        break;
    }
    
    const formatDir = path.join(reportsDir, subDir);
    
    try {
      await fs.access(formatDir);
    } catch {
      await fs.mkdir(formatDir, { recursive: true });
    }

    const filepath = path.join(formatDir, filename);
    await fs.writeFile(filepath, content, 'utf-8');
    return filepath;
  }

  async generateAllFormats(issues, velocityData, manualInput, project = null, boards = [], jiraClient = null) {
    console.log('📝 Generating multiple report formats...');
    
    const results = {};
    
    // Generate Markdown (Epic-focused)
    results.markdown = await this.generateEpicFocusedReport(issues, velocityData, manualInput, project, boards, jiraClient);
    
    // Generate HTML for Google Docs
    results.html = await this.generateGoogleDocsReport(issues, velocityData, manualInput, project, boards);
    
    // Generate Plain Text
    results.text = await this.generatePlainTextReport(issues, velocityData, manualInput, project, boards);
    
    return results;
  }

  async generateGoogleDocsReport(issues, velocityData, manualInput, project = null, boards = []) {
    const template = await this.loadTemplate('google-docs');
    const categorized = this.categorizeJiraCliIssues(issues);
    const velocity = this.calculateVelocityMetrics(velocityData);
    
    const startDate = moment().subtract(1, 'weeks').format('MMM DD');
    const endDate = moment().format('MMM DD, YYYY');
    
    const projectInfo = project ? `${project.key} - ${project.name}` : 'Multi-Cluster Management Engineering';
    
    // Generate team name from boards
    let teamName = 'Multi-Cluster Management Engineering';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        teamName = boards[0].name;
      } else {
        teamName = `${projectInfo} (${boards.length} teams)`;
      }
    } else if (project) {
      teamName = projectInfo;
    }
    
    // Generate board info for display
    let boardInfo = '';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        boardInfo = boards[0].name;
      } else {
        boardInfo = `${boards.length} boards: ${boards.map(b => b.name).join(', ')}`;
      }
    }
    
    // Generate trend analysis for sub-Epic items
    const subEpicTrends = this.generateSubEpicTrendAnalysis(categorized.subEpicItems, velocityData);
    
    const data = {
      dateRange: `${startDate} - ${endDate}`,
      totalIssues: issues.length,
      epicIssues: categorized.epics.completed.length + categorized.epics.inProgress.length + categorized.epics.newIssues.length,
      subEpicIssues: categorized.subEpicItems.all.length,
      generatedOn: moment().format('YYYY-MM-DD HH:mm:ss'),
      projectInfo: projectInfo,
      teamName: teamName,
      boardInfo: boardInfo,
      velocity,
      manualInput: manualInput || {},
      boards: boards || [],
      multiBoard: boards && boards.length > 1,
      subEpicTrends: subEpicTrends,
      workBreakdown: this.calculateWorkBreakdown(categorized),
      // HTML template expects different variable names
      completedIssues: categorized.epics.completed,
      inProgressIssues: categorized.epics.inProgress,
      newIssues: categorized.epics.newIssues,
      issuesNeedingAttention: categorized.epics.needsAttention,
      // Include original categorized data for template flexibility
      ...categorized
    };

    return template(data);
  }

  async generatePlainTextReport(issues, velocityData, manualInput, project = null, boards = []) {
    const template = await this.loadTemplate('plain-text');
    const categorized = this.categorizeJiraCliIssues(issues);
    const velocity = this.calculateVelocityMetrics(velocityData);
    
    // Generate trend analysis for sub-Epic items
    const subEpicTrends = this.generateSubEpicTrendAnalysis(categorized.subEpicItems, velocityData);
    
    const startDate = moment().subtract(1, 'weeks').format('MMM DD');
    const endDate = moment().format('MMM DD, YYYY');
    
    const projectInfo = project ? `${project.key} - ${project.name}` : 'Multi-Cluster Management Engineering';
    
    // Generate team name from boards
    let teamName = 'Multi-Cluster Management Engineering';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        teamName = boards[0].name;
      } else {
        teamName = `${projectInfo} (${boards.length} teams)`;
      }
    } else if (project) {
      teamName = projectInfo;
    }
    
    // Generate board info for display
    let boardInfo = '';
    if (boards && boards.length > 0) {
      if (boards.length === 1) {
        boardInfo = boards[0].name;
      } else {
        boardInfo = `${boards.length} boards: ${boards.map(b => b.name).join(', ')}`;
      }
    }
    
    const data = {
      dateRange: `${startDate} - ${endDate}`,
      totalIssues: issues.length,
      epicIssues: categorized.epics.completed.length + categorized.epics.inProgress.length + categorized.epics.newIssues.length,
      subEpicIssues: categorized.subEpicItems.all.length,
      generatedOn: moment().format('YYYY-MM-DD HH:mm:ss'),
      projectInfo: projectInfo,
      teamName: teamName,
      boardInfo: boardInfo,
      velocity,
      manualInput: manualInput || {},
      boards: boards || [],
      multiBoard: boards && boards.length > 1,
      subEpicTrends: subEpicTrends,
      workBreakdown: this.calculateWorkBreakdown(categorized),
      // Use Epic-level items for main content
      completed: categorized.epics.completed,
      inProgress: categorized.epics.inProgress,
      newIssues: categorized.epics.newIssues,
      needsAttention: categorized.epics.needsAttention,
      // Include full categorized data for template flexibility
      categorized: categorized
    };

    return template(data);
  }

  calculateWorkBreakdown(categorized) {
    const total = categorized.completedIssues.length + categorized.inProgressIssues.length + categorized.issuesNeedingAttention.length;
    
    if (total === 0) {
      return { completedPercentage: 0, inProgressPercentage: 0, attentionPercentage: 0 };
    }
    
    return {
      completedPercentage: Math.round((categorized.completedIssues.length / total) * 100),
      inProgressPercentage: Math.round((categorized.inProgressIssues.length / total) * 100),
      attentionPercentage: Math.round((categorized.issuesNeedingAttention.length / total) * 100)
    };
  }

  async exportData(issues, velocityData, format = 'json', projectSuffix = '') {
    const dataDir = path.join(process.cwd(), 'data');
    
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    const timestamp = moment().format('YYYY-MM-DD');
    const suffix = projectSuffix ? `-${projectSuffix}` : '';
    
    if (format === 'json') {
      const data = {
        exportDate: moment().toISOString(),
        issues,
        velocityData,
        summary: {
          totalIssues: issues.length,
          averageVelocity: this.calculateVelocityMetrics(velocityData).average
        }
      };
      
      const filepath = path.join(dataDir, `jira-export${suffix}-${timestamp}.json`);
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      return filepath;
    }
    
    // CSV export for issues
    if (format === 'csv') {
      const csvHeaders = 'Key,Summary,Status,Assignee,Priority,Type,Created,Updated,Resolution\n';
      const csvRows = issues.map(issue => 
        `"${issue.key}","${issue.summary}","${issue.status}","${issue.assignee || ''}","${issue.priority}","${issue.issuetype || ''}","${issue.created}","${issue.updated}","${issue.resolution || ''}"`
      ).join('\n');
      
      const filepath = path.join(dataDir, `jira-issues${suffix}-${timestamp}.csv`);
      await fs.writeFile(filepath, csvHeaders + csvRows);
      return filepath;
    }
  }
}