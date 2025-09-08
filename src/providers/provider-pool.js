import { RateLimitedProvider } from './rate-limited-provider.js';
import { PerformanceOptimizedStrategy } from '../routing/routing-strategy.js';
import { MODEL_CONFIGS } from './model-configs.js';

// Manages multiple API keys with rate limiting
export class ProviderPool {
  constructor(apiClients, strategy = null) {
    this.providers = [];
    this.strategy = strategy || new PerformanceOptimizedStrategy();
    
    // Create rate-limited providers for each API client
    for (const client of apiClients) {
      const provider = new RateLimitedProvider(
        client.apiClient,
        client.keyId,
        client.tier,
        MODEL_CONFIGS
      );
      this.providers.push(provider);
    }
  }

  async execute(model, prompt, context, outputFile, language, contextFiles) {
    const provider = this.selectProvider(model);
    
    try {
      return await provider.execute(model, prompt, context, outputFile, language, contextFiles);
    } catch (error) {
      // If rate limit exceeded (either our tracking or actual API 429), try another provider
      const isRateLimit = error.message.startsWith('RateLimitExceeded') || 
                         error.message.includes('429') ||
                         error.message.includes('rate limit');
                         
      if (isRateLimit) {
        const fallbackProviders = this.providers.filter(p => p !== provider && p.canHandle(model));
        if (fallbackProviders.length > 0) {
          const fallback = this.strategy.select(fallbackProviders, model);
          console.log(`  Failover: Switching from ${provider.keyId} to ${fallback.keyId} due to rate limit`);
          return await fallback.execute(model, prompt, context, outputFile, language, contextFiles);
        }
      }
      throw error;
    }
  }

  selectProvider(model) {
    return this.strategy.select(this.providers, model);
  }

  getAvailability(model = null) {
    const report = [];
    
    for (const provider of this.providers) {
      if (model) {
        report.push(provider.getAvailability(model));
      } else {
        // Get availability for all models
        for (const modelName of Object.keys(MODEL_CONFIGS)) {
          report.push(provider.getAvailability(modelName));
        }
      }
    }
    
    return report;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }
}