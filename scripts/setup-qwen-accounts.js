# Qwen Account Setup Script

#!/usr/bin/env node
/**
 * Interactive Qwen Account Setup Script
 * Guides user through creating 10 Qwen accounts
 */

import readline from 'readline';

console.log('╔════════════════════════════════════════════════════╗');
console.log('║     Qwen Account Setup Assistant                       ║');
console.log('╚════════════════════════════════════════════════════╝\n');

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('Schritt 1: Qwen Portal öffnen');
  console.log('─────────────────────────────────');
  console.log('1. Öffne: https://tongyi.aliyun.com/');
  console.log('2. Logge dich mit deinem Alibaba Cloud Account ein');
  console.log('3. Navigiere zu: API 密钥管理 (API Key Management)');
  console.log('4. Klicke auf: 创建 API Key (Create API Key)');
  console.log('5. Gib dem Key einen beschreibenden Namen\n');
  console.log('6. Kopiere den API Key');
  console.log('7. Gib einen Namen ein für den Key (z.B. qwen-dev-1)');
  console.log('8. Wiederhole 10 Mal\n');

  await ask('\nDrücke ENTER wenn du bereit bist, den ersten Key einzugeben...');

  const apiKeys = [];
  const useCases = [];

  for (let i = 1; i <= 10; i++) {
    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║     Account #${i}                                    ║`);
    console.log('╚════════════════════════════════════════════════════╝\n`);

    const useCase = await ask(`Use-Case für Account #${i} (dev/chat/agent/prod/backup): `);
    useCases.push(useCase || `qwen-${useCase}-${i}`);

    const apiKey = await ask(`API Key #${i} (sk-xxxx...): `);
    apiKeys.push(apiKey || `sk-placeholder-${i}`);

    const alias = await ask(`Alias für Account #${i} (qwen-1, qwen-chat-2, etc.) [default: qwen-${i}]: `);
    
    console.log(`✓ Account #${i}: ${alias || `qwen-${i}`} (${useCase || 'general'})`);
    console.log(`✓ API Key: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}`);
  }

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║           Zusammenfassung                           ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log(`\n✅ ${apiKeys.length} Accounts konfiguriert`);

  console.log('\n📝 .env Datei:');
  console.log('─────────────────────────────────────────────────');
  
  for (let i = 0; i < apiKeys.length; i++) {
    console.log(`export QWEN_API_KEY_${i + 1}="${apiKeys[i]}"`);
    console.log(`export QWEN_ALIAS_${i + 1}="${useCases[i]}"`);
  }

  console.log('\n📋 Alle Keys:');
  console.log('─────────────────────────────────────────────────');
  console.log(apiKeys.map((k, i) => `Qwen ${i + 1}: ${k}`).join('\n'));

  console.log('\n💾 Speichere diese Datei als: ~/.qwen-api-keys');
  console.log('    Füge sie dann mit: source ~/.qwen-api-keys');
  console.log('    Oder setze sie in deiner OpenClaw Konfiguration\n');

  console.log('\n🎉 Setup abgeschlossen!');
  console.log('    Nächster Schritt: keys in .env speichern und Qwen Provider starten\n');

  process.exit(0);
}

main().catch(console.error);
