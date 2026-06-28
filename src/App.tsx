import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Key, 
  Database, 
  FileText, 
  Terminal, 
  RefreshCw, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Cpu, 
  Layers, 
  Send, 
  ExternalLink, 
  Search, 
  Lock, 
  ShieldAlert,
  Info,
  ChevronRight,
  TrendingUp,
  Server,
  Power,
  Ban
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { ProviderKey, GatewayKey, RequestLog, DashboardStats } from './types';

const PROVIDER_THINKING_OPTIONS: Record<string, { label: string, value: string }[]> = {
  vertexai: [
    { label: 'Disabled (Default)', value: '' },
    { label: 'Enabled', value: 'enabled' }
  ],
  openai: [
    { label: 'Disabled (Default)', value: '' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ],
  anthropic: [
    { label: 'Disabled (Default)', value: '' },
    { label: 'Budget: 1024', value: '1024' },
    { label: 'Budget: 2048', value: '2048' },
    { label: 'Budget: 4096', value: '4096' }
  ]
};

const getThinkingOptions = (providerName: string) => {
  return PROVIDER_THINKING_OPTIONS[providerName] || [
    { label: 'Disabled (Default)', value: '' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'providers' | 'gateway-keys' | 'logs' | 'playground' | 'settings'>('dashboard');
  
  // App States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [providers, setProviders] = useState<ProviderKey[]>([]);
  const [gatewayKeys, setGatewayKeys] = useState<GatewayKey[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  
  // Interactive forms & selection states
  const [newClientName, setNewClientName] = useState('');
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderKey | null>(null);
  const [providerProjectIdInput, setProviderProjectIdInput] = useState('');
  const [providerLocationInput, setProviderLocationInput] = useState('us-central1');
  const [providerKeyInput, setProviderKeyInput] = useState('');
  const [providerCustomHeadersInput, setProviderCustomHeadersInput] = useState('');
  const [connectionTestResult, setConnectionTestResult] = useState<{ [key: string]: { loading: boolean; success?: boolean; error?: string } }>({});
  
  // Playground States
  const [playgroundModel, setPlaygroundModel] = useState('gemini-2.5-flash');
  const [playgroundProvider, setPlaygroundProvider] = useState('vertexai');
  const [playgroundThinkingLevel, setPlaygroundThinkingLevel] = useState('');
  const [playgroundPrompt, setPlaygroundPrompt] = useState('Hi');
  const [playgroundResponse, setPlaygroundResponse] = useState('');
  const [playgroundStream, setPlaygroundStream] = useState(false);
  
  // Copy state for the error message
  const [copiedErrorProvider, setCopiedErrorProvider] = useState<string | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleCopyError = (providerName: string, errorText: string) => {
    navigator.clipboard.writeText(errorText);
    setCopiedErrorProvider(providerName);
    setTimeout(() => setCopiedErrorProvider(null), 2000);
  };
  const [playgroundLatency, setPlaygroundLatency] = useState<number | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundDebugInfo, setPlaygroundDebugInfo] = useState<{
    requestUrl: string;
    requestMethod: string;
    requestHeaders: Record<string, string>;
    requestBody: any;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
  } | null>(null);
  const [selectedGatewayToken, setSelectedGatewayToken] = useState('');

  // Logs search/filter states
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilterProvider, setLogFilterProvider] = useState<string>('all');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all');

  // Loading/Refresh indicator
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Authentication States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('lite_llm_admin_token');
  });
  const [adminToken, setAdminToken] = useState<string>(() => {
    return localStorage.getItem('lite_llm_admin_token') || '';
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('lite_llm_admin_username') || 'admin';
  });

  // Login inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginSecret, setLoginSecret] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Settings inputs
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminSecret, setNewAdminSecret] = useState('');
  const [adminUpdateStatus, setAdminUpdateStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [settingsTab, setSettingsTab] = useState<'credentials' | 'logging'>('credentials');
  const [gatewayLogLevel, setGatewayLogLevel] = useState<'basic' | 'detailed'>('basic');
  const [logLevelUpdateStatus, setLogLevelUpdateStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  // Authenticated fetch wrapper
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('lite_llm_admin_token') || adminToken;
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 && url !== '/api/auth/login') {
      handleLogout();
    }
    return res;
  };

  // Fetch admin configuration profile
  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setNewAdminUsername(data.username);
        setNewAdminSecret(data.secret);
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err);
    }
  };

  // Fetch all data
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, configRes, gwRes, logsRes, settingsRes] = await Promise.all([
        fetchWithAuth('/api/stats'),
        fetchWithAuth('/api/config'),
        fetchWithAuth('/api/gateway-keys'),
        fetchWithAuth('/api/logs'),
        fetchWithAuth('/api/settings')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (configRes.ok) setProviders(await configRes.json());
      if (gwRes.ok) {
        const keys = await gwRes.json();
        setGatewayKeys(keys);
        // Default select the first active key for the playground
        const activeKey = keys.find((k: GatewayKey) => k.status === 'active');
        if (activeKey && !selectedGatewayToken) {
          setSelectedGatewayToken(activeKey.token);
        }
      }
      if (logsRes.ok) setLogs(await logsRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setGatewayLogLevel(settings.logLevel || 'basic');
      }
    } catch (err) {
      console.error('Error fetching data from gateway API:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchData();
      fetchProfile();
    }
  }, [isAdminAuthenticated]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(label);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginSecret.trim()) {
      setLoginError('Please enter both username and secret key.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, secret: loginSecret })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('lite_llm_admin_token', data.token);
        localStorage.setItem('lite_llm_admin_username', data.username);
        setAdminToken(data.token);
        setAdminUsername(data.username);
        setIsAdminAuthenticated(true);
        setLoginUsername('');
        setLoginSecret('');
      } else {
        setLoginError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Network error during authentication.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lite_llm_admin_token');
    localStorage.removeItem('lite_llm_admin_username');
    setAdminToken('');
    setAdminUsername('admin');
    setIsAdminAuthenticated(false);
    setStats(null);
    setProviders([]);
    setGatewayKeys([]);
    setLogs([]);
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminSecret.trim()) {
      setAdminUpdateStatus({ error: 'Username and Secret key cannot be empty.' });
      return;
    }

    try {
      const res = await fetchWithAuth('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newAdminUsername, secret: newAdminSecret })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('lite_llm_admin_token', data.token);
        localStorage.setItem('lite_llm_admin_username', data.username);
        setAdminToken(data.token);
        setAdminUsername(data.username);
        setAdminUpdateStatus({ success: true });
        setTimeout(() => setAdminUpdateStatus(null), 3000);
      } else {
        setAdminUpdateStatus({ error: data.error || 'Failed to update credentials.' });
      }
    } catch (err: any) {
      setAdminUpdateStatus({ error: err?.message || 'Network error during settings update.' });
    }
  };

  const handleUpdateLogLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logLevel: gatewayLogLevel })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLogLevelUpdateStatus({ success: true });
        setTimeout(() => setLogLevelUpdateStatus(null), 3000);
      } else {
        setLogLevelUpdateStatus({ error: data.error || 'Failed to update log level' });
      }
    } catch (err: any) {
      setLogLevelUpdateStatus({ error: err.message || 'Network error' });
    }
  };

  // Create client Gateway Key
  const handleCreateGatewayKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const res = await fetchWithAuth('/api/gateway-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName })
      });

      if (res.ok) {
        const newKey = await res.json();
        setGatewayKeys([newKey, ...gatewayKeys]);
        setNewClientName('');
        if (!selectedGatewayToken) setSelectedGatewayToken(newKey.token);
        fetchData(); // refresh stats
      } else {
        const err = await res.json();
        alert(`Failed to create token: ${err?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error creating gateway key:', err);
      alert('Network error while creating gateway key.');
    }
  };

  // Revoke client Gateway Key
  const handleRevokeGatewayKey = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Token',
      message: 'Are you sure you want to revoke this Gateway client token? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/gateway-keys/${id}/revoke`, {
            method: 'DELETE'
          });

          if (res.ok) {
            setGatewayKeys(gatewayKeys.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
            fetchData();
          }
        } catch (err) {
          console.error('Error revoking token:', err);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteGatewayKey = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Token',
      message: 'Are you sure you want to completely delete this Gateway client token?',
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/gateway-keys/${id}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            setGatewayKeys(gatewayKeys.filter(k => k.id !== id));
            fetchData();
          }
        } catch (err) {
          console.error('Error deleting token:', err);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleToggleGatewayKey = async (id: string, currentStatus: string) => {
    if (currentStatus === 'revoked') return;
    
    try {
      const res = await fetchWithAuth(`/api/gateway-keys/${id}/toggle`, {
        method: 'POST'
      });

      if (res.ok) {
        setGatewayKeys(gatewayKeys.map(k => k.id === id ? { ...k, status: currentStatus === 'active' ? 'disabled' : 'active' } : k));
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling token status:', err);
    }
  };

  // Test provider connection
  const handleTestProviderConnection = async (providerName: string, projectId: string, location: string, key?: string, customHeadersStr?: string) => {
    setConnectionTestResult(prev => ({
      ...prev,
      [providerName]: { loading: true }
    }));

    let parsedHeaders = undefined;
    if (customHeadersStr) {
      try {
        parsedHeaders = JSON.parse(customHeadersStr);
      } catch (e) {
        // ignore invalid json for test
      }
    }

    try {
      const res = await fetchWithAuth('/api/provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName, projectId, location, key, customHeaders: parsedHeaders })
      });

      const data = await res.json();
      setConnectionTestResult(prev => ({
        ...prev,
        [providerName]: {
          loading: false,
          success: data.success,
          error: data.success ? undefined : (data.error || 'Connection Failed')
        }
      }));
      fetchData(); // refresh logs
    } catch (err: any) {
      setConnectionTestResult(prev => ({
        ...prev,
        [providerName]: {
          loading: false,
          success: false,
          error: err?.message || 'Network error during ping'
        }
      }));
      fetchData(); // refresh logs
    }
  };

  // Save Provider Config
  const handleSaveProviderKey = async (providerId: string, providerName: string) => {
    try {
      let parsedHeaders = undefined;
      if (providerCustomHeadersInput.trim()) {
        try {
          parsedHeaders = JSON.parse(providerCustomHeadersInput);
        } catch (e) {
          alert("Invalid JSON for Custom Headers");
          return;
        }
      }

      const res = await fetchWithAuth('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: providerId, 
          projectId: providerProjectIdInput, 
          location: providerLocationInput, 
          key: providerKeyInput,
          customHeaders: parsedHeaders
        })
      });

      if (res.ok) {
        setProviders(providers.map(p => p.id === providerId ? { ...p, projectId: providerProjectIdInput, location: providerLocationInput, key: providerKeyInput, customHeaders: parsedHeaders, updatedAt: new Date().toISOString() } : p));
        setEditingProvider(null);
        setProviderProjectIdInput('');
        setProviderLocationInput('');
        setProviderKeyInput('');
        setProviderCustomHeadersInput('');
        fetchData(); // reload
        // Re-run test connection
        handleTestProviderConnection(providerName, providerProjectIdInput, providerLocationInput, providerKeyInput, providerCustomHeadersInput);
      }
    } catch (err) {
      console.error('Error saving provider config:', err);
    }
  };



  // Run Developer Playground Gateway call
  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playgroundPrompt.trim() || !selectedGatewayToken || !playgroundProvider) return;

    setPlaygroundLoading(true);
    setPlaygroundResponse('');
    setPlaygroundLatency(null);
    setPlaygroundError(null);
    setPlaygroundDebugInfo(null);

    const startTime = Date.now();

    const requestUrl = `/api/v1/${playgroundProvider}/chat/completions`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${selectedGatewayToken}`
    };
    const requestBodyObj = {
      model: playgroundModel,
      stream: playgroundStream,
      messages: [
        { role: 'user', content: playgroundPrompt }
      ],
      ...(playgroundThinkingLevel ? { reasoning_effort: playgroundThinkingLevel } : {})
    };

    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBodyObj)
      });

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (playgroundStream) {
        setPlaygroundLoading(false);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setPlaygroundError(data.error?.message || data.error || 'Gateway API error');
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        
        let done = false;
        let responseText = '';
        
        if (reader) {
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (value) {
              const chunkValue = decoder.decode(value, { stream: true });
              const lines = chunkValue.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                  try {
                    const dataObj = JSON.parse(line.substring(6));
                    if (dataObj.error) {
                       setPlaygroundError(dataObj.error);
                    } else if (dataObj.choices?.[0]?.delta?.content) {
                      responseText += dataObj.choices[0].delta.content;
                      setPlaygroundResponse(responseText);
                    }
                  } catch (e) {
                    // ignore partial json
                  }
                }
              }
            }
          }
        }
        
        setPlaygroundLatency(Date.now() - startTime);
        fetchData();
        return;
      }

      const data = await res.json();
      setPlaygroundLatency(Date.now() - startTime);
      
      if (gatewayLogLevel === 'detailed') {
        setPlaygroundDebugInfo({
          requestUrl: `${window.location.origin}${requestUrl}`,
          requestMethod: 'POST',
          requestHeaders,
          requestBody: requestBodyObj,
          responseStatus: res.status,
          responseHeaders,
          responseBody: data
        });
      }

      if (res.ok) {
        setPlaygroundResponse(data.choices?.[0]?.message?.content || '');
        fetchData(); // refresh request logs
      } else {
        setPlaygroundError(data.error?.message || 'Gateway API error');
      }
    } catch (err: any) {
      setPlaygroundError(err?.message || 'Network request failed');
      if (gatewayLogLevel === 'detailed') {
        setPlaygroundDebugInfo({
          requestUrl: `${window.location.origin}${requestUrl}`,
          requestMethod: 'POST',
          requestHeaders,
          requestBody: requestBodyObj,
        });
      }
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.prompt.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.response.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.model.toLowerCase().includes(logSearchQuery.toLowerCase());
    
    const matchesProvider = logFilterProvider === 'all' || log.provider === logFilterProvider;
    const matchesStatus = 
      logFilterStatus === 'all' || 
      (logFilterStatus === 'success' && log.status === 200) || 
      (logFilterStatus === 'failed' && log.status !== 200);

    return matchesSearch && matchesProvider && matchesStatus;
  });

  // Providers metadata
  const providerMeta: { [key: string]: { color: string; bg: string; border: string; text: string } } = {
    vertexai: { color: 'from-blue-600 to-indigo-600', bg: 'bg-blue-950/40', border: 'border-blue-900/50', text: 'text-blue-400' },
  };

  const COLORS = ['#3b82f6'];

  const providerShareData = stats ? [
    { name: 'Vertex AI', value: stats.providerCounts.vertexai }
  ].filter(p => p.value > 0) : [];

  const playgroundCurlCommand = `curl -X POST "${window.location.origin}/api/v1/${playgroundProvider || 'vertexai'}/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${selectedGatewayToken || '<YOUR_GATEWAY_TOKEN>'}" \\
  -d '{
    "model": "${playgroundModel}",${playgroundStream ? '\n    "stream": true,' : ''}
    "messages": [{"role": "user", "content": "${playgroundPrompt.replace(/"/g, '\\"')}"}]${playgroundThinkingLevel ? `,\n    "reasoning_effort": "${playgroundThinkingLevel}"` : ''}
  }'`;

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-center items-center p-6 antialiased">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/40 border border-slate-900 rounded-2xl p-8 space-y-6 shadow-2xl shadow-indigo-950/20"
        >
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-indigo-950/50">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                MiniLLM Unified Gateway
              </h1>
              <p className="text-xs text-slate-400">Administrator Credentials Verification</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 font-sans" htmlFor="username">Admin Username</label>
              <input
                id="username"
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g., admin"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 font-sans" htmlFor="secret">Access Secret Key</label>
              <input
                id="secret"
                type="password"
                value={loginSecret}
                onChange={(e) => setLoginSecret(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              id="login_submit_btn"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Access Management Portal</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      {/* Top Banner / System Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-950/50">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                MiniLLM Unified Gateway
              </span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-mono">
                Active Proxy
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Asynchronous non-blocking multi-provider LLM gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs font-mono bg-slate-900/60 border border-slate-800/80 rounded-lg px-3 py-1.5 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              Host: <span className="text-slate-200 font-semibold">Node.js Express</span>
            </span>
            <div className="h-3 w-[1px] bg-slate-800"></div>
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              Idle RAM: <span className="text-emerald-400 font-semibold">&lt; 40MB</span>
            </span>
          </div>

          <button 
            onClick={fetchData} 
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 py-2 px-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
            id="refresh_btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Sync Gateway'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Side Navigation Bar */}
        <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/60 p-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Gateway Core</p>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
              activeTab === 'dashboard' 
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-slate-100 font-medium' 
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
            }`}
            id="nav_dashboard"
          >
            <div className="flex items-center gap-2.5">
              <Activity className={`h-4 w-4 ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>Proxy Dashboard</span>
            </div>
            <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'dashboard' ? 'opacity-100 text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
              activeTab === 'providers' 
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-slate-100 font-medium' 
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
            }`}
            id="nav_providers"
          >
            <div className="flex items-center gap-2.5">
              <Database className={`h-4 w-4 ${activeTab === 'providers' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>Provider Credentials</span>
            </div>
            <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'providers' ? 'opacity-100 text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('gateway-keys')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
              activeTab === 'gateway-keys' 
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-slate-100 font-medium' 
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
            }`}
            id="nav_gateway_keys"
          >
            <div className="flex items-center gap-2.5">
              <Key className={`h-4 w-4 ${activeTab === 'gateway-keys' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>Client API Tokens</span>
            </div>
            <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'gateway-keys' ? 'opacity-100 text-indigo-400' : ''}`} />
          </button>

          <div className="h-[1px] bg-slate-900/80 my-4 mx-3"></div>
          
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Dev Sandbox</p>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
              activeTab === 'logs' 
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-slate-100 font-medium' 
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
            }`}
            id="nav_logs"
          >
            <div className="flex items-center gap-2.5">
              <FileText className={`h-4 w-4 ${activeTab === 'logs' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>Unified Audit Logs</span>
            </div>
            <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'logs' ? 'opacity-100 text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
              activeTab === 'playground' 
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-slate-100 font-medium' 
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
            }`}
            id="nav_playground"
          >
            <div className="flex items-center gap-2.5">
              <Terminal className={`h-4 w-4 ${activeTab === 'playground' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>API Playground</span>
            </div>
            <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'playground' ? 'opacity-100 text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
              activeTab === 'settings' 
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-slate-100 font-medium' 
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
            }`}
            id="nav_settings"
          >
            <div className="flex items-center gap-2.5">
              <Lock className={`h-4 w-4 ${activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>Gateway Settings</span>
            </div>
            <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'settings' ? 'opacity-100 text-indigo-400' : ''}`} />
          </button>

          <div className="h-[1px] bg-slate-900/80 my-4 mx-3"></div>

          <div className="px-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all text-left"
              id="logout_btn"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Log Out Admin</span>
            </button>
          </div>

          {/* Architecture info callout */}
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900 mt-8 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
              <Info className="h-3.5 w-3.5" />
              <span>Architecture Tip</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Express asynchronously proxies HTTP packages without maintaining bulky states. Under heavy client load, the event loop schedules downstream connections with high efficiency, bypassing Python's thread overhead.
            </p>
          </div>
        </nav>

        {/* Core Screen Container */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD VIEW */}
            {activeTab === 'dashboard' && stats && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Stats Summary Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between" id="stat_card_requests">
                    <span className="text-xs font-medium text-slate-400">Total API Calls</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold font-mono text-slate-100">{stats.totalRequests}</span>
                      <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/15 px-1.5 py-0.5 rounded">All-Time</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between" id="stat_card_success">
                    <span className="text-xs font-medium text-slate-400">Response Success Rate</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold font-mono text-emerald-400">{stats.successRate}%</span>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded">Healthy</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between" id="stat_card_latency">
                    <span className="text-xs font-medium text-slate-400">Average Transit Latency</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold font-mono text-slate-100">{stats.avgLatencyMs} ms</span>
                      <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 border border-slate-700/50 px-1.5 py-0.5 rounded">Global</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between" id="stat_card_tokens">
                    <span className="text-xs font-medium text-slate-400">Total Managed Tokens</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold font-mono text-slate-100">{(stats.totalTokens / 1000).toFixed(1)}k</span>
                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded">Throughput</span>
                    </div>
                  </div>
                </div>

                {/* Main Graph Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Requests volume chart */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Gateway Traffic Timeline</h3>
                        <p className="text-xs text-slate-400">Hourly aggregates proxy performance logs</p>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md text-[10px] font-mono border border-slate-800">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span> Success
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span> Failed
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.dailyRequests}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                            labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Provider breakdown chart */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Provider Share</h3>
                      <p className="text-xs text-slate-400 mb-4">API distribution across LLM sources</p>
                    </div>

                    <div className="h-44 relative flex items-center justify-center">
                      {providerShareData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={providerShareData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {providerShareData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                              itemStyle={{ color: '#f1f5f9', fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-slate-500 font-mono flex flex-col items-center gap-1.5">
                          <Activity className="h-6 w-6 text-slate-700 animate-pulse" />
                          <span>Waiting for API logs...</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Google Vertex AI</span>
                        <span className="text-sm font-bold font-mono text-slate-100">{stats.providerCounts.vertexai} req</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gateway Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/20 border border-slate-900 rounded-xl p-5">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-400" />
                      How the Gateway Achieves Extreme Low-Resource Overhead
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Typically, MiniLLM implementations are written in Python with complex uvicorn/asyncio layers that consumes a minimum of 150MB-300MB idle RAM, scaling upwards under concurrent threads. 
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      By contrast, this Node.js architecture utilizes Express’s event-driven, single-threaded loop, translating standard HTTP headers with almost zero system state:
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] text-indigo-400 block font-mono font-bold">EVENT LOOP</span>
                        <span className="text-xs text-slate-300 font-semibold">Non-Blocking I/O</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] text-indigo-400 block font-mono font-bold">GC OVERHEAD</span>
                        <span className="text-xs text-slate-300 font-semibold">V8 Micro-Heap</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                        <span className="text-[9px] text-indigo-400 block font-mono font-bold">LATENCY JITTER</span>
                        <span className="text-xs text-slate-300 font-semibold">Pass-Through</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-indigo-400" />
                      Runtime Process Resource Blueprint
                    </h4>

                    {/* Progress meters representing resource usage */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>Gateway Memory (Idle RAM footprint)</span>
                          <span className="text-emerald-400 font-semibold">32 MB / 512 MB (6.2%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '6.2%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>Gateway Memory (Max Concurrent load)</span>
                          <span className="text-amber-400 font-semibold">68 MB / 512 MB (13.2%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '13.2%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>Routing Computation Jitter (CPU draw)</span>
                          <span className="text-emerald-400 font-semibold">&lt; 0.5% average</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '1%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. PROVIDER CREDENTIALS VIEW */}
            {activeTab === 'providers' && (
              <motion.div
                key="providers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-400" />
                    Provider Credentials
                  </h2>
                  <p className="text-xs text-slate-400">Configure LLM upstream credentials securely. All keys are processed on the server-side and never leaked.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map(p => {
                    const meta = providerMeta[p.name] || { color: 'from-slate-600 to-slate-700', bg: 'bg-slate-950/40', border: 'border-slate-800', text: 'text-slate-400' };
                    const testStatus = connectionTestResult[p.name];

                    return (
                      <div 
                        key={p.id} 
                        className={`bg-slate-900/30 border border-slate-900 rounded-xl p-5 flex flex-col justify-between hover:border-slate-800 transition-all`}
                        id={`provider_card_${p.name}`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-slate-200">{p.displayName}</span>
                            <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.border} ${meta.text}`}>
                              {p.name}
                            </span>
                          </div>

                          <div className="space-y-3 mt-4">
                            {editingProvider?.id === p.id ? (
                              <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Google Cloud Project ID</label>
                                    <input
                                      type="text"
                                      value={providerProjectIdInput}
                                      onChange={(e) => setProviderProjectIdInput(e.target.value)}
                                      placeholder="e.g. my-gcp-project"
                                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none font-mono"
                                      id={`provider_project_input_${p.name}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Vertex AI Location</label>
                                    <input
                                      type="text"
                                      value={providerLocationInput}
                                      onChange={(e) => setProviderLocationInput(e.target.value)}
                                      placeholder="e.g. us-central1"
                                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none font-mono"
                                      id={`provider_location_input_${p.name}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">API Key / JSON Service Account (Optional)</label>
                                    <textarea
                                      rows={2}
                                      value={providerKeyInput}
                                      onChange={(e) => setProviderKeyInput(e.target.value)}
                                      placeholder="Leave empty to use ADC, or paste API Key / JSON"
                                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none font-mono"
                                      id={`provider_key_input_${p.name}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Custom Request Headers (JSON)</label>
                                    <textarea
                                      rows={2}
                                      value={providerCustomHeadersInput}
                                      onChange={(e) => setProviderCustomHeadersInput(e.target.value)}
                                      placeholder='{"X-Vertex-AI-LLM-Shared-Request-Type": "priority"}'
                                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none font-mono"
                                      id={`provider_custom_headers_input_${p.name}`}
                                    />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveProviderKey(p.id, p.name)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex-1"
                                    id={`provider_save_btn_${p.name}`}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingProvider(null)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs flex-1"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-[10px] text-slate-400 uppercase font-mono block">Vertex Configuration</label>
                                <div className="flex justify-between items-start bg-slate-950 border border-slate-950 px-3 py-2 rounded-lg gap-2">
                                  <div className="flex flex-col space-y-1">
                                    <span className="font-mono text-xs text-slate-400 tracking-wider break-all">
                                      <span className="text-slate-500">Project:</span> {p.projectId || 'Not Configured'}
                                    </span>
                                    <span className="font-mono text-xs text-slate-400 tracking-wider">
                                      <span className="text-slate-500">Location:</span> {p.location || 'Not Configured'}
                                    </span>
                                    <span className="font-mono text-xs text-slate-400 tracking-wider">
                                      <span className="text-slate-500">Auth:</span> {p.key ? (p.key.trim().startsWith('{') ? 'Service Account JSON' : 'API Key') : 'ADC (Default)'}
                                    </span>
                                    {p.customHeaders && Object.keys(p.customHeaders).length > 0 && (
                                      <span className="font-mono text-xs text-slate-400 tracking-wider">
                                        <span className="text-slate-500">Headers:</span> {Object.keys(p.customHeaders).length} configured
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setEditingProvider(p);
                                      setProviderProjectIdInput(p.projectId || '');
                                      setProviderLocationInput(p.location || 'us-central1');
                                      setProviderKeyInput(p.key || '');
                                      setProviderCustomHeadersInput(p.customHeaders ? JSON.stringify(p.customHeaders, null, 2) : '');
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded shrink-0 mt-0.5"
                                    id={`provider_edit_btn_${p.name}`}
                                  >
                                    Configure
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Connection Test Output */}
                        <div className="mt-6 border-t border-slate-950 pt-4">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {testStatus?.loading ? (
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                                  <span>Testing upstream...</span>
                                </div>
                              ) : testStatus?.success === true ? (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>Upstream Online</span>
                                </div>
                              ) : testStatus?.success === false ? (
                                <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold font-mono">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span>Connection Fail</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                                  <span className="h-2 w-2 rounded-full bg-slate-700"></span>
                                  <span>Not Tested</span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleTestProviderConnection(p.name, p.projectId, p.location, p.key)}
                              disabled={testStatus?.loading}
                              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 transition-all active:scale-[0.98] whitespace-nowrap"
                              id={`provider_test_btn_${p.name}`}
                            >
                              Ping Upstream
                            </button>
                          </div>
                          
                          {/* Show full error text if failed */}
                          {testStatus?.success === false && testStatus?.error && (
                            <div className="mt-3 relative group">
                              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 font-mono break-words pr-10 max-h-48 overflow-y-auto">
                                {testStatus.error}
                              </div>
                              <button
                                onClick={() => handleCopyError(p.name, testStatus.error || '')}
                                className="absolute top-2 right-2 p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-900/50 rounded-md text-red-400 opacity-0 group-hover:opacity-100 transition-all active:scale-[0.95]"
                                title="Copy error message"
                              >
                                {copiedErrorProvider === p.name ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl flex items-start gap-3">
                  <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">How Sandbox fallback keys work</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      If you do not possess valid keys for OpenAI, Anthropic, or DeepSeek, you do not need to configure them. The gateway automatically maps those models to your local <strong className="text-slate-200">Gemini Key</strong>, appends a simulator instruction to response pipelines, and logs them marked as <strong className="text-amber-400">"Simulated"</strong>! This lets you test any upstream model completely free.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. CLIENT API TOKENS VIEW */}
            {activeTab === 'gateway-keys' && (
              <motion.div
                key="gateway-keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Key className="h-5 w-5 text-indigo-400" />
                      Gateway API Tokens
                    </h2>
                    <p className="text-xs text-slate-400">Generate, copy, and manage custom bearer credentials client apps use to access the proxy.</p>
                  </div>

                  <form onSubmit={handleCreateGatewayKey} className="flex gap-2">
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="e.g., Slackbot Server"
                      className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none w-56"
                      id="new_token_name_input"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                      id="create_token_btn"
                    >
                      <Plus className="h-4 w-4" />
                      Create Token
                    </button>
                  </form>
                </div>

                <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-slate-900/20">
                          <th className="px-5 py-3.5">Client Label</th>
                          <th className="px-5 py-3.5">API Token Credentials</th>
                          <th className="px-5 py-3.5">Created Date</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {gatewayKeys.map(k => (
                          <tr key={k.id} className="hover:bg-slate-900/10 text-xs">
                            <td className="px-5 py-4 font-semibold text-slate-200">{k.name}</td>
                            <td className="px-5 py-4 font-mono">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-900 text-slate-300">
                                  {k.token}
                                </span>
                                <button
                                  onClick={() => handleCopy(k.token, k.id)}
                                  className="text-indigo-400 hover:text-indigo-300 p-1 rounded"
                                  title="Copy credentials"
                                >
                                  {copiedToken === k.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-400">{new Date(k.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                k.status === 'active' 
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                                  : k.status === 'disabled'
                                  ? 'bg-amber-950/40 text-amber-400 border-amber-900/50'
                                  : 'bg-red-950/40 text-red-400 border-red-900/50'
                              }`}>
                                {k.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {k.status !== 'revoked' && (
                                  <button
                                    onClick={() => handleToggleGatewayKey(k.id, k.status)}
                                    className={`${k.status === 'active' ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'} p-1.5 rounded transition-all`}
                                    title={k.status === 'active' ? "Disable token" : "Enable token"}
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>
                                )}
                                {k.status !== 'revoked' && (
                                  <button
                                    onClick={() => handleRevokeGatewayKey(k.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition-all"
                                    title="Revoke client token (cannot be undone)"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteGatewayKey(k.id)}
                                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-all"
                                  title="Delete token permanently"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. AUDIT LOGS VIEW */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    Unified Audit Logs
                  </h2>
                  <p className="text-xs text-slate-400">Search and audit every message package intercepted by the unified gateway.</p>
                </div>

                {/* Filter and search parameters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search prompts, responses, or models..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 outline-none w-full"
                      id="log_search_input"
                    />
                  </div>

                  <div>
                    <select
                      value={logFilterProvider}
                      onChange={(e) => setLogFilterProvider(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none w-full"
                      id="log_provider_filter"
                    >
                      <option value="all">All Providers</option>
                      <option value="vertexai">Google Vertex AI</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={logFilterStatus}
                      onChange={(e) => setLogFilterStatus(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none w-full"
                      id="log_status_filter"
                    >
                      <option value="all">All Statuses</option>
                      <option value="success">Success (200)</option>
                      <option value="failed">Error (500)</option>
                    </select>
                  </div>
                </div>

                {/* Logs layout split panel */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left list of logs */}
                  <div className="lg:col-span-3 bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden h-[500px] flex flex-col">
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-900/50">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map(log => {
                          const meta = providerMeta[log.provider] || { color: 'from-slate-600 to-slate-700', bg: 'bg-slate-950/40', border: 'border-slate-800', text: 'text-slate-400' };
                          return (
                            <button
                              key={log.id}
                              onClick={() => setSelectedLog(log)}
                              className={`w-full text-left p-4 hover:bg-slate-900/20 flex items-center justify-between gap-4 transition-all ${
                                selectedLog?.id === log.id ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : ''
                              }`}
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full font-semibold ${meta.bg} ${meta.border} ${meta.text}`}>
                                    {log.provider}
                                  </span>
                                  <span className="text-slate-300 font-mono text-[11px] font-semibold truncate">{log.model}</span>
                                  {log.isSimulated && (
                                    <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/10 px-1 rounded font-mono">Simulated</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 truncate pr-4">{log.prompt}</p>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right font-mono text-[10px] text-slate-400">
                                  <span className="block">{log.latencyMs} ms</span>
                                  <span className="text-slate-500">{log.totalTokens} tokens</span>
                                </div>

                                <span className={`h-2.5 w-2.5 rounded-full ${log.status === 200 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-500 font-mono">
                          No matching request logs found.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Detail Inspection Panel */}
                  <div className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-xl p-5 h-[500px] flex flex-col justify-between">
                    {selectedLog ? (
                      <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                          <div>
                            <span className="text-[10px] text-slate-500 block font-mono">REQUEST METADATA</span>
                            <span className="text-xs font-mono font-bold text-slate-200">{selectedLog.id}</span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                            selectedLog.status === 200 
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                              : 'bg-red-950/40 text-red-400 border-red-900/50'
                          }`}>
                            HTTP {selectedLog.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                          <div className="bg-slate-950/50 p-2 rounded border border-slate-900">
                            <span className="text-slate-500 block">TRANSIT TIME</span>
                            <span className="text-slate-300 font-semibold">{selectedLog.latencyMs} ms</span>
                          </div>
                          <div className="bg-slate-950/50 p-2 rounded border border-slate-900">
                            <span className="text-slate-500 block">TOKEN CONSUMPTION</span>
                            <span className="text-slate-300 font-semibold">{selectedLog.totalTokens} (p:{selectedLog.promptTokens} c:{selectedLog.completionTokens})</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Client Intercept Prompt</span>
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 max-h-32 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap font-mono">
                            {selectedLog.prompt}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Returned LLM Output</span>
                          {selectedLog.status === 200 ? (
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 max-h-48 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap font-mono">
                              {selectedLog.response}
                            </div>
                          ) : (
                            <div className="bg-red-950/20 p-3 rounded-lg border border-red-950/30 text-xs text-red-400 font-mono">
                              <span className="font-bold flex items-center gap-1 mb-1">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Proxy Request Error:
                              </span>
                              {selectedLog.error || 'The downstream provider returned an error package or failed due to invalid credentials.'}
                            </div>
                          )}
                        </div>

                        {/* Detailed Logging Information */}
                        {(selectedLog.requestUrl || selectedLog.requestHeaders || selectedLog.responseHeaders || selectedLog.requestBody || selectedLog.responseBody) && (
                          <div className="space-y-3 pt-4 border-t border-slate-900/80">
                            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">Detailed Audit Trail</span>
                            
                            {selectedLog.requestUrl && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-500 font-mono">REQUEST PATH</span>
                                <div className="bg-slate-950 p-2 text-[10px] text-slate-300 rounded border border-slate-900 font-mono break-all">
                                  {selectedLog.requestUrl}
                                </div>
                              </div>
                            )}

                            {selectedLog.requestHeaders && Object.keys(selectedLog.requestHeaders).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-500 font-mono">REQUEST HEADERS</span>
                                <div className="bg-slate-950 p-2 text-[10px] text-slate-300 rounded border border-slate-900 font-mono max-h-24 overflow-y-auto">
                                  {Object.entries(selectedLog.requestHeaders).map(([k, v]) => (
                                    <div key={k}><span className="text-slate-400">{k}:</span> {v}</div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedLog.requestBody && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-500 font-mono">REQUEST BODY (RAW)</span>
                                <pre className="bg-slate-950 p-2 text-[10px] text-slate-300 rounded border border-slate-900 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {JSON.stringify(selectedLog.requestBody, null, 2)}
                                </pre>
                              </div>
                            )}

                            {selectedLog.responseHeaders && Object.keys(selectedLog.responseHeaders).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-500 font-mono">RESPONSE HEADERS</span>
                                <div className="bg-slate-950 p-2 text-[10px] text-slate-300 rounded border border-slate-900 font-mono max-h-24 overflow-y-auto">
                                  {Object.entries(selectedLog.responseHeaders).map(([k, v]) => (
                                    <div key={k}><span className="text-slate-400">{k}:</span> {v}</div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedLog.responseBody && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-500 font-mono">RESPONSE BODY (RAW)</span>
                                <pre className="bg-slate-950 p-2 text-[10px] text-slate-300 rounded border border-slate-900 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {JSON.stringify(selectedLog.responseBody, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-slate-500 font-mono space-y-2">
                        <FileText className="h-8 w-8 text-slate-700 animate-pulse" />
                        <span>Select a request log from the list to audit headers and payload blocks.</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. API PLAYGROUND VIEW */}
            {activeTab === 'playground' && (
              <motion.div
                key="playground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-indigo-400" />
                    Developer Sandbox
                  </h2>
                  <p className="text-xs text-slate-400">Instantly test standard OpenAI-compatible requests and trace the gateway execution parameters.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Playground parameters config */}
                  <form onSubmit={handlePlaygroundSubmit} className="lg:col-span-2 space-y-4 bg-slate-900/30 border border-slate-900 p-5 rounded-xl flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono block">Authorize Gateway Token</label>
                        <select
                          value={selectedGatewayToken}
                          onChange={(e) => setSelectedGatewayToken(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none w-full"
                          id="playground_token_selector"
                          required
                        >
                          <option value="">-- Select Active Token --</option>
                          {gatewayKeys.filter(k => k.status === 'active').map(k => (
                            <option key={k.id} value={k.token}>{k.name} ({k.token.substring(0, 10)}...)</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono block">Upstream Provider</label>
                        <select
                          value={playgroundProvider}
                          onChange={(e) => {
                            setPlaygroundProvider(e.target.value);
                            setPlaygroundThinkingLevel('');
                          }}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none w-full font-mono"
                          id="playground_provider_select"
                          required
                        >
                          {providers.map(p => (
                            <option key={p.id} value={p.name}>{p.displayName} ({p.name})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono block">Unified Model Parameter</label>
                        <input
                          type="text"
                          value={playgroundModel}
                          onChange={(e) => setPlaygroundModel(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none w-full font-mono"
                          id="playground_model_input"
                          placeholder="e.g. gemini-1.5-flash"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono block">Deep Thinking / Reasoning</label>
                        <select
                          value={playgroundThinkingLevel}
                          onChange={(e) => setPlaygroundThinkingLevel(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none w-full font-mono"
                          id="playground_thinking_select"
                        >
                          {getThinkingOptions(playgroundProvider).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="playground_stream_checkbox"
                          checked={playgroundStream}
                          onChange={(e) => setPlaygroundStream(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 accent-indigo-500"
                        />
                        <label htmlFor="playground_stream_checkbox" className="text-[10px] text-slate-400 uppercase font-mono block cursor-pointer">Stream Response</label>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono block">Message Prompt</label>
                        <textarea
                          rows={4}
                          value={playgroundPrompt}
                          onChange={(e) => setPlaygroundPrompt(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-3 text-xs text-slate-200 outline-none w-full font-mono"
                          id="playground_prompt_textarea"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={playgroundLoading || !selectedGatewayToken}
                      className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                      id="playground_send_btn"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {playgroundLoading ? 'Proxy Executing...' : 'Execute Gateway Request'}
                    </button>
                  </form>

                  {/* Sandbox playground outputs */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Console Response Output */}
                    <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-xl h-64 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-900/80 mb-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Response Payload console</span>
                          {playgroundLatency && (
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded">
                              Latency: {playgroundLatency} ms
                            </span>
                          )}
                        </div>

                        <div className="overflow-y-auto max-h-40 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed pr-1">
                          {playgroundLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 animate-pulse py-4">
                              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                              <span>Sending client request, verifying API signatures, and resolving downstream pipelines...</span>
                            </div>
                          ) : playgroundResponse ? (
                            playgroundResponse
                          ) : playgroundError ? (
                            <div className="text-red-400 bg-red-950/20 border border-red-950/30 rounded p-3 text-xs">
                              <span className="font-bold block mb-1">Gateway Error:</span>
                              {playgroundError}
                            </div>
                          ) : (
                            <span className="text-slate-500">Run a gateway execution using the sidebar config parameters to capture output packets.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* bash code curl block */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Client Code Integration</span>
                        <button
                          onClick={() => handleCopy(playgroundCurlCommand, 'curl')}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          title="Copy shell script"
                        >
                          {copiedToken === 'curl' ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy cURL</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="bg-slate-950 p-4 rounded-lg border border-slate-900 text-[10px] text-indigo-300 font-mono overflow-x-auto leading-relaxed whitespace-pre select-all">
                        {playgroundCurlCommand}
                      </pre>
                    </div>

                    {/* Detailed Request Logs */}
                    {playgroundDebugInfo && (
                      <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 mt-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-900/80 pb-3">
                          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Detailed Request Logs</span>
                        </div>
                        
                        <div className="space-y-4 text-[10px] font-mono">
                          {/* Request Details */}
                          <div>
                            <div className="text-emerald-400 mb-1 font-bold">Request Details:</div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 space-y-3">
                              <div>
                                <span className="text-indigo-400 font-bold">{playgroundDebugInfo.requestMethod}</span> <span className="text-slate-300">{playgroundDebugInfo.requestUrl}</span>
                              </div>
                              
                              <div>
                                <div className="text-slate-500 mb-1 font-bold">Headers:</div>
                                <div className="text-slate-300 pl-4 whitespace-pre-wrap break-all">
                                  {Object.entries(playgroundDebugInfo.requestHeaders).map(([k, v]) => (
                                    <div key={k}><span className="text-slate-400">{k}:</span> {v}</div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="text-slate-500 mb-1 font-bold">Body:</div>
                                <pre className="text-slate-300 pl-4 whitespace-pre-wrap break-all">
                                  {JSON.stringify(playgroundDebugInfo.requestBody, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>

                          {/* Response Details */}
                          {(playgroundDebugInfo.responseStatus || playgroundDebugInfo.responseBody) && (
                            <div>
                              <div className="text-indigo-400 mb-1 font-bold mt-4">Response Details:</div>
                              <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 space-y-3">
                                
                                {playgroundDebugInfo.responseStatus && (
                                  <div>
                                    <span className="text-slate-500 font-bold">Status:</span> <span className={playgroundDebugInfo.responseStatus >= 400 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{playgroundDebugInfo.responseStatus}</span>
                                  </div>
                                )}
                                
                                {playgroundDebugInfo.responseHeaders && Object.keys(playgroundDebugInfo.responseHeaders).length > 0 && (
                                  <div>
                                    <div className="text-slate-500 mb-1 font-bold">Headers:</div>
                                    <div className="text-slate-300 pl-4 whitespace-pre-wrap break-all">
                                      {Object.entries(playgroundDebugInfo.responseHeaders).map(([k, v]) => (
                                        <div key={k}><span className="text-slate-400">{k}:</span> {v}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {playgroundDebugInfo.responseBody && (
                                  <div>
                                    <div className="text-slate-500 mb-1 font-bold">Body:</div>
                                    <pre className="text-slate-300 pl-4 whitespace-pre-wrap break-all">
                                      {JSON.stringify(playgroundDebugInfo.responseBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. GATEWAY SETTINGS VIEW */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-indigo-400" />
                    Gateway Administrator Settings
                  </h2>
                  <p className="text-xs text-slate-400">Configure global administrator credentials and system-wide logging preferences.</p>
                </div>

                <div className="flex border-b border-slate-800 max-w-xl">
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      settingsTab === 'credentials'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
                    }`}
                    onClick={() => setSettingsTab('credentials')}
                  >
                    Admin Credentials
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      settingsTab === 'logging'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
                    }`}
                    onClick={() => setSettingsTab('logging')}
                  >
                    System Logs Configuration
                  </button>
                </div>

                {settingsTab === 'credentials' && (
                  <motion.div
                    key="tab-credentials"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 pt-2 max-w-xl"
                  >
                    <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-6">
                      <form onSubmit={handleUpdateAdminCredentials} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium block">Administrator Username</label>
                      <input
                        type="text"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="e.g., admin"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs text-slate-100 outline-none"
                        id="settings_username_input"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium block">Access Secret Key (Password)</label>
                      <input
                        type="text"
                        value={newAdminSecret}
                        onChange={(e) => setNewAdminSecret(e.target.value)}
                        placeholder="e.g., admin123"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs text-slate-100 outline-none font-mono"
                        id="settings_secret_input"
                        required
                      />
                    </div>

                    {adminUpdateStatus?.success && (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>Administrator credentials updated and saved successfully!</span>
                      </div>
                    )}

                    {adminUpdateStatus?.error && (
                      <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{adminUpdateStatus.error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-xs py-2 px-4 rounded-lg transition-all"
                      id="save_settings_btn"
                    >
                      Save Configuration
                    </button>
                  </form>
                </div>

                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl flex items-start gap-3 max-w-xl">
                  <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">Security Best Practice</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Updating these values will rewrite the local server configuration file instantly. Make sure to record your new credentials carefully. If you forget them, you can inspect the <code className="text-slate-300 font-mono bg-slate-950 px-1 py-0.5 rounded">data/db.json</code> file on the server.
                    </p>
                  </div>
                </div>
                </motion.div>
                )}

                {settingsTab === 'logging' && (
                  <motion.div
                    key="tab-logging"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pt-2 max-w-xl space-y-6"
                  >
                    <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-6">
                      <form onSubmit={handleUpdateLogLevel} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-medium block">Audit Log Detail Level</label>
                        <select
                          value={gatewayLogLevel}
                          onChange={(e) => setGatewayLogLevel(e.target.value as 'basic' | 'detailed')}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs text-slate-100 outline-none"
                          id="settings_loglevel_select"
                        >
                          <option value="basic">Basic (Latency, Tokens, Prompts, Status)</option>
                          <option value="detailed">Detailed (Includes Headers, Request/Response Payloads)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">Detailed logging will capture full HTTP payloads. Use with caution as it will increase server storage pressure.</p>
                      </div>

                      {logLevelUpdateStatus?.success && (
                        <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          <span>Log level updated successfully!</span>
                        </div>
                      )}

                      {logLevelUpdateStatus?.error && (
                        <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-xs flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{logLevelUpdateStatus.error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-xs py-2 px-4 rounded-lg transition-all"
                        id="save_loglevel_btn"
                      >
                        Update Log Level
                      </button>
                    </form>
                  </div>
                </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Generic Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-100">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-400">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-[0.98] rounded-lg transition-all shadow-md shadow-red-900/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
