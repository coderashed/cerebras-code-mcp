import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
  default: {
    appendFile: vi.fn()
  }
}));

describe('debugLog', () => {
  const originalEnv = process.env.CEREBRAS_DEBUG;

  afterEach(() => {
    process.env.CEREBRAS_DEBUG = originalEnv;
    vi.resetModules();
  });

  it('should always log to console.error', async () => {
    // Note: v1.3.3 debugLog always logs regardless of CEREBRAS_DEBUG
    vi.resetModules();

    const { debugLog } = await import('../../src/config/constants.js');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await debugLog('test message');

    expect(consoleSpy).toHaveBeenCalledWith('test message');
    consoleSpy.mockRestore();
  });

  it('should log to console and file when CEREBRAS_DEBUG is true', async () => {
    process.env.CEREBRAS_DEBUG = 'true';
    vi.resetModules();

    const { debugLog } = await import('../../src/config/constants.js');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);

    await debugLog('test message');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('cerebras-mcp-debug.log'),
      expect.stringContaining('test message')
    );

    consoleSpy.mockRestore();
  });

  it('should handle file write errors gracefully', async () => {
    process.env.CEREBRAS_DEBUG = 'true';
    vi.resetModules();

    const { debugLog } = await import('../../src/config/constants.js');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fs.appendFile).mockRejectedValue(new Error('Write failed'));

    // Should not throw
    await expect(debugLog('test message')).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });
});

describe('getClineRulesPath', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    vi.resetModules();
  });

  it('should return a path containing Documents/Cline/Rules on linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.resetModules();

    const { getClineRulesPath } = await import('../../src/config/constants.js');
    const result = getClineRulesPath();

    expect(result).toContain('Documents');
    expect(result).toContain('Cline');
    expect(result).toContain('Rules');
  });

  it('should return a path containing Documents/Cline/Rules on win32', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    vi.resetModules();

    const { getClineRulesPath } = await import('../../src/config/constants.js');
    const result = getClineRulesPath();

    expect(result).toContain('Documents');
    expect(result).toContain('Cline');
    expect(result).toContain('Rules');
  });
});

describe('config env var branches', () => {
  const savedModel = process.env.CEREBRAS_MODEL;
  const savedMaxTokens = process.env.CEREBRAS_MAX_TOKENS;
  const savedORModel = process.env.OPENROUTER_MODEL;

  afterEach(() => {
    if (savedModel === undefined) delete process.env.CEREBRAS_MODEL;
    else process.env.CEREBRAS_MODEL = savedModel;
    if (savedMaxTokens === undefined) delete process.env.CEREBRAS_MAX_TOKENS;
    else process.env.CEREBRAS_MAX_TOKENS = savedMaxTokens;
    if (savedORModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = savedORModel;
    vi.resetModules();
  });

  it('should use CEREBRAS_MODEL when set', async () => {
    process.env.CEREBRAS_MODEL = 'custom-model';
    vi.resetModules();

    const { config } = await import('../../src/config/constants.js');
    expect(config.cerebrasModel).toBe('custom-model');
  });

  it('should parse CEREBRAS_MAX_TOKENS when set', async () => {
    process.env.CEREBRAS_MAX_TOKENS = '2048';
    vi.resetModules();

    const { config } = await import('../../src/config/constants.js');
    expect(config.maxTokens).toBe(2048);
  });

  it('should use OPENROUTER_MODEL when set', async () => {
    process.env.OPENROUTER_MODEL = 'custom-or-model';
    vi.resetModules();

    const { config } = await import('../../src/config/constants.js');
    expect(config.openRouterModel).toBe('custom-or-model');
  });
});