import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConfig = vi.hoisted(() => ({
  cerebrasApiKey: 'test-cerebras-key',
  openRouterApiKey: 'test-openrouter-key',
  cerebrasModel: 'test-model',
  openRouterModel: 'test-or-model'
}));

vi.mock('../../../src/config/constants.js', () => ({
  config: mockConfig
}));

const mockCallCerebras = vi.hoisted(() => vi.fn());
const mockCallOpenRouter = vi.hoisted(() => vi.fn());

vi.mock('../../../src/api/cerebras.js', () => ({
  callCerebras: mockCallCerebras
}));

vi.mock('../../../src/api/openrouter.js', () => ({
  callOpenRouter: mockCallOpenRouter
}));

import { routeAPICall, getAvailableProviders } from '../../../src/api/router/router.js';

describe('routeAPICall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.cerebrasApiKey = 'test-cerebras-key';
    mockConfig.openRouterApiKey = 'test-openrouter-key';
  });

  it('should route to Cerebras when Cerebras API key is available', async () => {
    mockCallCerebras.mockResolvedValue('cerebras result');

    const result = await routeAPICall('test prompt', 'context', 'output.js');

    expect(mockCallCerebras).toHaveBeenCalledWith('test prompt', 'context', 'output.js', null, []);
    expect(result).toBe('cerebras result');
  });

  it('should route to OpenRouter when only OpenRouter API key is available', async () => {
    mockConfig.cerebrasApiKey = '';
    mockCallOpenRouter.mockResolvedValue('openrouter result');

    const result = await routeAPICall('test prompt');

    expect(mockCallOpenRouter).toHaveBeenCalled();
    expect(result).toBe('openrouter result');
  });

  it('should throw error when no API keys are configured', async () => {
    mockConfig.cerebrasApiKey = '';
    mockConfig.openRouterApiKey = '';

    await expect(routeAPICall('test')).rejects.toThrow('No API keys configured');
  });

  it('should fallback to OpenRouter when Cerebras fails', async () => {
    mockCallCerebras.mockRejectedValue(new Error('Cerebras failed'));
    mockCallOpenRouter.mockResolvedValue('fallback result');

    const result = await routeAPICall('test prompt');

    expect(mockCallCerebras).toHaveBeenCalled();
    expect(mockCallOpenRouter).toHaveBeenCalled();
    expect(result).toBe('fallback result');
  });

  it('should throw when both providers fail', async () => {
    mockCallCerebras.mockRejectedValue(new Error('Cerebras failed'));
    mockCallOpenRouter.mockRejectedValue(new Error('OpenRouter failed'));

    await expect(routeAPICall('test')).rejects.toThrow('Both primary');
  });

  it('should pass all arguments to provider', async () => {
    mockCallCerebras.mockResolvedValue('result');

    await routeAPICall('prompt', 'context', 'file.js', 'typescript', ['/ctx.js']);

    expect(mockCallCerebras).toHaveBeenCalledWith(
      'prompt', 'context', 'file.js', 'typescript', ['/ctx.js']
    );
  });

  it('should re-throw when OpenRouter is primary and no fallback is available', async () => {
    mockConfig.cerebrasApiKey = '';
    mockCallOpenRouter.mockRejectedValue(new Error('OpenRouter failed'));

    await expect(routeAPICall('test')).rejects.toThrow('OpenRouter failed');
  });

  it('should not attempt fallback when OpenRouter is the only provider', async () => {
    mockConfig.cerebrasApiKey = '';
    mockCallOpenRouter.mockRejectedValue(new Error('OpenRouter failed'));

    await expect(routeAPICall('test')).rejects.toThrow();
    expect(mockCallCerebras).not.toHaveBeenCalled();
  });
});

describe('getAvailableProviders', () => {
  beforeEach(() => {
    mockConfig.cerebrasApiKey = 'test-cerebras-key';
    mockConfig.openRouterApiKey = 'test-openrouter-key';
  });

  it('should return both providers when both keys available', () => {
    const providers = getAvailableProviders();

    expect(providers).toHaveLength(2);
    expect(providers[0].name).toBe('cerebras');
    expect(providers[1].name).toBe('openrouter');
  });

  it('should return only Cerebras when only Cerebras key available', () => {
    mockConfig.openRouterApiKey = '';

    const providers = getAvailableProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('cerebras');
  });

  it('should return empty array when no keys available', () => {
    mockConfig.cerebrasApiKey = '';
    mockConfig.openRouterApiKey = '';

    const providers = getAvailableProviders();

    expect(providers).toHaveLength(0);
  });
});