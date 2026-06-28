import * as fs from 'fs';
import * as path from 'path';
import { ProviderKey, GatewayKey, RequestLog } from '../types.js';

interface DBState {
  providerKeys: ProviderKey[];
  gatewayKeys: GatewayKey[];
  logs: RequestLog[];
  adminUsername?: string;
  adminSecret?: string;
  logLevel?: 'basic' | 'detailed';
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// In-memory fallback if file system write fails
let inMemoryState: DBState | null = null;

function getInitialState(): DBState {
  return {
    providerKeys: [
      {
        id: '1',
        name: 'vertexai',
        displayName: 'Google Vertex AI',
        projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
        location: 'us-central1',
        key: '',
        updatedAt: new Date().toISOString()
      }
    ],
    gatewayKeys: [
      {
        id: 'g1',
        name: 'Default Demo Client',
        token: 'sk-gw-demo-token-123456',
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ],
    logs: [
      // Seed some mock logs for initial analytics visualization if empty
      {
        id: 'log-seed-1',
        timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
        provider: 'vertexai',
        model: 'gemini-1.5-pro-preview-0409',
        latencyMs: 382,
        status: 200,
        promptTokens: 42,
        completionTokens: 120,
        totalTokens: 162,
        prompt: 'Explain quantum physics in one sentence.',
        response: 'Quantum physics is the study of how matter and energy behave at the smallest scales, where particles can exist in multiple states simultaneously.',
        isSimulated: false
      }
    ],
    adminUsername: 'admin',
    adminSecret: 'admin123',
    logLevel: 'basic'
  };
}

export function loadDB(): DBState {
  if (inMemoryState) {
    return inMemoryState;
  }

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const state = JSON.parse(data) as DBState;
      let dirty = false;

      // Automatically migrate database to include default credentials if missing
      if (!state.adminUsername) {
        state.adminUsername = 'admin';
        dirty = true;
      }
      if (!state.adminSecret) {
        state.adminSecret = 'admin123';
        dirty = true;
      }
      if (!state.logLevel) {
        state.logLevel = 'basic';
        dirty = true;
      }
      
      // Keep provider keys synced with vertexai if we just booted
      const vertexKey = state.providerKeys.find(k => k.name === 'vertexai');
      if (!vertexKey && state.providerKeys.length > 0) {
          state.providerKeys = getInitialState().providerKeys;
          dirty = true;
      }
      
      // Update old logs to use vertexai instead of previous providers
      state.logs.forEach(log => {
          if (log.provider !== 'vertexai') {
              log.provider = 'vertexai';
              dirty = true;
          }
      });

      if (dirty) {
        fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
      }

      return state;
    } else {
      const initialState = getInitialState();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
      return initialState;
    }
  } catch (error) {
    console.error('Local FS database error, falling back to in-memory store:', error);
    if (!inMemoryState) {
      inMemoryState = getInitialState();
    }
    return inMemoryState;
  }
}

export function saveDB(state: DBState): boolean {
  // Update in-memory cache
  inMemoryState = state;

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save to local FS database:', error);
    return false;
  }
}
