/**
 * German Translations
 */

import type { TranslationMessages } from './index.js';

export const de: TranslationMessages = {
  common: {
    hello: 'Hallo',
    goodbye: 'Auf Wiedersehen',
    error: 'Fehler',
    success: 'Erfolg',
    warning: 'Warnung',
    info: 'Information',
  },
  cli: {
    help: 'Verwendung: openclaw [Befehl] [Optionen]',
    usage: 'Verwendung: {{command}}',
    version: 'OpenClaw Version {{version}}',
    error: 'Fehler: {{message}}',
  },
  gateway: {
    server: {
      starting: 'Starte OpenClaw Gateway...',
      started: 'OpenClaw Gateway läuft auf Port {{port}}',
      stopped: 'OpenClaw Gateway gestoppt',
      error: 'Gateway-Fehler: {{message}}',
    },
    auth: {
      required: 'Authentifizierung erforderlich',
      invalid: 'Ungültiges Authentifizierungs-Token',
      expired: 'Authentifizierungs-Token abgelaufen',
    },
  },
  discord: {
    ready: 'Bereit! Eingeloggt als {{user}}',
    reconnecting: 'Verbinde erneut mit Discord...',
    error: 'Discord-Fehler: {{message}}',
  },
  agents: {
    system: {
      welcome: 'Hallo! Ich bin OpenClaw, dein KI-Assistent.',
      processing: 'Verarbeite deine Anfrage...',
      completed: 'Erfolgreich abgeschlossen',
      error: 'Ein Fehler ist aufgetreten: {{message}}',
    },
  },
};
