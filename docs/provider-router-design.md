# LLM Provider Router - Multi-Provider Intelligent Routing System

## Concept

An intelligent routing layer that automatically selects the best LLM provider based on:
- User preferences
- Token limits & remaining quota
- Cost optimization
- Task-specific requirements
- Context window needs

---

## 🎯 Core Features

### 1. Multi-Provider Support

| Provider | Model | Context Window | Cost/1M Tokens | Notes |
|----------|--------|----------------|-----------------|-------|
| **Z.AI** | glm-4.7 | 128K | $?.?? | Current default |
| **Kimi (Moonshot)** | kimi-2.5 | 256K | Free tier available | High context |
| **Google AI** | gemini-2.5-flash | 1M | Free tier | Massive context |
| **OpenAI** | gpt-4o | 128K | $30/M | Best quality |
| **Anthropic** | claude-3.5-sonnet | 200K | $15/M | Best reasoning |
| **Multiple Google** | gemini-flash/free | 1M | Free (x5) | Load balanced |

### 2. Automatic Failover

```typescript
// When provider hits limit, auto-switch
interface RoutingDecision {
  provider: string;
  model: string;
  reason: 'preference' | 'limit' | 'cost' | 'context' | 'quality';
  confidence: number;
}

class ProviderRouter {
  async selectBestProvider(task: Task): Promise<RoutingDecision> {
    const candidates = this.eligibleProviders(task);

    // Sort by preference, then quota, then cost
    return candidates.sort((a, b) => {
      // 1. User preference
      if (a.preferenceScore !== b.preferenceScore) {
        return b.preferenceScore - a.preferenceScore;
      }

      // 2. Remaining quota (failover trigger)
      if (a.remainingQuota === 0) return 1;
      if (b.remainingQuota === 0) return -1;

      // 3. Context window requirement
      if (task.estimatedTokens > a.contextWindow) return 1;
      if (task.estimatedTokens > b.contextWindow) return -1;

      // 4. Cost optimization
      return a.costPerToken - b.costPerToken;
    })[0];
  }
}
```

### 3. Preference-Based Routing

User can set preferences per task type:

```typescript
interface ProviderPreferences {
  // Per task type
  coding: { preferred: 'OpenAI', fallback: ['Anthropic', 'Z.AI'] };
  reasoning: { preferred: 'Anthropic', fallback: ['Kimi', 'Google'] };
  creative: { preferred: 'OpenAI', fallback: ['Kimi', 'Google'] };
  simple: { preferred: 'Google', fallback: ['Z.AI', 'Kimi'] };

  // Per quality requirement
  quality: {
    max_speed: { preferred: 'Google Flash' },
    balanced: { preferred: 'Z.AI' },
    max_quality: { preferred: 'OpenAI GPT-4o' },
    max_context: { preferred: 'Kimi' } // 256K tokens
  };

  // Cost optimization
  budget_mode: 'free_only' | 'cost_first' | 'quality_first';
}
```

### 4. Context-Aware Switching

Only switch providers when safe to do so:

```typescript
interface ContextState {
  currentProvider: string;
  tokensUsed: number;
  contextWindow: number;
  messageHistory: Message[];
  canSwitch: boolean;
}

function canSwitchProviders(state: ContextState): boolean {
  // Allow switch if:
  // 1. Context is small (first few messages)
  if (state.tokensUsed < 5000) return true;

  // 2. Current provider exhausted
  if (await getRemainingQuota(state.currentProvider) === 0) {
    console.warn(`Provider ${state.currentProvider} exhausted, switching...`);
    return true;
  }

  // 3. User explicitly requested switch
  if (userRequestedSwitch) return true;

  // 4. Task type change (simple -> complex)
  if (taskTypeChangedSignificantly) return true;

  // Otherwise, preserve context
  return false;
}
```

### 5. Multi-Account Load Balancing

For providers with multiple accounts (Google Free):

