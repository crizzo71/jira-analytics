import dotenv from 'dotenv';

dotenv.config();

export const config = {
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || 'https://issues.redhat.com',
    apiToken: process.env.JIRA_API_TOKEN,
    authType: process.env.JIRA_AUTH_TYPE || 'bearer',
    projectKeys: process.env.JIRA_PROJECT_KEYS ? process.env.JIRA_PROJECT_KEYS.split(',') : [],
    boardIds: process.env.JIRA_BOARD_IDS ? process.env.JIRA_BOARD_IDS.split(',') : []
  },
  
  report: {
    weeksBack: parseInt(process.env.REPORT_WEEKS_BACK) || 1,
    velocitySprintsCount: parseInt(process.env.VELOCITY_SPRINTS_COUNT) || 6,
    outputFormat: 'markdown'
  }
};