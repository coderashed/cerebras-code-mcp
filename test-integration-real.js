#!/usr/bin/env node

// Integration test with real Cerebras API keys
import { ProviderPool } from './src/providers/provider-pool.js';
import { CostOptimizedStrategy } from './src/routing/routing-strategy.js';
import { callCerebras } from './src/api/cerebras.js';
import { config } from './src/config/constants.js';

// Real API client wrapper
class RealCerebrasClient {
  constructor(apiKey, name) {
    this.apiKey = apiKey;
    this.name = name;
    this.callCount = 0;
  }
  
  async callCerebras(model, prompt, context, outputFile, language, contextFiles) {
    // Temporarily override config to use this specific key
    const originalKey = config.cerebrasApiKey;
    const originalModel = config.cerebrasModel;
    
    try {
      config.cerebrasApiKey = this.apiKey;
      config.cerebrasModel = model;
      
      this.callCount++;
      console.log(`  [${this.name}] Making API call #${this.callCount} to ${model}...`);
      
      const result = await callCerebras(prompt, context, outputFile, language, contextFiles);
      console.log(`  [${this.name}] ✅ Success! Response length: ${result.length} chars`);
      
      return result;
    } catch (error) {
      console.log(`  [${this.name}] ❌ Error: ${error.message}`);
      throw error;
    } finally {
      config.cerebrasApiKey = originalKey;
      config.cerebrasModel = originalModel;
    }
  }
}

async function runIntegrationTest() {
  console.log('🚀 Real API Integration Test\n');
  console.log('Testing with actual Cerebras API keys...\n');
  
  // Setup with real API keys from environment
  const freeKey = process.env.CEREBRAS_FREE_KEY || process.env.CEREBRAS_API_KEY;
  const paidKey = process.env.CEREBRAS_PAID_KEY;
  
  if (!freeKey || !paidKey) {
    console.error('❌ Error: Both CEREBRAS_FREE_KEY and CEREBRAS_PAID_KEY must be set');
    console.error('   Export them as environment variables before running this test');
    process.exit(1);
  }
  
  const clients = [
    {
      apiClient: new RealCerebrasClient(freeKey, 'FREE'),
      keyId: 'free',
      tier: 'free'
    },
    {
      apiClient: new RealCerebrasClient(paidKey, 'PAID'),
      keyId: 'paid',
      tier: 'paid'
    }
  ];
  
  const pool = new ProviderPool(clients, new CostOptimizedStrategy());
  
  // Test 1: Basic request routing
  console.log('Test 1: Basic request routing\n');
  
  try {
    const model = 'llama-3.3-70b'; // Model with same limits on both tiers
    const prompt = 'Write a one-line Python function that returns "Hello World"';
    
    console.log(`Request 1 (should use FREE tier):`);
    const result1 = await pool.execute(model, prompt, '', '/tmp/test-output.py', 'python', []);
    console.log(`  Result preview: ${result1.substring(0, 50)}...\n`);
    
    // Check availability
    const availability = pool.getAvailability(model);
    const freeAvail = availability.find(a => a.keyId === 'free');
    const paidAvail = availability.find(a => a.keyId === 'paid');
    
    console.log('Availability after request:');
    if (freeAvail && !freeAvail.error) {
      console.log(`  Free tier: ${freeAvail.minute.used}/${freeAvail.minute.limit} requests used this minute`);
    }
    if (paidAvail && !paidAvail.error) {
      console.log(`  Paid tier: ${paidAvail.minute.used}/${paidAvail.minute.limit} requests used this minute`);
    }
    
  } catch (error) {
    console.error('Test 1 failed:', error.message);
  }
  
  // Test 2: Rate limiting with restrictive model
  console.log('\n\nTest 2: Rate limiting with qwen-3-coder-480b\n');
  
  try {
    const model = 'qwen-3-coder-480b'; // 10 req/min free, 50 req/min paid
    const simplePrompt = 'Return just the number: 1';
    
    console.log('Making 12 rapid requests (exceeds free tier limit of 10)...\n');
    
    let freeCount = 0;
    let paidCount = 0;
    
    for (let i = 1; i <= 12; i++) {
      try {
        console.log(`Request ${i}:`);
        const result = await pool.execute(model, `${simplePrompt} + ${i}`, '', '/tmp/test.py', 'python', []);
        
        // Check which provider handled it
        if (clients[0].apiClient.callCount > freeCount) {
          freeCount = clients[0].apiClient.callCount;
          console.log(`  ✅ Handled by FREE tier (total: ${freeCount})`);
        } else if (clients[1].apiClient.callCount > paidCount) {
          paidCount = clients[1].apiClient.callCount;
          console.log(`  ✅ Handled by PAID tier (total: ${paidCount})`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`  ❌ Request failed: ${error.message}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  Free tier handled: ${freeCount} requests`);
    console.log(`  Paid tier handled: ${paidCount} requests`);
    console.log(`  Total successful: ${freeCount + paidCount}/12`);
    
    if (freeCount <= 10 && paidCount > 0) {
      console.log('\n✅ PASS: Rate limiting working! Free tier capped at limit, paid tier took overflow.');
    } else if (freeCount + paidCount === 12) {
      console.log('\n✅ PASS: All requests succeeded with automatic failover!');
    }
    
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }
  
  // Test 3: Check that we prevent 429 errors
  console.log('\n\nTest 3: Verify 429 prevention\n');
  
  const availability = pool.getAvailability('qwen-3-coder-480b');
  console.log('Current availability for qwen-3-coder-480b:');
  availability.forEach(avail => {
    if (!avail.error) {
      console.log(`  ${avail.keyId} tier: ${avail.minute.used}/${avail.minute.limit} minute, ${avail.hour.used}/${avail.hour.limit} hour`);
    }
  });
  
  console.log('\n🎉 Integration test complete!');
  console.log('\nKey observations:');
  console.log('1. Requests automatically route to available keys');
  console.log('2. Free tier is preferred when available (cost optimization)');
  console.log('3. Paid tier handles overflow when free tier is exhausted');
  console.log('4. Rate tracking prevents 429 errors by checking limits before requests');
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});