/**
 * Qwen Portal Provider with Multi-Account Pool
 * Supports up to 10 free accounts with automatic load balancing
 */

export interface QwenAccount {
  id: string;
  apiKey: string;
  quota: {
    requests: { used: number; limit: number; resetAt: Date };
    tokens: { used: number; limit: number; resetAt: Date };
  };
  performance: {
    avgLatency: number;
    errorRate: number;
    lastUsed: Date;
  };
}

export interface QwenModel {
  name: string;
  contextWindow: number;
  maxTokens: number;
  description: string;
}

export interface QwenConfig {
  enabled: boolean;
  accounts: QwenAccount[];
  loadBalancing: 'round_robin' | 'least_used' | 'weighted' | 'random';
  defaultModel: string;
}

// Qwen API Configuration
const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_DEFAULT_MODEL = "qwen-max";
const QWEN_REQUESTS_PER_DAY = 1000;
const QWEN_TOKENS_PER_MONTH = 1000000;

// Available Qwen Models
const QWEN_MODELS: Record<string, QwenModel> = {
  'qwen-max': {
    name: 'qwen-max',
    contextWindow: 128000,
    maxTokens: 8192,
    description: 'Qwen Max - Highest quality, 128K context',
  },
  'qwen-plus': {
    name: 'qwen-plus',
    contextWindow: 32000,
    maxTokens: 8192,
    description: 'Qwen Plus - High quality, 32K context',
  },
  'qwen-turbo': {
    name: 'qwen-turbo',
    contextWindow: 8000,
    maxTokens: 8192,
    description: 'Qwen Turbo - Fast, cost-optimized',
  },
  'qwen-coder': {
    name: 'qwen-coder',
    contextWindow: 32000,
    maxTokens: 8192,
    description: 'Qwen Coder - Specialized for coding',
  },
};

/**
 * Qwen Provider Class
 */
export class QwenProvider {
  private config: QwenConfig;
  private currentIndex: number = 0;
  private lastResetCheck: Date = new Date();

  constructor(config: QwenConfig) {
    this.config = config;
    this.initializeAccounts();
    this.startQuotaResetChecker();
  }

