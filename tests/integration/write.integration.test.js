import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { handleWriteTool } from '../../src/server/tool-handlers.js';
import { forceProvider, forceFallback, hasProvider, createTempDir } from './helpers/setup.js';

// Available providers based on env vars present
const providers = [
  hasProvider('cerebras') && 'cerebras',
  hasProvider('openrouter') && 'openrouter',
].filter(Boolean);

describe.skipIf(providers.length === 0)('Integration: write tool', () => {
  let tempDir, cleanup;

  beforeAll(async () => {
    ({ dir: tempDir, cleanup } = await createTempDir());
  });

  afterAll(async () => {
    await cleanup();
  });

  describe.each(providers)('provider: %s', (provider) => {
    let restore;

    beforeAll(() => {
      restore = forceProvider(provider);
    });

    afterAll(() => restore());

    it('should generate a hello world function', async () => {
      const filePath = path.join(tempDir, `hello-${provider}.js`);

      const result = await handleWriteTool({
        file_path: filePath,
        prompt: 'Create a function called helloWorld that returns the string "hello world"',
      });

      // Tool should return content (not an error)
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      // The first content item should be text (diff or create output)
      const text = result.content[0].text;
      expect(text).toBeDefined();

      // File should have been written
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toContain('helloWorld');
      expect(written).toMatch(/hello.world/i);
    }, 30_000);
  });

  const canTestFallback = hasProvider('cerebras') && hasProvider('openrouter');

  describe.skipIf(!canTestFallback)('fallback: cerebras → openrouter', () => {
    let restore;

    beforeAll(() => {
      restore = forceFallback();
    });

    afterAll(() => restore());

    it('should fall back to openrouter when cerebras fails', async () => {
      const filePath = path.join(tempDir, 'hello-fallback.js');

      const result = await handleWriteTool({
        file_path: filePath,
        prompt: 'Create a function called helloWorld that returns the string "hello world"',
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const text = result.content[0].text;
      expect(text).toBeDefined();

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toContain('helloWorld');
      expect(written).toMatch(/hello.world/i);
    }, 30_000);
  });
});
