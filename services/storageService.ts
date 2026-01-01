import { PRContext, SecurityControl, PRStatus } from "../types";

const STORAGE_KEY = 'cloudguard_context_v1';

interface StorageSchema {
  [serviceName: string]: PRContext;
}

export const saveContext = (context: PRContext) => {
  const current = loadAllContext();
  // Normalize service name to key
  const key = context.serviceName.toLowerCase().trim();
  current[key] = context;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
};

export const getContext = (serviceName: string): PRContext | null => {
  const current = loadAllContext();
  const key = serviceName.toLowerCase().trim();
  return current[key] || null;
};

const loadAllContext = (): StorageSchema => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const updateContextStatus = (serviceName: string, status: PRStatus, controls?: SecurityControl[]) => {
  const context = getContext(serviceName);
  if (context) {
    context.status = status;
    context.lastUpdated = new Date().toISOString();
    if (controls) {
      context.controls = controls;
    }
    saveContext(context);
  }
};
