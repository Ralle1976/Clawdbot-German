/**
 * OpenClaw Internationalization (i18n) System
 * Support for multiple languages with English as default
 */

export type Language = 'en' | 'de';

export interface I18nParams {
  [key: string]: string | number | boolean;
}

/**
 * Core i18n interface
 */
export interface I18n {
  /**
   * Get translated string by key
   * @param key - Translation key (e.g., 'cli.help.usage')
   * @param params - Optional parameters for interpolation
   * @returns Translated string
   */
  t(key: string, params?: I18nParams): string;

  /**
   * Set current language
   * @param lang - Language code
   */
  setLanguage(lang: Language): void;

  /**
   * Get current language
   * @returns Current language code
   */
  getLanguage(): Language;

  /**
   * Check if translation key exists
   * @param key - Translation key
   * @returns True if key exists
   */
  has(key: string): boolean;

  /**
   * Get all available languages
   * @returns Array of available language codes
   */
  getAvailableLanguages(): Language[];
}

/**
 * Translation messages structure
 */
export interface TranslationMessages {
  common?: {
    hello?: string;
    goodbye?: string;
    error?: string;
    success?: string;
    warning?: string;
    info?: string;
  };
  cli?: {
    help?: string;
    usage?: string;
    version?: string;
    error?: string;
  };
  gateway?: {
    server?: {
      starting?: string;
      started?: string;
      stopped?: string;
      error?: string;
    };
    auth?: {
      required?: string;
      invalid?: string;
      expired?: string;
    };
  };
  discord?: {
    ready?: string;
    reconnecting?: string;
    error?: string;
  };
  agents?: {
    system?: {
      welcome?: string;
      processing?: string;
      completed?: string;
      error?: string;
    };
  };
  [key: string]: any;
}

// This will be populated by the translations
let currentLanguage: Language = 'en';
let translations: Record<Language, TranslationMessages> = {} as any;

/**
 * Get a translated string by key
 */
function getTranslation(key: string, params?: I18nParams): string {
  const keys = key.split('.');
  let value: any = translations[currentLanguage];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English if translation not found
      value = translations['en'];
      for (const k2 of keys) {
        value = value?.[k2];
        if (value === undefined) {
          return key; // Return key if not found
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Interpolate parameters
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return String(params[param] ?? match);
    });
  }

  return value;
}

/**
 * Create i18n instance
 */
export function createI18n(initialTranslations: Record<Language, TranslationMessages>): I18n {
  translations = initialTranslations;

  return {
    t(key: string, params?: I18nParams): string {
      return getTranslation(key, params);
    },
    setLanguage(lang: Language): void {
      if (translations[lang]) {
        currentLanguage = lang;
      } else {
        console.warn(`Language "${lang}" not available, falling back to "en"`);
        currentLanguage = 'en';
      }
    },
    getLanguage(): Language {
      return currentLanguage;
    },
    has(key: string): boolean {
      const keys = key.split('.');
      let value = translations[currentLanguage];
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          return false;
        }
      }
      return typeof value === 'string';
    },
    getAvailableLanguages(): Language[] {
      return Object.keys(translations) as Language[];
    }
  };
}

/**
 * Default i18n instance (will be initialized with translations)
 */
let i18nInstance: I18n | null = null;

export function initI18n(translations: Record<Language, TranslationMessages>): I18n {
  i18nInstance = createI18n(translations);
  return i18nInstance;
}

export function getI18n(): I18n {
  if (!i18nInstance) {
    throw new Error('i18n not initialized. Call initI18n() first.');
  }
  return i18nInstance;
}
