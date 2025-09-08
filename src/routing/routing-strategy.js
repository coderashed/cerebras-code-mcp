// Strategy Pattern: Abstract base class for routing strategies
export class RoutingStrategy {
  select(providers, model) {
    throw new Error('RoutingStrategy.select must be implemented');
  }
}

// Prefer free tier, fallback to paid
export class CostOptimizedStrategy extends RoutingStrategy {
  select(providers, model) {
    const available = providers.filter(p => p.canHandle(model));
    
    if (available.length === 0) {
      throw new Error(`NoProvidersAvailable: ${model}`);
    }
    
    // Sort by tier (free first) then by utilization
    available.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier === 'free' ? -1 : 1;
      }
      return a.getUtilization(model) - b.getUtilization(model);
    });
    
    return available[0];
  }
}

// Prefer paid tier for better context window and higher limits
export class PerformanceOptimizedStrategy extends RoutingStrategy {
  select(providers, model) {
    const available = providers.filter(p => p.canHandle(model));
    
    if (available.length === 0) {
      throw new Error(`NoProvidersAvailable: ${model}`);
    }
    
    // Sort by tier (paid first for 2x context window) then by utilization
    available.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier === 'paid' ? -1 : 1;
      }
      return a.getUtilization(model) - b.getUtilization(model);
    });
    
    return available[0];
  }
}

// Round robin between available providers
export class RoundRobinStrategy extends RoutingStrategy {
  constructor() {
    super();
    this.lastIndex = 0;
  }
  
  select(providers, model) {
    const available = providers.filter(p => p.canHandle(model));
    
    if (available.length === 0) {
      throw new Error(`NoProvidersAvailable: ${model}`);
    }
    
    this.lastIndex = (this.lastIndex + 1) % available.length;
    return available[this.lastIndex];
  }
}

// Select least utilized provider
export class LoadBalancedStrategy extends RoutingStrategy {
  select(providers, model) {
    const available = providers.filter(p => p.canHandle(model));
    
    if (available.length === 0) {
      throw new Error(`NoProvidersAvailable: ${model}`);
    }
    
    // Sort by utilization (least utilized first)
    available.sort((a, b) => a.getUtilization(model) - b.getUtilization(model));
    
    return available[0];
  }
}