import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeAPICall, getAvailableProviders } from '../../../src/api/router/router.js';

// Mock the dependencies
vi.mock('../../../src/api/cerebras.js', () => ({
  callCerebras: vi.fn()
}));

vi.mock('../../../src/api/openrouter.js', () => ({
  callOpenRouter: vi.fn()
}));

vi.mock('../../../src/config/constants.js', () => ({
  config: {
    cerebrasApiKey: null,
    openRouterApiKey: null,
    cerebrasModel: 'test-model',
    openRouterModel: 'test-or-model'
  }
}));

vi.mock('../../../src/api/rate-limiter.js', () => ({
  cerebrasRateLimiter: {
    execute: vi.fn((fn) => fn())
  },
  openRouterRateLimiter: {
    execute: vi.fn((fn) => fn())
  }
}));

import { callCerebras } from '../../../src/api/cerebras.js';
import { callOpenRouter } from '../../../src/api/openrouter.js';
import { config } from '../../../src/config/constants.js';
import { cerebrasRateLimiter, openRouterRateLimiter } from '../../../src/api/rate-limiter.js';

describe('routeAPICall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.cerebrasApiKey = null;
    config.openRouterApiKey = null;
  });

  it('should throw error when no API keys configured', async () => {
    await expect(routeAPICall('test prompt'))
      .rejects.toThrow('No API keys configured');
  });

  it('should route to Cerebras when only Cerebras key is set', async () => {
    config.cerebrasApiKey = 'test-key';
    vi.mocked(callCerebras).mockResolvedValue('cerebras response');

    const result = await routeAPICall('test prompt', 'context', 'file.js', 'javascript', [], null);

    expect(result).toBe('cerebras response');
    expect(cerebrasRateLimiter.execute).toHaveBeenCalled();
    expect(callCerebras).toHaveBeenCalledWith('test prompt', 'context', 'file.js', 'javascript', [], null);
  });

  it('should route to OpenRouter when only OpenRouter key is set', async () => {
    config.openRouterApiKey = 'test-or-key';
    vi.mocked(callOpenRouter).mockResolvedValue('openrouter response');

    const result = await routeAPICall('test prompt');

    expect(result).toBe('openrouter response');
    expect(openRouterRateLimiter.execute).toHaveBeenCalled();
    expect(callOpenRouter).toHaveBeenCalled();
  });

  it('should prefer Cerebras when both keys are set', async () => {
    config.cerebrasApiKey = 'test-key';
    config.openRouterApiKey = 'test-or-key';
    vi.mocked(callCerebras).mockResolvedValue('cerebras response');

    const result = await routeAPICall('test prompt');

    expect(result).toBe('cerebras response');
    expect(callCerebras).toHaveBeenCalled();
    expect(callOpenRouter).not.toHaveBeenCalled();
  });

  it('should fallback to OpenRouter when Cerebras fails', async () => {
    config.cerebrasApiKey = 'test-key';
    config.openRouterApiKey = 'test-or-key';
    vi.mocked(callCerebras).mockRejectedValue(new Error('Cerebras failed'));
    vi.mocked(callOpenRouter).mockResolvedValue('openrouter fallback');

    const result = await routeAPICall('test prompt');

    expect(result).toBe('openrouter fallback');
    expect(callCerebras).toHaveBeenCalled();
    expect(callOpenRouter).toHaveBeenCalled();
  });

  it('should throw error when Cerebras fails and no fallback available', async () => {
    config.cerebrasApiKey = 'test-key';
    vi.mocked(callCerebras).mockRejectedValue(new Error('Cerebras failed'));

    await expect(routeAPICall('test prompt'))
      .rejects.toThrow('Cerebras failed');
  });

  it('should throw combined error when both providers fail', async () => {
    config.cerebrasApiKey = 'test-key';
    config.openRouterApiKey = 'test-or-key';
    vi.mocked(callCerebras).mockRejectedValue(new Error('Cerebras error'));
    vi.mocked(callOpenRouter).mockRejectedValue(new Error('OpenRouter error'));

    await expect(routeAPICall('test prompt'))
      .rejects.toThrow('Both primary (cerebras) and fallback (openrouter) providers failed');
  });
});

describe('getAvailableProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.cerebrasApiKey = null;
    config.openRouterApiKey = null;
  });

  it('should return empty array when no keys configured', () => {
    const providers = getAvailableProviders();
    expect(providers).toEqual([]);
  });

  it('should return Cerebras when key is set', () => {
    config.cerebrasApiKey = 'test-key';
    config.cerebrasModel = 'test-model';

    const providers = getAvailableProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({
      name: 'cerebras',
      model: 'test-model',
      available: true
    });
  });

  it('should return OpenRouter when key is set', () => {
    config.openRouterApiKey = 'test-or-key';
    config.openRouterModel = 'test-or-model';

    const providers = getAvailableProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({
      name: 'openrouter',
      model: 'test-or-model',
      available: true
    });
  });

  it('should return both providers when both keys are set', () => {
    config.cerebrasApiKey = 'test-key';
    config.openRouterApiKey = 'test-or-key';
    config.cerebrasModel = 'cerebras-model';
    config.openRouterModel = 'or-model';

    const providers = getAvailableProviders();

    expect(providers).toHaveLength(2);
    expect(providers[0].name).toBe('cerebras');
    expect(providers[1].name).toBe('openrouter');
  });
});
