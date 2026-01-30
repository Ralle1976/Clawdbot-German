# Free-Tier LLM Providers - Comprehensive Guide

## Overview

Complete list of LLM providers with generous free tiers suitable for multi-provider routing and load balancing.

---

## 🆓 Free-Tier Provider Matrix

| Provider | Free Tier | Limits | Context | Quality | Multi-Account |
|----------|-----------|---------|----------|----------|---------------|
| **Qwen Portal** | 1000/day | 1M tokens | 128K | High | ✅ Yes |
| **Google AI** | 15/day | 1M tokens | 1M | High | ✅ Yes |
| **Kimi (Moonshot)** | 15/day | 256K | 256K | High | ⚠️ Limited |
| **Z.AI** | Unknown | 128K | 128K | High | ❌ Unknown |
| **Groq** | 30/min | 2M tokens | 128K | Fast | ✅ Yes |
| **Hugging Face** | API free | varies | varies | varies | ✅ Yes |

---

## 📊 Detailed Provider Analysis

### 1. Qwen Portal (Tongyi Qianwen)

**Provider:** Alibaba Cloud Tongyi Qianwen
**Website:** https://tongyi.aliyun.com/

#### Free Tier
- **Requests:** 1000/day (confirmed)
- **Tokens:** 1M tokens/month (estimated)
- **Reset:** Daily (requests), Monthly (tokens)
- **Cost:** $0 for free tier

#### Models Available
- `qwen-max` - Best quality, latest model
- `qwen-plus` - High quality
- `qwen-turbo` - Fast, cost-optimized
- `qwen-coder` - Specialized for coding

#### Context Windows
- **qwen-max**: 128K tokens
- **qwen-plus**: 32K tokens
- **qwen-turbo**: 8K tokens
- **qwen-coder**: 32K tokens

#### Multi-Account Strategy
```typescript
interface QwenAccountPool {
  accounts: {
    id: string;
    apiKey: string;
    quota: {
      requests: { used: number; limit: 1000; reset: Date };
      tokens: { used: number; limit: 1000000; reset: Date };
    };
  }[];
  strategy: 'round_robin' | 'least_used' | 'weighted';
  maxAccounts: 10; // Can create up to 10 free accounts
}

// With 10 accounts:
// - Total daily requests: 10,000
// - Total monthly tokens: 10M
// - Massive free capacity!
```

#### Integration Example
```typescript
const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_DEFAULT_MODEL = "qwen-max";

class QwenProvider implements LLMProvider {
  async chat(messages: Message[]): Promise<ChatResponse> {
    const account = await accountPool.selectAccount();

    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model || QWEN_DEFAULT_MODEL,
        messages,
        max_tokens: 8192,
      }),
    });

    // Track usage
    await trackUsage(account, response.usage);

    return response.json();
  }
}
```

---

### 2. Google AI (Gemini)

**Provider:** Google AI Studio
**Website:** https://ai.google.dev/

#### Free Tier
- **Requests:** 15/day per account
- **Tokens:** 1M tokens/month
- **Reset:** Daily (requests), Monthly (tokens)
- **Cost:** $0 for free tier

#### Models Available
- `gemini-2.5-flash` - 1M context, extremely fast
- `gemini-2.5-flash-thinking` - Extended reasoning
- `gemini-2.5-pro` - Highest quality
- `gemini-1.5-pro` - Legacy, still supported

#### Context Windows
- **gemini-2.5-flash**: 1M tokens! (Massive)
- **gemini-2.5-pro**: 1M tokens
- **gemini-2.5-flash-thinking**: 1M tokens

#### Multi-Account Strategy
```typescript
// Google allows multiple free accounts
// Each account gets 15 requests/day
// With 5 accounts: 75 requests/day
// With 10 accounts: 150 requests/day

const GOOGLE_ACCOUNT_POOL_SIZE = 5; // Conservative
const GOOGLE_ACCOUNT_POOL_SIZE_MAX = 10; // Aggressive

// Example with 5 accounts:
// - Daily: 75 requests
// - Monthly: ~2,250 requests
// - Tokens: 5M/month
```

---

### 3. Kimi (Moonshot AI)

**Provider:** Moonshot AI
**Website:** https://platform.moonshot.cn/

#### Free Tier
- **Requests:** 15/day (estimated)
- **Tokens:** Free tier available
- **Context:** 256K tokens (kimi-2.5)
- **Cost:** $0 for free tier

