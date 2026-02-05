import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { handleWriteTool } from '../../src/server/tool-handlers.js';
import { config } from '../../src/config/constants.js';
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

  describe.each(providers)('edit existing file: %s', (provider) => {
    let restore;

    beforeAll(() => {
      restore = forceProvider(provider);
    });

    afterAll(() => restore());

    it('should edit an existing file and return a diff', async () => {
      const filePath = path.join(tempDir, `edit-${provider}.js`);
      const seed = `function greet(name) {\n  // TODO: implement greeting\n  return '';\n}`;
      await fs.writeFile(filePath, seed);

      const result = await handleWriteTool({
        file_path: filePath,
        prompt: 'Implement the greet function to return "Hello, " concatenated with the name parameter',
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const text = result.content[0].text;
      expect(text).toMatch(/update/i);

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).not.toBe(seed);
      expect(written).toMatch(/function/i);
    }, 30_000);
  });

  describe('context files', () => {
    let restore;
    const contextProvider = providers[0];

    beforeAll(() => {
      restore = forceProvider(contextProvider);
    });

    afterAll(() => restore());

    it('should use context files to inform code generation', async () => {
      const contextPath = path.join(tempDir, 'context-helper.js');
      const contextContent = `export function formatName(first, last) {\n  return \`\${first} \${last}\`;\n}`;
      await fs.writeFile(contextPath, contextContent);

      const outputPath = path.join(tempDir, 'context-output.js');

      const result = await handleWriteTool({
        file_path: outputPath,
        prompt: 'Create a greetUser function that imports and uses the formatName function from the context file to greet a user by full name',
        context_files: [contextPath],
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const written = await fs.readFile(outputPath, 'utf-8');
      expect(written).toContain('formatName');
    }, 30_000);
  });

  describe('nested directory creation', () => {
    let restore;
    const nestedProvider = providers[0];

    beforeAll(() => {
      restore = forceProvider(nestedProvider);
    });

    afterAll(() => restore());

    it('should create parent directories when they do not exist', async () => {
      const filePath = path.join(tempDir, 'nested', 'deep', 'dir', 'output.js');

      const result = await handleWriteTool({
        file_path: filePath,
        prompt: 'Create a function called hello that returns the string "world"',
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toMatch(/hello|world/i);
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

  describe('error handling', () => {
    it('should return structured error when prompt is missing', async () => {
      const filePath = path.join(tempDir, 'error-no-prompt.js');

      const result = await handleWriteTool({
        file_path: filePath,
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toMatch(/prompt is required/i);

      // File should not have been created
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should return structured error when file_path is missing', async () => {
      const result = await handleWriteTool({
        prompt: 'Create something',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toMatch(/file_path is required/i);
    });

    it('should return structured error with invalid API key', async () => {
      const savedCerebras = config.cerebrasApiKey;
      const savedOpenRouter = config.openRouterApiKey;
      config.cerebrasApiKey = 'invalid-key-xxx';
      config.openRouterApiKey = '';

      const filePath = path.join(tempDir, 'should-not-exist.js');

      const result = await handleWriteTool({
        file_path: filePath,
        prompt: 'Create a hello world function',
      });

      config.cerebrasApiKey = savedCerebras;
      config.openRouterApiKey = savedOpenRouter;

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toMatch(/error/i);

      // File should not have been created (API failed before write)
      await expect(fs.access(filePath)).rejects.toThrow();
    }, 30_000);
  });
});
