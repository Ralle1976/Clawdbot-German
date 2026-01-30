# 🦞 OpenClaw — Persönlicher KI-Assistent (Deutsch)

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text-dark.png">
        <img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text.png" alt="OpenClaw" width="500">
    </picture>
</p>

<p align="center">
  <strong>EXFOLIATE! EXFOLIATE!</strong>
</p>

<p align="center">
  <a href="https://github.com/Ralle1976/Clawdbot-German/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/Ralle1976/Clawdbot-German/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/Ralle1976/Clawdbot-German/releases"><img src="https://img.shields.io/github/v/release/Ralle1976/Clawdbot-German?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**OpenClaw-German** ist ein *persönlicher KI-Assistent*, den du auf deinen eigenen Geräten ausführst.
Er antwortet dir über die Kanäle, die du bereits verwendest (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Microsoft Teams, WebChat) sowie über Erweiterungskanäle wie BlueBubbles, Matrix, Zalo und Zalo Personal. Er kann auf macOS/iOS/Android sprechen und zuhören und ein Live Canvas rendern, das du steuerst. Das Gateway ist nur die Kontrollebene — das Produkt ist der Assistent.

Wenn du einen persönlichen, einzelnen Assistenten möchtest, der sich lokal, schnell und immer verfügbar anfühlt, ist dies die Lösung.

