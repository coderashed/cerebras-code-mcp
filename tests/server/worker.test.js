import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWorkerData = vi.hoisted(() => ({
  file_path: '/test/file.js',
  prompt: 'test prompt',
  context_files: [],
  shared_context: null
}));

const mockParentPort = vi.hoisted(() => ({
  postMessage: vi.fn()
}));

const mockReadFileContent = vi.hoisted(() => vi.fn());
const mockWriteFileContent = vi.hoisted(() => vi.fn());
const mockRouteAPICall = vi.hoisted(() => vi.fn());
const mockFormatEditResponse = vi.hoisted(() => vi.fn());
const mockFormatCreateResponse = vi.hoisted(() => vi.fn());

vi.mock('worker_threads', () => ({
  workerData: mockWorkerData,
  parentPort: mockParentPort
}));

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: mockReadFileContent,
  writeFileContent: mockWriteFileContent
}));

vi.mock('../../src/api/router/router.js', () => ({
  routeAPICall: mockRouteAPICall
}));

vi.mock('../../src/formatting/response-formatter.js', () => ({
  formatEditResponse: mockFormatEditResponse,
  formatCreateResponse: mockFormatCreateResponse
}));

describe('worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParentPort.postMessage.mockClear();
    mockReadFileContent.mockReset();
    mockWriteFileContent.mockReset();
    mockRouteAPICall.mockReset();
    mockFormatEditResponse.mockReset();
    mockFormatCreateResponse.mockReset();

    mockWorkerData.file_path = '/test/file.js';
    mockWorkerData.prompt = 'test prompt';
    mockWorkerData.context_files = [];
    mockWorkerData.shared_context = null;
  });

  const loadWorker = async () => {
    vi.resetModules();
    await import('../../src/server/worker.js');
    await new Promise(resolve => setTimeout(resolve, 10));
  };

  it('should create new file when content does not exist', async () => {
    mockReadFileContent.mockResolvedValue(null);
    mockRouteAPICall.mockResolvedValue('new content');
    mockFormatCreateResponse.mockReturnValue({ type: 'text', text: 'File created' });

    await loadWorker();

    expect(mockReadFileContent).toHaveBeenCalledWith('/test/file.js');
    expect(mockRouteAPICall).toHaveBeenCalledWith('test prompt', '', '/test/file.js', null, [], null);
    expect(mockWriteFileContent).toHaveBeenCalledWith('/test/file.js', 'new content');
    expect(mockFormatCreateResponse).toHaveBeenCalledWith('file.js', 'new content', '/test/file.js');
    expect(mockFormatEditResponse).not.toHaveBeenCalled();
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({ content: [{ type: 'text', text: 'File created' }] });
  });

  it('should edit existing file when content exists', async () => {
    const existingContent = 'old content';
    const newContent = 'updated content';
    mockReadFileContent.mockResolvedValue(existingContent);
    mockRouteAPICall.mockResolvedValue(newContent);
    mockFormatEditResponse.mockReturnValue({ type: 'text', text: 'File edited' });

    await loadWorker();

    expect(mockReadFileContent).toHaveBeenCalledWith('/test/file.js');
    expect(mockRouteAPICall).toHaveBeenCalledWith('test prompt', '', '/test/file.js', null, [], existingContent);
    expect(mockWriteFileContent).toHaveBeenCalledWith('/test/file.js', newContent);
    expect(mockFormatEditResponse).toHaveBeenCalledWith('file.js', existingContent, newContent, '/test/file.js');
    expect(mockFormatCreateResponse).not.toHaveBeenCalled();
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({ content: [{ type: 'text', text: 'File edited' }] });
  });

  it('should prepend shared_context to prompt', async () => {
    mockWorkerData.shared_context = 'shared context info';
    const existingContent = 'existing';
    mockReadFileContent.mockResolvedValue(existingContent);
    mockRouteAPICall.mockResolvedValue('result');
    mockFormatEditResponse.mockReturnValue({ type: 'text', text: 'done' });

    await loadWorker();

    expect(mockRouteAPICall).toHaveBeenCalledWith(
      'shared context info\n\ntest prompt',
      '',
      '/test/file.js',
      null,
      [],
      existingContent
    );
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({ content: [{ type: 'text', text: 'done' }] });
  });

  it('should handle errors and post error message', async () => {
    const error = new Error('API call failed');
    mockReadFileContent.mockResolvedValue('content');
    mockRouteAPICall.mockRejectedValue(error);

    await loadWorker();

    expect(mockParentPort.postMessage).toHaveBeenCalledWith({
      content: [{ type: 'text', text: 'API call failed' }]
    });
  });

  it('should post empty content when response is falsy', async () => {
    mockReadFileContent.mockResolvedValue(null);
    mockRouteAPICall.mockResolvedValue('result');
    mockFormatCreateResponse.mockReturnValue(null);

    await loadWorker();

    expect(mockParentPort.postMessage).toHaveBeenCalledWith({ content: [] });
  });
});