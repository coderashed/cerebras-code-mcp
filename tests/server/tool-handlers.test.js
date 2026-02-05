import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWriteTool, handleBatchWriteTool } from '../../src/server/tool-handlers.js';

const mockResolveContextForFile = vi.hoisted(() => vi.fn());

vi.mock('../../src/server/session-context.js', () => ({
  resolveContextForFile: mockResolveContextForFile
}));

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn(),
  writeFileContent: vi.fn()
}));

vi.mock('../../src/api/router/router.js', () => ({
  routeAPICall: vi.fn()
}));

vi.mock('../../src/formatting/response-formatter.js', () => ({
  formatEditResponse: vi.fn(),
  formatCreateResponse: vi.fn()
}));

vi.mock('../../src/server/agent-spawner.js', () => ({
  spawnAgentBatch: vi.fn()
}));

vi.mock('../../src/server/planner.js', () => ({
  planBatchOperation: vi.fn()
}));

import { readFileContent, writeFileContent } from '../../src/utils/file-utils.js';
import { routeAPICall } from '../../src/api/router/router.js';
import { formatEditResponse, formatCreateResponse } from '../../src/formatting/response-formatter.js';
import { spawnAgentBatch } from '../../src/server/agent-spawner.js';
import { planBatchOperation } from '../../src/server/planner.js';

describe('handleWriteTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveContextForFile.mockReset();
    mockResolveContextForFile.mockImplementation((filePath, params = {}) => ({
      shared_context: params.shared_context ?? null,
      shared_context_files: params.shared_context_files ?? []
    }));
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
      ['/context/file1.js', '/context/file2.js'],
      null
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
});

describe('handleBatchWriteTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveContextForFile.mockReset();
    mockResolveContextForFile.mockImplementation((filePath, params = {}) => ({
      shared_context: params.shared_context ?? null,
      shared_context_files: params.shared_context_files ?? []
    }));
  });

  it('should return error when neither prompt nor operations provided', async () => {
    const result = await handleBatchWriteTool({});

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('prompt');
  });

  it('should use provided operations in manual mode', async () => {
    const operations = [
      { file_path: '/path/file1.js', prompt: 'create file 1' },
      { file_path: '/path/file2.js', prompt: 'create file 2' }
    ];

    vi.mocked(spawnAgentBatch).mockResolvedValue({
      content: [{ type: 'text', text: 'Done' }]
    });

    const result = await handleBatchWriteTool({ operations });

    expect(planBatchOperation).not.toHaveBeenCalled();
    expect(spawnAgentBatch).toHaveBeenCalledWith(operations, null, []);
    expect(result.content[0].text).toContain('Planned');
    expect(result.content[0].text).toContain('2');
  });

  it('should use planner in auto mode', async () => {
    const plannedOps = [
      { file_path: '/path/auto1.js', prompt: 'auto prompt' }
    ];

    vi.mocked(planBatchOperation).mockResolvedValue(plannedOps);
    vi.mocked(spawnAgentBatch).mockResolvedValue({
      content: [{ type: 'text', text: 'Created' }]
    });

    const result = await handleBatchWriteTool({
      prompt: 'Create a user module',
      shared_context: 'Use TypeScript',
      shared_context_files: ['/types.ts']
    });

    expect(planBatchOperation).toHaveBeenCalledWith(
      'Create a user module',
      'Use TypeScript',
      ['/types.ts']
    );
    expect(spawnAgentBatch).toHaveBeenCalled();
  });

  it('should return error when planner returns empty operations', async () => {
    vi.mocked(planBatchOperation).mockResolvedValue([]);

    const result = await handleBatchWriteTool({ prompt: 'do something' });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('No operations');
  });

  it('should return error when planner returns null', async () => {
    vi.mocked(planBatchOperation).mockResolvedValue(null);

    const result = await handleBatchWriteTool({ prompt: 'do something' });

    expect(result.content[0].text).toContain('Error');
  });

  it('should handle spawner errors gracefully', async () => {
    vi.mocked(planBatchOperation).mockResolvedValue([
      { file_path: '/file.js', prompt: 'test' }
    ]);
    vi.mocked(spawnAgentBatch).mockRejectedValue(new Error('Spawn failed'));

    const result = await handleBatchWriteTool({ prompt: 'create' });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Spawn failed');
  });

  it('should pass shared context to spawner', async () => {
    const operations = [{ file_path: '/file.js', prompt: 'test' }];

    vi.mocked(spawnAgentBatch).mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }]
    });

    await handleBatchWriteTool({
      operations,
      shared_context: 'style guide',
      shared_context_files: ['/shared.js']
    });

    expect(spawnAgentBatch).toHaveBeenCalledWith(
      operations,
      'style guide',
      ['/shared.js']
    );
  });
});