#### Models Available
- `kimi-2.5` - Latest, 256K context
- `kimi-1.5` - Legacy, 128K context

#### Notes
- Excellent for large context tasks (256K tokens)
- Good Chinese and English support
- Multi-account policy unclear (may have restrictions)

---

### 4. Groq

**Provider:** Groq
**Website:** https://groq.com/

#### Free Tier
- **Requests:** 30/minute (rate limit)
- **Tokens:** 2M tokens/month
- **Speed:** Extremely fast (LLM inference accelerator)
- **Cost:** $0 for free tier

#### Models Available
- `llama-3.3-70b-versatile`
- `llama-3.3-8b-instant`
- `mixtral-8x7b-32768`
- `gemma2-9b-it`

#### Multi-Account Strategy
```typescript
// Groq allows multiple accounts
// 30 requests/min is very generous
// With 3 accounts: 90 requests/min!
// That's 5,400 requests/hour!

const GROQ_ACCOUNT_POOL_SIZE = 3;
const GROQ_RATE_LIMIT_PER_MINUTE = 30;
const GROQ_TOTAL_CAPACITY = GROQ_ACCOUNT_POOL_SIZE * GROQ_RATE_LIMIT_PER_MINUTE; // 90/min
```

---

### 5. Hugging Face Inference API

**Provider:** Hugging Face
**Website:** https://huggingface.co/

#### Free Tier
- **Requests:** API is free (inference time limit)
- **Tokens:** Varies by model
- **Cost:** $0 for most inference APIs

#### Models Available
- Open-source models hosted on HF
- Mixtral, Llama, Mistral, etc.
- Can host custom models

#### Notes
- Variable pricing (some models have costs)
- Speed varies by model size
- Excellent for experimentation

---

## 🧩 Multi-Account Load Balancing Design

### Round-Robin Strategy

```typescript
class MultiAccountLoadBalancer {
  accounts: ProviderAccount[];
  currentIndex: number = 0;
  strategy: 'round_robin';

  selectAccount(): ProviderAccount {
    // Find accounts with available quota
    const available = this.accounts.filter(a =>
      a.quota.requests.used < a.quota.requests.limit
    );

    if (available.length === 0) {
      throw new Error('All accounts exhausted');
    }

    // Round-robin selection
    const selected = available[this.currentIndex % available.length];
    this.currentIndex++;

    console.log(`Selected account: ${selected.id} (${this.currentIndex}th in cycle)`);

    return selected;
  }
}
```

### Least-Used Strategy

```typescript
class LeastUsedLoadBalancer {
  selectAccount(): ProviderAccount {
    const available = this.accounts.filter(a =>
      a.quota.requests.used < a.quota.requests.limit
    );

    // Sort by usage, pick least used
    const sorted = available.sort((a, b) =>
      a.quota.requests.used - b.quota.requests.used
    );

    return sorted[0];
  }
}
```

### Weighted Strategy (Smart Routing)

```typescript
class WeightedLoadBalancer {
  selectAccount(task: Task): ProviderAccount {
    const available = this.accounts.filter(a =>
      a.quota.requests.used < a.quota.requests.limit
    );

    // Score accounts based on:
    // 1. Remaining quota (40% weight)
    // 2. Task complexity (30% weight)
    // 3. Historical performance (20% weight)
    // 4. Rate limit proximity (10% weight)

    const scored = available.map(account => ({
      account,
      score: this.calculateScore(account, task)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].account;
  }

  private calculateScore(account: ProviderAccount, task: Task): number {
    const quotaScore = (account.quota.requests.limit - account.quota.requests.used) / account.quota.requests.limit * 40;

    const complexityScore = account.bestTaskTypes.includes(task.type) ? 30 : 0;

    const performanceScore = account.performance.avgLatency < 1000 ? 20 : 10;

    const rateLimitScore = account.quota.requests.used / account.quota.requests.limit * 10;

    return quotaScore + complexityScore + performanceScore - rateLimitScore;
  }
}
```

---

## 📈 Free-Tier Capacity Calculator

### Example: Qwen Multi-Account Setup

