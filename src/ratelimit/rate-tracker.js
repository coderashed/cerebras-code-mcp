import { SlidingWindow } from './sliding-window.js';
import { FixedWindow } from './fixed-window.js';

// Composite tracker for all rate limit windows
export class RateTracker {
  constructor(limits) {
    this.limits = limits;
    this.windows = {};
    
    // Initialize windows based on limits
    if (limits.minute) {
      this.windows.minute = new SlidingWindow(60, 1);
    }
    if (limits.hour) {
      this.windows.hour = new SlidingWindow(3600, 60);
    }
    if (limits.day) {
      this.windows.day = new FixedWindow(86400);
    }
  }

  recordRequest() {
    Object.values(this.windows).forEach(window => window.increment());
  }

  canHandle() {
    // Check all windows against their limits
    for (const [period, window] of Object.entries(this.windows)) {
      if (!window.canIncrement(this.limits[period])) {
        return false;
      }
    }
    return true;
  }

  getBottleneck() {
    let maxUtilization = 0;
    let bottleneck = null;
    
    for (const [period, window] of Object.entries(this.windows)) {
      const utilization = window.getCount() / this.limits[period];
      if (utilization > maxUtilization) {
        maxUtilization = utilization;
        bottleneck = period;
      }
    }
    
    return bottleneck;
  }

  getAvailability() {
    const availability = {};
    for (const [period, window] of Object.entries(this.windows)) {
      availability[period] = {
        used: window.getCount(),
        limit: this.limits[period],
        available: Math.max(0, this.limits[period] - window.getCount())
      };
    }
    return availability;
  }

  reset() {
    Object.values(this.windows).forEach(window => window.reset());
  }
}