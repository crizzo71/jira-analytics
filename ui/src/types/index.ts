// API Types
export interface JiraConfig {
  token: string;
  baseUrl: string;
  isValid: boolean;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: string;
  projectTypeKey: string;
}

export interface Board {
  id: number;
  name: string;
  type: string;
  location?: {
    projectId: string;
    projectKey: string;
    projectName: string;
  };
}

export interface ProjectSelection {
  projectKey: string;
  projectName: string;
  boardIds: number[];
  timestamp: string;
}

// Report Types
export interface ReportConfig {
  dateRange: {
    start: string;
    end: string;
  };
  velocityPeriods: number;
  includeManualInput: boolean;
  formats: ReportFormat[];
}

export type ReportFormat = 'markdown' | 'html' | 'text' | 'json' | 'csv';

export interface ReportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentOperation?: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  format: ReportFormat;
  createdAt: string;
  projectKey: string;
  boardIds: number[];
  size: number;
  url: string;
}

// Manual Input Types
export interface ManualInputData {
  teamMorale: {
    score: number;
    explanation?: string;
  };
  celebrations: string[];
  milestones: {
    name: string;
    date: string;
    status: 'completed' | 'upcoming';
    description?: string;
  }[];
  blockers: {
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    jiraIssue?: string;
    description: string;
  }[];
  forwardPriorities: {
    title: string;
    order: number;
    jiraIssue?: string;
  }[];
}

// Velocity Types
export interface VelocityData {
  average: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  periods: {
    period: string;
    completed: number;
  }[];
}

// WebSocket Event Types
export interface ProgressEvent {
  reportId: string;
  percentage: number;
  status: string;
  message: string;
}

export interface ReportCompleteEvent {
  reportId: string;
  format: ReportFormat;
  url: string;
}

export interface ReportErrorEvent {
  reportId: string;
  error: string;
  retryable: boolean;
}

// UI State Types
export interface AppState {
  isAuthenticated: boolean;
  config: JiraConfig | null;
  selectedProject: ProjectSelection | null;
  reports: GeneratedReport[];
  currentOperation: 'idle' | 'fetching' | 'generating' | 'error';
}

// Form Types
export interface AuthForm {
  token: string;
  baseUrl: string;
}

export interface ProjectSelectForm {
  projectKey: string;
  boardSelectionMode: 'single' | 'multiple' | 'manual' | 'all';
  selectedBoardIds: number[];
  manualBoardIds: string;
}

export interface ReportGenerationForm {
  dateRange: {
    start: Date;
    end: Date;
  };
  velocityPeriods: number;
  formats: ReportFormat[];
  includeManualInput: boolean;
}