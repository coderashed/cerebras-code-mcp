import { describe, it, expect, vi, beforeEach } from 'vitest';
import https from 'https';
import { EventEmitter } from 'events';

vi.mock('https');

// Use vi.hoisted to create a mutable config that the mock factory can access
const mockConfig = vi.hoisted(() => ({
  cerebrasApiKey: 'test-key',
  cerebrasModel: 'test-model',
  temperature: 0.7,
  maxTokens: undefined,
  topP: undefined,
  clearThinking: false
}));

vi.mock('../../src/config/constants.js', () => ({
  config: mockConfig
}));

vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn(),
  getLanguageFromFile: vi.fn(() => 'javascript'),
  expandContextPaths: vi.fn(paths => Promise.resolve(paths || []))
}));

vi.mock('../../src/utils/code-cleaner.js', () => ({
  cleanCodeResponse: vi.fn(code => code)
}));

// Import after mocks are set up
import { callCerebras } from '../../src/api/cerebras.js';
import { readFileContent, getLanguageFromFile } from '../../src/utils/file-utils.js';
import { cleanCodeResponse } from '../../src/utils/code-cleaner.js';

function createMockRequest() {
  const req = new EventEmitter();
  req.write = vi.fn();
  req.end = vi.fn();
  req.destroy = vi.fn();
  req.setTimeout = vi.fn((timeout, callback) => {
    req._timeoutCallback = callback;
  });
  return req;
}

function createMockResponse(statusCode, headers = {}) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = headers;
  return res;
}

describe('callCerebras', () => {
  let mockReq;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config to defaults
    mockConfig.cerebrasApiKey = 'test-key';
    mockConfig.cerebrasModel = 'test-model';
    mockConfig.temperature = 0.7;
    mockConfig.maxTokens = undefined;
    mockConfig.topP = undefined;
    mockConfig.clearThinking = false;

    mockReq = createMockRequest();
    vi.mocked(https.request).mockImplementation((options, callback) => {
      mockReq._callback = callback;
      return mockReq;
    });
  });

  it('should return cleaned code on successful response', async () => {
    vi.mocked(cleanCodeResponse).mockReturnValue('cleaned code');
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('Create a function', 'context', 'output.js');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'raw code' } }]
    }));
    res.emit('end');

    const result = await promise;
    expect(result).toBe('cleaned code');
    expect(cleanCodeResponse).toHaveBeenCalledWith('raw code');
  });

  it('should throw error when API key is missing', async () => {
    mockConfig.cerebrasApiKey = '';

    await expect(callCerebras('test')).rejects.toThrow('No Cerebras API key found');
  });

  it('should throw error on non-200 status code', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('test');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(500);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({ error: { message: 'Server error' } }));
    res.emit('end');

    await expect(promise).rejects.toThrow('Cerebras API error: 500');
  });

  it('should throw error on network failure', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('test');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    mockReq.emit('error', new Error('Network failed'));

    await expect(promise).rejects.toThrow('Request failed: Network failed');
  });

  it('should throw error on timeout', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('test');

    await vi.waitFor(() => {
      expect(mockReq._timeoutCallback).toBeDefined();
    });

    mockReq._timeoutCallback();

    await expect(promise).rejects.toThrow('Request timeout after 30 seconds');
    expect(mockReq.destroy).toHaveBeenCalled();
  });

  it('should throw error on invalid JSON response', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('test');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', 'not valid json');
    res.emit('end');

    await expect(promise).rejects.toThrow('Failed to parse API response');
  });

  it('should include context in prompt', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('Create function', 'This is context', 'output.js');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'code' } }]
    }));
    res.emit('end');

    await promise;

    const requestData = JSON.parse(mockReq.write.mock.calls[0][0]);
    expect(requestData.messages[1].content).toContain('Context: This is context');
  });

  it('should read and include context files', async () => {
    vi.mocked(readFileContent).mockResolvedValue('context file content');
    const promise = callCerebras('Create function', '', 'output.js', null, ['/path/to/context.js']);

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'code' } }]
    }));
    res.emit('end');

    await promise;

    expect(readFileContent).toHaveBeenCalledWith('/path/to/context.js');
    const requestData = JSON.parse(mockReq.write.mock.calls[0][0]);
    expect(requestData.messages[1].content).toContain('Context Files:');
    expect(requestData.messages[1].content).toContain('context file content');
  });

  it('should filter output file from context files', async () => {
    vi.mocked(readFileContent).mockResolvedValue('other content');
    const promise = callCerebras('test', '', '/abs/path/output.js', null, ['/abs/path/output.js', '/other/file.js']);

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'code' } }]
    }));
    res.emit('end');

    await promise;

    expect(readFileContent).toHaveBeenCalledWith('/other/file.js');
    const requestData = JSON.parse(mockReq.write.mock.calls[0][0]);
    expect(requestData.messages[1].content).not.toContain('/abs/path/output.js');
  });

  it('should include max_tokens when configured', async () => {
    mockConfig.maxTokens = 1000;
    vi.mocked(readFileContent).mockResolvedValue(null);

    const promise = callCerebras('test');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'code' } }]
    }));
    res.emit('end');

    await promise;

    const requestData = JSON.parse(mockReq.write.mock.calls[0][0]);
    expect(requestData.max_tokens).toBe(1000);
  });

  it('should use detected language for output file', async () => {
    vi.mocked(getLanguageFromFile).mockReturnValue('typescript');
    vi.mocked(readFileContent).mockResolvedValue(null);
    const promise = callCerebras('test', '', 'output.ts');

    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const res = createMockResponse(200);
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'code' } }]
    }));
    res.emit('end');

    await promise;

    expect(getLanguageFromFile).toHaveBeenCalledWith('output.ts', null);
    const requestData = JSON.parse(mockReq.write.mock.calls[0][0]);
    expect(requestData.messages[0].content).toContain('typescript');
  });
});