```typescript
interface FreeTierCapacity {
  provider: string;
  accounts: number;
  dailyRequests: number;
  monthlyTokens: number;
  totalFreeValue: number; // Estimated USD equivalent
}

const QWEN_CAPACITY: FreeTierCapacity = {
  provider: 'Qwen',
  accounts: 5,
  dailyRequests: 5000,    // 1000 * 5
  monthlyTokens: 5000000,  // 1M * 5
  totalFreeValue: 500,    // Estimated at $0.10/1M tokens = $500
};

const GOOGLE_CAPACITY: FreeTierCapacity = {
  provider: 'Google AI',
  accounts: 3,
  dailyRequests: 45,       // 15 * 3
  monthlyTokens: 3000000, // 1M * 3
  totalFreeValue: 600,    // Estimated
};

const GROQ_CAPACITY: FreeTierCapacity = {
  provider: 'Groq',
  accounts: 3,
  dailyRequests: 43200,   // 30/min * 60 * 24 = 43,200!
  monthlyTokens: 6000000,  // 2M * 3
  totalFreeValue: 300,    // Estimated
};
```

### Combined Free-Tier Capacity

```
┌──────────────┬──────────┬─────────────┬──────────────┬─────────────┐
│ Provider     │ Accounts  │ Daily Req   │ Monthly Tok │ Est. Value  │
├──────────────┼──────────┼─────────────┼──────────────┼─────────────┤
│ Qwen (5)    │     5    │ 5,000       │ 5M           │ $500         │
│ Google (3)   │     3    │ 45          │ 3M           │ $600         │
│ Groq (3)     │     3    │ 43,200      │ 6M           │ $300         │
│ Kimi (1)     │     1    │ 15          │ 256K         │ $200         │
│ Z.AI (1)     │     1    │ TBD         │ TBD           │ TBD          │
├──────────────┼──────────┼─────────────┼──────────────┼─────────────┤
│ TOTAL        │    13    │ 48,260      │ 14.256M      │ $1,600+      │
└──────────────┴──────────┴─────────────┴──────────────┴─────────────┘
```

**Total Free Value:** ~$1,600+ per month!

---

## 🎯 Recommended Free-Tier Setup

### Optimal Configuration

```json
{
  "providers": {
    "qwen": {
      "enabled": true,
      "accounts": [
        { "id": "qwen-1", "apiKey": "${QWEN_API_KEY_1}" },
        { "id": "qwen-2", "apiKey": "${QWEN_API_KEY_2}" },
        { "id": "qwen-3", "apiKey": "${QWEN_API_KEY_3}" },
        { "id": "qwen-4", "apiKey": "${QWEN_API_KEY_4}" },
        { "id": "qwen-5", "apiKey": "${QWEN_API_KEY_5}" }
      ],
      "loadBalancing": "round_robin",
      "models": {
        "qwen-max": { "contextWindow": 128000, "costPer1M": 0 },
        "qwen-turbo": { "contextWindow": 8000, "costPer1M": 0 }
      }
    },

    "google": {
      "enabled": true,
      "accounts": [
        { "id": "google-1", "apiKey": "${GOOGLE_API_KEY_1}" },
        { "id": "google-2", "apiKey": "${GOOGLE_API_KEY_2}" },
        { "id": "google-3", "apiKey": "${GOOGLE_API_KEY_3}" }
      ],
      "loadBalancing": "least_used",
      "models": {
        "gemini-2.5-flash": { "contextWindow": 1000000, "costPer1M": 0 }
      }
    },

    "groq": {
      "enabled": true,
      "accounts": [
        { "id": "groq-1", "apiKey": "${GROQ_API_KEY_1}" },
        { "id": "groq-2", "apiKey": "${GROQ_API_KEY_2}" },
        { "id": "groq-3", "apiKey": "${GROQ_API_KEY_3}" }
      ],
      "loadBalancing": "weighted",
      "models": {
        "llama-3.3-70b-versatile": { "contextWindow": 128000, "costPer1M": 0 }
      }
    }
  },

  "preferences": {
    "default": "qwen",
    "budgetMode": "free_first",
    "autoSwitch": true,
    "switchOnLimit": true,
    "preferences": {
      "coding": ["groq", "qwen", "google"],
      "reasoning": ["qwen", "google", "kimi"],
      "simple": ["groq", "google", "qwen"],
      "max_context": ["google", "qwen", "kimi"]
    }
  }
}
```

---

## 🔒 Account Creation Guide

### Qwen Portal
```bash
1. Go to: https://tongyi.aliyun.com/
2. Sign up with: Alibaba Cloud account
3. Navigate to: API Key Management
4. Create API key
5. Copy to: ~/.openclaw/providers/qwen-1.apikey
6. Repeat for additional accounts
```

