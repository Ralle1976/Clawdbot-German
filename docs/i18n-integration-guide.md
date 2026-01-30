# i18n Integration Guide for OpenClaw-German

This guide helps developers integrate the i18n system into OpenClaw-German code.

## Quick Start

### Step 1: Import the i18n system

```typescript
import { getI18n } from "../locale/index.js";
```

### Step 2: Get the i18n instance

```typescript
const i18n = getI18n();
```

### Step 3: Use translations

```typescript
// Simple translation
console.log(i18n.t("common.hello"));

// With parameters
console.log(i18n.t("cli.version", { version: "1.0.0" }));
```

---

## CLI Command Integration

### Example: Integrating a CLI Command

**Before (hardcoded strings):**
```typescript
export function registerMyCommand(program: Command) {
  program
    .command("mycommand")
    .description("This is my command")
    .action(() => {
      console.log("Hello, user!");
      console.log("Processing...");
    });
}
```

**After (with i18n):**
```typescript
import { getI18n } from "../locale/index.js";

export function registerMyCommand(program: Command) {
  const i18n = getI18n();

  program
    .command("mycommand")
    .description(i18n.t("cli.commands.mycommand"))
    .action(() => {
      console.log(i18n.t("agents.system.welcome"));
      console.log(i18n.t("common.processing"));
    });
}
```

---

## Adding New Translation Keys

### Step 1: Add to en.ts

```typescript
export const en: TranslationMessages = {
  // ... existing keys
  mymodule: {
    newFeature: "This is a new feature",
    success: "Operation completed successfully",
    error: "Operation failed: {{message}}",
  },
};
```

### Step 2: Add to de.ts

```typescript
export const de: TranslationMessages = {
  // ... existing keys
  mymodule: {
    newFeature: "Dies ist ein neues Feature",
    success: "Vorgang erfolgreich abgeschlossen",
    error: "Vorgang fehlgeschlagen: {{message}}",
  },
};
```

### Step 3: Use in code

```typescript
const i18n = getI18n();
console.log(i18n.t("mymodule.newFeature"));
console.log(i18n.t("mymodule.error", { message: "File not found" }));
```

---

## Translation Key Naming Convention

Follow this pattern for consistency:

```
<module>.<category>.<specific>

Examples:
cli.gateway.starting
discord.messages.commandError
agents.system.welcome
common.loading
```

### Module Prefixes

- `common` - General UI strings (buttons, status, etc.)
- `cli` - CLI commands and messages
- `gateway` - Gateway daemon messages
- `discord` - Discord bot messages
- `agents` - Agent system messages
- `browser` - Browser control messages
- `nodes` - Node management messages
- `cron` - Cron job messages
- `webhooks` - Webhook messages
- `plugins` - Plugin messages
- `skills` - Skill messages
- `security` - Security messages
- `docs` - Documentation messages
- `system` - System messages

---

## Using Parameters

### Define with parameters

```typescript
// en.ts
export const en: TranslationMessages = {
  cli: {
    file: {
      notFound: "File not found: {{path}}",
      created: "Created file: {{name}} ({{size}} bytes)",
    },
  },
};
```

```typescript
// de.ts
export const de: TranslationMessages = {
  cli: {
    file: {
      notFound: "Datei nicht gefunden: {{path}}",
      created: "Datei erstellt: {{name}} ({{size}} Bytes)",
    },
  },
};
```

### Use with parameters

```typescript
const i18n = getI18n();

console.log(i18n.t("cli.file.notFound", { path: "/tmp/test.txt" }));
// Output: "File not found: /tmp/test.txt" or "Datei nicht gefunden: /tmp/test.txt"

console.log(i18n.t("cli.file.created", { name: "test.txt", size: 1024 }));
// Output: "Created file: test.txt (1024 bytes)" or "Datei erstellt: test.txt (1024 Bytes)"
```

---

## Common Integration Patterns

### 1. Command Description

```typescript
program
  .command("status")
  .description(i18n.t("cli.commands.status"))
```

### 2. Help Text

