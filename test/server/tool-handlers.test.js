import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleWriteTool } from '../../src/server/tool-handlers.js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

// Mock dependencies
vi.mock('../../src/config/constants.js', () => ({
  debugLog: vi.fn(),
  config: {}
}));

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn(),
  writeFileContent: vi.fn()
}));

vi.mock('../../src/utils/code-cleaner.js', () => ({
  cleanCodeResponse: vi.fn(code => code) // Pass through by default
}));

// Mock both routers since the import is dynamic
vi.mock('../../src/api/router/enhanced-router.js', () => ({
  routeAPICall: vi.fn()
}));

vi.mock('../../src/api/router/router.js', () => ({
  routeAPICall: vi.fn()
}));

vi.mock('../../src/formatting/response-formatter.js', () => ({
  formatEditResponse: vi.fn(),
  formatCreateResponse: vi.fn()
}));

import { readFileContent, writeFileContent } from '../../src/utils/file-utils.js';
import { cleanCodeResponse } from '../../src/utils/code-cleaner.js';
import { formatEditResponse, formatCreateResponse } from '../../src/formatting/response-formatter.js';

// Import the mocked router - it will be one or the other based on env vars
let routeAPICall;
if (process.env.CEREBRAS_FREE_KEY && process.env.CEREBRAS_PAID_KEY) {
  const module = await import('../../src/api/router/enhanced-router.js');
  routeAPICall = module.routeAPICall;
} else {
  const module = await import('../../src/api/router/router.js');
  routeAPICall = module.routeAPICall;
}

