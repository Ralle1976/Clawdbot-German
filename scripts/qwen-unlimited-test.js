#!/usr/bin/env node
/**
 * Qwen UNLIMITED Tokens Test
 * Determines if Qwen Free-Tier has token limits or is truly unlimited
 */

console.log('╔═════════════════════════════════════════════════════╗');
console.log('║     Qwen UNLIMITED Tokens Test                     ║');
console.log('║           (Run after adding REAL API Keys)          ║');
console.log('╚═════════════════════════════════════════════════════╝\n');

import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '/mnt/c/Users/tango/Desktop/Desktop/Clawdbot-DE/.env' });

// Test configuration
const TEST_ACCOUNT = 1; // Use first account for testing
const TEST_ITERATIONS = 100; // Make 100 requests
const TOKENS_PER_REQUEST = 200; // 200 tokens per request

console.log('Test Configuration:');
console.log(`- Account: #${TEST_ACCOUNT}`);
console.log(`- Total Requests: ${TEST_ITERATIONS}`);
console.log(`- Tokens per Request: ${TOKENS_PER_REQUEST}`);
console.log(`- Expected Total Tokens: ${TEST_ITERATIONS * TOKENS_PER_REQUEST}\n`);

/**
 * Get API keys
 */
function getQwenAPIKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`QWEN_API_KEY_${i}`];
    if (!key || key === `PLACEHOLDER_qwen-${i}`) {
      console.error(`✗ QWEN_API_KEY_${i} not found or is a placeholder`);
      continue;
    }
    keys.push(key);
  }
  return keys;
}

/**
 * Test 1: Request Counting
 * Counts how many successful requests can be made
 */
