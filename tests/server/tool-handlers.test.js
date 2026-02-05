import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWriteTool } from '../../src/server/tool-handlers.js';

vi.mock('../../src/config/constants.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn(),
  writeFileContent: vi.fn()
}));

vi.mock('../../src/utils/code-cleaner.js', () => ({
  cleanCodeResponse: vi.fn(code => code)
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
import { routeAPICall } from '../../src/api/router/router.js';
import { formatEditResponse, formatCreateResponse } from '../../src/formatting/response-formatter.js';

describe('handleWriteTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when prompt is missing', async () => {
    const result = await handleWriteTool({ file_path: '/path/file.js' });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Prompt is required');
  });

  it('should return error when file_path is missing', async () => {
    const result = await handleWriteTool({ prompt: 'write code' });

    expect(result.content[0].text).toContain('file_path is required');
  });

  it('should create new file when file does not exist', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    vi.mocked(routeAPICall).mockResolvedValue('generated code');
    vi.mocked(writeFileContent).mockResolvedValue(true);
    vi.mocked(formatCreateResponse).mockReturnValue({
      type: 'text',
      text: 'Created file'
    });

    const result = await handleWriteTool({
      file_path: '/path/new.js',
      prompt: 'create a function'
    });

    expect(readFileContent).toHaveBeenCalledWith('/path/new.js');
    expect(routeAPICall).toHaveBeenCalled();
    expect(writeFileContent).toHaveBeenCalledWith('/path/new.js', 'generated code');
    expect(formatCreateResponse).toHaveBeenCalledWith('new.js', 'generated code', '/path/new.js');
    expect(result.content).toHaveLength(1);
  });

  it('should edit existing file', async () => {
    vi.mocked(readFileContent).mockResolvedValue('existing content');
    vi.mocked(routeAPICall).mockResolvedValue('updated content');
    vi.mocked(writeFileContent).mockResolvedValue(true);
    vi.mocked(formatEditResponse).mockReturnValue({
      type: 'text',
      text: 'Updated file'
    });

    const result = await handleWriteTool({
      file_path: '/path/existing.js',
      prompt: 'update the function'
    });

    expect(formatEditResponse).toHaveBeenCalledWith(
      'existing.js',
      'existing content',
      'updated content',
      '/path/existing.js'
    );
  });

  it('should pass context_files to routeAPICall', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    vi.mocked(routeAPICall).mockResolvedValue('code');
    vi.mocked(writeFileContent).mockResolvedValue(true);
    vi.mocked(formatCreateResponse).mockReturnValue({ type: 'text', text: 'ok' });

    await handleWriteTool({
      file_path: '/path/file.js',
      prompt: 'write code',
      context_files: ['/context/file1.js', '/context/file2.js']
    });

    expect(routeAPICall).toHaveBeenCalledWith(
      'write code',
      '',
      '/path/file.js',
      null,
      ['/context/file1.js', '/context/file2.js']
    );
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    vi.mocked(routeAPICall).mockRejectedValue(new Error('API failed'));

    const result = await handleWriteTool({
      file_path: '/path/file.js',
      prompt: 'write code'
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('API failed');
  });

  it('should handle null formatEditResponse', async () => {
    vi.mocked(readFileContent).mockResolvedValue('old');
    vi.mocked(routeAPICall).mockResolvedValue('old'); // No change
    vi.mocked(writeFileContent).mockResolvedValue(true);
    vi.mocked(formatEditResponse).mockReturnValue(null);

    const result = await handleWriteTool({
      file_path: '/path/file.js',
      prompt: 'update'
    });

    expect(result.content).toHaveLength(0);
  });

  it('should return empty content when existing file is empty', async () => {
    vi.mocked(readFileContent).mockResolvedValue('');
    vi.mocked(routeAPICall).mockResolvedValue('new code');
    vi.mocked(writeFileContent).mockResolvedValue(true);

    const result = await handleWriteTool({
      file_path: '/path/empty.js',
      prompt: 'write code'
    });

    expect(writeFileContent).toHaveBeenCalledWith('/path/empty.js', 'new code');
    expect(formatEditResponse).not.toHaveBeenCalled();
    expect(formatCreateResponse).not.toHaveBeenCalled();
    expect(result.content).toHaveLength(0);
  });
});