import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { routeAPICall, getAvailableProviders } from '../../src/api/router/router.js';

// Mock the API modules
vi.mock('../../src/api/cerebras.js', () => ({
  callCerebras: vi.fn()
}));

vi.mock('../../src/api/openrouter.js', () => ({
  callOpenRouter: vi.fn()
}));

// Mock the config
vi.mock('../../src/config/constants.js', () => ({
  config: {
    cerebrasApiKey: null,
    openRouterApiKey: null,
    cerebrasModel: 'llama3.1-70b',
    openRouterModel: 'cerebras/llama3.1-70b',
    temperature: 0.7,
    maxTokens: null
  },
  debugLog: vi.fn()
}));

import { callCerebras } from '../../src/api/cerebras.js';
import { callOpenRouter } from '../../src/api/openrouter.js';
import { config } from '../../src/config/constants.js';

describe('APIRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config to default state
    config.cerebrasApiKey = null;
    config.openRouterApiKey = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('routeAPICall', () => {
    it('should route to Cerebras when only Cerebras key is available', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      config.openRouterApiKey = null;
      
      callCerebras.mockResolvedValue('cerebras response');
      
      const result = await routeAPICall('prompt', 'context', 'output.js', 'javascript', ['file1.js']);
      
      expect(callCerebras).toHaveBeenCalledWith('prompt', 'context', 'output.js', 'javascript', ['file1.js']);
      expect(callOpenRouter).not.toHaveBeenCalled();
      expect(result).toBe('cerebras response');
    });

    it('should route to OpenRouter when only OpenRouter key is available', async () => {
      config.cerebrasApiKey = null;
      config.openRouterApiKey = 'test-openrouter-key';
      
      callOpenRouter.mockResolvedValue('openrouter response');
      
      const result = await routeAPICall('prompt', 'context', 'output.js', 'javascript', ['file1.js']);
      
      expect(callOpenRouter).toHaveBeenCalledWith('prompt', 'context', 'output.js', 'javascript', ['file1.js']);
      expect(callCerebras).not.toHaveBeenCalled();
      expect(result).toBe('openrouter response');
    });

    it('should prefer Cerebras when both keys are available', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      config.openRouterApiKey = 'test-openrouter-key';
      
      callCerebras.mockResolvedValue('cerebras response');
      
      const result = await routeAPICall('prompt', 'context');
      
      expect(callCerebras).toHaveBeenCalled();
      expect(callOpenRouter).not.toHaveBeenCalled();
      expect(result).toBe('cerebras response');
    });

    it('should fallback to OpenRouter when Cerebras fails', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      config.openRouterApiKey = 'test-openrouter-key';
      
      callCerebras.mockRejectedValue(new Error('Cerebras API error'));
      callOpenRouter.mockResolvedValue('openrouter fallback response');
      
      const result = await routeAPICall('prompt', 'context');
      
      expect(callCerebras).toHaveBeenCalled();
      expect(callOpenRouter).toHaveBeenCalled();
      expect(result).toBe('openrouter fallback response');
    });

    it('should throw error when no API keys are configured', async () => {
      config.cerebrasApiKey = null;
      config.openRouterApiKey = null;
      
      await expect(routeAPICall('prompt')).rejects.toThrow('No API keys configured');
    });

    it('should throw error when both providers fail', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      config.openRouterApiKey = 'test-openrouter-key';
      
      callCerebras.mockRejectedValue(new Error('Cerebras failed'));
      callOpenRouter.mockRejectedValue(new Error('OpenRouter failed'));
      
      await expect(routeAPICall('prompt')).rejects.toThrow('Both primary (cerebras) and fallback (openrouter) providers failed');
    });

    it('should throw error when primary fails and no fallback available', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      config.openRouterApiKey = null;
      
      callCerebras.mockRejectedValue(new Error('Cerebras failed'));
      
      await expect(routeAPICall('prompt')).rejects.toThrow('Cerebras failed');
    });

    it('should handle empty context and files gracefully', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      
      callCerebras.mockResolvedValue('response');
      
      const result = await routeAPICall('prompt', '', '', null, []);
      
      expect(callCerebras).toHaveBeenCalledWith('prompt', '', '', null, []);
      expect(result).toBe('response');
    });

    it('should pass all parameters correctly', async () => {
      config.cerebrasApiKey = 'test-cerebras-key';
      
      callCerebras.mockResolvedValue('response');
      
      const prompt = 'Generate a function';
      const context = 'This is context';
      const outputFile = '/path/to/output.js';
      const language = 'javascript';
      const contextFiles = ['/file1.js', '/file2.js'];
      
      await routeAPICall(prompt, context, outputFile, language, contextFiles);
      
      expect(callCerebras).toHaveBeenCalledWith(prompt, context, outputFile, language, contextFiles);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return empty array when no keys configured', () => {
      config.cerebrasApiKey = null;
      config.openRouterApiKey = null;
      
      const providers = getAvailableProviders();
      
      expect(providers).toEqual([]);
    });

    it('should return Cerebras provider when key is configured', () => {
      config.cerebrasApiKey = 'test-key';
      config.cerebrasModel = 'llama3.1-70b';
      config.openRouterApiKey = null;
      
      const providers = getAvailableProviders();
      
      expect(providers).toHaveLength(1);
      expect(providers[0]).toMatchObject({
        name: 'cerebras',
        model: 'llama3.1-70b',
        available: true
      });
    });

    it('should return OpenRouter provider when key is configured', () => {
      config.cerebrasApiKey = null;
      config.openRouterApiKey = 'test-key';
      config.openRouterModel = 'cerebras/llama3.1-70b';
      
      const providers = getAvailableProviders();
      
      expect(providers).toHaveLength(1);
      expect(providers[0]).toMatchObject({
        name: 'openrouter',
        model: 'cerebras/llama3.1-70b',
        available: true
      });
    });

    it('should return both providers when both keys configured', () => {
      config.cerebrasApiKey = 'cerebras-key';
      config.openRouterApiKey = 'openrouter-key';
      
      const providers = getAvailableProviders();
      
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.name)).toContain('cerebras');
      expect(providers.map(p => p.name)).toContain('openrouter');
    });
  });
});