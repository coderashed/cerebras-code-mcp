import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateTracker } from '../../src/ratelimit/rate-tracker.js';
import { RateLimitedProvider } from '../../src/providers/rate-limited-provider.js';
import { ProviderPool } from '../../src/providers/provider-pool.js';
import { CostOptimizedStrategy } from '../../src/routing/routing-strategy.js';

describe('Rate Limiting Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01 12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('RateTracker', () => {
    it('should track requests across all windows', () => {
      const limits = {
        minute: 30,
        hour: 900,
        day: 14400
      };
      
      const tracker = new RateTracker(limits);
      
      // Can handle initial requests
      expect(tracker.canHandle()).toBe(true);
      
      // Track 30 requests (minute limit)
      for (let i = 0; i < 30; i++) {
        tracker.recordRequest();
      }
      
      expect(tracker.canHandle()).toBe(false);
      expect(tracker.getBottleneck()).toBe('minute');
      
      // After a minute, can handle again
      vi.advanceTimersByTime(60 * 1000);
      expect(tracker.canHandle()).toBe(true);
    });

    it('should respect all limits simultaneously', () => {
      const limits = {
        minute: 10,
        hour: 50,
        day: 100
      };
      
      const tracker = new RateTracker(limits);
      
      // Fill minute limit
      for (let i = 0; i < 10; i++) {
        tracker.recordRequest();
      }
      expect(tracker.canHandle()).toBe(false);
      
      // Wait a minute, add more
      vi.advanceTimersByTime(60 * 1000);
      for (let i = 0; i < 10; i++) {
        tracker.recordRequest();
      }
      
      // Continue this pattern until we hit hour limit
      // We've done 20, need 30 more to hit 50
      for (let j = 0; j < 3; j++) {
        vi.advanceTimersByTime(60 * 1000);
        for (let i = 0; i < 10; i++) {
          if (tracker.canHandle()) {
            tracker.recordRequest();
          }
        }
      }
      
      // Check availability shows hour is the constraint
      const availability = tracker.getAvailability();
      expect(availability.hour.used).toBe(50);
      expect(tracker.canHandle()).toBe(false);
    });
  });

  describe('RateLimitedProvider', () => {
    it('should enforce rate limits', async () => {
      const mockApiClient = {
        callCerebras: vi.fn().mockResolvedValue('response')
      };
      
      const modelConfigs = {
        'test-model': {
          free: {
            limits: {
              requests: { minute: 5, hour: 10, day: 20 }
            }
          }
        }
      };
      
      const provider = new RateLimitedProvider(
        mockApiClient,
        'test-key',
        'free',
        modelConfigs
      );
      
      // Should allow initial requests
      expect(provider.canHandle('test-model')).toBe(true);
      
      // Execute 5 requests
      for (let i = 0; i < 5; i++) {
        await provider.execute('test-model', 'prompt', '', '', null, []);
      }
      
      // Should be at limit
      expect(provider.canHandle('test-model')).toBe(false);
      
      // Should throw when trying to exceed
      await expect(
        provider.execute('test-model', 'prompt', '', '', null, [])
      ).rejects.toThrow('RateLimitExceeded');
    });

    it('should track different models independently', () => {
      const mockApiClient = {
        callCerebras: vi.fn()
      };
      
      const modelConfigs = {
        'model-a': {
          free: {
            limits: {
              requests: { minute: 5, hour: 10, day: 20 }
            }
          }
        },
        'model-b': {
          free: {
            limits: {
              requests: { minute: 10, hour: 20, day: 40 }
            }
          }
        }
      };
      
      const provider = new RateLimitedProvider(
        mockApiClient,
        'test-key',
        'free',
        modelConfigs
      );
      
      // Fill model-a limit
      for (let i = 0; i < 5; i++) {
        provider.getTracker('model-a').recordRequest();
      }
      
      expect(provider.canHandle('model-a')).toBe(false);
      expect(provider.canHandle('model-b')).toBe(true);
    });
  });

  describe('ProviderPool with Strategy', () => {
    it('should route to available providers', async () => {
      const mockClient1 = {
        callCerebras: vi.fn().mockResolvedValue('response1')
      };
      
      const mockClient2 = {
        callCerebras: vi.fn().mockResolvedValue('response2')
      };
      
      const clients = [
        { apiClient: mockClient1, keyId: 'free', tier: 'free' },
        { apiClient: mockClient2, keyId: 'paid', tier: 'paid' }
      ];
      
      const pool = new ProviderPool(clients, new CostOptimizedStrategy());
      
      // Mock the model configs
      pool.providers[0].modelConfigs = {
        'test-model': {
          free: { limits: { requests: { minute: 2, hour: 10, day: 20 } } }
        }
      };
      
      pool.providers[1].modelConfigs = {
        'test-model': {
          paid: { limits: { requests: { minute: 5, hour: 20, day: 40 } } }
        }
      };
      
      // First 2 requests should go to free tier
      await pool.execute('test-model', 'prompt1', '', '', null, []);
      await pool.execute('test-model', 'prompt2', '', '', null, []);
      
      expect(mockClient1.callCerebras).toHaveBeenCalledTimes(2);
      expect(mockClient2.callCerebras).toHaveBeenCalledTimes(0);
      
      // Next request should go to paid tier (free exhausted)
      await pool.execute('test-model', 'prompt3', '', '', null, []);
      
      expect(mockClient1.callCerebras).toHaveBeenCalledTimes(2);
      expect(mockClient2.callCerebras).toHaveBeenCalledTimes(1);
    });

    it('should throw when all providers exhausted', async () => {
      const mockClient = {
        callCerebras: vi.fn().mockResolvedValue('response')
      };
      
      const clients = [
        { apiClient: mockClient, keyId: 'only', tier: 'free' }
      ];
      
      const pool = new ProviderPool(clients);
      
      pool.providers[0].modelConfigs = {
        'test-model': {
          free: { limits: { requests: { minute: 1, hour: 1, day: 1 } } }
        }
      };
      
      // First request succeeds
      await pool.execute('test-model', 'prompt1', '', '', null, []);
      
      // Second request should fail
      await expect(
        pool.execute('test-model', 'prompt2', '', '', null, [])
      ).rejects.toThrow('NoProvidersAvailable');
    });
  });
});