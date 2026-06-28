import { Request, Response } from 'express';
import { loadDB, saveDB } from '../../db/local_store.js';
import { providerFactory } from '../providers/provider.factory.js';
import { GatewayKey, DashboardStats, RequestLog } from '../../types.js';
import crypto from 'crypto';

export const getProviderConfig = (req: Request, res: Response) => {
  const db = loadDB();
  res.json(db.providerKeys);
};

export const saveProviderConfig = (req: Request, res: Response) => {
  const { id, projectId, location, key, customHeaders } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing provider key ID' });
  }

  const db = loadDB();
  const providerKey = db.providerKeys.find(k => k.id === id);
  if (!providerKey) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  providerKey.projectId = projectId;
  providerKey.location = location || 'us-central1';
  providerKey.key = key || '';
  if (customHeaders) {
    providerKey.customHeaders = customHeaders;
  } else {
    delete providerKey.customHeaders;
  }
  providerKey.updatedAt = new Date().toISOString();
  saveDB(db);

  res.json({ success: true, message: `Updated credentials for ${providerKey.displayName}` });
};

export const getGatewayKeys = (req: Request, res: Response) => {
  const db = loadDB();
  res.json(db.gatewayKeys);
};

export const createGatewayKey = (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Token client identifier name is required' });
  }

  const db = loadDB();
  const randomBytes = crypto.randomBytes(24).toString('base64').replace(/[/+=]/g, '');
  const newToken: GatewayKey = {
    id: `gw-${Date.now()}`,
    name,
    token: `sk-aigw-${randomBytes}`,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  db.gatewayKeys.unshift(newToken);
  saveDB(db);

  res.status(201).json(newToken);
};

export const revokeGatewayKey = (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDB();
  const tokenIndex = db.gatewayKeys.findIndex(k => k.id === id);

  if (tokenIndex === -1) {
    return res.status(404).json({ error: 'Gateway token not found' });
  }

  db.gatewayKeys[tokenIndex].status = 'revoked';
  saveDB(db);

  res.json({ success: true, message: 'Token successfully revoked' });
};

export const deleteGatewayKey = (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDB();
  const tokenIndex = db.gatewayKeys.findIndex(k => k.id === id);

  if (tokenIndex === -1) {
    return res.status(404).json({ error: 'Gateway token not found' });
  }

  db.gatewayKeys.splice(tokenIndex, 1);
  saveDB(db);

  res.json({ success: true, message: 'Token successfully deleted' });
};

export const toggleGatewayKeyStatus = (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDB();
  const tokenIndex = db.gatewayKeys.findIndex(k => k.id === id);

  if (tokenIndex === -1) {
    return res.status(404).json({ error: 'Gateway token not found' });
  }

  const token = db.gatewayKeys[tokenIndex];
  if (token.status === 'revoked') {
    return res.status(400).json({ error: 'Cannot toggle a revoked token' });
  }

  token.status = token.status === 'active' ? 'disabled' : 'active';
  saveDB(db);

  res.json({ success: true, message: `Token successfully ${token.status}` });
};

export const getLogs = (req: Request, res: Response) => {
  const db = loadDB();
  res.json(db.logs);
};

export const getSettings = (req: Request, res: Response) => {
  const db = loadDB();
  res.json({ logLevel: db.logLevel });
};

export const updateSettings = (req: Request, res: Response) => {
  const { logLevel } = req.body;
  if (logLevel !== 'basic' && logLevel !== 'detailed') {
    return res.status(400).json({ error: 'Invalid logLevel. Must be basic or detailed.' });
  }

  const db = loadDB();
  db.logLevel = logLevel;
  saveDB(db);

  res.json({ success: true, logLevel: db.logLevel });
};

export const getDashboardStats = (req: Request, res: Response) => {
  const db = loadDB();
  const logs = db.logs;

  const totalRequests = logs.length;
  const successfulLogs = logs.filter(l => l.status === 200);
  const successRate = totalRequests > 0 ? Math.round((successfulLogs.length / totalRequests) * 100) : 100;

  const totalLatency = successfulLogs.reduce((sum, l) => sum + l.latencyMs, 0);
  const avgLatencyMs = successfulLogs.length > 0 ? Math.round(totalLatency / successfulLogs.length) : 0;

  const totalTokens = successfulLogs.reduce((sum, l) => sum + l.totalTokens, 0);

  const providerCounts: Record<string, number> = { vertexai: 0 };
  const tokenUsageByProvider: Record<string, number> = { vertexai: 0 };

  logs.forEach(l => {
    if (l.provider in providerCounts) {
      providerCounts[l.provider]++;
    }
    if (l.status === 200 && l.provider in tokenUsageByProvider) {
      tokenUsageByProvider[l.provider] += l.totalTokens;
    }
  });

  const last7DaysMap = new Map<string, { requests: number; success: number; failed: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - 3600000 * 24 * i);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    last7DaysMap.set(dateStr, { requests: 0, success: 0, failed: 0 });
  }

  logs.forEach(l => {
    const dateStr = new Date(l.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (last7DaysMap.has(dateStr)) {
      const stats = last7DaysMap.get(dateStr)!;
      stats.requests++;
      if (l.status === 200) {
        stats.success++;
      } else {
        stats.failed++;
      }
    }
  });

  const dailyRequests = Array.from(last7DaysMap.entries()).map(([date, item]) => ({
    date,
    requests: item.requests,
    success: item.success,
    failed: item.failed
  }));

  const stats: DashboardStats = {
    totalRequests,
    successRate,
    avgLatencyMs,
    totalTokens,
    providerCounts,
    tokenUsageByProvider,
    dailyRequests
  };

  res.json(stats);
};

export const testProviderConnection = async (req: Request, res: Response) => {

  const { provider: providerName, projectId, location, key, customHeaders } = req.body;
  if (!providerName) {
    return res.status(400).json({ error: 'Provider name is required' });
  }

  const provider = providerFactory.getProvider(providerName);
  if (!provider) {
    return res.json({ success: false, error: `Unknown provider: ${providerName}` });
  }

  let testProjectId = projectId;
  let testLocation = location;
  let testKey = key;
  let testCustomHeaders = customHeaders;
  const db = loadDB();

  if (!projectId && key === undefined && customHeaders === undefined) {
    const found = db.providerKeys.find(k => k.name === providerName);
    if (found) {
        testProjectId = found.projectId;
        testLocation = found.location;
        testKey = found.key;
        testCustomHeaders = found.customHeaders;
    }
  }

  if (providerName === 'vertexai' && !testProjectId) {
    testProjectId = process.env.GOOGLE_CLOUD_PROJECT || '';
  }

  const config = {
    projectId: testProjectId,
    location: testLocation,
    key: testKey,
    customHeaders: testCustomHeaders
  };

  const startTime = Date.now();
  const result = await provider.testConnection(config);
  const latencyMs = Date.now() - startTime;

  // Log the test request
  const newLog: RequestLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    provider: providerName,
    model: 'gemini-2.5-flash (Ping)',
    latencyMs,
    status: result.success ? 200 : 500,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    prompt: 'Ping check, respond with "OK" if you hear me.',
    response: result.message || '',
    isSimulated: false,
    error: result.error
  };

  db.logs.unshift(newLog);
  if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
  saveDB(db);

  return res.json(result);
};
