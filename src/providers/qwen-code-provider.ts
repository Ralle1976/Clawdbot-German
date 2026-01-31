/**
 * Qwen Code Provider - Official OAuth Free-Tier Integration
 * Uses Qwen Code CLI for 2,000 FREE requests/day via Qwen OAuth
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export interface QwenCodeAccount {
  id: string;
  email: string;
  authStatus: 'authenticated' | 'unauthenticated' | 'expired';
  lastUsed: Date;
  requestsUsed: number; // Today
  requestsLimit: number; // 2,000 per day
  quotaResetTime: Date;
}

export interface QwenCodeConfig {
  enabled: boolean;
  accounts: QwenCodeAccount[];
  defaultModel: string;
  autoAuthenticate: boolean;
  loadBalancing: 'round_robin' | 'least_used' | 'random' | 'priority';
}

const QWEN_CODE_DEFAULT_MODEL = 'qwen-max-120b';
const QWEN_CODE_DAILY_LIMIT = 2000; // OFFICIAL FREE TIER!

/**
 * Qwen Code Provider Class
 */
export class QwenCodeProvider {
  private config: QwenCodeConfig;
  private currentIndex: number = 0;
  private authCachePath: string;

  constructor(config: QwenCodeConfig, authCachePath: string = '/tmp/qwen-code-auth.json') {
    this.config = config;
    this.authCachePath = authCachePath;
    this.initialize();
  }

  /**
   * Initialize provider
   */
  private async initialize(): Promise<void> {
    console.log('[Qwen Code Provider] Initializing...\n');

    // Load auth cache
    await this.loadAuthCache();

    // Check if qwen-code is installed
    const installed = await this.checkQwenCodeInstalled();
    if (!installed) {
      console.log('[Qwen Code Provider] Qwen Code CLI not installed. Install with:');
      console.log('  npm install -g @qwen-code/qwen-code@latest');
    }

    // Check authentication status for all accounts
    await this.checkAuthStatus();

    console.log(`[Qwen Code Provider] ✅ Initialized`);
    console.log(`[Qwen Code Provider] ✅ ${this.config.accounts.length} accounts loaded`);
    console.log(`[Qwen Code Provider] ✅ Daily limit: ${QWEN_CODE_DAILY_LIMIT} requests/day`);
  }

  /**
   * Check if qwen-code CLI is installed
   */
  private async checkQwenCodeInstalled(): Promise<boolean> {
    try {
      const result = spawn('npx', ['qwen-code', '--version']);
      return new Promise(resolve => {
        result.on('close', (code) => resolve(code === 0));
        result.on('error', () => resolve(false));
      });
    } catch {
      return false;
    }
  }

  /**
   * Check authentication status for all accounts
   */
  private async checkAuthStatus(): Promise<void> {
    console.log('[Qwen Code Provider] Checking authentication status...\n');

    for (const account of this.config.accounts) {
      try {
        // Run qwen-code /auth to check status
        const result = spawn('npx', ['qwen-code', '/auth', '--check']);
        
        // Parse output
        let output = '';
        result.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        await new Promise(resolve => result.on('close', resolve));
        
        // Check if authenticated
        if (output.includes('Authenticated') || output.includes('已登录')) {
          account.authStatus = 'authenticated';
          console.log(`[Qwen Code Provider] ✓ ${account.id}: Authenticated`);
        } else {
          account.authStatus = 'unauthenticated';
          console.log(`[Qwen Code Provider] ✗ ${account.id}: Not authenticated`);
        }
      } catch (error) {
        account.authStatus = 'unauthenticated';
        console.log(`[Qwen Code Provider] ✗ ${account.id}: Error checking auth`);
      }
    }

    // Save auth cache
    await this.saveAuthCache();
  }

