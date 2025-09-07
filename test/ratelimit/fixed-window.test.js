import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FixedWindow } from '../../src/ratelimit/fixed-window.js';

describe('FixedWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01 12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('daily window alignment', () => {
    it('should align to midnight for 24-hour window', () => {
      const window = new FixedWindow(86400); // 24 hours
      
      // Window should start at midnight
      const expectedStart = new Date('2024-01-01 00:00:00').getTime();
      expect(window.windowStart).toBe(expectedStart);
    });

    it('should not align for non-daily windows', () => {
      vi.setSystemTime(new Date('2024-01-01 12:34:56'));
      const window = new FixedWindow(3600); // 1 hour
      
      const expectedStart = new Date('2024-01-01 12:34:56').getTime();
      expect(window.windowStart).toBe(expectedStart);
    });
  });

  describe('increment and getCount', () => {
    it('should track increments', () => {
      const window = new FixedWindow(3600);
      
      expect(window.getCount()).toBe(0);
      
      window.increment();
      expect(window.getCount()).toBe(1);
      
      window.increment();
      window.increment();
      expect(window.getCount()).toBe(3);
    });

    it('should reset after window expires', () => {
      const window = new FixedWindow(3600); // 1 hour
      
      window.increment();
      window.increment();
      expect(window.getCount()).toBe(2);
      
      // Move forward 1 hour
      vi.advanceTimersByTime(3600 * 1000);
      expect(window.getCount()).toBe(0);
      
      window.increment();
      expect(window.getCount()).toBe(1);
    });

    it('should maintain count within window', () => {
      const window = new FixedWindow(3600);
      
      window.increment();
      expect(window.getCount()).toBe(1);
      
      // Move forward 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);
      expect(window.getCount()).toBe(1);
      
      window.increment();
      expect(window.getCount()).toBe(2);
      
      // Move forward another 29 minutes (59 total)
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(window.getCount()).toBe(2);
      
      // Move forward 1 more minute (60 total = 1 hour)
      vi.advanceTimersByTime(60 * 1000);
      expect(window.getCount()).toBe(0);
    });
  });

  describe('canIncrement', () => {
    it('should check against limit', () => {
      const window = new FixedWindow(3600);
      
      expect(window.canIncrement(5)).toBe(true);
      
      for (let i = 0; i < 5; i++) {
        window.increment();
      }
      
      expect(window.canIncrement(5)).toBe(false);
      expect(window.canIncrement(6)).toBe(true);
    });

    it('should allow after reset', () => {
      const window = new FixedWindow(3600);
      
      for (let i = 0; i < 10; i++) {
        window.increment();
      }
      expect(window.canIncrement(10)).toBe(false);
      
      // Move forward 1 hour to trigger reset
      vi.advanceTimersByTime(3600 * 1000);
      expect(window.canIncrement(10)).toBe(true);
    });
  });

  describe('timeUntilReset', () => {
    it('should calculate time until next reset', () => {
      const window = new FixedWindow(3600);
      
      expect(window.timeUntilReset()).toBe(3600 * 1000);
      
      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
      expect(window.timeUntilReset()).toBe(30 * 60 * 1000);
      
      vi.advanceTimersByTime(30 * 60 * 1000); // 60 minutes total
      expect(window.timeUntilReset()).toBe(0);
    });

    it('should handle daily window reset time', () => {
      const window = new FixedWindow(86400); // 24 hours
      
      // At noon, should be 12 hours until midnight
      expect(window.timeUntilReset()).toBe(12 * 60 * 60 * 1000);
      
      // Move to 11:59 PM
      vi.setSystemTime(new Date('2024-01-01 23:59:00'));
      expect(window.timeUntilReset()).toBe(60 * 1000);
    });
  });

  describe('reset', () => {
    it('should manually reset counter', () => {
      const window = new FixedWindow(3600);
      
      for (let i = 0; i < 10; i++) {
        window.increment();
      }
      expect(window.getCount()).toBe(10);
      
      window.reset();
      expect(window.getCount()).toBe(0);
    });

    it('should reset window start time', () => {
      const window = new FixedWindow(3600);
      const initialStart = window.windowStart;
      
      vi.advanceTimersByTime(30 * 60 * 1000);
      window.reset();
      
      expect(window.windowStart).toBeGreaterThan(initialStart);
    });
  });

  describe('daily rate limiting', () => {
    it('should reset at midnight', () => {
      vi.setSystemTime(new Date('2024-01-01 23:59:59'));
      const window = new FixedWindow(86400);
      
      for (let i = 0; i < 100; i++) {
        window.increment();
      }
      expect(window.getCount()).toBe(100);
      
      // Move to next day
      vi.setSystemTime(new Date('2024-01-02 00:00:00'));
      expect(window.getCount()).toBe(0);
      
      window.increment();
      expect(window.getCount()).toBe(1);
    });
  });
});