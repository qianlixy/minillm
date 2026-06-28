import { Request, Response } from 'express';
import { loadDB, saveDB } from '../../db/local_store.js';
import { providerFactory } from '../providers/provider.factory.js';
import { RequestLog } from '../../types.js';

export const handleChatCompletion = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const providerName = req.params.provider;
  const { model, messages, temperature, max_tokens, maxOutputTokens, reasoning_effort } = req.body;

  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: {
        message: "Missing 'model' or 'messages' array in request body.",
        type: "invalid_request_error"
      }
    });
  }

  const db = loadDB();
  const promptText = messages[messages.length - 1]?.content || '';
  
  const provider = providerFactory.getProvider(providerName);

  if (!provider) {
    return res.status(404).json({
      error: {
        message: `Provider '${providerName}' not found or unsupported.`,
        type: 'invalid_request_error',
        code: 'provider_not_found'
      }
    });
  }

  const providerKeyObj = db.providerKeys.find(k => k.name === providerName);
  const providerConfig = {
    projectId: providerKeyObj?.projectId,
    location: providerKeyObj?.location,
    key: providerKeyObj?.key,
    customHeaders: providerKeyObj?.customHeaders
  };

  const openAiSystemMsg = messages.find(m => m.role === 'system');
  const systemInstruction = openAiSystemMsg ? openAiSystemMsg.content : undefined;

  let mappedModel = model;
  if (model.includes('gpt') || model.includes('claude')) {
    mappedModel = 'gemini-1.5-pro-preview-0409';
  }

  try {
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const responseId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let fullResponseText = '';
      
      const stream = provider.generateChatCompletionStream({
        model: mappedModel,
        messages,
        temperature: temperature !== undefined ? Number(temperature) : undefined,
        max_tokens,
        maxOutputTokens,
        systemInstruction,
        reasoning_effort,
        stream: true
      }, providerConfig);

      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        fullResponseText += chunkText;
        
        res.write(`data: ${JSON.stringify({
          id: `chatcmpl-${responseId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: mappedModel,
          choices: [{
            index: 0,
            delta: { content: chunkText },
            finish_reason: null
          }]
        })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({
        id: `chatcmpl-${responseId}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: mappedModel,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      const latencyMs = Date.now() - startTime;
      const newLog: RequestLog = {
        id: responseId,
        timestamp: new Date().toISOString(),
        provider: providerName,
        model: mappedModel,
        latencyMs,
        status: 200,
        promptTokens: Math.ceil(JSON.stringify(messages).length / 4),
        completionTokens: Math.ceil(fullResponseText.length / 4),
        totalTokens: Math.ceil(JSON.stringify(messages).length / 4) + Math.ceil(fullResponseText.length / 4),
        prompt: promptText,
        response: fullResponseText,
        isSimulated: false,
      };

      db.logs.unshift(newLog);
      if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
      saveDB(db);

      return;
    }

    const response = await provider.generateChatCompletion({
      model: mappedModel,
      messages,
      temperature: temperature !== undefined ? Number(temperature) : undefined,
      max_tokens,
      maxOutputTokens,
      systemInstruction,
      reasoning_effort
    }, providerConfig);

    const latencyMs = Date.now() - startTime;
    
    let detailedInfo = {};
    if (db.logLevel === 'detailed') {
      if (response.debugInfo) {
        detailedInfo = { ...response.debugInfo };
      }
    }

    const newLog: RequestLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      provider: providerName,
      model: mappedModel,
      latencyMs,
      status: 200,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.promptTokens + response.completionTokens,
      prompt: promptText,
      response: response.resultText,
      isSimulated: false,
      ...detailedInfo
    };

    db.logs.unshift(newLog);
    if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
    saveDB(db);

    return res.status(200).json({
      id: `chatcmpl-${newLog.id}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: mappedModel,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: response.resultText },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: response.promptTokens,
        completion_tokens: response.completionTokens,
        total_tokens: response.promptTokens + response.completionTokens
      }
    });

  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err?.message || `Unknown server error in ${providerName} proxy gateway`;

    let detailedInfo = {};
    if (db.logLevel === 'detailed') {
      if (err.debugInfo) {
        detailedInfo = { ...err.debugInfo };
      }
    }

    const newLog: RequestLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      provider: providerName,
      model: mappedModel,
      latencyMs,
      status: 500,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      prompt: promptText,
      response: '',
      isSimulated: false,
      error: errorMessage,
      ...detailedInfo
    };

    db.logs.unshift(newLog);
    if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
    saveDB(db);

    if (req.body.stream && !res.headersSent) {
       res.setHeader('Content-Type', 'text/event-stream');
       res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
       res.end();
       return;
    } else if (req.body.stream && res.headersSent) {
       res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
       res.end();
       return;
    }

    return res.status(500).json({
      error: {
        message: errorMessage,
        type: 'gateway_proxy_error',
        code: 'gateway_error'
      }
    });
  }
};
