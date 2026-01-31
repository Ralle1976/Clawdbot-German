#!/usr/bin/env node
/**
 * SIMPLE Web Search Tool - Direct DuckDuckGo Access
 * NO API KEY REQUIRED - Works from local computer
 * 
 * Usage:
 *   node scripts/simple-web-search.js "search query"
 *   node scripts/simple-web-search.js --search "query"
 *   node scripts/simple-web-search.js --url "https://example.com" (read webpage)
 */

import * as https from 'https';

console.log('🔍 SIMPLE WEB SEARCH TOOL');
console.log('═════════════════════════════\n');

// Get search query from command line
const args = process.argv.slice(2);
const searchQuery = args[0];
const urlFlag = args.find(a => a === '--url');

if (!searchQuery && !urlFlag) {
  console.log('Usage:');
  console.log('  node scripts/simple-web-search.js "search query"');
  console.log('  node scripts/simple-web-search.js --url "https://example.com"');
  console.log('\nExamples:');
  console.log('  node scripts/simple-web-search.js "Qwen API pricing 2025"');
  console.log('  node scripts/simple-web-search.js --url "https://tongyi.aliyun.com/"');
  process.exit(1);
}

if (urlFlag) {
  // Read webpage mode
  const url = args[args.indexOf('--url') + 1];
  console.log(`📖 Reading: ${url}\n`);
  readWebpage(url);
} else {
  // Search mode
  console.log(`🔍 Searching for: ${searchQuery}\n`);
  performSearch(searchQuery);
}

/**
 * Perform DuckDuckGo search
 */
async function performSearch(query) {
  try {
    // DuckDuckGo HTML (no API key needed!)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    console.log(`Fetching: ${searchUrl}`);
    const response = await https.get(searchUrl);
    
    if (response.statusCode !== 200) {
      console.error(`❌ HTTP Error: ${response.statusCode}`);
      return;
    }
    
    const html = response.data;
    
    // Simple extraction (DuckDuckGo specific)
    const results = extractDuckDuckGoResults(html);
    
    console.log(`✓ Found ${results.length} results:\n`);
    
    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const result = results[i];
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   ${result.url}`);
      if (result.snippet) {
        console.log(`   ${result.snippet}`);
      }
      console.log('');
    }
    
    // Save results
    saveResults(query, results);
    
    // Read top 3 pages
    console.log('📖 Reading top 3 pages...\n');
    for (let i = 0; i < Math.min(results.length, 3); i++) {
      await readWebpage(results[i].url);
      await sleep(2000); // 2 second delay between requests
    }
    
  } catch (error) {
    console.error('❌ Search error:', error.message);
  }
}

/**
 * Extract search results from DuckDuckGo HTML
 */
function extractDuckDuckGoResults(html) {
  const results = [];
  
  // DuckDuckGo uses a specific HTML structure
  // We'll use regex to extract links and titles
  
  // Method 1: Extract all links and filter for results
  const linkRegex = /<a[^>]*class=["'](?:result__a[^"']*|result__title[^"']*)["'][^>]*href=["'](https?:[^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const matches = html.match(linkRegex) || [];
  
  for (const match of matches) {
    const hrefMatch = match.match(/href=["'](https?:[^"']+)["']/);
    const titleMatch = match.match(/>([^<]*)<\/a>/);
    
    if (hrefMatch && titleMatch) {
      const url = hrefMatch[1];
      const title = titleMatch[1]
        .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
        .trim();
      
      // Skip non-result links
      if (url.includes('duckduckgo.com') || url.includes('ddg.gg') || title.length < 10) {
        continue;
      }
      
      results.push({
        title: decodeHtml(title),
        url: url,
        snippet: null, // Will extract from page
      });
    }
  }
  
  return results;
}

/**
 * Read webpage and extract main content
 */
async function readWebpage(url) {
  try {
    console.log(`📖 Fetching: ${url}`);
    
    const response = await https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenClawBot/1.0)',
      },
      timeout: 15000, // 15 second timeout
    });
    
    if (response.statusCode !== 200) {
      console.error(`   ❌ HTTP Error: ${response.statusCode}`);
      return;
    }
    
    const html = response.data;
    const text = htmlToText(html);
    
    // Extract relevant sections
    const pricingSection = extractSection(text, ['price', 'cost', 'free', 'tier', 'pricing', '定价', '价格', '收费']);
    const apiSection = extractSection(text, ['api', 'endpoint', 'key', 'documentation', '文档', '密钥']);
    const unlimitedSection = extractSection(text, ['unlimited', '无限', 'unlimit']);
    
    console.log('   ✓ Page read');
    console.log(`   - ${text.length} characters extracted`);
    console.log(`   - Pricing section: ${pricingSection ? 'Found' : 'Not found'}`);
    console.log(`   - API section: ${apiSection ? 'Found' : 'Not found'}`);
    console.log(`   - Unlimited section: ${unlimitedSection ? 'Found' : 'Not found'}\n`);
    
    // Show preview
    const preview = text.substring(0, 500).replace(/\n/g, ' ');
    console.log(`   Preview: ${preview}...\n`);
    
    // Save page content
    savePageContent(url, text, pricingSection, apiSection, unlimitedSection);
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error(`   (Connection refused - site may be blocking automated requests)`);
    }
  }
}

/**
 * Extract section containing keywords
 */
function extractSection(text, keywords) {
  for (const keyword of keywords) {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + 500);
      return text.substring(start, end).trim();
    }
  }
  return null;
}

/**
 * Convert HTML to text
 */
function htmlToText(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Decode HTML entities
 */
function decodeHtml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Save search results
 */
function saveResults(query, results) {
  const fs = require('fs');
  const path = '/mnt/c/Users/tango/Desktop/Desktop/Clawdbot-DE/search/results.md';
  
  const content = `
## Search Results: ${query}
Date: ${new Date().toISOString()}
Total Results: ${results.length}

---

${results.map((r, i) => `
### ${i + 1}. ${r.title}
**URL:** ${r.url}
**Snippet:** ${r.snippet || 'Not extracted'}

`).join('\n')}
---

`;

  fs.appendFileSync(path, content);
  console.log(`   💾 Results saved to: search/results.md\n`);
}

/**
 * Save page content
 */
function savePageContent(url, text, pricingSection, apiSection, unlimitedSection) {
  const fs = require('fs');
  const path = '/mnt/c/Users/tango/Desktop/Desktop/Clawdbot-DE/search/pages.md';
  
  const content = `
## Page Content: ${url}
Date: ${new Date().toISOString()}
Characters: ${text.length}

---

### Pricing/Free Information:
${pricingSection || 'Not found'}

### API Information:
${apiSection || 'Not found'}

### Unlimited Information:
${unlimitedSection || 'Not found'}

### Content Preview (first 1000 chars):
${text.substring(0, 1000)}

---

`;

  fs.appendFileSync(path, content);
  console.log(`   💾 Page content saved to: search/pages.md\n`);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main entry point
 */
if (require.main === module) {
  main();
}

/**
 * Main function
 */
function main() {
  console.log('READY!\n');
}
