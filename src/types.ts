export interface ProviderKey {
  id: string;
  name: string; // "vertexai"
  displayName: string;
  projectId: string;
  location: string;
  key?: string; // Can be API Key or JSON string
  customHeaders?: Record<string, string>; // Additional request headers
  updatedAt: string;
}

export interface GatewayKey {
  id: string;
  name: string; // e.g. "Production Client", "Testing App"
  token: string; // "sk-gw-..."
  createdAt: string;
  status: 'active' | 'revoked' | 'disabled';
}

export interface RequestLog {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: number; // e.g., 200, 400, 500
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  prompt: string;
  response: string;
  isSimulated: boolean;
  error?: string;
  requestUrl?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
}

export interface DashboardStats {
  totalRequests: number;
  successRate: number; // percentage (0-100)
  avgLatencyMs: number;
  totalTokens: number;
  providerCounts: Record<string, number>;
  tokenUsageByProvider: Record<string, number>;
  dailyRequests: {
    date: string;
    requests: number;
    success: number;
    failed: number;
  }[];
}
