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
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}