```typescript
interface GoogleAccountPool {
  accounts: {
    id: string;
    apiKey: string;
    quota: { used: number; limit: number; resetAt: Date };
  }[];
  strategy: 'round_robin' | 'least_used' | 'random';
}

class AccountPool {
  async selectAccount(): Promise<GoogleAccount> {
    const available = this.accounts.filter(a => a.quota.used < a.quota.limit);

    if (available.length === 0) {
      throw new Error('All Google accounts exhausted');
    }

    switch (this.strategy) {
      case 'round_robin':
        return this.accounts[this.currentIndex++ % this.accounts.length];
      case 'least_used':
        return available.sort((a, b) => a.quota.used - b.quota.used)[0];
      case 'random':
        return available[Math.floor(Math.random() * available.length)];
    }
  }
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  User Request                         │
│              "Help me code this..."                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Provider Router Engine                     │
│  ┌─────────────────────────────────────────────────┐  │
│  │  1. Task Analysis                          │  │
│  │     - Estimate tokens needed                  │  │
│  │     - Identify task type (code/reason/etc)   │  │
│  │     - Check user preferences                 │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │  2. Provider Selection                      │  │
│  │     - Check quotas for all providers        │  │
│  │     - Filter by context window              │  │
│  │     - Sort by preferences                  │  │
│  │     - Apply cost optimization               │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │  3. Safety Check                          │  │
│  │     - Can we switch safely?                 │  │
│  │     - Context preservation needed?           │  │
│  │     - Rate limiting status                  │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Z.AI    │    │ Kimi    │    │ Google  │
    │ Provider│    │ Provider│    │ Pool    │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  LLM API Call   │
              │  with fallback  │
              └──────────────────┘
```

---

## 📊 Provider Configuration

### Example Configuration

```typescript
// ~/.openclaw/providers.json
{
  "providers": {
    "zai": {
      "enabled": true,
      "apiKey": "${ZAI_API_KEY}",
      "models": {
        "glm-4.7": {
          "contextWindow": 128000,
          "costPer1M": 100000, // Unknown, need to research
          "maxTokens": 8192,
          "preferenceScore": 50
        }
      },
      "quota": {
        "limit": "free_tier", // or specific number
        "reset": "daily"
      }
    },

    "kimi": {
      "enabled": true,
      "apiKey": "${MOONSHOT_API_KEY}",
      "models": {
        "kimi-2.5": {
          "contextWindow": 256000,
          "costPer1M": 0, // Free tier
          "maxTokens": 8192,
          "preferenceScore": 60 // Preferred for large context
        }
      },
      "quota": {
        "limit": "free_15_per_day",
        "reset": "daily"
      }
    },

    "google": {
      "enabled": true,
      "accounts": [
        {
          "id": "google-1",
          "apiKey": "${GOOGLE_API_KEY_1}",
          "quota": {
            "limit": 15, // Free: 15 requests/day
            "reset": "daily",
            "resetAt": "2026-01-31T00:00:00Z"
          }
        },
        {
          "id": "google-2",
          "apiKey": "${GOOGLE_API_KEY_2}",
          "quota": { /* ... */ }
        },
        {
          "id": "google-3",
          "apiKey": "${GOOGLE_API_KEY_3}",
          "quota": { /* ... */ }
        }
      ],
      "loadBalancing": "round_robin",
      "models": {
        "gemini-2.5-flash": {
          "contextWindow": 1000000, // 1M tokens!
          "costPer1M": 0,
          "maxTokens": 8192,
          "preferenceScore": 70 // Massive context
        }
      }
    },

    "openai": {
      "enabled": true,
      "apiKey": "${OPENAI_API_KEY}",
      "models": {
        "gpt-4o": {
          "contextWindow": 128000,
          "costPer1M": 30, // $30/M
          "maxTokens": 16384,
          "preferenceScore": 80 // Best quality
        }
      },
      "quota": {
        "limit": 1000000000, // 1M tokens
        "reset": "monthly"
      }
    }
  },

  "preferences": {
    "default": "zai", // Start with Z.AI

    "taskPreferences": {
      "coding": ["openai", "anthropic", "zai", "kimi"],
      "reasoning": ["anthropic", "kimi", "openai", "google"],
      "creative": ["openai", "kimi", "zai"],
      "simple": ["google", "zai", "kimi"]
    },

    "qualityPreferences": {
      "max_speed": ["google", "zai", "kimi"],
      "max_quality": ["openai", "anthropic"],
      "max_context": ["google", "kimi", "anthropic"],
      "cost_first": ["kimi", "google", "zai", "anthropic", "openai"]
    },

    "budgetMode": "quality_first", // or "cost_first", "free_only"
    "autoSwitch": true,
    "switchOnLimit": true,
    "preserveContext": true
  }
}
```