[Website](https://openclaw.ai) · [Dokumentation](https://docs.openclaw.ai) · [DeepWiki](https://deepwiki.com/openclaw/openclaw) · [Erste Schritte](https://docs.openclaw.ai/start/getting-started) · [Aktualisieren](https://docs.openclaw.ai/install/updating) · [Vorführungen](https://docs.openclaw.ai/start/showcase) · [FAQ](https://docs.openclaw.ai/start/faq) · [Einrichtungsassistent](https://docs.openclaw.ai/start/wizard) · [Nix](https://github.com/openclaw/nix-clawdbot) · [Docker](https://docs.openclaw.ai/install/docker) · [Discord](https://discord.gg/clawd)

**Empfohlene Einrichtung:** Führe den Einrichtungsassistenten aus (`openclaw language de` für Deutsch, dann `openclaw onboard`). Er führt dich durch Gateway, Workspace, Kanäle und Skills. Der CLI-Assistent ist der empfohlene Weg und funktioniert unter **macOS, Linux und Windows (über WSL2; dringend empfohlen)**.
Funktioniert mit npm, pnpm oder bun.
Neuinstallation? Beginne hier: [Erste Schritte](https://docs.openclaw.ai/start/getting-started)

**Abonnements (OAuth):**
- **[Anthropic](https://www.anthropic.com/)** (Claude Pro/Max)
- **[OpenAI](https://openai.com/)** (ChatGPT/Codex)

Modul-Hinweis: Obwohl jedes Modell unterstützt wird, empfehle ich dringend **Anthropic Pro/Max (100/200) + Opus 4.5** für die langen Kontextstärken und die bessere Widerstandsfähigkeit gegen Prompt-Injection. Siehe [Einrichtung](https://docs.openclaw.ai/start/onboarding).

## Modelle (Auswahl + Auth)

- Modell-Konfiguration + CLI: [Modelle](https://docs.openclaw.ai/concepts/models)
- Auth-Profil-Rotation (OAuth vs API-Schlüssel) + Fallbacks: [Modell-Failover](https://docs.openclaw.ai/concepts/model-failover)

## Installation (empfohlen)

Laufzeitumgebung: **Node ≥22**.

```bash
npm install -g openclaw-german@latest
# oder: pnpm add -g openclaw-german@latest

# Sprache auf Deutsch einstellen
openclaw language de

openclaw-german onboard --install-daemon
```

Der Assistent installiert den Gateway-Daemon (launchd/systemd-Benutzerdienst), damit er dauerhaft läuft.

## Schnellstart (TL;DR)

Laufzeitumgebung: **Node ≥22**.

Vollständiger Anfängerleitfaden (Auth, Pairing, Kanäle): [Erste Schritte](https://docs.openclaw.ai/start/getting-started)

```bash
openclaw-german language de

openclaw-german onboard --install-daemon

openclaw-german gateway --port 18789 --verbose

# Eine Nachricht senden
openclaw-german message send --to +1234567890 --message "Hallo von OpenClaw"

# Mit dem Assistenten sprechen (optional zurück an jeden verbundenen Kanal senden: WhatsApp/Telegram/Slack/Discord/Google Chat/Signal/iMessage/BlueBubbles/Microsoft Teams/Matrix/Zalo/Zalo Personal/WebChat)
openclaw-german agent --message "Checkliste Schiffen" --thinking high
```

Upgrade? [Aktualisierungsleitfaden](https://docs.openclaw.ai/install/updating) (und führe `openclaw-german doctor` aus).

## Entwicklungskanäle

- **stable**: Getaggte Releases (`vYYYY.M.D` oder `vYYYY.M.D-<patch>`), npm dist-tag `latest`.
- **beta**: Prerelease-Tags (`vYYYY.M.D-beta.N`), npm dist-tag `beta` (macOS-App möglicherweise fehlend).
- **dev**: Beweglicher Kopf von `main`, npm dist-tag `dev` (wenn veröffentlicht).

Kanäle wechseln (git + npm): `openclaw-german update --channel stable|beta|dev`.
Details: [Entwicklungskanäle](https://docs.openclaw.ai/install/development-channels).

## Aus dem Quellcode (Entwicklung)

Bevorzuge `pnpm` für Builds aus dem Quellcode. Bun ist optional zum direkten Ausführen von TypeScript.

```bash
git clone https://github.com/Ralle1976/Clawdbot-German.git
cd Clawdbot-German

pnpm install
pnpm ui:build # installiert UI-Abhängigkeiten beim ersten Lauf automatisch
pnpm build

openclaw-german language de

pnpm openclaw-german onboard --install-daemon

# Entwicklerschleife (automatisches Neuladen bei TS-Änderungen)
pnpm gateway:watch
```

## Deutsche Sprachunterstützung 🇩🇪

OpenClaw-German bietet vollständige i18n-Unterstützung (Internationalisierung) mit Deutsch als erstem unterstützter Sprache neben Englisch.

### Sprache ändern

```bash
# Aktuelle Sprache anzeigen
openclaw-german language

# Sprache auf Deutsch einstellen
openclaw-german language de

# Sprache auf Englisch einstellen
openclaw-german language en

# Auf Systemstandard zurücksetzen
openclaw-german language --reset
```

### Umgebungsvariable

Die Sprache kann auch über Umgebungsvariablen festgelegt werden:

```bash
# temporär für die aktuelle Sitzung
export OPENCLAW_LANGUAGE=de

# oder in ~/.bashrc, ~/.zshrc, etc. für dauerhafte Einstellung
echo 'export OPENCLAW_LANGUAGE=de' >> ~/.bashrc
```

### Übersetzter Inhalt

Die folgenden Bereiche sind auf Deutsch übersetzt:

- ✅ CLI-Befehle und Hilfe-Texte
- ✅ Gateway-Nachrichten
- ✅ Discord-Bot-Antworten
- ✅ Fehlermeldungen
- ✅ System-Nachrichten
- ✅ Dokumentation (in Arbeit)

## OpenClaw-German Features

OpenClaw-German ist ein Fork des originalen OpenClaw-Projekts mit den folgenden Verbesserungen:

### 🔒 Sicherheit

- Eingabevalidierung für alle CLI-Befehle
- Verbesserte Authentifizierung
- Rate Limiting (wenn verfügbar)
- Keine festcodierten Secrets
- Sichere Secret-Verwaltung

### 🔄 Refactoring

- Verbesserte Code-Struktur
- Bessere Modularisierung
- Performance-Optimierungen
- TypeScript Type Safety Verbesserungen
- Reduzierter Code durch Eliminierung von Duplikaten

### 🌐 Internationalisierung

- Vollständiges i18n-System
- Deutsche Sprachunterstützung
- Language Switcher CLI-Befehl
- Spracherkennung aus Umgebung

## Projektstatus

- ✅ i18n-System implementiert
- ✅ CLI-Befehle teilweise übersetzt
- ✅ Language Switcher erstellt
- 🔄 Discord-Integration in Arbeit
- 🔄 Dokumentation in Arbeit
- 🔄 Weitere Sprachen geplant (Französisch, Spanisch)

## Mitwirken

Contributions sind willkommen! Bitte lies [CONTRIBUTING.md](CONTRIBUTING.md) für Details.

### Übersetzungen beitragen

Wenn du eine neue Sprache hinzufügen möchtest:

1. Erstelle eine neue Sprachdatei in `src/locale/` (z.B. `fr.ts`)
2. Füge die Übersetzungen hinzu
3. Registriere die Sprache in `src/locale/index.ts`
4. Teste die neue Sprache

## Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## Unterstützung

- 📖 [Dokumentation](https://docs.openclaw.ai)
- 💬 [Discord](https://discord.gg/clawd)
- 🐛 [Issues](https://github.com/Ralle1976/Clawdbot-German/issues)

## Danksagung

OpenClaw-German basiert auf dem großartigen [OpenClaw](https://github.com/openclaw/openclaw) Projekt von der OpenClaw-Community.
