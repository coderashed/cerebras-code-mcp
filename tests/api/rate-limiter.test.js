import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlidingWindowRateLimiter, RateLimitError } from '../../src/api/rate-limiter.js';

describe('RateLimitError', () => {
  it('should create error with correct properties', () => {
    const error = new RateLimitError('Rate limit exceeded', 429, 5);

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(5000); // converted to ms
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('RateLimitError');
  });

  it('should handle undefined retryAfter', () => {
    const error = new RateLimitError('Rate limit exceeded', 429);

    expect(error.retryAfter).toBeUndefined();
  });
});

describe('SlidingWindowRateLimiter', () => {
  it('should create with default options', () => {
    const limiter = new SlidingWindowRateLimiter();

    expect(limiter.perSecondLimit).toBe(12);
    expect(limiter.perMinuteLimit).toBe(120);
    expect(limiter.maxRetries).toBe(3);
  });

  it('should create with custom options', () => {
    const limiter = new SlidingWindowRateLimiter({
      perSecondLimit: 5,
      perMinuteLimit: 50,
      maxRetries: 2,
    });

    expect(limiter.perSecondLimit).toBe(5);
    expect(limiter.perMinuteLimit).toBe(50);
    expect(limiter.maxRetries).toBe(2);
  });

  it('should execute function and return result', async () => {
    const limiter = new SlidingWindowRateLimiter();
    const result = await limiter.execute(() => Promise.resolve('success'));

    expect(result).toBe('success');
  });

  it('should track request timestamps', async () => {
    const limiter = new SlidingWindowRateLimiter();

    await limiter.execute(() => Promise.resolve('test'));

    expect(limiter.requestTimestamps.length).toBe(1);
  });

  it('should reject when function throws non-rate-limit error', async () => {
    const limiter = new SlidingWindowRateLimiter();

    await expect(limiter.execute(() => {
      throw new Error('Some error');
    })).rejects.toThrow('Some error');
  });

  it('should retry on RateLimitError with retryAfter', async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRetries: 2 });
    let attempts = 0;

    const result = await limiter.execute(async () => {
      attempts++;
      if (attempts === 1) {
        throw new RateLimitError('Rate limit', 429, 0.01); // 10ms
      }
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('should retry with exponential backoff after 2 retries', async () => {
    vi.useFakeTimers();
    const limiter = new SlidingWindowRateLimiter({ maxRetries: 4, baseDelayMs: 100 });
    let attempts = 0;

    const promise = limiter.execute(async () => {
      attempts++;
      if (attempts < 4) {
        throw new RateLimitError('Rate limit', 429);
      }
      return 'success';
    });

    // Run through delays
    for (let i = 0; i < 4; i++) {
      await vi.runAllTimersAsync();
    }

    const result = await promise;
    expect(result).toBe('success');
    expect(attempts).toBe(4);

    vi.useRealTimers();
  });

  it('should throw after max retries exceeded', async () => {
    const limiter = new SlidingWindowRateLimiter({ maxRetries: 1 });
    let attempts = 0;

    await expect(limiter.execute(async () => {
      attempts++;
      throw new RateLimitError('Rate limit', 429, 0.001);
    })).rejects.toThrow('Rate limit');

    expect(attempts).toBe(2); // Initial + 1 retry
  });

  it('should respect per-second limit', async () => {
    const limiter = new SlidingWindowRateLimiter({ perSecondLimit: 2, perMinuteLimit: 100 });

    // Make 2 requests (at limit)
    await limiter.execute(() => Promise.resolve(1));
    await limiter.execute(() => Promise.resolve(2));

    // Third request should be queued
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('should respect per-minute limit', async () => {
    const limiter = new SlidingWindowRateLimiter({ perSecondLimit: 100, perMinuteLimit: 2 });

    await limiter.execute(() => Promise.resolve(1));
    await limiter.execute(() => Promise.resolve(2));

    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('should prune old timestamps', async () => {
    const limiter = new SlidingWindowRateLimiter();

    // Add old timestamp (> 60 seconds ago)
    limiter.requestTimestamps.push(Date.now() - 70000);
    limiter.requestTimestamps.push(Date.now() - 100);

    limiter.pruneOldTimestamps();

    expect(limiter.requestTimestamps.length).toBe(1);
  });

  it('should calculate next slot time for per-second limit', () => {
    const limiter = new SlidingWindowRateLimiter({ perSecondLimit: 2, perMinuteLimit: 100 });

    // Fill per-second limit
    const now = Date.now();
    limiter.requestTimestamps = [now - 500, now - 200];

    const waitTime = limiter.getNextSlotTime();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(1001);
  });

  it('should calculate next slot time for per-minute limit', () => {
    const limiter = new SlidingWindowRateLimiter({ perSecondLimit: 100, perMinuteLimit: 2 });

    // Fill per-minute limit
    const now = Date.now();
    limiter.requestTimestamps = [now - 30000, now - 100];

    const waitTime = limiter.getNextSlotTime();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(60001);
  });

  it('should schedule next check when queue is blocked', async () => {
    vi.useFakeTimers();
    const limiter = new SlidingWindowRateLimiter({ perSecondLimit: 1, perMinuteLimit: 100 });

    // First request goes through
    const p1 = limiter.execute(() => Promise.resolve('first'));

    // Second request should be queued
    const p2 = limiter.execute(() => Promise.resolve('second'));

    await vi.runAllTimersAsync();
    await p1;

    // Advance time to allow second request
    await vi.advanceTimersByTimeAsync(1100);
    await vi.runAllTimersAsync();

    const result = await p2;
    expect(result).toBe('second');

    vi.useRealTimers();
  });

  it('should handle multiple queued requests', async () => {
    vi.useFakeTimers();
    const limiter = new SlidingWindowRateLimiter({ perSecondLimit: 2, perMinuteLimit: 10 });

    const results = [];
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(
        limiter.execute(() => {
          results.push(i);
          return Promise.resolve(i);
        })
      );
    }

    // Process all
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(1100);
      await vi.runAllTimersAsync();
    }

    await Promise.all(promises);
    expect(results.length).toBe(5);

    vi.useRealTimers();
  });
});
