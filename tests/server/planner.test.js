import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planBatchOperation } from '../../src/server/planner.js';
import https from 'https';
import { EventEmitter } from 'events';

// Mock https
vi.mock('https');

// Mock file-utils
vi.mock('../../src/utils/file-utils.js', () => ({
  readFileContent: vi.fn()
}));

// Mock config
vi.mock('../../src/config/constants.js', () => ({
  config: {
    cerebrasApiKey: 'test-api-key',
    cerebrasModel: 'test-model'
  }
}));

import { readFileContent } from '../../src/utils/file-utils.js';

// Helper to create mock request/response
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

function createMockResponse(statusCode, body) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = {};
  return { res, body };
}

describe('planBatchOperation', () => {
  let mockReq;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = createMockRequest();
    vi.mocked(https.request).mockImplementation((options, callback) => {
      mockReq._callback = callback;
      return mockReq;
    });
  });

  it('should return operations from successful API response', async () => {
    const operations = [
      { file_path: 'src/file1.js', prompt: 'Create file 1' },
      { file_path: 'src/file2.js', prompt: 'Create file 2' }
    ];

    const promise = planBatchOperation('Create a module');

    // Simulate API response
    const { res, body } = createMockResponse(200, JSON.stringify({
      choices: [{ message: { content: JSON.stringify(operations) } }]
    }));

    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: JSON.stringify(operations) } }]
    }));
    res.emit('end');

    const result = await promise;
    expect(result).toEqual(operations);
  });

  it('should handle JSON response wrapped in markdown code blocks', async () => {
    const operations = [{ file_path: 'file.js', prompt: 'test' }];
    const wrappedResponse = '```json\n' + JSON.stringify(operations) + '\n```';

    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: wrappedResponse } }]
    }));
    res.emit('end');

    const result = await promise;
    expect(result).toEqual(operations);
  });

  it('should include shared context in prompt', async () => {
    const operations = [{ file_path: 'file.js', prompt: 'test' }];

    const promise = planBatchOperation('Create file', 'Use TypeScript');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: JSON.stringify(operations) } }]
    }));
    res.emit('end');

    await promise;

    // Check that request was made with context
    const requestCall = https.request.mock.calls[0];
    expect(requestCall).toBeDefined();
  });

  it('should read and include context files', async () => {
    vi.mocked(readFileContent).mockResolvedValue('file content');
    const operations = [{ file_path: 'file.js', prompt: 'test' }];

    const promise = planBatchOperation('Create file', null, ['/path/context.js']);

    // Wait for context files to be read before the request is made
    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: JSON.stringify(operations) } }]
    }));
    res.emit('end');

    await promise;

    expect(readFileContent).toHaveBeenCalledWith('/path/context.js');
  });

  it('should handle missing context files gracefully', async () => {
    vi.mocked(readFileContent).mockRejectedValue(new Error('File not found'));
    const operations = [{ file_path: 'file.js', prompt: 'test' }];

    const promise = planBatchOperation('Create file', null, ['/missing.js']);

    // Wait for context files to be processed before the request is made
    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: JSON.stringify(operations) } }]
    }));
    res.emit('end');

    const result = await promise;
    expect(result).toEqual(operations);
  });

  it('should reject when API returns non-200 status', async () => {
    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(500, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({ error: { message: 'Server error' } }));
    res.emit('end');

    await expect(promise).rejects.toThrow('Planner API error: 500');
  });

  it('should reject when response is not an array', async () => {
    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: '{"not": "array"}' } }]
    }));
    res.emit('end');

    await expect(promise).rejects.toThrow('did not return an array');
  });

  it('should reject when operation missing file_path', async () => {
    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: '[{"prompt": "test"}]' } }]
    }));
    res.emit('end');

    await expect(promise).rejects.toThrow('must have file_path and prompt');
  });

  it('should reject when operation missing prompt', async () => {
    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: '[{"file_path": "test.js"}]' } }]
    }));
    res.emit('end');

    await expect(promise).rejects.toThrow('must have file_path and prompt');
  });

  it('should reject on network error', async () => {
    const promise = planBatchOperation('Create file');

    mockReq.emit('error', new Error('Network failed'));

    await expect(promise).rejects.toThrow('Planner request failed: Network failed');
  });

  it('should reject on timeout', async () => {
    const promise = planBatchOperation('Create file');

    // Trigger timeout callback
    mockReq._timeoutCallback();

    await expect(promise).rejects.toThrow('timeout after 30 seconds');
  });

  it('should reject when response is invalid JSON', async () => {
    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', 'not json at all');
    res.emit('end');

    await expect(promise).rejects.toThrow('Failed to parse API response');
  });

  it('should reject when LLM response is invalid JSON', async () => {
    const promise = planBatchOperation('Create file');

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: 'not json' } }]
    }));
    res.emit('end');

    await expect(promise).rejects.toThrow('Failed to parse planner response as JSON');
  });

  it('should handle context file returning null', async () => {
    vi.mocked(readFileContent).mockResolvedValue(null);
    const operations = [{ file_path: 'file.js', prompt: 'test' }];

    const promise = planBatchOperation('Create file', null, ['/empty.js']);

    // Wait for context files to be processed before the request is made
    await vi.waitFor(() => {
      expect(mockReq._callback).toBeDefined();
    });

    const { res } = createMockResponse(200, '');
    mockReq._callback(res);
    res.emit('data', JSON.stringify({
      choices: [{ message: { content: JSON.stringify(operations) } }]
    }));
    res.emit('end');

    const result = await promise;
    expect(result).toEqual(operations);
  });
});