  /**
   * Initialize account quotas
   */
  private initializeAccounts(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const account of this.config.accounts) {
      // Set request quota (resets daily)
      account.quota.requests = {
        used: 0,
        limit: QWEN_REQUESTS_PER_DAY,
        resetAt: midnight,
      };

      // Set token quota (resets monthly)
      account.quota.tokens = {
        used: 0,
        limit: QWEN_TOKENS_PER_MONTH,
        resetAt: monthStart,
      };

      // Initialize performance tracking
      account.performance = {
        avgLatency: 0,
        errorRate: 0,
        lastUsed: now,
      };
    }
  }

  /**
   * Start periodic quota reset checker
   */
  private startQuotaResetChecker(): void {
    // Check every minute for quota resets
    setInterval(() => {
      this.checkQuotaResets();
    }, 60000);
  }

  /**
   * Check and reset expired quotas
   */
  private checkQuotaResets(): void {
    const now = new Date();

    for (const account of this.config.accounts) {
      // Reset daily request quota
      if (now >= account.quota.requests.resetAt) {
        account.quota.requests.used = 0;
        const tomorrow = new Date(account.quota.requests.resetAt);
        tomorrow.setDate(tomorrow.getDate() + 1);
        account.quota.requests.resetAt = tomorrow;
        console.log(`[${account.id}] Daily quota reset`);
      }

      // Reset monthly token quota
      if (now >= account.quota.tokens.resetAt) {
        account.quota.tokens.used = 0;
        const nextMonth = new Date(account.quota.tokens.resetAt);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        account.quota.tokens.resetAt = nextMonth;
        console.log(`[${account.id}] Monthly token quota reset`);
      }
    }
  }

  /**
   * Select best account based on load balancing strategy
   */
  selectAccount(): QwenAccount {
    const now = new Date();

    // Filter accounts with available quota
    const available = this.config.accounts.filter(account => {
      const requestsAvailable = account.quota.requests.used < account.quota.requests.limit;
      const tokensAvailable = account.quota.tokens.used < account.quota.tokens.limit;
      return requestsAvailable && tokensAvailable;
    });

    if (available.length === 0) {
      throw new Error('All Qwen accounts exhausted quota');
    }

    let selected: QwenAccount;

    switch (this.config.loadBalancing) {
      case 'round_robin':
        selected = this.roundRobinSelect(available);
        break;
      case 'least_used':
        selected = this.leastUsedSelect(available);
        break;
      case 'weighted':
        selected = this.weightedSelect(available, now);
        break;
      case 'random':
        selected = this.randomSelect(available);
        break;
      default:
        selected = this.roundRobinSelect(available);
    }

    console.log(`[Qwen] Selected account: ${selected.id} (strategy: ${this.config.loadBalancing})`);
    return selected;
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelect(available: QwenAccount[]): QwenAccount {
    const index = this.currentIndex % available.length;
    this.currentIndex++;
    return available[index];
  }

  /**
   * Select account with least used quota
   */
  private leastUsedSelect(available: QwenAccount[]): QwenAccount {
    // Sort by combined quota usage (lower is better)
    const sorted = [...available].sort((a, b) => {
      const aUsage = (a.quota.requests.used / a.quota.requests.limit) +
                     (a.quota.tokens.used / a.quota.tokens.limit);
      const bUsage = (b.quota.requests.used / b.quota.requests.limit) +
                     (b.quota.tokens.used / b.quota.tokens.limit);
      return aUsage - bUsage;
    });
    return sorted[0];
  }

  /**
   * Weighted selection based on performance and availability
   */
  private weightedSelect(available: QwenAccount[], now: Date): QwenAccount {
    const scored = available.map(account => ({
      account,
      score: this.calculateScore(account, now),
    }));

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);
    return scored[0].account;
  }

  /**
   * Calculate account selection score
   */
  private calculateScore(account: QwenAccount, now: Date): number {
    let score = 0;

    // Quota availability score (40% weight)
    const requestAvailability = 1 - (account.quota.requests.used / account.quota.requests.limit);
    const tokenAvailability = 1 - (account.quota.tokens.used / account.quota.tokens.limit);
    score += (requestAvailability + tokenAvailability) / 2 * 40;

    // Latency score (30% weight)
    const latencyScore = Math.max(0, 1000 - account.performance.avgLatency) / 1000;
    score += latencyScore * 30;

    // Error rate score (20% weight)
    const errorScore = Math.max(0, 1 - account.performance.errorRate);
    score += errorScore * 20;

    // Recency score (10% weight) - prefer accounts not used recently
    const hoursSinceUse = (now.getTime() - account.performance.lastUsed.getTime()) / 3600000;
    const recencyScore = Math.min(1, hoursSinceUse / 24);
    score += recencyScore * 10;

    return score;
  }

  /**
   * Random selection
   */
  private randomSelect(available: QwenAccount[]): QwenAccount {
    const index = Math.floor(Math.random() * available.length);
    return available[index];
  }

  /**
   * Make a chat completion request to Qwen API
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
    const startTime = Date.now();

    try {
      const model = params.model || this.config.defaultModel;
      const maxTokens = params.maxTokens || QWEN_MODELS[model]?.maxTokens || 8192;

      const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: params.messages,
          max_tokens: maxTokens,
          temperature: params.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      // Update account usage
      account.quota.requests.used++;
      account.quota.tokens.used += result.usage.totalTokens;
      account.performance.lastUsed = new Date();

      // Update performance metrics
      account.performance.avgLatency =
        (account.performance.avgLatency * 0.9) + (latency * 0.1);
      account.performance.errorRate =
        (account.performance.errorRate * 0.95);

      console.log(`[Qwen][${account.id}] Request completed in ${latency}ms`);

      return result;

    } catch (error) {
      // Update error rate
      account.performance.errorRate =
        (account.performance.errorRate * 0.9) + (0.1);

      console.error(`[Qwen][${account.id}] Error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get status of all accounts
   */
  getStatus(): {
    provider: string;
    accounts: Array<{
      id: string;
      requestsUsed: number;
      requestsLimit: number;
      requestsRemaining: number;
      tokensUsed: number;
      tokensLimit: number;
      tokensRemaining: number;
      avgLatency: number;
      errorRate: number;
      status: 'available' | 'exhausted';
    }>;
    totalRequests: {
      used: number;
      limit: number;
      remaining: number;
    };
    totalTokens: {
      used: number;
      limit: number;
      remaining: number;
    };
  } {
    const now = new Date();
    let totalRequestsUsed = 0;
    let totalTokensUsed = 0;

    const accountsStatus = this.config.accounts.map(account => {
      const requestsAvailable = now < account.quota.requests.resetAt;
      const tokensAvailable = now < account.quota.tokens.resetAt;
      const requestsRemaining = requestsAvailable
        ? account.quota.requests.limit - account.quota.requests.used
        : 0;
      const tokensRemaining = tokensAvailable
        ? account.quota.tokens.limit - account.quota.tokens.used
        : 0;

      totalRequestsUsed += account.quota.requests.used;
      totalTokensUsed += account.quota.tokens.used;

      return {
        id: account.id,
        requestsUsed: account.quota.requests.used,
        requestsLimit: account.quota.requests.limit,
        requestsRemaining,
        tokensUsed: account.quota.tokens.used,
        tokensLimit: account.quota.tokens.limit,
        tokensRemaining,
        avgLatency: account.performance.avgLatency,
        errorRate: account.performance.errorRate,
        status: (requestsRemaining > 0 && tokensRemaining > 0) ? 'available' : 'exhausted',
      };
    });

    return {
      provider: 'Qwen',
      accounts: accountsStatus,
      totalRequests: {
        used: totalRequestsUsed,
        limit: this.config.accounts.length * QWEN_REQUESTS_PER_DAY,
        remaining: (this.config.accounts.length * QWEN_REQUESTS_PER_DAY) - totalRequestsUsed,
      },
      totalTokens: {
        used: totalTokensUsed,
        limit: this.config.accounts.length * QWEN_TOKENS_PER_MONTH,
        remaining: (this.config.accounts.length * QWEN_TOKENS_PER_MONTH) - totalTokensUsed,
      },
    };
  }

  /**
   * Get available models
   */
  getModels(): QwenModel[] {
    return Object.values(QWEN_MODELS);
  }

  /**
   * Check if account is available
   */
  isAccountAvailable(accountId: string): boolean {
    const account = this.config.accounts.find(a => a.id === accountId);
    if (!account) return false;

    const now = new Date();
    const requestsAvailable = account.quota.requests.used < account.quota.requests.limit;
    const tokensAvailable = account.quota.tokens.used < account.quota.tokens.limit;

    return requestsAvailable && tokensAvailable;
  }
}

/**
 * Create Qwen provider with 10 accounts
 */
export function createQwenProvider(apiKeys: string[]): QwenProvider {
  if (apiKeys.length !== 10) {
    throw new Error('Qwen provider requires exactly 10 API keys');
  }

  const accounts: QwenAccount[] = apiKeys.map((apiKey, index) => ({
    id: `qwen-${index + 1}`,
    apiKey,
    quota: {
      requests: { used: 0, limit: QWEN_REQUESTS_PER_DAY, resetAt: new Date() },
      tokens: { used: 0, limit: QWEN_TOKENS_PER_MONTH, resetAt: new Date() },
    },
    performance: {
      avgLatency: 0,
      errorRate: 0,
      lastUsed: new Date(),
    },
  }));

  const config: QwenConfig = {
    enabled: true,
    accounts,
    loadBalancing: 'round_robin', // Default strategy
    defaultModel: QWEN_DEFAULT_MODEL,
  };

  return new QwenProvider(config);
}
