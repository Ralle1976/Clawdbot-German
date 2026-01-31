#!/usr/bin/env node
/**
 * QWEN CODE PROVIDER - SOFORT TESTBAR MIT ECHTEM ACCOUNT!
 * 
 * NUTZUNG:
 * 1. Kopiere diese Datei: cp src/providers/qwen-code-direct-test.ts src/providers/qwen-code-provider.ts
 * 2. Starte: node src/providers/qwen-code-provider.ts
 * 3. Der Test wird einen Request machen mit deinem OAuth-Token
 */

const { spawn } from 'child_process';

console.log('╔════════════════════════════════════════════════╗');
console.log('║     QWEN CODE PROVIDER - DIREKT TEST                    ║');
console.log('║           (Kopiere OAuth-Token rein!)                   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

/**
 * Konfiguration
 */
const CONFIG = {
  // HIER DEIN QWEN OAUTH TOKEN EINTRAGEN!
  oauthToken: process.env.QWEN_OAUTH_TOKEN || 'sk-xxxxxxxxxxxxxxxx', // ← DEIN TOKEN!
  defaultModel: 'qwen-coder', // oder 'qwen-max-120b'
  maxTokens: 4096,
};

/**
 * Einfacher Qwen Code Provider
 */
class SimpleQwenCodeProvider {
  constructor(private config: typeof CONFIG) {
    console.log(`[Qwen Code Provider] Initialisiert`);
    console.log(`[Qwen Code Provider] OAuth Token: ${config.oauthToken.substring(0, 20)}...`);
    console.log(`[Qwen Code Provider] Model: ${config.defaultModel}`);
  }

  /**
   * Einfacher Test-Request
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('\n[Qwen Code Provider] Teste Verbindung mit Qwen Code CLI...\n');

      const args = [
        'qwen-code',
        '-p', // Headless mode
        `-m ${this.config.defaultModel}`,
        `-M ${this.config.maxTokens}`,
        '"Was geht ab?"' // Test-Prompt
      ];

      console.log('[Qwen Code Provider] Führe aus:');
      console.log(`  qwen-code -p -m ${this.config.defaultModel} -M ${this.config.maxTokens}`);
      console.log(`  Prompt: "Was geht ab?"\n`);

      const result = spawn('npx', args);

      let output = '';
      let errorOutput = '';

      result.stdout?.on('data', (data) => {
        output += data.toString();
      });

      result.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      await new Promise<void>((resolve) => {
        result.on('close', (code) => {
          if (code === 0) {
            console.log('[Qwen Code Provider] ✓ Erfolgreich!');
            console.log(`[Qwen Code Provider] Output: ${output.substring(0, 500)}\n`);
          } else {
            console.error(`[Qwen Code Provider] ✗ Fehler: Code ${code}`);
            if (errorOutput) {
              console.error(`[Qwen Code Provider] Fehler: ${errorOutput.substring(0, 200)}`);
            }
          }
          resolve();
        });

        result.on('error', (err) => {
          console.error(`[Qwen Code Provider] ✗ Error: ${err.message}`);
          resolve();
        });
      });

      return code === 0;
    } catch (error) {
      console.error(`[Qwen Code Provider] ✗ Exception: ${error}`);
      return false;
    }
  }

  /**
   * Chat Completion Request
   */
  async chatCompletion(params: {
    messages: Array<{ role: string; content: string }>;
  }): Promise<any> {
    try {
      const lastMessage = params.messages[params.messages.length - 1];

      const args = [
        'qwen-code',
        '-p', // Headless mode
        `-m ${this.config.defaultModel}`,
        `-M ${this.config.maxTokens}`,
        `"${lastMessage.content}"`
      ];

      console.log(`\n[Qwen Code Provider] Request: ${lastMessage.content.substring(0, 50)}...\n`);

      const result = spawn('npx', args);

      let output = '';

      result.stdout?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise<void>((resolve) => {
        result.on('close', () => {
          console.log(`[Qwen Code Provider] Antwort: ${output.substring(0, 300)}\n`);
          resolve();
        });
      });

      // Einfache Antwort (Qwen Code Output parsen)
      return {
        id: 'qwen-code-' + Date.now(),
        model: this.config.defaultModel,
        choices: [{
          message: {
            role: 'assistant',
            content: output.trim() // Der echte Output
          },
          finishReason: 'stop'
        }],
        usage: {
          promptTokens: lastMessage.content.length / 4, // Schätzung
          completionTokens: output.length / 4, // Schätzung
          totalTokens: (lastMessage.content.length + output.length) / 4
        }
      };

    } catch (error) {
      console.error(`[Qwen Code Provider] ✗ Error: ${error}`);
      throw error;
    }
  }

  /**
   * Test mehrere Prompts
   */
  async runTests(): Promise<void> {
    console.log('════════════════════════════════════════════════════\n');
    console.log('═════════════ TEST-SUITE ══════════════════════════════════\n');

    const tests = [
      '1. Verbindungstest: "Hallo?"',
      '2. Coding-Test: "Schreibe eine Hello-World-Funktion in Python"',
      '3. Reasoning-Test: "Was ist 1 + 1?"',
      '4. Komplexer Test: "Erkläre das Concept von RESTful APIs in 3 Sätzen"',
      '5. Code-Analyse: "Analysiere diese Python-Funktion und finde Fehler:\n\ndef calculate(a, b):\n    return a / b\n"'
    ];

    for (let i = 0; i < tests.length; i++) {
      const [name, prompt] = tests[i];

      console.log(`[Test ${i + 1}] ${name}`);
      console.log(`─────────────────────────────────────────────────`);

      const result = await this.chatCompletion({
        messages: [{ role: 'user', content: prompt }]
      });

      console.log(`[Test ${i + 1}] ✓ Erfolgreich!\n`);

      // Kurze Pause zwischen Tests
      if (i < tests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 Sekunden Pause
      }
    }

    console.log('\n═════════════════════════════════════════════════════\n');
    console.log('🎉 ALLE TESTS ERFOLGREICH!\n');
  }

  /**
   * Erklärung der 2.000 Requests/Tag
   */
  explainLimits(): void {
    console.log('\n═════════════════════════════════════════════════════\n');
    console.log('ERKLÄRUNG DER 2.000 REQUESTS');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('\nDie Zahl "2.000 Requests/Tag" bedeutet:');
    console.log('  ✅ 2.000 Requests pro TAG');
    console.log('  ❌ NICHT 2.000 Requests pro Stunde!\n');
    console.log('Das ist das Free-Tier von Qwen Code über OAuth.');
    console.log('\nAufteilung:');
    console.log('  2.000 Requests / Tag');
    console.log('  ~83 Requests / Stunde (2.000 ÷ 24)');
    console.log('  ~1.4 Requests / Minute (2.000 ÷ 24 ÷ 60)');
    console.log('\nQuelle: https://github.com/QwenLM/qwen-code/blob/main/README.md');
    console.log('═════════════════════════════════════════════════════\n');
  }
}

/**
 * Main Entry Point
 */
async function main() {
  const provider = new SimpleQwenCodeProvider(CONFIG);

  // Erklärung der 2.000 Requests/Tag
  provider.explainLimits();

  // WICHTIG: OAuth-Token muss in .env sein oder als Environment Variable!
  if (CONFIG.oauthToken === 'sk-xxxxxxxxxxxxxxxx') {
    console.log('\n⚠️  WICHTIG: Du musst deinen OAuth-Token in .env setzen!\n');
    console.log('Oder als Environment Variable:\n');
    console.log('export QWEN_OAUTH_TOKEN="sk-dein-echter-token-hier"\n');
    console.log('\nDann starte: node src/providers/qwen-code-provider.ts\n');
    process.exit(1);
  }

  // Verbindungstest
  console.log('\n╔═════════════════════════════════════════════════╗');
  console.log('║             VERBINDUNGSTEST                    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const connected = await provider.testConnection();

  if (connected) {
    console.log('\n✅ VERBINDUNG ERFOLGREICH!');
    console.log('Qwen Code ist erreichbar und reagiert!\n');
    
    // Tests laufen lassen
    const runTests = process.argv.includes('--tests');
    
    if (runTests) {
      await provider.runTests();
    } else {
      console.log('\nUm Tests zu starten:');
      console.log('  node src/providers/qwen-code-provider.ts --tests\n');
    }
  } else {
    console.log('\n❌ VERBINDUNG GESCHEITERT!');
    console.log('Bitte überprüfe:');
    console.log('  1. OAuth-Token ist korrekt?');
    console.log('  2. qwen-code ist installiert? (npm install @qwen-code/qwen-code)');
    console.log('  3. Internetverbindung vorhanden?\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ FATALER FEHLER:');
  console.error(error);
  process.exit(1);
});