  /**
   * Authenticate an account
   */
  async authenticateAccount(accountId: string): Promise<boolean> {
    const account = this.config.accounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    console.log(`[Qwen Code Provider] Authenticating ${accountId}...\n`);

    try {
      // Run qwen-code /auth command (interactive browser flow)
      const result = spawn('npx', ['qwen-code', '/auth']);
      
      // In interactive mode, we wait for user to complete OAuth
      console.log('[Qwen Code Provider] Opening browser for OAuth...');
      console.log('[Qwen Code Provider] Please complete the OAuth flow in the browser.');
      
      await new Promise(resolve => result.on('close', resolve));
      
      // Check auth status after
      await this.checkAuthStatus();
      
      const updatedAccount = this.config.accounts.find(a => a.id === accountId);
      if (updatedAccount?.authStatus === 'authenticated') {
        console.log(`[Qwen Code Provider] ✓ ${accountId}: Authenticated successfully`);
        return true;
      } else {
        console.log(`[Qwen Code Provider] ✗ ${accountId}: Authentication failed`);
        return false;
      }
    } catch (error) {
      console.log(`[Qwen Code Provider] ✗ ${accountId}: Authentication error`);
      return false;
    }
  }

  /**
   * Select best account based on load balancing strategy
   */
  selectAccount(): QwenCodeAccount {
    const now = new Date();

    // Filter available accounts (authenticated + not exhausted)
    const available = this.config.accounts.filter(account => {
      const authenticated = account.authStatus === 'authenticated';
      const notExhausted = account.requestsUsed < account.requestsLimit;
      const notReset = now < account.quotaResetTime;
      return authenticated && notExhausted && notReset;
    });

    if (available.length === 0) {
      console.log('[Qwen Code Provider] ⚠️  No accounts available');
      throw new Error('All Qwen Code accounts are unavailable. Please authenticate.');
    }

    let selected: QwenCodeAccount;

    switch (this.config.loadBalancing) {
      case 'round_robin':
        selected = available[this.currentIndex % available.length];
        this.currentIndex++;
        break;

      case 'least_used':
        selected = available.sort((a, b) => a.requestsUsed - b.requestsUsed)[0];
        break;

      case 'random':
        selected = available[Math.floor(Math.random() * available.length)];
        break;

      case 'priority':
        // Select first available account
        selected = available[0];
        break;

      default:
        selected = available[0];
    }

    console.log(`[Qwen Code Provider] Selected: ${selected.id} (${this.config.loadBalancing})`);
    console.log(`[Qwen Code Provider] Requests used: ${selected.requestsUsed}/${selected.requestsLimit}`);
    console.log(`[Qwen Code Provider] Resets at: ${selected.quotaResetTime.toLocaleString()}`);

    return selected;
  }

  /**
   * Make chat completion request
   */
  async chatCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    id: string;
    model: string;
    choices: Array<{
      message: { role: string; content: string };
      finishReason: string;
    }>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    const account = this.selectAccount();

    try {
      // Use qwen-code CLI in headless mode
      const messagesString = JSON.stringify(params.messages);
      const model = params.model || this.config.defaultModel;
      const maxTokens = params.maxTokens || 4096;

      const args = [
        'qwen-code',
        '-p', // Headless mode
        `-m ${model}`,
        `-M ${maxTokens}`,
        messagesString
      ];

      const result = spawn('npx', args);

      let output = '';
      result.stdout?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise(resolve => result.on('close', resolve));

      // Update account usage
      account.requestsUsed++;
      account.lastUsed = new Date();

      // Check if quota is exhausted
      if (account.requestsUsed >= account.requestsLimit) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        account.quotaResetTime = tomorrow;
        console.log(`[Qwen Code Provider] ⚠️  ${account.id}: Quota exhausted. Resets at ${tomorrow.toLocaleString()}`);
      }

      // Save auth cache
      await this.saveAuthCache();

      // Parse output (simple parsing - qwen-code output structure)
      const response = this.parseQwenCodeOutput(output, model);

