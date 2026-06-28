import { BaseProvider } from './base.provider.js';
import { VertexAIProvider } from './vertexai.provider.js';

class ProviderFactory {
  private providers: Map<string, BaseProvider> = new Map();

  constructor() {
    this.registerProvider(new VertexAIProvider());
  }

  registerProvider(provider: BaseProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }
}

export const providerFactory = new ProviderFactory();
