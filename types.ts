export interface SecurityControl {
  controlId: string;
  controlName: string;
  controlDescription: string;
  mapping: string;
  plane: 'Control Plane' | 'Data Plane';
}

export interface GenerationResponse {
  serviceName: string;
  controls: SecurityControl[];
  error?: string; // Support for guardrail rejection
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  reviewers: string; // Comma separated usernames
  branchBase: string;
}