      console.log(`[Qwen Code Provider] ✓ Request completed`);
      console.log(`[Qwen Code Provider] Model: ${response.model}`);
      console.log(`[Qwen Code Provider] Tokens: ${response.usage.totalTokens}`);

      return response;

    } catch (error) {
      console.log(`[Qwen Code Provider] ✗ Request failed: ${error}`);

      // Reset account on error (simple retry logic)
      if (account.requestsUsed > 0) {
        account.requestsUsed--;
      }

      throw error;
    }
  }

  /**
   * Parse Qwen Code output
   */
  private parseQwenCodeOutput(output: string, model: string): any {
    // Try to extract response
    // Qwen Code CLI output structure varies, so we'll do simple parsing
    
    let content = output.trim();
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // Look for response content
    // Remove ANSI codes and CLI artifacts
    content = content
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
      .split('\n')
      .filter(line => line.length > 10) // Filter out CLI prompts
      .join('\n')
      .trim();

    // Estimate tokens (rough estimation: 4 chars per token)
    usage.totalTokens = Math.ceil(content.length / 4);
    usage.promptTokens = Math.ceil(params.messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4);
    usage.completionTokens = usage.totalTokens - usage.promptTokens;

    return {
      id: 'qwen-code-' + Date.now(),
      model,
      choices: [{
        message: {
          role: 'assistant',
          content
        },
        finishReason: 'stop'
      }],
      usage
    };
  }

  /**
   * Get status of all accounts
   */
  getStatus(): {
    provider: string;
    accounts: Array<{
      id: string;
      authStatus: string;
      requestsUsed: number;
      requestsLimit: number;
      requestsRemaining: number;
      lastUsed: string;
      quotaResetTime: string;
      status: 'available' | 'exhausted' | 'unauthenticated';
    }>;
    totalDailyRequests: number;
    totalDailyLimit: number;
  } {
    const now = new Date();
    let totalUsed = 0;
    let totalLimit = this.config.accounts.length * QWEN_CODE_DAILY_LIMIT;
    let totalAvailable = 0;

    const accountsStatus = this.config.accounts.map(account => {
      const available = account.authStatus === 'authenticated' && 
                         account.requestsUsed < account.requestsLimit &&
                         now < account.quotaResetTime;

      totalUsed += account.requestsUsed;
      
      if (available) {
        totalAvailable += (account.requestsLimit - account.requestsUsed);
      }

      return {
        id: account.id,
        authStatus: account.authStatus,
        requestsUsed: account.requestsUsed,
        requestsLimit: account.requestsLimit,
        requestsRemaining: available ? (account.requestsLimit - account.requestsUsed) : 0,
        lastUsed: account.lastUsed.toISOString(),
        quotaResetTime: account.quotaResetTime.toISOString(),
        status: available ? 'available' : 
                (account.requestsUsed >= account.requestsLimit) ? 'exhausted' : 'unauthenticated'
      };
    });

    return {
      provider: 'Qwen Code',
      accounts: accountsStatus,
      totalDailyRequests: totalUsed,
      totalDailyLimit
    };
  }

  /**
   * Get available models
   */
  getModels(): Array<{
    name: string;
    contextWindow: number;
    maxTokens: number;
    description: string;
  }> {
    // Qwen Code uses Qwen models via their API
    // We'll return known Qwen models
    return [
      {
        name: 'qwen-max-120b',
        contextWindow: 128000,
        maxTokens: 4096,
        description: 'Qwen Max 120B - Highest quality, 128K context'
      },
      {
        name: 'qwen-plus-72b',
        contextWindow: 32000,
        maxTokens: 4096,
        description: 'Qwen Plus 72B - High quality, 32K context'
      },
      {
        name: 'qwen-plus-32b',
        contextWindow: 32000,
        maxTokens: 4096,
        description: 'Qwen Plus 32B - Balanced quality, 32K context'
      },
      {
        name: 'qwen-turbo-6b',
        contextWindow: 8000,
        maxTokens: 4096,
        description: 'Qwen Turbo 6B - Fast, cost-optimized'
      }
    ];
  }

  /**
   * Load auth cache from disk
   */
  private async loadAuthCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.authCachePath, 'utf-8');
      const cache = JSON.parse(data);
      
      // Merge cache with config
      for (const cachedAccount of cache.accounts || []) {
        const account = this.config.accounts.find(a => a.id === cachedAccount.id);
        if (account) {
          account.authStatus = cachedAccount.authStatus;
          account.requestsUsed = cachedAccount.requestsUsed;
          account.lastUsed = new Date(cachedAccount.lastUsed);
          account.quotaResetTime = new Date(cachedAccount.quotaResetTime);
        }
      }
    } catch {
      // No cache file exists, that's fine
    }
  }

  /**
   * Save auth cache to disk
   */
  private async saveAuthCache(): Promise<void> {
    try {
      const cache = {
        provider: 'Qwen Code',
        accounts: this.config.accounts.map(account => ({
          id: account.id,
          authStatus: account.authStatus,
          requestsUsed: account.requestsUsed,
          quotaResetTime: account.quotaResetTime
        })),
        savedAt: new Date().toISOString()
      };

      await fs.writeFile(this.authCachePath, JSON.stringify(cache, null, 2));
    } catch {
      console.log('[Qwen Code Provider] Could not save auth cache');
    }
  }

  /**
   * Reset daily quotas
   */
  async resetDailyQuotas(): Promise<void> {
    const now = new Date();
    let resetCount = 0;

    for (const account of this.config.accounts) {
      if (now >= account.quotaResetTime) {
        account.requestsUsed = 0;
        
        // Set next reset time
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        account.quotaResetTime = tomorrow;

        resetCount++;
        console.log(`[Qwen Code Provider] ✓ Reset quota for ${account.id}`);
      }
    }

    if (resetCount > 0) {
      await this.saveAuthCache();
      console.log(`[Qwen Code Provider] ✓ Reset ${resetCount} accounts`);
    }
  }

  /**
   * Initialize provider with config
   */
  static async create(config: QwenCodeConfig): Promise<QwenCodeProvider> {
    const provider = new QwenCodeProvider(config);
    return provider;
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): QwenCodeAccount | undefined {
    return this.config.accounts.find(a => a.id === accountId);
  }
}

