import { GoogleGenAI } from '@google/genai';
import { BaseProvider, ChatCompletionRequest, ChatCompletionResponse, ProviderConfig } from './base.provider.js';

export class VertexAIProvider extends BaseProvider {
  name = 'vertexai';

  private initializeClient(config: ProviderConfig): GoogleGenAI {
    const projectId = config.projectId || process.env.GOOGLE_CLOUD_PROJECT || '';
    const location = config.location || 'us-central1';
    const providerKey = config.key || '';

    let genAiOptions: any = {};

    if (providerKey) {
      const keyStr = providerKey.trim();
      if (keyStr.startsWith('{') && keyStr.endsWith('}')) {
        // Service Account JSON
        if (!projectId) {
          throw new Error('Google Cloud Project ID is required for Vertex AI Service Accounts. Please configure it in Provider Keys.');
        }
        try {
          genAiOptions = {
            vertexai: true,
            project: projectId,
            location: location,
            googleAuthOptions: { credentials: JSON.parse(keyStr) }
          };
        } catch(e: any) {
          throw new Error('Failed to parse Service Account JSON.');
        }
      } else {
        // API Key (Developer API, mutually exclusive with vertexai/project/location)
        genAiOptions = {
          vertexai: true,
          apiKey: keyStr
        };
      }
    } else if (process.env.GEMINI_API_KEY) {
      genAiOptions = {
        apiKey: process.env.GEMINI_API_KEY
      };
    } else {
      // Default to ADC (Vertex AI)
      if (!projectId) {
        throw new Error('Google Cloud Project ID is required when using Application Default Credentials (ADC). Please configure it in Provider Keys.');
      }
      genAiOptions = {
        vertexai: true,
        project: projectId,
        location: location
      };
    }

    if (config.customHeaders && Object.keys(config.customHeaders).length > 0) {
      genAiOptions.httpOptions = {
        headers: config.customHeaders
      };
    }

    return new GoogleGenAI(genAiOptions);
  }

  async testConnection(config: ProviderConfig) {
    try {
      const ai = this.initializeClient(config);
      const requestBody: any = {
        model: 'gemini-2.5-flash',
        contents: 'Ping check, respond with "OK" if you hear me.',
        config: { maxOutputTokens: 50 }
      };

      const response = await ai.models.generateContent(requestBody);

      if (response.text) {
        return { success: true, message: 'Vertex AI Connection Successful!' };
      } else {
        return { success: false, error: `No text returned. Response: ${JSON.stringify(response)}` };
      }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Connection test failed.' };
    }
  }

  async generateChatCompletion(request: ChatCompletionRequest, config: ProviderConfig): Promise<ChatCompletionResponse> {
    const ai = this.initializeClient(config);

    const chatMessages = request.messages.filter(m => m.role !== 'system');
    const geminiContents = chatMessages.map(m => {
      let role = 'user';
      if (m.role === 'assistant' || m.role === 'model') {
        role = 'model';
      }
      return {
        role,
        parts: [{ text: m.content }]
      };
    });

    const requestBody: any = {
      model: request.model,
      contents: geminiContents,
      config: {
        systemInstruction: request.systemInstruction || undefined,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens || request.max_tokens,
        ...(request.reasoning_effort === 'enabled' ? {
          thinkingConfig: {
            thinkingBudget: 1024
          }
        } : {})
      }
    };

    const debugInfoBase = {
      requestBody
    };

    let response;
    try {
      response = await ai.models.generateContent(requestBody);
    } catch (err: any) {
      err.debugInfo = {
        ...debugInfoBase,
        responseBody: err.message
      };
      throw err;
    }

    const resultText = response.text || '';
    const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil(JSON.stringify(request.messages).length / 4);
    const completionTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(resultText.length / 4);

    return {
      resultText,
      promptTokens,
      completionTokens,
      debugInfo: {
        ...debugInfoBase,
        responseBody: response
      }
    };
  }
  
  async *generateChatCompletionStream(request: ChatCompletionRequest, config: ProviderConfig): AsyncGenerator<any, void, unknown> {
    const ai = this.initializeClient(config);

    const chatMessages = request.messages.filter(m => m.role !== 'system');
    const geminiContents = chatMessages.map(m => {
      let role = 'user';
      if (m.role === 'assistant' || m.role === 'model') {
        role = 'model';
      }
      return {
        role,
        parts: [{ text: m.content }]
      };
    });

    const requestBody: any = {
      model: request.model,
      contents: geminiContents,
      config: {
        systemInstruction: request.systemInstruction || undefined,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens || request.max_tokens,
        ...(request.reasoning_effort === 'enabled' ? {
          thinkingConfig: {
            thinkingBudget: 1024
          }
        } : {})
      }
    };

    const responseStream = await ai.models.generateContentStream(requestBody);
    for await (const chunk of responseStream) {
      yield chunk;
    }
  }
}
