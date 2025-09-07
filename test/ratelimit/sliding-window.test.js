import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlidingWindow } from '../../src/ratelimit/sliding-window.js';

describe('SlidingWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01 12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct bucket count', () => {
      const window = new SlidingWindow(60, 10);
      expect(window.bucketCount).toBe(6);
      expect(window.buckets.length).toBe(6);
    });

    it('should handle non-divisible window sizes', () => {
      const window = new SlidingWindow(65, 10);
      expect(window.bucketCount).toBe(7);
    });
  });

  describe('increment and getCount', () => {
    it('should track increments', () => {
      const window = new SlidingWindow(60, 10);
      
      window.increment();
      window.increment();
      expect(window.getCount()).toBe(2);
      
      window.increment();
      expect(window.getCount()).toBe(3);
    });

    it('should rotate buckets over time', () => {
      const window = new SlidingWindow(60, 10);
      
      window.increment();
      expect(window.getCount()).toBe(1);
      
      // Move forward 10 seconds
      vi.advanceTimersByTime(10000);
      window.increment();
      expect(window.getCount()).toBe(2);
      
      // Move forward 50 more seconds (total 60)
      vi.advanceTimersByTime(50000);
      expect(window.getCount()).toBe(1); // First increment should be gone
      
      // Move forward 10 more seconds
      vi.advanceTimersByTime(10000);
      expect(window.getCount()).toBe(0); // All should be gone
    });

    it('should handle rapid increments', () => {
      const window = new SlidingWindow(60, 1);
      
      for (let i = 0; i < 100; i++) {
        window.increment();
      }
      expect(window.getCount()).toBe(100);
    });
  });

  describe('canIncrement', () => {
    it('should check against limit', () => {
      const window = new SlidingWindow(60, 10);
      
      expect(window.canIncrement(5)).toBe(true);
      
      for (let i = 0; i < 5; i++) {
        window.increment();
      }
      
      expect(window.canIncrement(5)).toBe(false);
      expect(window.canIncrement(6)).toBe(true);
    });

    it('should respect sliding window', () => {
      const window = new SlidingWindow(30, 10);
      
      for (let i = 0; i < 10; i++) {
        window.increment();
      }
      expect(window.canIncrement(10)).toBe(false);
      
      // Move forward 30 seconds
      vi.advanceTimersByTime(30000);
      expect(window.canIncrement(10)).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all buckets', () => {
      const window = new SlidingWindow(60, 10);
      
      for (let i = 0; i < 10; i++) {
        window.increment();
      }
      expect(window.getCount()).toBe(10);
      
      window.reset();
      expect(window.getCount()).toBe(0);
    });
  });

  describe('minute window', () => {
    it('should track last 60 seconds with 1-second buckets', () => {
      const window = new SlidingWindow(60, 1);
      
      window.increment();
      expect(window.getCount()).toBe(1);
      
      vi.advanceTimersByTime(59000);
      expect(window.getCount()).toBe(1);
      
      vi.advanceTimersByTime(1000);
      expect(window.getCount()).toBe(0); // After 60 seconds, the first increment expires
      
      // The sliding window should expire data after windowSize seconds
    });
  });

  describe('hour window', () => {
    it('should track last hour with minute buckets', () => {
      const window = new SlidingWindow(3600, 60);
      
      window.increment();
      expect(window.getCount()).toBe(1);
      
      // Move forward 59 minutes
      vi.advanceTimersByTime(59 * 60 * 1000);
      window.increment();
      expect(window.getCount()).toBe(2);
      
      // Move forward 2 more minutes (61 total)
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(window.getCount()).toBe(1); // First increment should be gone
    });
  });
});