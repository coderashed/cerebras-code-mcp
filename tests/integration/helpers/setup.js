import { config } from '../../../src/config/constants.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Force the router to use a specific provider by manipulating config keys.
 * Returns a restore function to call in afterAll/afterEach.
 */
export function forceProvider(provider) {
  const saved = {
    cerebrasApiKey: config.cerebrasApiKey,
    openRouterApiKey: config.openRouterApiKey,
  };

  if (provider === 'cerebras') {
    config.openRouterApiKey = '';
  } else if (provider === 'openrouter') {
    config.cerebrasApiKey = '';
  }

  return () => Object.assign(config, saved);
}

/**
 * Force the Cerebras → OpenRouter fallback path by setting an invalid
 * Cerebras key (truthy so the router picks it as primary, but the API
 * call will fail) while keeping the real OpenRouter key intact.
 * Returns a restore function.
 */
export function forceFallback() {
  const saved = { cerebrasApiKey: config.cerebrasApiKey };
  config.cerebrasApiKey = 'invalid-key';
  return () => Object.assign(config, saved);
}

/**
 * Check if a provider's API key is available.
 */
export function hasProvider(provider) {
  if (provider === 'cerebras') return !!process.env.CEREBRAS_API_KEY;
  if (provider === 'openrouter') return !!process.env.OPENROUTER_API_KEY;
  return false;
}

/**
 * Create a temporary directory for integration test file output.
 * Returns { dir, cleanup } where cleanup removes the directory.
 */
export async function createTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebras-mcp-test-'));
  return {
    dir,
    cleanup: () => fs.rm(dir, { recursive: true, force: true }),
  };
}
