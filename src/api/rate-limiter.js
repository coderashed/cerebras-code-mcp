import { config } from '../config/constants.js';

class RateLimitError extends Error {
  constructor(message, statusCode, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter !== undefined ? retryAfter * 1000 : undefined;
    this.retryable = true;
  }
}

class SlidingWindowRateLimiter {
  constructor(options = {}) {
    // Dual window: per-second and per-minute limits
    this.perSecondLimit = options.perSecondLimit ?? 12;
    this.perMinuteLimit = options.perMinuteLimit ?? 120;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.requestTimestamps = [];
    this.queue = [];
    this.scheduledCheck = null;
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute: fn, resolve, reject });
      this.processQueue();
    });
  }

  processQueue() {
    this.pruneOldTimestamps();

    // Dispatch as many requests as capacity allows - no awaiting
    while (this.queue.length > 0 && this.canMakeRequest()) {
      const item = this.queue.shift();
      this.recordRequest();

      // Fire and forget - each request runs independently
      this.executeWithRetry(item.execute)
        .then(result => {
          item.resolve(result);
          this.processQueue(); // Check if more slots freed up
        })
        .catch(error => {
          item.reject(error);
          this.processQueue();
        });
    }

    // Schedule wake-up when next slot frees
    this.scheduleNextCheck();
  }

  scheduleNextCheck() {
    if (this.scheduledCheck) {
      clearTimeout(this.scheduledCheck);
      this.scheduledCheck = null;
    }

    if (this.queue.length > 0 && !this.canMakeRequest()) {
      const waitTime = this.getNextSlotTime();
      if (waitTime > 0) {
        this.scheduledCheck = setTimeout(() => {
          this.scheduledCheck = null;
          this.processQueue();
        }, waitTime);
      }
    }
  }

  canMakeRequest() {
    const now = Date.now();
    this.pruneOldTimestamps();

    // Check per-second limit
    const lastSecond = this.requestTimestamps.filter(ts => (now - ts) < 1000);
    if (lastSecond.length >= this.perSecondLimit) {
      return false;
    }

    // Check per-minute limit
    if (this.requestTimestamps.length >= this.perMinuteLimit) {
      return false;
    }

    return true;
  }

  getNextSlotTime() {
    const now = Date.now();
    let maxWait = 0;

    // Check per-second constraint
    const lastSecond = this.requestTimestamps
      .filter(ts => (now - ts) < 1000)
      .sort((a, b) => a - b);

    if (lastSecond.length >= this.perSecondLimit) {
      const oldestInSecond = lastSecond[0];
      const waitForSecond = (oldestInSecond + 1000) - now + 1;
      maxWait = Math.max(maxWait, waitForSecond);
    }

    // Check per-minute constraint
    if (this.requestTimestamps.length >= this.perMinuteLimit) {
      const sorted = [...this.requestTimestamps].sort((a, b) => a - b);
      const oldestInMinute = sorted[0];
      const waitForMinute = (oldestInMinute + 60000) - now + 1;
      maxWait = Math.max(maxWait, waitForMinute);
    }

    return Math.max(0, maxWait);
  }

  pruneOldTimestamps() {
    const now = Date.now();
    // Keep timestamps within the minute window (largest window)
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => (now - ts) < 60000
    );
  }

  async executeWithRetry(fn, retries = 0) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError) {
        if (retries < this.maxRetries) {
          let delay;
          if (error.retryAfter !== undefined) {
            delay = error.retryAfter;
          } else if (retries < 2) {
            // First 2 retries: 1 second each (handles per-second limits)
            delay = 1000;
          } else {
            // After that: exponential backoff (handles per-minute limits)
            delay = this.baseDelayMs * Math.pow(2, retries - 1);
          }
          await this.delay(delay);
          return this.executeWithRetry(fn, retries + 1);
        }
        throw error;
      }
      throw error;
    }
  }

  recordRequest() {
    this.requestTimestamps.push(Date.now());
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const cerebrasRateLimiter = new SlidingWindowRateLimiter({
  perSecondLimit: config.rateLimitPerSecond,
  perMinuteLimit: config.rateLimitMaxRequests,
  maxRetries: config.rateLimitMaxRetries,
  baseDelayMs: config.rateLimitBaseDelayMs
});

export const openRouterRateLimiter = new SlidingWindowRateLimiter({
  perSecondLimit: config.rateLimitPerSecond,
  perMinuteLimit: config.rateLimitMaxRequests,
  maxRetries: config.rateLimitMaxRetries,
  baseDelayMs: config.rateLimitBaseDelayMs
});

export { SlidingWindowRateLimiter, RateLimitError };