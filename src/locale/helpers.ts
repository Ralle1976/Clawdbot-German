/**
 * i18n Helper Functions
 */

import type { I18n } from './index.js';

/**
 * Get language from environment variable or system locale
 */
export function getLanguageFromEnv(): string {
  const envLang = process.env.OPENCLAW_LANGUAGE || process.env.LANGUAGE || process.env.LANG;
  if (envLang) {
    const lang = envLang.split('.')[0].split('_')[0];
    return lang.toLowerCase();
  }
  return 'en';
}

/**
 * Detect preferred language from system settings
 */
export function detectLanguage(): 'en' | 'de' {
  const detected = getLanguageFromEnv();
  return (detected === 'de' || detected.startsWith('de')) ? 'de' : 'en';
}

/**
 * Format translation with parameters (shorthand)
 */
export function t(i18n: I18n, key: string, params?: Record<string, any>): string {
  return i18n.t(key, params);
}

/**
 * Create a translation hook for components
 */
export function useI18n(i18n: I18n) {
  return {
    t: (key: string, params?: Record<string, any>) => i18n.t(key, params),
    language: i18n.getLanguage(),
    setLanguage: (lang: 'en' | 'de') => i18n.setLanguage(lang),
    has: (key: string) => i18n.has(key),
    getAvailableLanguages: () => i18n.getAvailableLanguages(),
  };
}

/**
 * Validate translation keys across all languages
 */
export function validateTranslations(
  translations: Record<string, Record<string, any>>
): string[] {
  const errors: string[] = [];
  const languages = Object.keys(translations);
  const baseKeys = getAllKeys(translations['en']);

  for (const lang of languages) {
    if (lang === 'en') continue;

    const langKeys = getAllKeys(translations[lang]);
    const missing = baseKeys.filter(k => !langKeys.includes(k));
    const extra = langKeys.filter(k => !baseKeys.includes(k));

    if (missing.length > 0) {
      errors.push(`${lang}: Missing translations for: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }

    if (extra.length > 0) {
      errors.push(`${lang}: Extra translations not in English: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}`);
    }
  }

  return errors;
}

/**
 * Get all translation keys (flattened)
 */
function getAllKeys(obj: Record<string, any>, prefix: string = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Merge additional translations into existing ones
 */
export function mergeTranslations(
  base: Record<string, any>,
  additional: Record<string, any>
): Record<string, any> {
  const result = { ...base };

  for (const key of Object.keys(additional)) {
    if (typeof result[key] === 'object' && typeof additional[key] === 'object') {
      result[key] = mergeTranslations(result[key], additional[key]);
    } else {
      result[key] = additional[key];
    }
  }

  return result;
}
