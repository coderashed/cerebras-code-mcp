import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
