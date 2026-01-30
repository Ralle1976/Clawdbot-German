# Fix for Issue #4980 - SIGKILL Security Vulnerability

## Problem
Interactive CLI flows can be SIGKILL'd in agent exec, bypassing approval workflows.

## Impact
- **Security**: Users can kill CLI flows mid-execution, potentially leaving system in inconsistent state
- **Safety**: Approval workflows can be bypassed
- **Reliability**: Unexpected termination of critical operations (e.g., gh auth login)

## Solution

### Signal Handler Implementation

Add proper signal handlers to bash-tools.exec.js:

```typescript
// Track active child processes
const activeProcesses = new Set<ChildProcess>();

// Track pending approvals
const pendingApprovals = new Map<string, ApprovalState>();

// Cleanup function
function cleanup(signal: string) {
  console.error(`\nReceived ${signal}. Cleaning up...`);

  // 1. Kill all active child processes
  for (const proc of activeProcesses) {
    try {
      proc.kill('SIGTERM');
      // Give 5 seconds to clean up
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    } catch (e) {
      console.error('Error killing process:', e);
    }
  }

  // 2. Clear pending approvals
  pendingApprovals.clear();

  // 3. Save state if needed
  saveCurrentState();

  console.error('Cleanup complete.');
}

// Add signal handlers
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGHUP', () => cleanup('SIGHUP'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  cleanup('uncaughtException');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  cleanup('unhandledRejection');
  process.exit(1);
});

// Modified spawn function
function spawnWithCleanup(
  command: string,
  args: string[],
  options: SpawnOptions
): ChildProcess {
  const child = spawn(command, args, {
    ...options,
    detached: false,  // Keep control over process
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Track for cleanup
  activeProcesses.add(child);

  // Remove from tracking when done
  child.on('exit', () => {
    activeProcesses.delete(child);
  });

  child.on('error', () => {
    activeProcesses.delete(child);
  });

  return child;
}
```

### Approval State Management

```typescript
interface ApprovalState {
  sessionId: string;
  action: string;
  startTime: number;
  expiresAt: number;
}

// Save approval state to persistent storage
function saveApprovalState(state: ApprovalState) {
  pendingApprovals.set(state.sessionId, state);
  // Persist to disk for recovery
  fs.writeFileSync(
    '/tmp/clawdbot-approvals.json',
    JSON.stringify([...pendingApprovals.values()])
  );
}

// Restore approval state on startup
function restoreApprovalState() {
  try {
    const data = fs.readFileSync('/tmp/clawdbot-approvals.json', 'utf-8');
    const states = JSON.parse(data) as ApprovalState[];
    const now = Date.now();

    for (const state of states) {
      // Only restore non-expired approvals
      if (state.expiresAt > now) {
        pendingApprovals.set(state.sessionId, state);
      }
    }
  } catch (e) {
    // No existing state, that's fine
  }
}

// Save current execution state
function saveCurrentState() {
  // Save any critical state that needs recovery
  const state = {
    timestamp: Date.now(),
    pendingApprovals: [...pendingApprovals.values()],
    activeProcesses: activeProcesses.size
  };
  fs.writeFileSync(
    '/tmp/clawdbot-state.json',
    JSON.stringify(state, null, 2)
  );
}
```

## Testing

### Test 1: SIGINT (Ctrl+C) During Approval
```bash
# Start a flow that requires approval
clawdbot exec --approval-required

# While waiting for approval, press Ctrl+C
# Expected: Clean shutdown, no zombie processes
```

### Test 2: SIGTERM From External
```bash
# Start CLI in background
clawdbot agent --mode rpc &
PID=$!

# Send SIGTERM
kill -SIGTERM $PID

# Expected: Clean shutdown
```

### Test 3: Approval State Recovery
```bash
# Start approval-required command
clawdbot exec --approval-required

# Kill during approval
killall clawdbot

# Restart - should not have orphaned approvals
clawdbot --help
```

## Additional Security Considerations

1. **Approval Timeout**: Auto-reject approvals after N minutes
2. **Approval Limits**: Max N approvals per session
3. **Audit Logging**: Log all approval state changes
4. **Secure Storage**: Encrypt approval state on disk

## Implementation Priority

1. Add signal handlers (HIGH)
2. Implement process tracking (HIGH)
3. Add approval state persistence (MEDIUM)
4. Add security logging (MEDIUM)
5. Implement approval timeout (LOW)

## Estimated Effort

- Implementation: 2-3 hours
- Testing: 1 hour
- Documentation: 30 minutes

**Total: ~4 hours**

---

*This fix will be implemented as a PR to the fork repository.*