describe('ToolHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock implementations
    cleanCodeResponse.mockImplementation(code => code);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleWriteTool', () => {
    it('should handle new file creation', async () => {
      const args = {
        file_path: '/test/new-file.js',
        prompt: 'Create a hello world function',
        context_files: []
      };

      readFileContent.mockResolvedValue(null); // File doesn't exist
      routeAPICall.mockResolvedValue('function hello() { return "world"; }');
      writeFileContent.mockResolvedValue(undefined);
      formatCreateResponse.mockReturnValue({
        type: 'text',
        text: 'Created new file'
      });

      const result = await handleWriteTool(args);

      expect(readFileContent).toHaveBeenCalledWith('/test/new-file.js');
      expect(routeAPICall).toHaveBeenCalledWith(
        'Create a hello world function',
        '',
        '/test/new-file.js',
        null,
        []
      );
      expect(writeFileContent).toHaveBeenCalledWith(
        '/test/new-file.js',
        'function hello() { return "world"; }'
      );
      expect(formatCreateResponse).toHaveBeenCalled();
      expect(result.content).toHaveLength(1);
    });

    it('should handle existing file modification', async () => {
      const args = {
        file_path: '/test/existing.js',
        prompt: 'Add a new function',
        context_files: []
      };

      const existingContent = 'const x = 1;';
      readFileContent.mockResolvedValue(existingContent);
      routeAPICall.mockResolvedValue('const x = 1;\nfunction newFunc() {}');
      writeFileContent.mockResolvedValue(undefined);
      formatEditResponse.mockReturnValue({
        type: 'text',
        text: 'Modified file'
      });

      const result = await handleWriteTool(args);

      expect(readFileContent).toHaveBeenCalledWith('/test/existing.js');
      expect(routeAPICall).toHaveBeenCalled();
      expect(writeFileContent).toHaveBeenCalled();
      expect(formatEditResponse).toHaveBeenCalledWith(
        'existing.js',
        existingContent,
        'const x = 1;\nfunction newFunc() {}',
        '/test/existing.js'
      );
      expect(result.content).toHaveLength(1);
    });

    it('should handle context files', async () => {
      const args = {
        file_path: '/test/output.js',
        prompt: 'Generate based on context',
        context_files: ['/test/context1.js', '/test/context2.js']
      };

      readFileContent.mockResolvedValue(null);
      routeAPICall.mockResolvedValue('generated code');
      writeFileContent.mockResolvedValue(undefined);
      formatCreateResponse.mockReturnValue({ type: 'text', text: 'Created' });

      await handleWriteTool(args);

      expect(routeAPICall).toHaveBeenCalledWith(
        'Generate based on context',
        '',
        '/test/output.js',
        null,
        ['/test/context1.js', '/test/context2.js']
      );
    });

    it('should clean code response', async () => {
      const args = {
        file_path: '/test/file.js',
        prompt: 'Generate code',
        context_files: []
      };

      readFileContent.mockResolvedValue(null);
      routeAPICall.mockResolvedValue('```javascript\nconst x = 1;\n```');
      cleanCodeResponse.mockReturnValue('const x = 1;');
      writeFileContent.mockResolvedValue(undefined);
      formatCreateResponse.mockReturnValue({ type: 'text', text: 'Created' });

      await handleWriteTool(args);

      expect(cleanCodeResponse).toHaveBeenCalledWith('```javascript\nconst x = 1;\n```');
      expect(writeFileContent).toHaveBeenCalledWith('/test/file.js', 'const x = 1;');
    });

    it('should return error message when prompt is missing', async () => {
      const args = {
        file_path: '/test/file.js',
        // prompt is missing
      };

      const result = await handleWriteTool(args);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Prompt is required');
    });

    it('should return error message when file_path is missing', async () => {
      const args = {
        prompt: 'Generate code',
        // file_path is missing
      };

      const result = await handleWriteTool(args);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('file_path is required');
    });

    it('should handle API errors gracefully', async () => {
      const args = {
        file_path: '/test/file.js',
        prompt: 'Generate code',
        context_files: []
      };

      readFileContent.mockResolvedValue(null);
      routeAPICall.mockRejectedValue(new Error('API failed'));

      const result = await handleWriteTool(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error in cerebras-mcp server: API failed');
    });

    it('should extract filename correctly', async () => {
      const args = {
        file_path: '/very/long/path/to/myfile.py',
        prompt: 'Generate Python code',
        context_files: []
      };

      readFileContent.mockResolvedValue(null);
      routeAPICall.mockResolvedValue('print("hello")');
      writeFileContent.mockResolvedValue(undefined);
      formatCreateResponse.mockReturnValue({ type: 'text', text: 'Created' });

      await handleWriteTool(args);

      expect(formatCreateResponse).toHaveBeenCalledWith(
        'myfile.py',
        'print("hello")',
        '/very/long/path/to/myfile.py'
      );
    });

    it('should handle Windows paths', async () => {
      const args = {
        file_path: 'C:\\Users\\test\\file.js',
        prompt: 'Generate code',
        context_files: []
      };

      readFileContent.mockResolvedValue(null);
      routeAPICall.mockResolvedValue('const x = 1;');
      writeFileContent.mockResolvedValue(undefined);
      formatCreateResponse.mockReturnValue({ type: 'text', text: 'Created' });

      await handleWriteTool(args);

      const expectedFileName = path.basename('C:\\Users\\test\\file.js');
      expect(formatCreateResponse).toHaveBeenCalledWith(
        expectedFileName,
        'const x = 1;',
        'C:\\Users\\test\\file.js'
      );
    });

    it('should set IDE source from environment variable', async () => {
      process.env.CEREBRAS_MCP_IDE = 'cursor';
      
      const args = {
        file_path: '/test/file.js',
        prompt: 'Generate code',
        context_files: []
      };

      readFileContent.mockResolvedValue(null);
      routeAPICall.mockResolvedValue('code');
      writeFileContent.mockResolvedValue(undefined);
      formatCreateResponse.mockReturnValue({ type: 'text', text: 'Created' });

      await handleWriteTool(args);

      // Check that debugLog was called with IDE source
      const { debugLog } = await import('../../src/config/constants.js');
      expect(debugLog).toHaveBeenCalledWith(expect.stringContaining('IDE Source: cursor'));
      
      delete process.env.CEREBRAS_MCP_IDE;
    });
  });
});