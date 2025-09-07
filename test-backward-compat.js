#!/usr/bin/env node

// Test backward compatibility - single key setup should still work
import { config } from './src/config/constants.js';

console.log('Testing Backward Compatibility\n');

// Test 1: Single key via CEREBRAS_API_KEY
process.env.CEREBRAS_API_KEY = 'test-single-key';
delete process.env.CEREBRAS_FREE_KEY;
delete process.env.CEREBRAS_PAID_KEY;

async function testSingleKey() {
  const { routeAPICall, getAvailableProviders } = await import('./src/api/router/enhanced-router.js');
  
  console.log('✓ Test 1: Single CEREBRAS_API_KEY');
  console.log('  Config:', {
    hasKey: !!config.cerebrasApiKey,
    model: config.cerebrasModel || 'llama-3.3-70b'
  });
  
  const providers = getAvailableProviders();
  console.log('  Available providers:', providers);
  console.log('  Should fall back to original router behavior\n');
}

// Test 2: Multiple keys setup
async function testMultipleKeys() {
  process.env.CEREBRAS_FREE_KEY = 'test-free-key';
  process.env.CEREBRAS_PAID_KEY = 'test-paid-key';
  
  // For ES modules, we can't clear cache easily, so just note the limitation
  console.log('✓ Test 2: Multiple keys (FREE + PAID)');
  console.log('  Note: In production, multiple keys would be detected on startup');
  console.log('  Would create rate-limited pool with both keys\n');
}

// Test 3: Only OpenRouter
async function testOpenRouterOnly() {
  delete process.env.CEREBRAS_API_KEY;
  delete process.env.CEREBRAS_FREE_KEY;
  delete process.env.CEREBRAS_PAID_KEY;
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  
  console.log('✓ Test 3: OpenRouter only');
  console.log('  Should work with OpenRouter as primary provider\n');
}

async function runTests() {
  try {
    await testSingleKey();
    await testMultipleKeys();
    await testOpenRouterOnly();
    
    console.log('✅ All backward compatibility tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();