/**
 * Qwen Provider Test Suite
 * Tests multi-account pool, load balancing, and quota management
 */

import { createQwenProvider } from '../providers/qwen-provider.js';
import { QwenAccount } from '../providers/qwen-provider.js';

// Test configuration with 10 accounts
const TEST_API_KEYS = [
  'qwen-test-key-1-placeholder',
  'qwen-test-key-2-placeholder',
  'qwen-test-key-3-placeholder',
  'qwen-test-key-4-placeholder',
  'qwen-test-key-5-placeholder',
  'qwen-test-key-6-placeholder',
  'qwen-test-key-7-placeholder',
  'qwen-test-key-8-placeholder',
  'qwen-test-key-9-placeholder',
  'qwen-test-key-10-placeholder',
];

/**
 * Test 1: Provider Initialization
 */
function testInitialization(): boolean {
  console.log('\n--- TEST 1: Provider Initialization ---');
  
  try {
    const provider = createQwenProvider(TEST_API_KEYS);
    const status = provider.getStatus();
    
    console.log('✓ Provider initialized successfully');
    console.log(`✓ ${status.accounts.length} accounts loaded`);
    console.log(`✓ Total daily requests: ${status.totalRequests.limit}`);
    console.log(`✓ Total monthly tokens: ${status.totalTokens.limit}`);
    
    return true;
  } catch (error) {
    console.error('✗ Initialization failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 2: Round-Robin Load Balancing
 */
async function testRoundRobin(): Promise<boolean> {
  console.log('\n--- TEST 2: Round-Robin Load Balancing ---');
  
  try {
    const provider = createQwenProvider(TEST_API_KEYS);
    const selected: string[] = [];
    
    // Select 10 accounts
    for (let i = 0; i < 10; i++) {
      const account = provider['selectAccount']();
      selected.push(account.id);
    }
    
    // Check if all accounts were selected
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
 * Test 3: Least-Used Load Balancing
 */
async function testLeastUsed(): Promise<boolean> {
  console.log('\n--- TEST 3: Least-Used Load Balancing ---');
  
  try {
    // Create provider and manually set usage
    const provider = createQwenProvider(TEST_API_KEYS);
    
    // Simulate some usage
    const status = provider.getStatus();
    status.accounts[0].requestsUsed = 500;
    status.accounts[1].requestsUsed = 800;
    status.accounts[2].requestsUsed = 200;
    
    const selected = provider['leastUsedSelect'](
      provider['config'].accounts
    );
    
    const correct = selected.id === 'qwen-3';
    
    console.log(`✓ Least-used selected account: ${selected.id}`);
    console.log(`✓ Correct selection (qwen-3): ${correct ? 'YES' : 'NO'}`);
    
    return correct;
  } catch (error) {
    console.error('✗ Least-used test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 4: Quota Tracking
 */
async function testQuotaTracking(): Promise<boolean> {
  console.log('\n--- TEST 4: Quota Tracking ---');
  
  try {
    const provider = createQwenProvider(TEST_API_KEYS);
    let status = provider.getStatus();
    
    const initialRequests = status.totalRequests.remaining;
    const initialTokens = status.totalTokens.remaining;
    
    console.log(`Initial requests remaining: ${initialRequests}`);
    console.log(`Initial tokens remaining: ${initialTokens}`);
    
    // Simulate some usage
    for (const account of provider['config'].accounts) {
      account.quota.requests.used += 100;
      account.quota.tokens.used += 5000;
    }
    
    status = provider.getStatus();
    const afterRequests = status.totalRequests.remaining;
    const afterTokens = status.totalTokens.remaining;
    
    const requestsDecreased = afterRequests < initialRequests;
    const tokensDecreased = afterTokens < initialTokens;
    
    console.log(`After usage requests remaining: ${afterRequests}`);
    console.log(`After usage tokens remaining: ${afterTokens}`);
    console.log(`✓ Quota tracking: ${requestsDecreased && tokensDecreased ? 'YES' : 'NO'}`);
    
    return requestsDecreased && tokensDecreased;
  } catch (error) {
    console.error('✗ Quota tracking test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 5: Model Selection
 */
async function testModelSelection(): Promise<boolean> {
  console.log('\n--- TEST 5: Model Selection ---');
  
  try {
    const provider = createQwenProvider(TEST_API_KEYS);
    const models = provider.getModels();
    
    console.log(`✓ Available models: ${models.length}`);
    for (const model of models) {
      console.log(`  - ${model.name}: ${model.description}`);
      console.log(`    Context: ${model.contextWindow} tokens`);
      console.log(`    Max output: ${model.maxTokens} tokens`);
    }
    
    const hasMaxModel = models.some(m => m.name === 'qwen-max');
    const hasTurboModel = models.some(m => m.name === 'qwen-turbo');
    const hasCoderModel = models.some(m => m.name === 'qwen-coder');
    
    const allModelsPresent = hasMaxModel && hasTurboModel && hasCoderModel;
    console.log(`✓ All required models present: ${allModelsPresent ? 'YES' : 'NO'}`);
    
    return allModelsPresent;
  } catch (error) {
    console.error('✗ Model selection test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 6: Account Availability Check
 */
async function testAccountAvailability(): Promise<boolean> {
  console.log('\n--- TEST 6: Account Availability ---');
  
  try {
    const provider = createQwenProvider(TEST_API_KEYS);
    
    // All accounts should be available initially
    const qwen1Available = provider.isAccountAvailable('qwen-1');
    const qwen5Available = provider.isAccountAvailable('qwen-5');
    const qwen10Available = provider.isAccountAvailable('qwen-10');
    
    console.log(`✓ qwen-1 available: ${qwen1Available ? 'YES' : 'NO'}`);
    console.log(`✓ qwen-5 available: ${qwen5Available ? 'YES' : 'NO'}`);
    console.log(`✓ qwen-10 available: ${qwen10Available ? 'YES' : 'NO'}`);
    
    const allAvailable = qwen1Available && qwen5Available && qwen10Available;
    console.log(`✓ All accounts available: ${allAvailable ? 'YES' : 'NO'}`);
    
    return allAvailable;
  } catch (error) {
    console.error('✗ Account availability test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 7: Weighted Selection
 */
async function testWeightedSelection(): Promise<boolean> {
  console.log('\n--- TEST 7: Weighted Selection ---');
  
  try {
    const provider = createQwenProvider(TEST_API_KEYS);
    const now = new Date();
    
    // Simulate different performance
    const accounts = provider['config'].accounts;
    accounts[0].performance.avgLatency = 500;
    accounts[0].performance.errorRate = 0.05;
    accounts[1].performance.avgLatency = 1000;
    accounts[1].performance.errorRate = 0.1;
    accounts[2].performance.avgLatency = 200;
    accounts[2].performance.errorRate = 0.01;
    
    const selected = provider['weightedSelect'](accounts, now);
    const correct = selected.id === 'qwen-3'; // Should select best performer
    
    console.log(`✓ Selected account: ${selected.id}`);
    console.log(`  - Latency: ${selected.performance.avgLatency}ms`);
    console.log(`  - Error rate: ${selected.performance.errorRate}`);
    console.log(`✓ Correct selection (qwen-3 - best performer): ${correct ? 'YES' : 'NO'}`);
    
    return correct;
  } catch (error) {
    console.error('✗ Weighted selection test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runQwenTests(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     Qwen Provider Test Suite                     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  
  const results = {
    'Test 1: Initialization': await testInitialization(),
    'Test 2: Round-Robin': await testRoundRobin(),
    'Test 3: Least-Used': await testLeastUsed(),
    'Test 4: Quota Tracking': await testQuotaTracking(),
    'Test 5: Model Selection': await testModelSelection(),
    'Test 6: Account Availability': await testAccountAvailability(),
    'Test 7: Weighted Selection': await testWeightedSelection(),
  };
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY                     ');
  console.log('═══════════════════════════════════════════════════\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const [testName, result] of Object.entries(results)) {
    const status = result ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}  ${testName}`);
    if (result) passed++; else failed++;
  }
  
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${(passed / 7 * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Qwen provider is production-ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
  }
  
  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQwenTests().catch(console.error);
}
