import readline from 'readline';
import { config } from './config.js';

export class ProjectSelector {
  constructor(jiraClient) {
    this.jiraClient = jiraClient;
  }

  createReadlineInterface() {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async getAccessibleProjects() {
    try {
      console.log('🔍 Fetching accessible projects...');
      
      const url = `${config.jira.baseUrl}/rest/api/2/project`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const projects = await response.json();
      return projects.map(project => ({
        key: project.key,
        name: project.name,
        id: project.id,
        projectTypeKey: project.projectTypeKey
      }));
      
    } catch (error) {
      console.warn('Could not fetch projects via API, using known projects');
      return [
        { key: 'OCM', name: 'Open Cluster Management', id: 'unknown' },
        { key: 'ROSA', name: 'Red Hat OpenShift Service on AWS', id: 'unknown' },
        { key: 'HYPERSHIFT', name: 'HyperShift', id: 'unknown' },
        { key: 'ACM', name: 'Advanced Cluster Management', id: 'unknown' }
      ];
    }
  }

  async getBoardsForProject(projectKey) {
    try {
      console.log(`🔍 Fetching boards for project ${projectKey}...`);
      
      // Try to get boards for the project
      const url = `${config.jira.baseUrl}/rest/agile/1.0/board`;
      const params = new URLSearchParams({
        projectKeyOrId: projectKey,
        maxResults: '50'
      });
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`Could not fetch boards for ${projectKey}, will use project-wide queries`);
        return [];
      }
      
      const data = await response.json();
      return data.values.map(board => ({
        id: board.id,
        name: board.name,
        type: board.type,
        projectKey: projectKey
      }));
      
    } catch (error) {
      console.warn(`Error fetching boards for ${projectKey}:`, error.message);
      return [];
    }
  }

  async selectProjectInteractively() {
    const rl = this.createReadlineInterface();
    
    try {
      console.log('\\n📋 PROJECT SELECTION OPTIONS');
      console.log('=============================');
      console.log('1. Search for a specific project');
      console.log('2. Browse popular Red Hat projects');
      console.log('3. Enter project key directly');
      console.log('4. Use current configuration (OCM)');
      
      const choice = await this.askQuestion(rl, '\\nSelect an option (1-4): ');
      
      switch (choice) {
        case '1':
          return await this.searchProjects(rl);
        case '2':
          return await this.browsePopularProjects(rl);
        case '3':
          return await this.enterCustomProject(rl);
        case '4':
          return {
            key: 'OCM',
            name: 'Open Cluster Management',
            id: 'current'
          };
        default:
          throw new Error('Invalid selection');
      }
      
    } finally {
      rl.close();
    }
  }

  async searchProjects(rl) {
    const searchTerm = await this.askQuestion(rl, 'Enter search term (project name or key): ');
    const allProjects = await this.getAccessibleProjects();
    
    const filtered = allProjects.filter(project => 
      project.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20); // Limit to 20 results
    
    if (filtered.length === 0) {
      console.log(`\\n❌ No projects found matching "${searchTerm}"`);
      return await this.enterCustomProject(rl);
    }
    
    console.log(`\\n🔍 SEARCH RESULTS FOR "${searchTerm}"`);
    console.log('=====================================');
    filtered.forEach((project, index) => {
      console.log(`${index + 1}. ${project.key} - ${project.name}`);
    });
    console.log(`${filtered.length + 1}. Enter different search term`);
    console.log(`${filtered.length + 2}. Enter project key manually`);
    
    const choice = await this.askQuestion(rl, `\\nSelect a project (1-${filtered.length + 2}): `);
    const choiceNum = parseInt(choice);
    
    if (choiceNum >= 1 && choiceNum <= filtered.length) {
      return filtered[choiceNum - 1];
    } else if (choiceNum === filtered.length + 1) {
      return await this.searchProjects(rl);
    } else if (choiceNum === filtered.length + 2) {
      return await this.enterCustomProject(rl);
    } else {
      throw new Error('Invalid selection');
    }
  }

  async browsePopularProjects(rl) {
    const popularProjects = [
      { key: 'OCM', name: 'Open Cluster Management', id: 'popular' },
      { key: 'ROSA', name: 'Red Hat OpenShift Service on AWS', id: 'popular' },
      { key: 'HYPERSHIFT', name: 'HyperShift', id: 'popular' },
      { key: 'ACM', name: 'Advanced Cluster Management', id: 'popular' },
      { key: 'RHCLOUD', name: 'Hybrid Cloud Console', id: 'popular' },
      { key: 'ARO', name: 'Azure Red Hat OpenShift', id: 'popular' },
      { key: 'RHOAI', name: 'Red Hat OpenShift AI', id: 'popular' },
      { key: 'RHODS', name: 'Red Hat OpenShift Data Science', id: 'popular' },
      { key: 'INSTALLER', name: 'Anaconda Installer', id: 'popular' },
      { key: 'COST', name: 'Cost Management', id: 'popular' }
    ];
    
    console.log('\\n⭐ POPULAR RED HAT PROJECTS');
    console.log('===========================');
    popularProjects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.key} - ${project.name}`);
    });
    console.log(`${popularProjects.length + 1}. Search for different project`);
    console.log(`${popularProjects.length + 2}. Enter project key manually`);
    
    const choice = await this.askQuestion(rl, `\\nSelect a project (1-${popularProjects.length + 2}): `);
    const choiceNum = parseInt(choice);
    
    if (choiceNum >= 1 && choiceNum <= popularProjects.length) {
      return popularProjects[choiceNum - 1];
    } else if (choiceNum === popularProjects.length + 1) {
      return await this.searchProjects(rl);
    } else if (choiceNum === popularProjects.length + 2) {
      return await this.enterCustomProject(rl);
    } else {
      throw new Error('Invalid selection');
    }
  }

  async enterCustomProject(rl) {
    const customKey = await this.askQuestion(rl, 'Enter project key (e.g., OCM, ROSA, HYPERSHIFT): ');
    
    if (!customKey) {
      throw new Error('Project key is required');
    }
    
    return {
      key: customKey.toUpperCase(),
      name: `Project ${customKey.toUpperCase()}`,
      id: 'custom'
    };
  }

  async selectBoardInteractively(project) {
    const rl = this.createReadlineInterface();
    
    try {
      const boards = await this.getBoardsForProject(project.key);
      
      if (boards.length === 0) {
        console.log(`\\n⚠️  No boards found for project ${project.key}`);
        console.log('Will use project-wide issue queries instead.');
        return [];
      }
      
      console.log(`\\n🎯 BOARD SELECTION FOR ${project.key}`);
      console.log('====================================');
      console.log('1. Select single board');
      console.log('2. Select multiple boards');
      console.log('3. Enter board ID(s) manually');
      console.log('4. Use project-wide queries (all boards)');
      
      const selectionType = await this.askQuestion(rl, '\\nChoose selection type (1-4): ');
      
      switch (selectionType) {
        case '1':
          return await this.selectSingleBoard(rl, boards);
        case '2':
          return await this.selectMultipleBoards(rl, boards);
        case '3':
          return await this.selectBoardsByID(rl, project);
        case '4':
          return []; // Use project-wide queries
        default:
          throw new Error('Invalid selection');
      }
      
    } finally {
      rl.close();
    }
  }

  async selectSingleBoard(rl, boards) {
    console.log(`\\n📋 AVAILABLE BOARDS`);
    console.log('===================');
    boards.forEach((board, index) => {
      console.log(`${index + 1}. ${board.name} (${board.type})`);
    });
    
    const choice = await this.askQuestion(rl, `\\nSelect a board (1-${boards.length}): `);
    const choiceNum = parseInt(choice);
    
    if (choiceNum >= 1 && choiceNum <= boards.length) {
      return [boards[choiceNum - 1]];
    } else {
      throw new Error('Invalid selection');
    }
  }

  async selectMultipleBoards(rl, boards) {
    console.log(`\\n📋 AVAILABLE BOARDS (Multiple Selection)`);
    console.log('========================================');
    boards.forEach((board, index) => {
      console.log(`${index + 1}. ${board.name} (${board.type})`);
    });
    console.log('\\n💡 Enter board numbers separated by commas (e.g., 1,3,5)');
    console.log('💡 Or enter ranges (e.g., 1-3,5,7-9)');
    
    const choices = await this.askQuestion(rl, 'Select boards: ');
    const selectedBoards = this.parseMultipleSelections(choices, boards);
    
    if (selectedBoards.length === 0) {
      throw new Error('No valid boards selected');
    }
    
    console.log(`\\n✅ Selected ${selectedBoards.length} boards:`);
    selectedBoards.forEach(board => {
      console.log(`   - ${board.name} (${board.type})`);
    });
    
    return selectedBoards;
  }

  parseMultipleSelections(input, boards) {
    const selectedBoards = [];
    const parts = input.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range (e.g., "1-3")
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (start >= 1 && end <= boards.length && start <= end) {
          for (let i = start; i <= end; i++) {
            if (!selectedBoards.find(b => b.id === boards[i - 1].id)) {
              selectedBoards.push(boards[i - 1]);
            }
          }
        }
      } else {
        // Handle single number
        const num = parseInt(part);
        if (num >= 1 && num <= boards.length) {
          if (!selectedBoards.find(b => b.id === boards[num - 1].id)) {
            selectedBoards.push(boards[num - 1]);
          }
        }
      }
    }
    
    return selectedBoards;
  }

  async selectBoardsByID(rl, project) {
    console.log(`\\n🎯 MANUAL BOARD ID SELECTION`);
    console.log('============================');
    console.log('💡 Enter board ID(s) separated by commas (e.g., 20600,17975,17291)');
    console.log('💡 You can get board IDs from:');
    console.log('   - Jira board URL: .../secure/RapidBoard.jspa?rapidView=20600');
    console.log('   - API endpoint: /rest/agile/1.0/board');
    console.log('   - Or from previous board listings\\n');
    
    const boardIDs = await this.askQuestion(rl, 'Enter board ID(s): ');
    
    if (!boardIDs.trim()) {
      throw new Error('Board ID(s) are required');
    }
    
    const ids = boardIDs.split(',').map(id => id.trim()).filter(id => id);
    const boards = [];
    
    for (const id of ids) {
      const boardId = parseInt(id);
      if (isNaN(boardId)) {
        console.log(`⚠️  Skipping invalid board ID: ${id}`);
        continue;
      }
      
      try {
        const boardInfo = await this.fetchBoardInfo(boardId);
        if (boardInfo) {
          boards.push({
            id: boardId,
            name: boardInfo.name,
            type: boardInfo.type || 'unknown',
            projectKey: project.key
          });
          console.log(`✅ Found board: ${boardInfo.name} (${boardInfo.type || 'unknown'})`);
        } else {
          console.log(`❌ Board ID ${boardId} not found or not accessible`);
        }
      } catch (error) {
        console.log(`❌ Error fetching board ${boardId}: ${error.message}`);
      }
    }
    
    if (boards.length === 0) {
      throw new Error('No valid boards found for the provided IDs');
    }
    
    console.log(`\\n✅ Successfully configured ${boards.length} board(s):`);
    boards.forEach(board => {
      console.log(`   - ID: ${board.id} | ${board.name} (${board.type})`);
    });
    
    return boards;
  }

  async fetchBoardInfo(boardId) {
    try {
      const url = `${config.jira.baseUrl}/rest/agile/1.0/board/${boardId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const board = await response.json();
      return {
        id: board.id,
        name: board.name,
        type: board.type
      };
      
    } catch (error) {
      return null;
    }
  }

  async askQuestion(rl, question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async selectDataSourceMode() {
    console.log('\\n🎯 DATA SOURCE SELECTION');
    console.log('========================');
    console.log('How would you like to collect issues for this project?\\n');
    
    console.log('1. 📋 Work from Kanban Boards');
    console.log('   → Issues organized by team boards (Board API)');
    console.log('   → Good for: Sprint planning, team velocity, board-specific reports\\n');
    
    console.log('2. 📝 Work from Issues List');
    console.log('   → Issues filtered by project criteria (Search API)');
    console.log('   → Good for: Component tracking, custom status filters, cross-board analysis\\n');
    
    const rl = this.createReadlineInterface();
    
    try {
      while (true) {
        const choice = await this.askQuestion(rl, 'Choose your data source (1-2): ');
        
        if (choice === '1') {
          console.log('\\n✅ Selected: Kanban Boards mode');
          return 'boards';
        } else if (choice === '2') {
          console.log('\\n✅ Selected: Issues List mode');
          return 'issues';
        } else {
          console.log('❌ Invalid choice. Please enter 1 or 2.');
        }
      }
    } finally {
      rl.close();
    }
  }

  async configureIssuesFilter(project) {
    console.log('\\n📝 ISSUES FILTER CONFIGURATION');
    console.log('===============================');
    console.log(`Project: ${project.key}\\n`);
    
    const rl = this.createReadlineInterface();
    
    try {
      // Default values
      const defaults = {
        issueTypes: ['Epic', 'Story'],
        statuses: ['In Progress', 'Code Review', 'Review', 'Closed'],
        resolution: 'Unresolved',
        component: '',
        dateRange: 7
      };
      
      console.log('Configure your filter criteria (press Enter to use defaults):\\n');
      
      // Issue Types
      const issueTypesInput = await this.askQuestion(rl, 
        `Issue Types (default: ${defaults.issueTypes.join(', ')}): `);
      const issueTypes = issueTypesInput ? 
        issueTypesInput.split(',').map(t => t.trim()) : 
        defaults.issueTypes;
      
      // Statuses
      const statusesInput = await this.askQuestion(rl, 
        `Statuses (default: ${defaults.statuses.map(s => `"${s}"`).join(', ')}): `);
      const statuses = statusesInput ? 
        statusesInput.split(',').map(s => s.trim().replace(/"/g, '')) : 
        defaults.statuses;
      
      // Resolution
      const resolution = await this.askQuestion(rl, 
        `Resolution (default: ${defaults.resolution}): `) || defaults.resolution;
      
      // Component (mandatory for Issues mode)
      let component;
      while (true) {
        component = await this.askQuestion(rl, 
          'Component (required): ');
        if (component && component.trim()) {
          break;
        }
        console.log('❌ Component is required for Issues-Based filtering. Please enter a component name.');
      }
      
      // Date Range
      const dateRangeInput = await this.askQuestion(rl, 
        `Date Range in days (default: ${defaults.dateRange}): `);
      const dateRange = dateRangeInput ? 
        parseInt(dateRangeInput) : 
        defaults.dateRange;
      
      const filter = {
        issueTypes,
        statuses,
        resolution,
        component: component.trim(),
        dateRange
      };
      
      // Validate the filter
      if (await this.validateIssuesFilter(filter, project)) {
        return filter;
      } else {
        console.log('\\n⚠️  Filter validation failed. Using safe defaults with provided component.');
        // Ensure component is still set even if validation fails
        const safeDefaults = { ...defaults, component: component.trim() };
        return safeDefaults;
      }
      
    } finally {
      rl.close();
    }
  }

  async validateIssuesFilter(filter, project) {
    try {
      // Build test JQL
      const testJQL = this.buildIssuesJQL(filter, project);
      
      // Test with maxResults=1
      const url = `${config.jira.baseUrl}/rest/api/2/search`;
      const params = new URLSearchParams({
        jql: testJQL,
        maxResults: '1'
      });
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${config.jira.apiToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.warn(`JQL validation failed: ${error.errorMessages?.join(', ') || response.statusText}`);
        return false;
      }
      
      console.log('✅ Filter validated successfully');
      return true;
      
    } catch (error) {
      console.warn(`Filter validation error: ${error.message}`);
      return false;
    }
  }

  buildIssuesJQL(filter, project) {
    let jql = `project = ${project.key}`;
    
    if (filter.issueTypes && filter.issueTypes.length > 0) {
      jql += ` AND issuetype in (${filter.issueTypes.join(',')})`;
    }
    
    if (filter.statuses && filter.statuses.length > 0) {
      jql += ` AND status in (${filter.statuses.map(s => `"${s}"`).join(',')})`;
    }
    
    if (filter.resolution) {
      jql += ` AND resolution = ${filter.resolution}`;
    }
    
    if (filter.component) {
      jql += ` AND component = "${filter.component}"`;
    }
    
    // Date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - filter.dateRange * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    jql += ` AND updated >= "${startDate}" AND updated <= "${endDate}"`;
    jql += ` ORDER BY priority DESC, updated DESC`;
    
    return jql;
  }

  async selectProjectAndBoard() {
    console.log('\\n🎯 PROJECT AND BOARD SELECTION');
    console.log('================================');
    
    // Try smart quick start first
    let project = await this.smartQuickStart();
    
    // If they chose "different project", do full selection
    if (!project) {
      project = await this.selectProjectInteractively();
    }
    
    console.log(`\\n✅ Selected project: ${project.key} - ${project.name}`);
    
    // NEW: Data source mode selection
    const dataSourceMode = await this.selectDataSourceMode();
    
    let boards = [];
    let issuesFilter = null;
    
    if (dataSourceMode === 'boards') {
      boards = await this.selectBoardInteractively(project);
      if (boards.length > 0) {
        if (boards.length === 1) {
          console.log(`✅ Selected board: ${boards[0].name} (${boards[0].type})`);
        } else {
          console.log(`✅ Selected ${boards.length} boards:`);
          boards.forEach(board => {
            console.log(`   - ${board.name} (${board.type})`);
          });
        }
      } else {
        console.log(`✅ Using project-wide board queries for ${project.key}`);
      }
    } else if (dataSourceMode === 'issues') {
      issuesFilter = await this.configureIssuesFilter(project);
      console.log(`✅ Configured issues filter for ${project.key}`);
      console.log(`   Component: ${issuesFilter.component || 'All components'}`);
      console.log(`   Statuses: ${issuesFilter.statuses.join(', ')}`);
      console.log(`   Date Range: Last ${issuesFilter.dateRange} days`);
    }
    
    return { 
      project, 
      boards, 
      dataSourceMode, 
      issuesFilter 
    };
  }

  async getProjectsFromConfig() {
    // Get projects from environment config
    if (config.jira.projectKeys && config.jira.projectKeys.length > 0) {
      return config.jira.projectKeys.map(key => ({
        key: key,
        name: `Project ${key}`,
        id: 'config'
      }));
    }
    return [];
  }

  async quickSelectFromConfig() {
    const configProjects = await this.getProjectsFromConfig();
    if (configProjects.length === 1) {
      console.log(`\\n📋 Using configured project: ${configProjects[0].key}`);
      return {
        project: configProjects[0],
        boards: []
      };
    } else if (configProjects.length > 1) {
      console.log(`\\n📋 Multiple projects configured: ${configProjects.map(p => p.key).join(', ')}`);
      console.log('Use interactive selection to choose specific project and boards.');
    }
    return null;
  }

  async smartQuickStart() {
    const rl = this.createReadlineInterface();
    
    try {
      console.log('\\n🚀 QUICK START - SMART PROJECT SELECTION');
      console.log('==========================================');
      console.log('Based on your team, you likely work on one of these:');
      console.log('');
      console.log('1. OCM - Open Cluster Management (most likely)');
      console.log('2. ROSA - Red Hat OpenShift Service on AWS');
      console.log('3. HYPERSHIFT - HyperShift');
      console.log('4. I need to select a different project');
      
      const choice = await this.askQuestion(rl, '\\nQuick selection (1-4): ');
      
      switch (choice) {
        case '1':
          return { key: 'OCM', name: 'Open Cluster Management', id: 'quick' };
        case '2':
          return { key: 'ROSA', name: 'Red Hat OpenShift Service on AWS', id: 'quick' };
        case '3':
          return { key: 'HYPERSHIFT', name: 'HyperShift', id: 'quick' };
        case '4':
          return null; // Fall back to full selection
        default:
          return { key: 'OCM', name: 'Open Cluster Management', id: 'quick' };
      }
      
    } finally {
      rl.close();
    }
  }
}