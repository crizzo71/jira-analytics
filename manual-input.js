import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

export class ManualInputCollector {
  constructor() {
    this.inputData = {};
    this.inputFilePath = path.join(process.cwd(), 'manual-input.json');
  }

  async loadExistingInput() {
    try {
      const data = await fs.readFile(this.inputFilePath, 'utf-8');
      this.inputData = JSON.parse(data);
      console.log('📄 Loaded existing manual input data');
    } catch (error) {
      console.log('📝 No existing manual input found, starting fresh');
      this.inputData = this.getDefaultTemplate();
    }
  }

  getDefaultTemplate() {
    return {
      reportDate: new Date().toISOString().split('T')[0],
      teamMorale: {
        assessment: "",
        challenges: "",
        supportNeeded: ""
      },
      celebrations: {
        teamCelebrations: "",
        kudos: "",
        noteworthy: ""
      },
      milestones: {
        milestonesReached: "",
        releases: ""
      },
      forwardLooking: {
        upcomingPriorities: "",
        potentialBlockers: "",
        risks: ""
      },
      velocityHighlights: {
        trends: "",
        anomalies: "",
        context: ""
      }
    };
  }

  createReadlineInterface() {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async askQuestion(rl, question, currentValue = '') {
    return new Promise((resolve) => {
      const displayValue = currentValue ? ` [Current: ${currentValue}]` : '';
      rl.question(`${question}${displayValue}\n> `, (answer) => {
        resolve(answer.trim() || currentValue);
      });
    });
  }

  async collectInteractiveInput() {
    const rl = this.createReadlineInterface();
    
    console.log('\\n📋 Manual Input Collection for Weekly Report');
    console.log('===============================================');
    console.log('Press Enter to keep existing values, or type new values to update.\\n');

    try {
      // Team Morale Section
      console.log('🎭 TEAM MORALE AND CULTURE');
      console.log('---------------------------');
      
      this.inputData.teamMorale.assessment = await this.askQuestion(
        rl, 
        'Team morale assessment (brief summary of team sentiment):', 
        this.inputData.teamMorale.assessment
      );
      
      this.inputData.teamMorale.challenges = await this.askQuestion(
        rl, 
        'Current challenges affecting the team:', 
        this.inputData.teamMorale.challenges
      );
      
      this.inputData.teamMorale.supportNeeded = await this.askQuestion(
        rl, 
        'Support needed from leadership:', 
        this.inputData.teamMorale.supportNeeded
      );

      // Celebrations Section
      console.log('\\n🎉 CELEBRATIONS AND ACHIEVEMENTS');
      console.log('----------------------------------');
      
      this.inputData.celebrations.teamCelebrations = await this.askQuestion(
        rl, 
        'Team celebrations or positive feedback:', 
        this.inputData.celebrations.teamCelebrations
      );
      
      this.inputData.celebrations.kudos = await this.askQuestion(
        rl, 
        'Kudos/shoutouts for team members:', 
        this.inputData.celebrations.kudos
      );
      
      this.inputData.celebrations.noteworthy = await this.askQuestion(
        rl, 
        'Other noteworthy achievements:', 
        this.inputData.celebrations.noteworthy
      );

      // Milestones Section
      console.log('\\n🎯 MILESTONES AND RELEASES');
      console.log('----------------------------');
      
      this.inputData.milestones.milestonesReached = await this.askQuestion(
        rl, 
        'Major project milestones reached:', 
        this.inputData.milestones.milestonesReached
      );
      
      this.inputData.milestones.releases = await this.askQuestion(
        rl, 
        'Releases or deliverables completed:', 
        this.inputData.milestones.releases
      );

      // Forward Looking Section
      console.log('\\n🔮 FORWARD-LOOKING ITEMS');
      console.log('--------------------------');
      
      this.inputData.forwardLooking.upcomingPriorities = await this.askQuestion(
        rl, 
        'Upcoming priorities for next period:', 
        this.inputData.forwardLooking.upcomingPriorities
      );
      
      this.inputData.forwardLooking.potentialBlockers = await this.askQuestion(
        rl, 
        'Potential blockers or risks:', 
        this.inputData.forwardLooking.potentialBlockers
      );

      // Velocity Context Section
      console.log('\\n📊 VELOCITY AND PERFORMANCE CONTEXT');
      console.log('-------------------------------------');
      
      this.inputData.velocityHighlights.trends = await this.askQuestion(
        rl, 
        'Notable trends in team velocity:', 
        this.inputData.velocityHighlights.trends
      );
      
      this.inputData.velocityHighlights.anomalies = await this.askQuestion(
        rl, 
        'Explanation for any velocity anomalies:', 
        this.inputData.velocityHighlights.anomalies
      );

      this.inputData.reportDate = new Date().toISOString().split('T')[0];
      
      console.log('\\n✅ Manual input collection completed!');
      
    } finally {
      rl.close();
    }
  }

  async saveInput() {
    try {
      await fs.writeFile(this.inputFilePath, JSON.stringify(this.inputData, null, 2));
      console.log(`💾 Manual input saved to ${this.inputFilePath}`);
    } catch (error) {
      throw new Error(`Failed to save manual input: ${error.message}`);
    }
  }

  async getInputData() {
    await this.loadExistingInput();
    return this.inputData;
  }

  async collectAndSave() {
    await this.loadExistingInput();
    await this.collectInteractiveInput();
    await this.saveInput();
    return this.inputData;
  }

  async updateFromFile(inputFile) {
    try {
      const data = await fs.readFile(inputFile, 'utf-8');
      const newData = JSON.parse(data);
      this.inputData = { ...this.inputData, ...newData };
      await this.saveInput();
      console.log(`📥 Manual input updated from ${inputFile}`);
    } catch (error) {
      throw new Error(`Failed to update from file: ${error.message}`);
    }
  }
}