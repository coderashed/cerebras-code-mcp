import { callCerebras } from '../cerebras.js';
import { callOpenRouter } from '../openrouter.js';
import { config } from '../../config/constants.js';
import { ProviderPool } from '../../providers/provider-pool.js';
import { CostOptimizedStrategy, PerformanceOptimizedStrategy, LoadBalancedStrategy, RoundRobinStrategy } from '../../routing/routing-strategy.js';

// Create API client wrappers that match our decorator interface
class CerebrasApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  
  async callCerebras(model, prompt, context, outputFile, language, contextFiles) {
    // Temporarily override config to use this specific key
    const originalKey = config.cerebrasApiKey;
    const originalModel = config.cerebrasModel;
    
    try {
      config.cerebrasApiKey = this.apiKey;
      config.cerebrasModel = model;
      
      return await callCerebras(prompt, context, outputFile, language, contextFiles);
    } finally {
      config.cerebrasApiKey = originalKey;
      config.cerebrasModel = originalModel;
    }
  }
}

// Initialize provider pool if we have multiple keys
let providerPool = null;

function initializeProviderPool() {
  if (providerPool) return providerPool;
  
  const clients = [];
  
  // Check for multiple Cerebras keys
  const freeKey = process.env.CEREBRAS_FREE_KEY || process.env.CEREBRAS_API_KEY;
  const paidKey = process.env.CEREBRAS_PAID_KEY;
  
  if (freeKey) {
    clients.push({
      apiClient: new CerebrasApiClient(freeKey),
      keyId: 'free',
      tier: 'free'
    });
  }
  
  if (paidKey) {
    clients.push({
      apiClient: new CerebrasApiClient(paidKey),
      keyId: 'paid',
      tier: 'paid'
    });
  }
  
  if (clients.length > 0) {
    // Select strategy based on environment variable or default to performance (paid first)
    const strategyName = process.env.ROUTING_STRATEGY || 'performance';
    let strategy;
    
    switch (strategyName) {
      case 'cost':
        strategy = new CostOptimizedStrategy();
        break;
      case 'balanced':
        strategy = new LoadBalancedStrategy();
        break;
      case 'roundrobin':
        strategy = new RoundRobinStrategy();
        break;
      case 'performance':
      default:
        strategy = new PerformanceOptimizedStrategy();
    
    providerPool = new ProviderPool(clients, strategy);
  }
  
  return providerPool;
}

/**
 * Enhanced router with rate limiting support
 * Falls back to original router if no provider pool is configured
 */
export async function routeAPICall(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  const pool = initializeProviderPool();
  
  if (pool) {
    // Use rate-limited provider pool
    const model = config.cerebrasModel || 'llama-3.3-70b';
    
    try {
      return await pool.execute(model, prompt, context, outputFile, language, contextFiles);
    } catch (error) {
      // If all rate-limited providers fail, try OpenRouter as last resort
      if (config.openRouterApiKey && error.message.startsWith('NoProvidersAvailable')) {
        console.log('All Cerebras providers exhausted, falling back to OpenRouter...');
        return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
      }
      throw error;
    }
  } else {
    // Fall back to original router behavior
    return await originalRouteAPICall(prompt, context, outputFile, language, contextFiles);
  }
}

/**
 * Original router logic for backward compatibility
 */
async function originalRouteAPICall(prompt, context, outputFile, language, contextFiles) {
  const provider = determineProvider();
  
  try {
    switch (provider) {
      case 'cerebras':
        return await callCerebras(prompt, context, outputFile, language, contextFiles);
      
      case 'openrouter':
        return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    const fallbackProvider = getFallbackProvider(provider);
    if (fallbackProvider && fallbackProvider !== provider) {
      console.log(`Primary provider ${provider} failed, trying fallback ${fallbackProvider}...`);
      
      try {
        switch (fallbackProvider) {
          case 'cerebras':
            return await callCerebras(prompt, context, outputFile, language, contextFiles);
          
          case 'openrouter':
            return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
          
          default:
            throw new Error(`Unknown fallback provider: ${fallbackProvider}`);
        }
      } catch (fallbackError) {
        throw new Error(`Both primary (${provider}) and fallback (${fallbackProvider}) providers failed: ${error.message} | ${fallbackError.message}`);
      }
    } else {
      throw error;
    }
  }
}

function determineProvider() {
  if (config.cerebrasApiKey) {
    return 'cerebras';
  } else if (config.openRouterApiKey) {
    return 'openrouter';
  } else {
    throw new Error('No API keys configured. Please set CEREBRAS_API_KEY or OPENROUTER_API_KEY environment variable.');
  }
}

function getFallbackProvider(primaryProvider) {
  switch (primaryProvider) {
    case 'cerebras':
      return config.openRouterApiKey ? 'openrouter' : null;
  }
}

/**
 * Get availability report for all providers and models
 */
export function getAvailabilityReport() {
  const pool = initializeProviderPool();
  
  if (pool) {
    return pool.getAvailability();
  }
  
  // Return simple availability for non-pool setup
  return {
    providers: getAvailableProviders(),
    rateLimiting: false
  };
}

/**
 * Get list of available providers
 */
export function getAvailableProviders() {
  const providers = [];
  
  const pool = initializeProviderPool();
  if (pool) {
    // Return rate-limited provider info
    return pool.providers.map(p => ({
      name: 'cerebras',
      keyId: p.keyId,
      tier: p.tier,
      rateLimited: true
    }));
  }
  
  // Original logic
  if (config.cerebrasApiKey) {
    providers.push({
      name: 'cerebras',
      model: config.cerebrasModel,
      available: true
    });
  }
  
  if (config.openRouterApiKey) {
    providers.push({
      name: 'openrouter', 
      model: config.openRouterModel,
      available: true
    });
  }
  
  return providers;
}