---

## 🔄 Routing Algorithm

### Step-by-Step Decision Process

```typescript
async function routeRequest(request: UserRequest): Promise<RoutingDecision> {
  // 1. Analyze Request
  const taskAnalysis = await analyzeTask(request);

  // 2. Get All Eligible Providers
  const providers = getEligibleProviders(taskAnalysis);

  // 3. Score Each Provider
  const scored = providers.map(provider => ({
    provider,
    score: calculateScore(provider, taskAnalysis)
  }));

  // 4. Sort by Score
  scored.sort((a, b) => b.score - a.score);

  // 5. Select Best
  const selected = scored[0];

  // 6. Check if Safe to Switch
  if (!canSwitchSafely(selected.provider, taskAnalysis)) {
    // Stay with current provider
    return getCurrentDecision();
  }

  // 7. Return Decision
  return {
    provider: selected.provider,
    model: selected.model,
    reason: selected.reason,
    confidence: selected.score
  };
}

function calculateScore(provider: Provider, task: Task): number {
  let score = 0;

  // Preference weight: 40%
  score += provider.preferenceScore * 0.4;

  // Quota remaining weight: 30%
  score += (provider.quotaRemaining / provider.quotaLimit) * 30;

  // Context window weight: 15%
  if (provider.contextWindow >= task.estimatedTokens) {
    score += 15;
  } else {
    score -= 50; // Penalize insufficient context
  }

  // Cost weight: 10%
  score += (1 / provider.costPer1M) * 10 * 1000000;

  // Quality weight: 5%
  score += provider.qualityScore * 0.05;

  return score;
}
```

---

## 📈 Monitoring & Metrics

### Real-Time Tracking

```typescript
interface ProviderMetrics {
  [providerId: string]: {
    requests: {
      total: number;
      success: number;
      failed: number;
    };
    tokens: {
      used: number;
      remaining: number;
      limit: number;
    };
    cost: {
      spent: number;
      budget: number;
    };
    latency: {
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    };
    errors: {
      rateLimit: number;
      quotaExceeded: number;
      apiError: number;
    };
  };
}
```

### Dashboard Display

```
Provider Router Status
═════════════════════════════════════════════

Current Provider: Z.AI (glm-4.7)
Context: 12,345 / 128,000 tokens (9.6%)

Provider Status:
┌─────────────┬─────────┬───────────┬──────────┬────────┐
│ Provider    │ Active  │ Quota     │ Cost     │ Latency│
├─────────────┼─────────┼───────────┼──────────┼────────┤
│ Z.AI       │   ✅    │ 87% left  │    $?   │  850ms │
│ Kimi       │   ✅    │ 93% left  │   $0    │ 1200ms │
│ Google #1   │   ✅    │ 80% left  │   $0    │  600ms │
│ Google #2   │   ✅    │ 85% left  │   $0    │  650ms │
│ Google #3   │   ✅    │ 90% left  │   $0    │  700ms │
│ OpenAI     │   ❌    │ N/A       │   N/A    │  N/A   │
└─────────────┴─────────┴───────────┴──────────┴────────┘

Routing Decisions (last 24h):
- Z.AI → Google #1 (quota limit, 12:30)
- Google #2 → Google #3 (load balance, 14:15)
- Kimi → Z.AI (preference, 16:00)
- Z.AI → OpenAI (quality req, 18:45)
```

---

## 🛠️ CLI Commands

