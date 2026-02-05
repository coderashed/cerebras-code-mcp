import { describe, it, expect } from 'vitest';
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
});
