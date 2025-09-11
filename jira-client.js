import { config } from './config.js';

export class JiraClient {
  constructor() {
    this.baseUrl = config.jira.baseUrl;
    this.auth = {
      username: config.jira.username,
      password: config.jira.apiToken
    };
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const urlParams = new URLSearchParams(params);
      const url = `${this.baseUrl}/rest/api/2/${endpoint}?${urlParams}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Jira API Error:', error.message);
      throw error;
    }
  }

  async getIssuesUpdatedInLastWeek(projectKey) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const dateString = oneWeekAgo.toISOString().split('T')[0];

    const jql = `project = "${projectKey}" AND updated >= "${dateString}" ORDER BY updated DESC`;
    
    return await this.makeRequest('search', {
      jql,
      fields: 'summary,status,assignee,updated,created,priority,issuetype,resolution',
      maxResults: 100
    });
  }

  async getProject(projectKey) {
    return await this.makeRequest(`project/${projectKey}`);
  }
}