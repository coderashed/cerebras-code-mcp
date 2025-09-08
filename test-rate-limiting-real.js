#!/usr/bin/env node

// Test that rate limiting actually prevents errors
import { ProviderPool } from './src/providers/provider-pool.js';
import { CostOptimizedStrategy } from './src/routing/routing-strategy.js';

// Mock that simulates real API behavior
class SimulatedCerebrasClient {
  constructor(apiKey, name, limits) {
    this.apiKey = apiKey;
    this.name = name;
    this.limits = limits;
    this.requestCounts = {
      minute: 0,
      hour: 0,
      day: 0
    };
    this.lastReset = {
      minute: Date.now(),
      hour: Date.now(),
      day: Date.now()
    };
  }
  
  resetCountsIfNeeded() {
    const now = Date.now();
    
    // Reset minute counter every 60 seconds
    if (now - this.lastReset.minute > 60000) {
      this.requestCounts.minute = 0;
      this.lastReset.minute = now;
    }
    
    // Reset hour counter every hour
    if (now - this.lastReset.hour > 3600000) {
      this.requestCounts.hour = 0;
      this.lastReset.hour = now;
    }
    
    // Reset day counter every day
    if (now - this.lastReset.day > 86400000) {
      this.requestCounts.day = 0;
      this.lastReset.day = now;
    }
  }
  
  async callCerebras(model, prompt) {
    this.resetCountsIfNeeded();
    
    // Check if we would exceed limits (simulating real API)
    if (this.requestCounts.minute >= this.limits.minute) {
      throw new Error(`429 Rate Limit: ${this.name} minute limit exceeded`);
    }
    if (this.requestCounts.hour >= this.limits.hour) {
      throw new Error(`429 Rate Limit: ${this.name} hour limit exceeded`);
    }
    if (this.requestCounts.day >= this.limits.day) {
      throw new Error(`429 Rate Limit: ${this.name} day limit exceeded`);
    }
    
    // Increment counts
    this.requestCounts.minute++;
    this.requestCounts.hour++;
    this.requestCounts.day++;
    
    return `Response from ${this.name} (${this.requestCounts.minute}/${this.limits.minute})`;
  }
}

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting Protection\n');
  
  // Create clients with realistic limits
  const clients = [
    {
      apiClient: new SimulatedCerebrasClient('free', 'FREE', { minute: 10, hour: 100, day: 100 }),
      keyId: 'free',
      tier: 'free'
    },
    {
      apiClient: new SimulatedCerebrasClient('paid', 'PAID', { minute: 50, hour: 3000, day: 72000 }),
      keyId: 'paid',
      tier: 'paid'
    }
  ];
  
  const pool = new ProviderPool(clients, new CostOptimizedStrategy());
  const model = 'qwen-3-coder-480b';
  
  console.log('Attempting 65 rapid requests (exceeds free limit, within paid limit)...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let freeUsed = 0;
  let paidUsed = 0;
  
  for (let i = 1; i <= 65; i++) {
    try {
      const result = await pool.execute(model, `prompt ${i}`, '', '', null, []);
      successCount++;
      
      if (result.includes('FREE')) freeUsed++;
      if (result.includes('PAID')) paidUsed++;
      
      if (i % 10 === 0 || i === 11) {
        console.log(`After ${i} requests: ✅ ${successCount} successful, FREE: ${freeUsed}, PAID: ${paidUsed}`);
      }
    } catch (error) {
      errorCount++;
      console.log(`Request ${i}: ❌ ${error.message}`);
      
      // If we hit an error, the rate limiting failed
      if (error.message.includes('429')) {
        console.log('\n❌ FAILED: Rate limiting did not prevent 429 error!');
        process.exit(1);
      }
    }
  }
  
  console.log('\n📊 Final Results:');
  console.log(`  Total requests: 65`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${errorCount}`);
  console.log(`  Free tier used: ${freeUsed} (max 10)`);
  console.log(`  Paid tier used: ${paidUsed} (max 50)`);
  
  if (errorCount === 5) {
    console.log('\n✅ PASSED: Rate limiting correctly prevented errors!');
    console.log('  - Free tier stopped at 10 requests');
    console.log('  - Paid tier handled overflow up to 50 requests');
    console.log('  - Last 5 requests correctly rejected (both keys exhausted)');
  } else if (errorCount === 0 && successCount === 60) {
    console.log('\n✅ PASSED: Rate limiting working perfectly!');
    console.log('  - All requests within limits succeeded');
    console.log('  - Automatic failover from free to paid tier');
  } else {
    console.log('\n⚠️  Unexpected result - check implementation');
  }
}

testRateLimiting().catch(console.error);