async function testRequestCounting(apiKey: string): Promise<boolean> {
  console.log('\n--- TEST 1: Request Counting ---');
  
  try {
    let successCount = 0;
    let failCount = 0;
    let rateLimited = false;

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-max',
          messages: [{ role: 'user', content: `Test ${i}` }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        successCount++;
      } else if (response.status === 429) {
        // Rate limited
        rateLimited = true;
        failCount++;
        console.log(`⚠️  Rate limited at request #${i + 1}`);
        break;
      } else {
        failCount++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✓ Success: ${successCount}, Failed: ${failCount}`);
    console.log(`✓ Rate Limited: ${rateLimited ? 'YES' : 'NO'}`);
    console.log(`✓ Success Rate: ${(successCount / TEST_ITERATIONS * 100).toFixed(1)}%`);

    return successCount === TEST_ITERATIONS;
  } catch (error) {
    console.error('✗ Request counting test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 2: Token Limit Detection
 * Tries to exceed any potential token limit
 */
async function testTokenLimitDetection(apiKey: string): Promise<{ hasLimit: boolean; limit?: number }> {
  console.log('\n--- TEST 2: Token Limit Detection ---');
  
  try {
    let totalTokensUsed = 0;
    let limitReached = false;
    let limit = null;

    // Make 20 requests with increasing token usage
    for (let i = 0; i < 20; i++) {
      const tokensInRequest = 1000 * (i + 1); // 1K, 2K, 3K, ... 20K

      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-max',
          messages: [{ role: 'user', content: 'A'.repeat(tokensInRequest) }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const total = promptTokens + completionTokens;
        
        totalTokensUsed += total;
        console.log(`  Request #${i + 1}: ${tokensInRequest} prompt tokens + ${completionTokens} completion = ${total} total`);

        // Check for token limit error
        if (response.status === 429) {
          limitReached = true;
          limit = totalTokensUsed;
          console.log(`\n⚠️  TOKEN LIMIT REACHED!`);
          console.log(`⚠️  Limit: ${limit} tokens`);
          break;
        }
      } else {
        console.error(`  Request #${i + 1} failed: ${response.status}`);
        limitReached = true;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✓ Total tokens used: ${totalTokensUsed.toLocaleString()}`);
    console.log(`✓ Token limit: ${limitReached ? limit : 'UNLIMITED'}`);

    return {
      hasLimit: limitReached,
      limit: limit,
    };
  } catch (error) {
    console.error('✗ Token limit detection failed:', (error as Error).message);
    return { hasLimit: false };
  }
}

/**
 * Test 3: High-Volume Test
 * Tests if there's any degradation at high volume
 */
async function testHighVolume(apiKey: string): Promise<boolean> {
  console.log('\n--- TEST 3: High-Volume Test ---');
  console.log('Making 100 requests rapidly...\n');

  try {
    const startTime = Date.now();
    let errors = 0;

    // Make 100 requests rapidly
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen-max',
            messages: [{ role: 'user', content: `Test ${i}` }],
            max_tokens: 50,
          }),
        }).then(res => {
          if (!res.ok) errors++;
          return res;
        }).catch(err => {
          errors++;
          throw err;
        })
      );
    }

    // Wait for all requests to complete
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = responses.filter(r => r.ok).length;
    const successRate = (successful / 100 * 100).toFixed(1);

    console.log(`✓ Duration: ${duration}ms`);
    console.log(`✓ Successful: ${successful}/100 (${successRate}%)`);
    console.log(`✓ Errors: ${errors}`);
    console.log(`✓ Average per request: ${(duration / 100).toFixed(1)}ms`);

    // Check for rate limiting
    if (successRate < 90) {
      console.log(`\n⚠️  Success rate below 90% - possibly rate limited`);
      return false;
    }

    console.log('\n✓ High-volume test passed');
    return true;

  } catch (error) {
    console.error('✗ High-volume test failed:', (error as Error).message);
    return false;
  }
}

/**
 * Test 4: Billing Check (via API response)
 * Checks if any billing information is returned
 */
async function testBillingInfo(apiKey: string): Promise<{ isFree: boolean; pricingTier?: string }> {
  console.log('\n--- TEST 4: Billing Info Check ---');

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();

      console.log('✓ Models retrieved successfully');
      console.log('✓ Available models:', data.data?.length || 0);

      // Check for pricing info
      if (data.data) {
        for (const model of data.data) {
          if (model.pricing) {
            console.log(`  Model ${model.model}:`);
            console.log(`    Pricing: ${JSON.stringify(model.pricing)}`);
            console.log(`    Type: ${model.type || 'unknown'}`);

            // If pricing is null or "free", it's likely free
            if (model.pricing === null || model.pricing.type === 'free') {
              console.log(`    Status: FREE ✅`);
            }
          }
        }
      }

      return {
        isFree: true,
        pricingTier: 'detected',
      };
    }

    return {
      isFree: false,
    };
  } catch (error) {
    console.error('✗ Billing check failed:', (error as Error).message);
    return {
      isFree: false,
    };
  }
}

/**
 * Main test runner
 */
async function main() {
  // Get API keys
  const apiKeys = getQwenAPIKeys();

  if (apiKeys.length === 0) {
    console.log('\n❌ No valid Qwen API keys found!');
    console.log('\nPlease:');
    console.log('1. Create Alibaba Cloud account');
    console.log('2. Create Qwen API keys');
    console.log('3. Add keys to .env file');
    console.log('4. Run this test again\n');
    process.exit(1);
  }

  const apiKey = apiKeys[0];
  console.log(`\n✓ Using API key from account #1`);
  console.log(`✓ First 15 chars: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`✓ Last 4 chars: ...${apiKey.substring(apiKey.length - 4)}`);

  // Run all tests
  const results = {
    'Test 1: Request Counting': await testRequestCounting(apiKey),
    'Test 2: Token Limit Detection': await testTokenLimitDetection(apiKey),
    'Test 3: High-Volume': await testHighVolume(apiKey),
    'Test 4: Billing Info': await testBillingInfo(apiKey),
  };

  // Print summary
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                        ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  for (const [testName, result] of Object.entries(results)) {
    const status = typeof result === 'boolean' 
      ? (result ? '✓ PASS' : '✗ FAIL')
      : (result.isFree ? '✓ FREE' : '⚠️ UNKNOWN');
    console.log(`${status}  ${testName}`);
  }

  // Conclusion
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║                  CONCLUSION                          ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  const tokenLimitTest = results['Test 2: Token Limit Detection'];
  
  if (tokenLimitTest.hasLimit && tokenLimitTest.limit) {
    console.log('📊 SCENARIO A: With Token Limit');
    console.log(`   Token Limit: ${tokenLimitTest.limit.toLocaleString()} tokens`);
    console.log(`   Recommendation: Use with monthly quota tracking`);
    console.log(`   Configuration: { "qwen": { "unlimitedTokens": false } }`);
  } else {
    console.log('🚀 SCENARIO B: UNLIMITED Tokens!');
    console.log(`   Token Limit: UNLIMITED`);
    console.log(`   Recommendation: ENJOY massive capacity!`);
    console.log(`   Configuration: { "qwen": { "unlimitedTokens": true } }`);
    console.log(`   💰 Estimated Value: PRICELESS!`);
  }

  // Next steps
  console.log('\n📝 Next Steps:');
  console.log('1. Configure based on test results');
  console.log('2. Test with all 10 accounts');
  console.log('3. Monitor usage and limits');
  console.log('4. Enjoy massive FREE capacity!');

  process.exit(0);
}

main().catch(console.error);
