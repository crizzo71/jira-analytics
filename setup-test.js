#!/usr/bin/env node

// Simple setup test without dependencies
import { readFileSync, existsSync } from 'fs';

console.log('🚀 Jira Status Builder Setup Test');
console.log('=================================\n');

// Check environment file
if (!existsSync('.env')) {
  console.error('❌ .env file not found');
  console.log('Run: cp .env.example .env');
  process.exit(1);
}

// Read environment variables manually (without dotenv)
const envContent = readFileSync('.env', 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    envVars[key] = value;
  }
});

console.log('📋 Environment Configuration:');
console.log('-----------------------------');
console.log(`JIRA_BASE_URL: ${envVars.JIRA_BASE_URL || 'Not set'}`);
console.log(`JIRA_API_TOKEN: ${envVars.JIRA_API_TOKEN ? 
  (envVars.JIRA_API_TOKEN === 'your_personal_access_token' ? 
    '❌ Default value - needs real token' : 
    '✅ Set (hidden)') : 
  '❌ Not set'}`);
console.log(`JIRA_PROJECT_KEYS: ${envVars.JIRA_PROJECT_KEYS || 'Not set'}`);

console.log('\n🔧 Setup Status:');
console.log('-----------------');

const hasValidToken = envVars.JIRA_API_TOKEN && 
  envVars.JIRA_API_TOKEN !== 'your_personal_access_token';

if (!hasValidToken) {
  console.log('❌ API Token needed');
  console.log('\n📝 To get your Red Hat Jira API Token:');
  console.log('1. Visit https://issues.redhat.com');
  console.log('2. Go to Account Settings → Security → API Tokens');
  console.log('3. Create new token');
  console.log('4. Edit .env file and replace "your_personal_access_token" with your token');
  console.log('\n⚠️  Never commit your .env file with real tokens!');
} else {
  console.log('✅ API Token configured');
  
  // Test API connection
  console.log('\n🌐 Testing API Connection...');
  testApiConnection(envVars);
}

async function testApiConnection(env) {
  try {
    const response = await fetch(`${env.JIRA_BASE_URL}/rest/api/2/myself`, {
      headers: {
        'Authorization': `Bearer ${env.JIRA_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      console.log(`✅ API connection successful`);
      console.log(`👤 Authenticated as: ${user.displayName} (${user.emailAddress})`);
      
      console.log('\n🎯 Ready to generate reports!');
      console.log('Next steps:');
      console.log('1. npm install  (fix npm permissions first)');
      console.log('2. npm run select  (choose project and boards)');
      console.log('3. npm start  (generate your first report)');
      
    } else {
      console.log(`❌ API connection failed: HTTP ${response.status}`);
      if (response.status === 401) {
        console.log('   Check your API token - it may be invalid or expired');
      }
    }
  } catch (error) {
    console.log(`❌ API connection error: ${error.message}`);
  }
}