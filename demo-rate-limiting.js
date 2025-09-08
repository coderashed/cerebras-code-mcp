#!/usr/bin/env node

// Demo script showing rate limiting in action
// Usage: node demo-rate-limiting.js

import { ProviderPool } from './src/providers/provider-pool.js';
import { CostOptimizedStrategy, LoadBalancedStrategy } from './src/routing/routing-strategy.js';

// Mock API client for demo
class MockCerebrasClient {
  constructor(apiKey, name) {
    this.apiKey = apiKey;
    this.name = name;
    this.callCount = 0;
  }
  
  async callCerebras(model, prompt) {
    this.callCount++;
    console.log(`  [${this.name}] Call #${this.callCount} to ${model}`);
    return `Response from ${this.name}`;
  }
}

// Setup demo providers
const clients = [
  {
    apiClient: new MockCerebrasClient('free-key-123', 'FREE'),
    keyId: 'free',
    tier: 'free'
  },
  {
    apiClient: new MockCerebrasClient('paid-key-456', 'PAID'),
    keyId: 'paid',
    tier: 'paid'
  }
];

// Create pool with cost-optimized strategy
const pool = new ProviderPool(clients, new CostOptimizedStrategy());

console.log('\n🚀 Rate Limiting Demo\n');
console.log('Configuration:');
console.log('  - Free tier: qwen-3-coder-480b limited to 10 req/min');
console.log('  - Paid tier: qwen-3-coder-480b limited to 50 req/min');
console.log('  - Strategy: Cost-optimized (prefer free tier)\n');

async function runDemo() {
  const model = 'qwen-3-coder-480b';
  
  console.log('Making 15 requests...\n');
  
  for (let i = 1; i <= 15; i++) {
    try {
      console.log(`Request ${i}:`);
      await pool.execute(model, `prompt ${i}`, '', '', null, []);
      
      // Show availability after each request
      const availability = pool.getAvailability(model);
      const freeAvail = availability.find(a => a.keyId === 'free');
      const paidAvail = availability.find(a => a.keyId === 'paid');
      
      if (freeAvail && !freeAvail.error) {
        console.log(`  Free tier: ${freeAvail.minute.used}/${freeAvail.minute.limit} requests used`);
      }
      if (paidAvail && !paidAvail.error) {
        console.log(`  Paid tier: ${paidAvail.minute.used}/${paidAvail.minute.limit} requests used`);
      }
      console.log();
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('Summary:');
  console.log(`  Free tier handled: ${clients[0].apiClient.callCount} requests`);
  console.log(`  Paid tier handled: ${clients[1].apiClient.callCount} requests`);
  console.log('\nNotice how requests automatically shifted to paid tier when free tier hit its limit!');
}

runDemo().catch(console.error);