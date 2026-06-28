export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  reasoning_effort?: string;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  resultText: string;
  promptTokens: number;
  completionTokens: number;
  debugInfo?: {
    requestUrl?: string;
    requestHeaders?: Record<string, string>;
    requestBody?: any;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
  };
}

export interface ProviderConfig {
  projectId?: string;
  location?: string;
  key?: string;
  customHeaders?: Record<string, string>;
}

export abstract class BaseProvider {
  abstract name: string;
  
  /**
   * Test the connection to the provider.
   */
  abstract testConnection(config: ProviderConfig): Promise<{ success: boolean; message?: string; error?: string }>;

  /**
   * Generate a chat completion.
   */
  abstract generateChatCompletion(request: ChatCompletionRequest, config: ProviderConfig): Promise<ChatCompletionResponse>;

  /**
   * Generate a streaming chat completion.
   */
  abstract generateChatCompletionStream(request: ChatCompletionRequest, config: ProviderConfig): AsyncGenerator<any, void, unknown>;
}