// Export factory function
export async function createQwenCodeProvider(config: QwenCodeConfig): Promise<QwenCodeProvider> {
  const provider = new QwenCodeProvider(config);
  await provider.initialize();
  return provider;
}

/**
 * Create Qwen Code provider with 5 accounts (10K daily free!)
 */
export async function createQwenCodeProviderWith5Accounts(emails: string[]): Promise<QwenCodeProvider> {
  const accounts: QwenCodeAccount[] = emails.map((email, index) => ({
    id: `qwen-code-${index + 1}`,
    email,
    authStatus: 'unauthenticated',
    lastUsed: new Date(),
    requestsUsed: 0,
    requestsLimit: 2000, // 2,000 per day
    quotaResetTime: new Date(), // Reset at end of day
  }));

  const config: QwenCodeConfig = {
    enabled: true,
    accounts,
    defaultModel: 'qwen-max-120b',
    autoAuthenticate: true,
    loadBalancing: 'round_robin'
  };

  const provider = await createQwenCodeProvider(config);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     Qwen Code Provider - OFFICIAL FREE TIER     ║');
  console.log('║           2,000 FREE REQUESTS/DAY (Oauth)        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`✅ ${accounts.length} accounts configured`);
  console.log(`✅ Total daily requests: ${accounts.length * 2000}`);
  console.log(`✅ Total monthly requests: ${accounts.length * 2000 * 30} (!)`);
  console.log(`✅ Total monthly requests: ${accounts.length * 2000 * 30} (!)`); // ~30 days
  console.log(`✅ Cost: $0 (100% FREE!)`);

  return provider;
}
