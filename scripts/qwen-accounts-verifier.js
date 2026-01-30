#!/usr/bin/env node
/**
 * Automatic Qwen Account Verifier & Test Runner
 * Once you have real API keys, this will:
 * 1. Verify all 10 accounts
 * 2. Test connectivity
 * 3. Test quota tracking
 * 4. Run load balancing
 * 5. Generate production-ready configuration
 */

import dotenv from 'dotenv';
import { createQwenProvider, type QwenProvider } from '../src/providers/qwen-provider.js';

console.log('╔═════════════════════════════════════════════════════╗');
console.log('║     Qwen Account Verifier & Test Runner            ║');
console.log('║           (Run this after adding REAL API Keys)  ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Load environment variables
dotenv.config({ path: '/mnt/c/Users/tango/Desktop/Desktop/Clawdbot-DE/.env' });

/**
 * Extract Qwen API keys from environment
 */
function getQwenAPIKeys(): string[] {
  const keys: string[] = [];

  for (let i = 1; i <= 10; i++) {
    const key = process.env[`QWEN_API_KEY_${i}`];
    if (!key || key === `PLACEHOLDER_qwen-${i}`) {
      console.error(`✗ QWEN_API_KEY_${i} not found or still a placeholder`);
      continue;
    }

    keys.push(key);
  }

  return keys;
}

/**
 * Test 1: Provider Initialization
 */
async function testProviderInitialization(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 1: Provider Initialization ---');

  try {
    const status = provider.getStatus();
    
    console.log('✓ Provider initialized successfully');
    console.log(`✓ ${status.accounts.length} accounts loaded`);
    console.log(`✓ Total daily requests: ${status.totalRequests.limit}`);
    console.log(`✓ Total monthly tokens: ${status.totalTokens.limit}`);
    console.log(`✓ Total monthly tokens: ${(status.totalTokens.limit / 1000000).toFixed(1)}M`);

    return true;
  } catch (error) {
    console.error('✗ Initialization failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 2: API Connectivity (Ping)
 */
async function testAPIConnectivity(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 2: API Connectivity (Ping) ---');

  try {
    // Simple ping request
    const response = await provider.chatCompletion({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 10,
    });

    console.log('✓ API connection successful');
    console.log(`✓ Response received in ${response.usage.totalTokens} tokens`);
    console.log(`✓ Model: ${response.model}`);

    return true;
  } catch (error) {
    console.error('✗ API connection failed:', (error as Error).message);
    console.error('  Check if:');
    console.error('  - API keys are valid');
    console.error('  - Keys are copied correctly (no extra spaces)');
    console.error('  - Network connection is stable');
    console.error('  - Qwen API is accessible from your location');
    return false;
  }
}

/**
 * Test 3: Quota Tracking Verification
 */
async function testQuotaTracking(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 3: Quota Tracking Verification ---');

  try {
    const statusBefore = provider.getStatus();
    const initialRequests = statusBefore.totalRequests.remaining;
    const initialTokens = statusBefore.totalTokens.remaining;

    console.log(`Before: Requests remaining: ${initialRequests}, Tokens remaining: ${(initialTokens / 1000000).toFixed(1)}M`);

    // Make a small request
    const response = await provider.chatCompletion({
      messages: [{ role: 'user', content: 'Hello!' }],
      maxTokens: 50,
    });

    const statusAfter = provider.getStatus();
    const requestsDecreased = statusAfter.totalRequests.remaining < initialRequests;
    const tokensDecreased = statusAfter.totalTokens.remaining < initialTokens;

    console.log(`After:  Requests remaining: ${statusAfter.totalRequests.remaining}, Tokens remaining: ${(statusAfter.totalTokens.remaining / 1000000).toFixed(1)}M`);
    console.log(`Requests decreased: ${requestsDecreased ? 'YES' : 'NO'}`);
    console.log(`Tokens decreased: ${tokensDecreased ? 'YES' : 'NO'}`);
    console.log(`✓ Quota tracking: ${requestsDecreased && tokensDecreased ? 'WORKING' : 'FAILED'}`);

    return requestsDecreased && tokensDecreased;
  } catch (error) {
    console.error('✗ Quota tracking test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 4: Load Balancing - Round Robin
 */
async function testRoundRobinLoadBalancing(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 4: Load Balancing - Round Robin ---');

  try {
    const selected: string[] = [];

    // Select 10 accounts
    for (let i = 0; i < 10; i++) {
      const account = provider['selectAccount']();
      selected.push(account.id);
    }

    const uniqueAccounts = new Set(selected);
    const allSelected = uniqueAccounts.size === 10;

    console.log(`✓ Selected ${uniqueAccounts.size} unique accounts`);
    console.log(`✓ Round-robin worked: ${allSelected ? 'YES' : 'NO'}`);
    console.log(`Selection order: ${selected.join(' → ')}`);

    return allSelected;
  } catch (error) {
    console.error('✗ Round-robin test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 5: Load Balancing - Least Used
 */
async function testLeastUsedLoadBalancing(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 5: Load Balancing - Least Used ---');

  try {
    // Manually set usage to simulate
    const accounts = provider['config'].accounts;
    accounts[0].quota.requests.used = 500;
    accounts[1].quota.requests.used = 800;
    accounts[2].quota.requests.used = 200;

    const selected = provider['selectAccount']();
    const correct = selected.id === 'qwen-3'; // qwen-3 has least usage (200)

    console.log(`✓ Least-used selected account: ${selected.id}`);
    console.log(`✓ Correct selection (qwen-3): ${correct ? 'YES' : 'NO'}`);
    console.log(`✓ Usage: ${accounts[0].quota.requests.used} (qwen-1), ${accounts[1].quota.requests.used} (qwen-2), ${accounts[2].quota.requests.used} (qwen-3)`);

    return correct;
  } catch (error) {
    console.error('✗ Least-used test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 6: Real Chat Completion
 */
async function testRealChatCompletion(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 6: Real Chat Completion ---');

  try {
    const testMessages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: 'Explain quantum computing in 3 sentences.' },
      { role: 'assistant', content: '' }, // Placeholder for response
      { role: 'user', content: 'What is AI?' },
    ];

    const response = await provider.chatCompletion({
      messages: testMessages,
      maxTokens: 1000,
    });

    const assistantMessage = response.choices[0].message;
    console.log(`✓ Chat completion successful`);
    console.log(`✓ Model: ${response.model}`);
    console.log(`✓ Tokens used: ${response.usage.totalTokens} (input: ${response.usage.promptTokens}, output: ${response.usage.completionTokens})`);
    console.log(`✓ Response length: ${assistantMessage.content.length} characters`);
    console.log(`\n--- Assistant Response ---`);
    console.log(assistantMessage.content);
    console.log('----------------------------\n');

    return true;
  } catch (error) {
    console.error('✗ Chat completion failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 7: Model Selection
 */
async function testModelSelection(provider: QwenProvider): Promise<boolean> {
  console.log('\n--- TEST 7: Model Selection ---');

  try {
    const models = provider.getModels();
    console.log(`✓ Available models: ${models.length}`);

    for (const model of models) {
      console.log(`\n--- Model: ${model.name} ---`);
      console.log(`Description: ${model.description}`);
      console.log(`Context Window: ${model.contextWindow.toLocaleString()} tokens`);
      console.log(`Max Output: ${model.maxTokens.toLocaleString()} tokens`);

      // Test the model
      const response = await provider.chatCompletion({
        messages: [{ role: 'user', content: 'Test' }],
        model: model.name,
        maxTokens: 50,
      });

      console.log(`✓ ${model.name} working: ${response.choices[0].message.content}`);
    }

    console.log('\n✓ All models working');
    return true;
  } catch (error) {
    console.error('✗ Model selection test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Generate Production Configuration
 */
function generateProductionConfig(provider: QwenProvider): void {
  console.log('\n--- Generating Production Configuration ---');

  const status = provider.getStatus();

  const config = {
    provider: 'qwen',
    enabled: true,
    accounts: status.accounts.map((acc, i) => ({
      id: acc.id,
      requestsUsed: acc.requestsUsed,
      requestsLimit: acc.requestsLimit,
      requestsRemaining: acc.requestsRemaining,
      tokensUsed: acc.tokensUsed,
      tokensLimit: acc.tokensLimit,
      tokensRemaining: acc.tokensRemaining,
      status: acc.status,
      performance: {
        avgLatency: 0, // Will be tracked during usage
        errorRate: 0,
        lastUsed: new Date().toISOString(),
      },
    })),
    loadBalancing: 'round_robin',
    defaultModel: 'qwen-max',
    totalDailyRequests: status.totalRequests.used,
    totalDailyLimit: status.totalRequests.limit,
    totalMonthlyTokens: status.totalTokens.used,
    totalMonthlyLimit: status.totalTokens.limit,
  };

  // Save to file
  const fs = require('fs');
  const configPath = '/mnt/c/Users/tango/Desktop/Desktop/Clawdbot-DE/config/qwen-production.json';

  fs.mkdirSync(configPath.split('/').slice(0, -1).join('/'), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`✓ Production config saved to: ${configPath}`);
  console.log(`✓ Total accounts: ${config.accounts.length}`);
  console.log(`✓ Total daily requests available: ${config.totalDailyLimit.toLocaleString()}`);
  console.log(`✓ Total monthly tokens available: ${(config.totalMonthlyLimit / 1000000).toFixed(1)}M`);
}

/**
 * Main Test Runner
 */
async function main() {
  // Load API keys
  const apiKeys = getQwenAPIKeys();

  if (apiKeys.length === 0) {
    console.log('\n❌ No valid Qwen API keys found!');
    console.log('\nPlease follow these steps:');
    console.log('1. Create Alibaba Cloud account: https://www.alibabacloud.com/');
    console.log('2. Go to Qwen portal: https://tongyi.aliyun.com/');
    console.log('3. Create 10 API keys');
    console.log('4. Copy keys to .env file');
    console.log('5. Run this test again\n');
    process.exit(1);
  }

  console.log(`\n✓ Loaded ${apiKeys.length} Qwen API keys`);

  // Create provider
  const provider = createQwenProvider(apiKeys);

  // Run all tests
  const results = {
    'Test 1: Initialization': await testProviderInitialization(provider),
    'Test 2: API Connectivity': await testAPIConnectivity(provider),
    'Test 3: Quota Tracking': await testQuotaTracking(provider),
    'Test 4: Round-Robin LB': await testRoundRobinLoadBalancing(provider),
    'Test 5: Least-Used LB': await testLeastUsedLoadBalancing(provider),
    'Test 6: Chat Completion': await testRealChatCompletion(provider),
    'Test 7: Model Selection': await testModelSelection(provider),
  };

  // Print summary
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                        ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  for (const [testName, result] of Object.entries(results)) {
    const status = result ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}  ${testName}`);
    if (result) passed++; else failed++;
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${(passed / 7 * 100).toFixed(1)}%`);

  // Generate production config if all tests passed
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Generating production configuration...');
    generateProductionConfig(provider);
    
    console.log('\n╔═════════════════════════════════════════════════════╗');
    console.log('║         PRODUCTION READY!                             ║');
    console.log('╚═════════════════════════════════════════════════════╝\n');
    
    console.log('Your Qwen provider is now production-ready!');
    console.log('\nNext steps:');
    console.log('1. Add Qwen provider to your LLM router');
    console.log('2. Configure task-based routing');
    console.log('3. Start using your 10 accounts for massive capacity');
    console.log('4. Monitor usage via: clawdbot provider status qwen');
    
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    console.log('\nCommon issues:');
    console.log('- Invalid API keys (check for extra spaces)');
    console.log('- Network connectivity issues');
    console.log('- API rate limits (try again later)');
    console.log('- Key permissions (ensure keys have correct permissions)');
    
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
