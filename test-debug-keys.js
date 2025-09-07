#!/usr/bin/env node

// Debug script to verify both keys are being detected
// Use environment variables or fall back to test keys
process.env.CEREBRAS_FREE_KEY = process.env.CEREBRAS_FREE_KEY || 'test-free-key';
process.env.CEREBRAS_PAID_KEY = process.env.CEREBRAS_PAID_KEY || 'test-paid-key';

import { getAvailableProviders } from './src/api/router/enhanced-router.js';

console.log('Environment variables:');
console.log('  CEREBRAS_FREE_KEY:', process.env.CEREBRAS_FREE_KEY ? '✓ Set' : '✗ Not set');
console.log('  CEREBRAS_PAID_KEY:', process.env.CEREBRAS_PAID_KEY ? '✓ Set' : '✗ Not set');
console.log('  CEREBRAS_API_KEY:', process.env.CEREBRAS_API_KEY ? '✓ Set' : '✗ Not set');

console.log('\nProviders detected:');
const providers = getAvailableProviders();
console.log(JSON.stringify(providers, null, 2));

// Now test the pool directly
import { ProviderPool } from './src/providers/provider-pool.js';
import { CostOptimizedStrategy } from './src/routing/routing-strategy.js';

class TestClient {
  constructor(name) {
    this.name = name;
  }
  async callCerebras() {
    return `Response from ${this.name}`;
  }
}

const clients = [
  { apiClient: new TestClient('FREE'), keyId: 'free', tier: 'free' },
  { apiClient: new TestClient('PAID'), keyId: 'paid', tier: 'paid' }
];

const pool = new ProviderPool(clients, new CostOptimizedStrategy());

console.log('\nProvider pool initialized with:');
console.log(`  ${pool.providers.length} providers`);
pool.providers.forEach(p => {
  console.log(`  - ${p.keyId} (${p.tier})`);
});

// Test availability
const availability = pool.getAvailability('qwen-3-coder-480b');
console.log('\nAvailability for qwen-3-coder-480b:');
availability.forEach(a => {
  if (!a.error) {
    console.log(`  ${a.keyId}: Can handle ${a.minute.available} more requests this minute`);
  }
});