// Fixed window counter for daily rate limiting
export class FixedWindow {
  constructor(windowSeconds) {
    this.windowDuration = windowSeconds * 1000;
    this.count = 0;
    this.windowStart = this.alignToDay(Date.now());
  }

  alignToDay(timestamp) {
    // For daily windows, align to midnight
    if (this.windowDuration === 86400000) {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }
    return timestamp;
  }

  increment() {
    this.resetIfExpired();
    this.count++;
  }

  getCount() {
    this.resetIfExpired();
    return this.count;
  }

  canIncrement(limit) {
    this.resetIfExpired();
    return this.count < limit;
  }

  resetIfExpired() {
    const now = Date.now();
    if (now >= this.windowStart + this.windowDuration) {
      this.count = 0;
      this.windowStart = this.alignToDay(now);
    }
  }

  timeUntilReset() {
    const now = Date.now();
    return Math.max(0, (this.windowStart + this.windowDuration) - now);
  }

  reset() {
    this.count = 0;
    this.windowStart = this.alignToDay(Date.now());
  }
}