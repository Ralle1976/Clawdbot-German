# Simple Web Search Tool - Einfaches Web-Suche-Tool

## Benutzung

### Suche im Web (DuckDuckGo - KEIN API Key!)
```bash
node scripts/simple-web-search.js "Dein Suchbegriff"
```

### Webseite lesen
```bash
node scripts/simple-web-search.js --url "https://beispiel.de"
```

### Beispiele für Provider-Recherche

#### Qwen Pricing & Free-Tier:
```bash
node scripts/simple-web-search.js "Qwen API pricing tokens 2025"
node scripts/simple-web-search.js "Qwen free tier unlimited tokens 2025"
node scripts/simple-web-search.js "Qwen 1000 requests per day pricing"
node scripts/simple-web-search.js "Qwen DashScope API cost"
```

#### DeepSeek Free-Tier:
```bash
node scripts/simple-web-search.js "DeepSeek API pricing 2025 free tier"
node scripts/simple-web-search.js "DeepSeek unlimited requests per day"
node scripts/simple-web-search.js "DeepSeek API documentation"
```

#### Groq Free-Tier:
```bash
node scripts/simple-web-search.js "Groq API pricing free tier 2025"
node scripts/simple-web-search.js "Groq 30 requests per minute"
```

#### Gwen-Free-Tier (falls es existiert):
```bash
node scripts/simple-web-search.js "Gwen-Free-Tier API pricing"
node scripts/simple-web-search.js "Gwen-Free-Tier free tier unlimited"
node scripts/simple-web-search.js "Gwen AI Claude alternative free"
```

---

## Ausgabe

Das Tool speichert alle Ergebnisse in:
- `search/results.md` - Suchergebnisse
- `search/pages.md` - Webseiten-Inhalte

---

## Features

- DuckDuckGo Suche (KEIN API Key!)
- Webseiten lesen
- Preis-Informationen finden
- Free-Tier-Informationen finden
- Offizielle Dokumentation lesen
- API-Informationen finden

---

## Beispiele

### Beispiel 1: Qwen Pricing suchen
```bash
node scripts/simple-web-search.js "Qwen API pricing tokens 2025"
```

### Beispiel 2: Offizielle Dokumentation lesen
```bash
node scripts/simple-web-search.js --url "https://tongyi.aliyun.com/"
```

### Beispiel 3: DeepSeek Free-Tier
```bash
node scripts/simple-web-search.js "DeepSeek API pricing free tier unlimited"
```

---

**Einfach zu benutzen, KEIN API Key!**