```bash
# Check current provider
openclaw provider status

# List all configured providers
openclaw provider list

# Set provider preference
openclaw provider set --task coding --preferred openai

# Check quotas
openclaw provider quota

# Manually switch provider
openclaw provider switch zai

# Reset to auto-routing
openclaw provider reset

# Show routing decisions
openclaw provider log
```

---

## 🔒 Security Considerations

1. **API Key Protection**: All keys stored encrypted
2. **Quota Tracking**: Prevent unauthorized usage
3. **Rate Limiting**: Respect provider limits
4. **Audit Logging**: Log all provider switches
5. **Fallback Safety**: Never leave system without provider

---

## 🎯 Implementation Priority

### Phase 1: Core Router (Week 1)
- [ ] Provider configuration schema
- [ ] Basic routing algorithm
- [ ] Manual provider switch command
- [ ] Quota tracking

### Phase 2: Auto-Switching (Week 2)
- [ ] Automatic failover on quota limit
- [ ] Preference-based selection
- [ ] Context-aware switching
- [ ] Multi-account pool

### Phase 3: Optimization (Week 3)
- [ ] Cost optimization mode
- [ ] Latency-based routing
- [ ] Predictive quota management
- [ ] Smart caching

### Phase 4: Dashboard (Week 4)
- [ ] Real-time metrics
- [ ] Routing visualization
- [ ] Cost breakdown
- [ ] Performance analytics

---

## 📝 Configuration Files

### ~/.openclaw/providers.json
Provider configuration and preferences

### ~/.openclaw/providers-log.json
Routing decisions and metrics history

### ~/.openclaw/provider-cache.json
Cached provider capabilities and status

---

## 🚀 Getting Started

### 1. Configure Providers
```bash
# Interactive setup
openclaw provider setup

# Or edit config directly
nano ~/.openclaw/providers.json
```

### 2. Set Preferences
```bash
# Set default preference
openclaw provider prefer zai

# Set per-task preferences
openclaw provider prefer --task coding openai
openclaw provider prefer --task reasoning anthropic
```

### 3. Enable Auto-Routing
```bash
openclaw config set provider.auto_routing true
openclaw config set provider.switch_on_limit true
```

### 4. Monitor
```bash
# Real-time status
openclaw provider monitor
```

---

## 💡 Use Cases

### Use Case 1: Free Tier Maximization
```json
{
  "budgetMode": "free_only",
  "preferences": {
    "default": ["google", "kimi", "zai"]
  },
  "autoSwitch": true
}
```
**Result:** Always uses free providers, rotates when quota exhausted

### Use Case 2: Quality First
```json
{
  "budgetMode": "quality_first",
  "preferences": {
    "reasoning": ["openai", "anthropic"]
  }
}
```
**Result:** Best quality providers for complex reasoning tasks

### Use Case 3: Cost Optimized
```json
{
  "budgetMode": "cost_first",
  "preferences": {
    "simple": ["google", "kimi", "zai"],
    "coding": ["zai", "google"]
  }
}
```
**Result:** Minimize cost while maintaining acceptable quality

### Use Case 4: Multi-Account Load Balancing
```json
{
  "google": {
    "accounts": ["google-1", "google-2", "google-3", "google-4", "google-5"],
    "loadBalancing": "round_robin"
  }
}
```
**Result:** Distribute load across 5 Google accounts for maximum free quota

---

## 🎯 Success Metrics

- **Switch Accuracy**: >95% correct routing decisions
- **Failover Time**: <100ms on quota limit
- **Cost Reduction**: >30% with cost optimization
- **Availability**: >99.9% (always have fallback)
- **Latency Impact**: <10% overhead vs direct provider

---

## 📚 References

- OpenAI API: https://platform.openai.com/docs/api-reference
- Anthropic API: https://docs.anthropic.com/
- Google AI: https://ai.google.dev/docs
- Kimi/Moonshot: https://platform.moonshot.cn/docs

---

*This is the comprehensive design for the LLM Provider Router system.* 🧬
