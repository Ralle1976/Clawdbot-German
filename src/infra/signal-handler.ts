/**
 * Process Signal Handler for Security Hardening
 * Implements proper signal handling for SIGTERM, SIGINT, SIGHUP
 * Prevents approval workflow bypass via SIGKILL
 */

const fs = from "node:fs/promises";

// Track active child processes
const activeProcesses = new Set<ChildProcess>();

// Track pending approvals
interface ApprovalState {
  sessionId: string;
  action: string;
  startTime: number;
  expiresAt: number;
  command: string;
}
const pendingApprovals = new Map<string, ApprovalState>();

// State file paths
const APPROVAL_STATE_FILE = '/tmp/clawdbot-approvals.json';
const EXEC_STATE_FILE = '/tmp/clawdbot-state.json';

/**
 * Cleanup function called on any signal
 */
async function cleanup(signal: string): Promise<void> {
  console.error(`\n🛑 Received ${signal}. Cleaning up...\n`);

  try {
    // 1. Kill all active child processes gracefully
    let killed = 0;
    for (const proc of activeProcesses) {
      try {
        proc.kill('SIGTERM');
        killed++;
      } catch (e) {
        // Process might already be dead
        console.error(`Error sending SIGTERM: ${(e as Error).message}`);
      }
    }

    if (killed > 0) {
      console.error(`✓ Sent SIGTERM to ${killed} active processes`);
      // Give processes 5 seconds to clean up
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Force kill any remaining
      for (const proc of activeProcesses) {
        if (!proc.killed) {
          try {
            proc.kill('SIGKILL');
          } catch (e) {
            // Ignore
          }
        }
      }
      console.error(`✓ Force-killed ${activeProcesses.size} remaining processes`);
    }

    // 2. Clear pending approvals
    const pendingCount = pendingApprovals.size;
    pendingApprovals.clear();
    if (pendingCount > 0) {
      console.error(`✓ Cleared ${pendingCount} pending approval(s)`);
    }

    // 3. Save state for recovery
    await saveCurrentState(signal);

    console.error('\n✓ Cleanup complete. Exiting.\n');

  } catch (e) {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  }
}

/**
 * Save current execution state for recovery
 */
async function saveCurrentState(trigger: string): Promise<void> {
  try {
    const state = {
      timestamp: new Date().toISOString(),
      trigger,
      pendingApprovals: Array.from(pendingApprovals.values()),
      activeProcesses: activeProcesses.size,
      version: '1.0'
    };

    await fs.writeFile(EXEC_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    // State file might not be writable, but don't fail cleanup
    console.error('Warning: Could not save state:', (e as Error).message);
  }
}

/**
 * Register signal handlers
 */
export function registerSignalHandlers(): void {
  // Handle SIGTERM (kill command)
  process.on('SIGTERM', async () => {
    await cleanup('SIGTERM');
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    await cleanup('SIGINT');
    process.exit(130); // Standard exit code for SIGINT
  });

  // Handle SIGHUP (terminal closed)
  process.on('SIGHUP', async () => {
    await cleanup('SIGHUP');
    process.exit(0);
  });
}

/**
 * Register uncaught exception handlers
 */
export function registerExceptionHandlers(): void {
  process.on('uncaughtException', async (err: Error) => {
    console.error('\n💥 UNCAUGHT EXCEPTION:');
    console.error(err.stack);
    await cleanup('uncaughtException');
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
    console.error('\n💥 UNHANDLED REJECTION:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    await cleanup('unhandledRejection');
    process.exit(1);
  });
}

/**
 * Register approval state for tracking
 */
export function registerApprovalState(state: ApprovalState): void {
  const id = state.sessionId;
  pendingApprovals.set(id, state);

  // Persist to disk
  saveApprovalState();
}

/**
 * Remove approval state
 */
export function unregisterApprovalState(sessionId: string): void {
  pendingApprovals.delete(sessionId);
  saveApprovalState();
}

/**
 * Save approval state to disk
 */
function saveApprovalState(): void {
  try {
    const states = Array.from(pendingApprovals.values());
    fs.writeFileSync(APPROVAL_STATE_FILE, JSON.stringify(states, null, 2));
  } catch (e) {
    console.error('Warning: Could not save approval state:', (e as Error).message);
  }
}

/**
 * Restore approval state on startup
 */
export async function restoreApprovalState(): Promise<void> {
  try {
    const data = await fs.readFile(APPROVAL_STATE_FILE, 'utf-8');
    const states = JSON.parse(data) as ApprovalState[];
    const now = Date.now();

    let restored = 0;
    for (const state of states) {
      // Only restore non-expired approvals (max 10 minutes)
      if (state.expiresAt > now && (now - state.startTime) < 600000) {
        pendingApprovals.set(state.sessionId, state);
        restored++;
      }
    }

    if (restored > 0) {
      console.log(`✓ Restored ${restored} approval state(s) from disk`);
    }

    // Clean up state file
    await fs.unlink(APPROVAL_STATE_FILE);

  } catch (e) {
    // No existing state, that's fine
    // console.log('No previous approval state found');
  }
}

/**
 * Register a child process for cleanup tracking
 */
export function registerProcess(proc: ChildProcess): void {
  activeProcesses.add(proc);

  // Remove from tracking when done
  proc.on('exit', () => {
    activeProcesses.delete(proc);
  });

  proc.on('error', () => {
    activeProcesses.delete(proc);
  });
}

/**
 * Get number of active processes
 */
export function getActiveProcessCount(): number {
  return activeProcesses.size;
}

/**
 * Get pending approval count
 */
export function getPendingApprovalCount(): number {
  return pendingApprovals.size;
}

// Export cleanup function for direct use
export { cleanup };

// Initialize handlers on import
registerSignalHandlers();
registerExceptionHandlers();
console.log('✓ Signal handlers registered (SIGTERM, SIGINT, SIGHUP)');
console.log('✓ Exception handlers registered (uncaughtException, unhandledRejection)');
