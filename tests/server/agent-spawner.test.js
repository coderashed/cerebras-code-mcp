import { describe, it, expect, vi, beforeEach } from 'vitest';

// Store worker instances in a global variable that the mock can access
const mockWorkerInstances = [];

// Mock worker_threads with inline class definition
vi.mock('worker_threads', () => {
  return {
    Worker: class MockWorker {
      constructor(workerPath, options) {
        this.workerPath = workerPath;
        this.workerData = options?.workerData;
        this._handlers = {};
        mockWorkerInstances.push(this);
      }

      on(event, handler) {
        this._handlers[event] = handler;
      }

      emit(event, data) {
        if (this._handlers[event]) {
          this._handlers[event](data);
        }
      }
    }
  };
});

// Mock rate-limiter
vi.mock('../../src/api/rate-limiter.js', () => ({
  cerebrasRateLimiter: {
    execute: vi.fn((fn) => fn())
  }
}));

// Mock config
vi.mock('../../src/config/constants.js', () => ({
  config: {
    maxConcurrentRequests: 3
  }
}));

import { spawnAgent, spawnAgentBatch } from '../../src/server/agent-spawner.js';
import { cerebrasRateLimiter } from '../../src/api/rate-limiter.js';

describe('spawnAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkerInstances.length = 0;
  });

  it('should resolve with result on message', async () => {
    const promise = spawnAgent({ file_path: 'test.js', prompt: 'test' });

    const worker = mockWorkerInstances[0];
    worker.emit('message', { content: [{ type: 'text', text: 'done' }] });

    const result = await promise;
    expect(result).toEqual({ content: [{ type: 'text', text: 'done' }] });
  });

  it('should reject on worker error', async () => {
    const promise = spawnAgent({ file_path: 'test.js', prompt: 'test' });

    const worker = mockWorkerInstances[0];
    worker.emit('error', new Error('Worker crashed'));

    await expect(promise).rejects.toThrow('Worker crashed');
  });

  it('should reject on non-zero exit without result', async () => {
    const promise = spawnAgent({ file_path: 'test.js', prompt: 'test' });

    const worker = mockWorkerInstances[0];
    worker.emit('exit', 1);

    await expect(promise).rejects.toThrow('Worker stopped with exit code 1');
  });

  it('should not reject on zero exit code after message', async () => {
    const promise = spawnAgent({ file_path: 'test.js', prompt: 'test' });

    const worker = mockWorkerInstances[0];
    worker.emit('message', { content: [] });
    worker.emit('exit', 0);

    const result = await promise;
    expect(result).toEqual({ content: [] });
  });

  it('should not reject if result received before non-zero exit', async () => {
    const promise = spawnAgent({ file_path: 'test.js', prompt: 'test' });

    const worker = mockWorkerInstances[0];
    worker.emit('message', { content: [{ type: 'text', text: 'ok' }] });
    worker.emit('exit', 1);

    const result = await promise;
    expect(result.content[0].text).toBe('ok');
  });

  it('should pass args as workerData', async () => {
    const args = { file_path: '/path/file.js', prompt: 'create file' };
    spawnAgent(args);

    const worker = mockWorkerInstances[0];
    expect(worker.workerData).toEqual(args);
  });
});

describe('spawnAgentBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkerInstances.length = 0;
  });

  it('should handle empty operations', async () => {
    const result = await spawnAgentBatch([]);
    expect(result).toEqual({ content: [] });
  });

  it('should collect failures', async () => {
    vi.mocked(cerebrasRateLimiter.execute).mockRejectedValueOnce(new Error('Failed'));

    const operations = [{ file_path: 'file.js', prompt: 'test' }];
    const result = await spawnAgentBatch(operations);

    expect(result.content.some(c => c.text?.includes('Failed'))).toBe(true);
  });

  it('should flatten content from successful results', async () => {
    vi.mocked(cerebrasRateLimiter.execute).mockImplementation(async () => {
      return { content: [{ type: 'text', text: 'result' }] };
    });

    const operations = [
      { file_path: 'file1.js', prompt: 'test1' },
      { file_path: 'file2.js', prompt: 'test2' }
    ];

    const result = await spawnAgentBatch(operations);

    expect(result.content.length).toBe(2);
    expect(result.content[0].text).toBe('result');
  });

  it('should respect concurrency limit', async () => {
    let activeCount = 0;
    let maxActive = 0;

    vi.mocked(cerebrasRateLimiter.execute).mockImplementation(async () => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      await new Promise(r => setTimeout(r, 10));
      activeCount--;
      return { content: [] };
    });

    const operations = Array(5).fill({ file_path: 'file.js', prompt: 'test' });
    await spawnAgentBatch(operations);

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('should merge shared context', async () => {
    vi.mocked(cerebrasRateLimiter.execute).mockImplementation(async () => {
      return { content: [] };
    });

    const operations = [{ file_path: 'file.js', prompt: 'test' }];
    await spawnAgentBatch(operations, 'shared context', ['/shared.js']);

    expect(cerebrasRateLimiter.execute).toHaveBeenCalled();
  });

  it('should combine context files', async () => {
    vi.mocked(cerebrasRateLimiter.execute).mockImplementation(async () => {
      return { content: [] };
    });

    const operations = [{
      file_path: 'file.js',
      prompt: 'test',
      context_files: ['/op-context.js']
    }];

    await spawnAgentBatch(operations, 'shared', ['/shared-context.js']);

    expect(cerebrasRateLimiter.execute).toHaveBeenCalled();
  });

  it('should process multiple operations', async () => {
    vi.mocked(cerebrasRateLimiter.execute).mockImplementation(async () => {
      return { content: [{ type: 'text', text: 'ok' }] };
    });

    const operations = [
      { file_path: 'file1.js', prompt: 'create 1' },
      { file_path: 'file2.js', prompt: 'create 2' }
    ];

    const result = await spawnAgentBatch(operations);

    expect(cerebrasRateLimiter.execute).toHaveBeenCalledTimes(2);
    expect(result.content.length).toBe(2);
  });
});