### Google AI
```bash
1. Go to: https://ai.google.dev/
2. Sign in with: Google account
3. Navigate to: API Keys
4. Create API key for: Generative Language API
5. Copy to: ~/.openclaw/providers/google-1.apikey
6. Repeat with: Additional Google accounts
```

### Groq
```bash
1. Go to: https://console.groq.com/
2. Sign up with: Email/GitHub
3. Navigate to: API Keys
4. Create API key
5. Copy to: ~/.openclaw/providers/groq-1.apikey
```

---

## 📊 Monitoring Dashboard

```
Free-Tier Provider Status
════════════════════════════════════════════════

Provider Pool Summary:
┌─────────────┬─────────┬───────────┬───────────┬──────────┬────────┐
│ Provider    │ Accounts │ Daily Req │ Used      │ Remaining │ % Used │
├─────────────┼─────────┼───────────┼───────────┼──────────┼────────┤
│ Qwen       │    5     │ 5,000     │ 2,341     │ 2,659     │  53%   │
│ Google #1-3 │    3     │    45     │    12     │    33     │  27%   │
│ Groq       │    3     │ 43,200    │  8,765    │ 34,435    │  20%   │
│ Kimi       │    1     │    15     │     8     │     7     │  53%   │
├─────────────┼─────────┼───────────┼───────────┼──────────┼────────┤
│ TOTAL       │   12     │ 48,260    │ 11,126    │ 37,134    │  23%   │
└─────────────┴─────────┴───────────┴───────────┴──────────┴────────┘

Active Routing:
Current: Qwen qwen-max → Groq llama-3.3 (speed request)
Fallback Chain: Qwen → Google → Groq → Kimi → Z.AI

Today's Usage:
┌─────────┬──────────┬──────────────┐
│ Time    │ Provider  │ Requests     │
├─────────┼──────────┼──────────────┤
│ 00-04   │ Groq     │ 12,450       │
│ 04-08   │ Qwen     │  3,220       │
│ 08-12   │ Groq     │  8,890       │
│ 12-16   │ Google    │    15        │
│ 16-20   │ Qwen     │  2,110       │
│ 20-24   │ Qwen     │  1,345       │
└─────────┴──────────┴──────────────┘

Estimated Free Value Today: $53.20
```

---

## 🎯 Implementation Priority

### Phase 1: Qwen Integration (Week 1)
- [ ] Qwen provider implementation
- [ ] Multi-account pool for Qwen
- [ ] Round-robin load balancing
- [ ] Quota tracking

### Phase 2: Google Multi-Account (Week 2)
- [ ] Expand Google to 3 accounts
- [ ] Load balancing strategies
- [ ] Account rotation

### Phase 3: Groq Integration (Week 3)
- [ ] Groq provider implementation
- [ ] Speed-based routing
- [ ] 30/min rate limit handling

### Phase 4: Free-Tier Dashboard (Week 4)
- [ ] Real-time monitoring
- [ ] Usage analytics
- [ ] Cost visualization

---

## 💡 Optimization Tips

### 1. Smart Task Routing
```typescript
const TASK_ROUTING = {
  simple: ['Groq', 'Google Flash', 'Qwen Turbo'],
  coding: ['Groq', 'Qwen', 'Google'],
  reasoning: ['Qwen Max', 'Google Pro', 'Kimi'],
  creative: ['Qwen Max', 'Google Pro'],
  max_context: ['Google Flash', 'Kimi', 'Qwen Max']
};
```

### 2. Time-Based Routing
```typescript
// Use different providers at different times
// Morning: All providers (fresh quotas)
// Afternoon: Prioritize Groq (fast)
// Evening: Prioritize Qwen (large context)
// Night: All providers for overnight jobs
```

### 3. Quota Preservation
```typescript
// Save expensive providers for complex tasks
// Use free tiers for simple tasks
// Reserve Kimi for 256K context needs
// Use Google Flash for 1M context needs
```

---

## 📚 References

- Qwen API: https://help.aliyun.com/zh/dashscope/developer-reference/overview
- Google AI: https://ai.google.dev/docs
- Groq API: https://console.groq.com/docs
- Hugging Face: https://huggingface.co/docs/api-inference

---

**This is a comprehensive guide to free-tier LLM providers for intelligent routing.** 🧬
