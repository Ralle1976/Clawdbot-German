/**
 * English Translations
 */

import type { TranslationMessages } from './index.js';

export const en: TranslationMessages = {
  common: {
    hello: 'Hello',
    goodbye: 'Goodbye',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },
  cli: {
    help: 'Usage: openclaw [command] [options]',
    usage: 'Usage: {{command}}',
    version: 'OpenClaw version {{version}}',
    error: 'Error: {{message}}',
  },
  gateway: {
    server: {
      starting: 'Starting OpenClaw Gateway...',
      started: 'OpenClaw Gateway is running on port {{port}}',
      stopped: 'OpenClaw Gateway stopped',
      error: 'Gateway error: {{message}}',
    },
    auth: {
      required: 'Authentication required',
      invalid: 'Invalid authentication token',
      expired: 'Authentication token expired',
    },
  },
  discord: {
    ready: 'Ready! Logged in as {{user}}',
    reconnecting: 'Reconnecting to Discord...',
    error: 'Discord error: {{message}}',
  },
  agents: {
    system: {
      welcome: 'Hello! I am OpenClaw, your AI assistant.',
      processing: 'Processing your request...',
      completed: 'Completed successfully',
      error: 'An error occurred: {{message}}',
    },
  },
};