```typescript
.addHelpText(
  "after",
  () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/status")}\n`,
)
```

### 3. Success Messages

```typescript
console.log(theme.success(i18n.t("cli.success.configSaved")));
```

### 4. Error Messages

```typescript
console.error(theme.error(i18n.t("cli.errors.configNotFound")));
```

### 5. Status Messages

```typescript
console.log(theme.info(i18n.t("gateway.server.starting")));
```

---

## Conditional Translations

### Language-specific logic

```typescript
const i18n = getI18n();
const lang = i18n.getLanguage();

if (lang === "de") {
  // German-specific formatting
  console.log(formatGermanDate(date));
} else {
  // English formatting
  console.log(formatEnglishDate(date));
}
```

### Pluralization (manual)

```typescript
const count = items.length;
const i18n = getI18n();

let message;
if (count === 1) {
  message = i18n.t("common.item.single");
} else {
  message = i18n.t("common.item.multiple", { count });
}
```

---

## Testing i18n Integration

### Test Both Languages

```bash
# Test in English
openclaw language en
openclaw mycommand

# Test in German
openclaw language de
openclaw mycommand
```

### Validation

```typescript
import { validateTranslations } from "../locale/helpers.js";
import { en, de } from "../locale/index.js";

const errors = validateTranslations({ en, de });
if (errors.length > 0) {
  console.error("Translation errors:");
  errors.forEach(err => console.error(err));
} else {
  console.log("All translations valid!");
}
```

---

## Checklist for i18n Integration

When adding or modifying code with user-facing strings:

- [ ] Import `getI18n` from `../locale/index.js`
- [ ] Add English translation to `en.ts`
- [ ] Add German translation to `de.ts`
- [ ] Replace hardcoded strings with `i18n.t()` calls
- [ ] Test in English: `openclaw language en && openclaw <command>`
- [ ] Test in German: `openclaw language de && openclaw <command>`
- [ ] Run validation: `validateTranslations({ en, de })`
- [ ] Update documentation if needed

---

## Common Mistakes to Avoid

### ❌ Don't hardcode strings

```typescript
// Bad
console.log("Error: File not found");

// Good
console.log(i18n.t("cli.errors.fileNotFound"));
```

### ❌ Don't add keys to only one language

```typescript
// Bad
// en.ts
export const en: TranslationMessages = {
  mymodule: {
    newFeature: "This is new",
  },
};

// de.ts - Missing!
export const de: TranslationMessages = {};

// Good - Always add to both
// en.ts and de.ts
```

### ❌ Don't use inconsistent key naming

```typescript
// Bad
"message1": "Hello",
"msg_2": "Goodbye",
"msgThree": "Error"

// Good
"messages.hello": "Hello",
"messages.goodbye": "Goodbye",
"messages.error": "Error"
```

### ❌ Don't forget parameters

```typescript
// Bad
console.log("File: " + filePath); // Not translatable

// Good
console.log(i18n.t("common.file", { path: filePath }));
```

---

## Examples from the Codebase

### Example 1: docs-cli.ts

```typescript
import { getI18n } from "../locale/index.js";

export function registerDocsCli(program: Command) {
  const i18n = getI18n();

  program
    .command("docs")
    .description(i18n.t("cli.commands.docs"))
    .argument("[query...]", "Search query")
    .action(async (queryParts: string[]) => {
      // ...
    });
}
```

### Example 2: system-cli.ts

```typescript
import { getI18n } from "../locale/index.js";

export function registerSystemCli(program: Command) {
  const i18n = getI18n();

  const system = program
    .command("system")
    .description(i18n.t("cli.commands.system"));

  // ... subcommands
}
```

### Example 3: banner.ts

```typescript
import { getI18n } from "../locale/index.js";

export function formatCliBannerLine(version: string, options: BannerOptions = {}): string {
  const i18n = getI18n();
  const title = i18n.t("cli.banner.title");
  // ...
}
```

---

## Getting Help

- Read the main i18n guide: [I18N.md](../I18N.md)
- Check existing translations in: `src/locale/en.ts` and `src/locale/de.ts`
- See completed integrations in: `src/cli/language-cli.ts`, `src/cli/docs-cli.ts`, `src/cli/system-cli.ts`
- Run validation: `validateTranslations({ en, de })`

---

## Contributing

When contributing translations:

1. Follow the naming conventions
2. Add to both en.ts and de.ts
3. Test both languages
4. Run validation
5. Update this guide if adding new patterns

Happy translating! 🌐
