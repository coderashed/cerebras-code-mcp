import { RateTracker } from '../ratelimit/rate-tracker.js';

// Decorator Pattern: Wraps existing API with rate limiting
export class RateLimitedProvider {
  constructor(apiClient, keyId, tier, modelConfigs) {
    this.apiClient = apiClient; // Original API client
    this.keyId = keyId;
    this.tier = tier;
    this.modelConfigs = modelConfigs;
    this.trackers = new Map(); // model -> RateTracker
  }

  getTracker(model) {
    if (!this.trackers.has(model)) {
      const config = this.modelConfigs[model]?.[this.tier];
      if (!config) {
        throw new Error(`NoConfigForModel: ${model} on ${this.tier}`);
      }
      this.trackers.set(model, new RateTracker(config.limits.requests));
    }
    return this.trackers.get(model);
  }

  canHandle(model) {
    try {
      const tracker = this.getTracker(model);
      return tracker.canHandle();
    } catch (error) {
      if (error.message.startsWith('NoConfigForModel')) {
        return false;
      }
      throw error;
    }
  }

  async execute(model, prompt, context, outputFile, language, contextFiles) {
    const tracker = this.getTracker(model);
    
    if (!tracker.canHandle()) {
      throw new Error(`RateLimitExceeded: ${this.keyId} ${tracker.getBottleneck()}`);
    }
    
    try {
      // Delegate to original API client
      const result = await this.apiClient.callCerebras(
        model,
        prompt,
        context,
        outputFile,
        language,
        contextFiles
      );
      
      // Record successful request
      tracker.recordRequest();
      
      return result;
    } catch (error) {
      // If we get a 429, mark our tracker as exhausted
      if (error.message.includes('429')) {
        // Fill up the tracker to prevent more attempts
        const limits = this.modelConfigs[model]?.[this.tier]?.limits?.requests;
        if (limits) {
          // Record enough requests to hit the minute limit
          for (let i = tracker.getAvailability().minute.used; i < limits.minute; i++) {
            tracker.recordRequest();
          }
        }
      }
      throw error;
    }
  }

  getAvailability(model) {
    try {
      const tracker = this.getTracker(model);
      return {
        keyId: this.keyId,
        tier: this.tier,
        model: model,
        ...tracker.getAvailability()
      };
    } catch (error) {
      return {
        keyId: this.keyId,
        tier: this.tier,
        model: model,
        error: error.message
      };
    }
  }

  getUtilization(model) {
    const tracker = this.getTracker(model);
    const availability = tracker.getAvailability();
    
    // Calculate overall utilization (0-1)
    let totalUsed = 0;
    let totalLimit = 0;
    
    for (const period of Object.values(availability)) {
      totalUsed += period.used;
      totalLimit += period.limit;
    }
    
    return totalLimit > 0 ? totalUsed / totalLimit : 1;
  }
}