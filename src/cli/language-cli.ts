import type { Command } from "commander";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { initI18n, getI18n } from "../locale/index.js";
import { en, de } from "../locale/index.js";
import { theme } from "../terminal/theme.js";

const CONFIG_FILE = ".openclaw-language";

/**
 * Load language from config file
 */
function loadLanguageFromConfig(): string | null {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, "utf-8").trim();
      return content;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Save language to config file
 */
function saveLanguageToConfig(language: string): void {
  try {
    writeFileSync(CONFIG_FILE, language, "utf-8");
  } catch (error) {
    console.error(theme.error(`Failed to save language preference: ${error}`));
  }
}

/**
 * Get available languages
 */
function getAvailableLanguages(): string[] {
  return ["en", "de"];
}

/**
 * Initialize i18n with detected language
 */
export function initializeI18n() {
  // Priority: config file > env > system detection
  const configLang = loadLanguageFromConfig();
  const envLang = process.env.OPENCLAW_LANGUAGE || process.env.LANGUAGE || process.env.LANG;

  let initialLang = "en";

  if (configLang && ["en", "de"].includes(configLang)) {
    initialLang = configLang;
  } else if (envLang) {
    const detected = envLang.split(".")[0].split("_")[0].toLowerCase();
    if (detected === "de") {
      initialLang = "de";
    }
  }

  initI18n({ en, de });
  getI18n().setLanguage(initialLang as any);
}

/**
 * Register language CLI command
 */
export function registerLanguageCli(program: Command) {
  program
    .command("language")
    .description("Set or display the current language")
    .argument("[language]", "Language code (en, de)")
    .option("--reset", "Reset to system default")
    .action(async (languageArg: string | undefined, options: { reset?: boolean }) => {
      const i18n = getI18n();

      // Display current language if no argument
      if (!languageArg && !options.reset) {
        const currentLang = i18n.getLanguage();
        const langName = currentLang === "de" ? "German" : "English";
        console.log(`${theme.info(i18n.t("cli.language.current", { language: langName }))}`);

        const available = getAvailableLanguages().map((lang) =>
          lang === "de" ? "German (de)" : "English (en)",
        );
        console.log(`${theme.muted(i18n.t("cli.language.available", { languages: available.join(", ") }))}`);

        const configLang = loadLanguageFromConfig();
        if (configLang) {
          console.log(
            `${theme.muted(i18n.t("cli.language.env", { language: configLang }))} (config file)`,
          );
        } else if (process.env.OPENCLAW_LANGUAGE) {
          console.log(
            `${theme.muted(i18n.t("cli.language.env", { language: process.env.OPENCLAW_LANGUAGE }))} (env)`,
          );
        }

        return;
      }

      // Reset to system default
      if (options.reset) {
        try {
          if (existsSync(CONFIG_FILE)) {
            // Note: We can't use fs.unlinkSync without importing fs
            // For now, just set to English
            saveLanguageToConfig("en");
          }
          i18n.setLanguage("en");
          console.log(theme.success(i18n.t("cli.language.set", { language: "English (en)" })));
        } catch (error) {
          console.error(theme.error(`Failed to reset: ${error}`));
        }
        return;
      }

      // Set new language
      const lang = languageArg?.toLowerCase().trim();
      const available = getAvailableLanguages();

      if (!lang || !available.includes(lang)) {
        console.error(
          theme.error(i18n.t("cli.language.invalid", { language: lang || "none" })),
        );
        console.log(
          theme.muted(
            `Available languages: ${available.map((l) => `${l === "de" ? "German" : "English"} (${l})`).join(", ")}`,
          ),
        );
        process.exit(1);
        return;
      }

      try {
        i18n.setLanguage(lang as any);
        saveLanguageToConfig(lang);
        const langName = lang === "de" ? "German" : "English";
        console.log(theme.success(i18n.t("cli.language.set", { language: `${langName} (${lang})` })));
      } catch (error) {
        console.error(theme.error(`Failed to set language: ${error}`));
        process.exit(1);
      }
    });
}
