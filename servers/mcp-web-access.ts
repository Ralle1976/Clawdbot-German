#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Server for Web Access
 * Enables local LLMs (like Ollama) to access web for research
 * 
 * This creates a local server that can be called by:
 * - Ollama (via mcp)
 * - Claude Desktop (via mcp)
 * - Other MCP-compatible tools
 * 
 * Tools provided:
 * - web_search: Search the web
 * - web_read: Read a webpage
 * - web_extract: Extract main content from webpage
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';

// Create MCP server
const server = new Server({
  name: 'web-access-server',
  version: '1.0.0',
}, {
  capabilities: {
    resources: {},
    tools: {},
  },
});

/**
 * Tool 1: web_search
 * Search the web using DuckDuckGo (no API key needed!)
 */
server.setRequestHandler(async (request) => {
  if (request.params.name !== 'tools/list' && !request.params.name.startsWith('tools/call')) {
    return {};
  }

  if (request.params.name === 'tools/list' || request.params.name === 'tools/call') {
    return {
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for information. Uses DuckDuckGo (no API key required).',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              num_results: {
                type: 'number',
                description: 'Number of results (default: 5)',
                default: 5,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'web_read',
          description: 'Read a webpage and extract all text content',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to read',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'web_extract',
          description: 'Extract main content from webpage (removes ads, navigation, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to extract from',
              },
            },
            required: ['url'],
          },
        },
      ],
    };
  }

  if (request.params.name === 'tools/call') {
    const { name, arguments: args } = request.params.arguments;

    if (name === 'web_search') {
      const query = args.query;
      const numResults = args.num_results || 5;

      console.log(`\n🔍 Searching web for: ${query}`);

      // Use DuckDuckGo (no API key needed!)
      const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      try {
        const response = await fetch(ddgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OpenClawBot/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(`DuckDuckGo search failed: ${response.status}`);
        }

        const html = await response.text();

        // Extract search results using simple regex
        const results = extractSearchResults(html, numResults);

        console.log(`✓ Found ${results.length} results\n`);

        return {
          content: [
            {
              type: 'text',
              text: `Web Search Results for: ${query}\n\n${results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}\n`).join('\n')}`,
            },
          ],
        };
      } catch (error) {
        console.error(`✗ Search failed: ${(error as Error).message}`);
        throw error;
      }
    }

    if (name === 'web_read') {
      const url = args.url;

      console.log(`\n📖 Reading webpage: ${url}`);

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OpenClawBot/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        const html = await response.text();
        const text = htmlToText(html);

        console.log(`✓ Read ${text.length} characters\n`);

        return {
          content: [
            {
              type: 'text',
              text: `Webpage Content from: ${url}\n\n${text.substring(0, 10000)}\n\n[Content truncated at 10,000 characters]`,
            },
          ],
        };
      } catch (error) {
        console.error(`✗ Failed to read webpage: ${(error as Error).message}`);
        throw error;
      }
    }

    if (name === 'web_extract') {
      const url = args.url;

      console.log(`\n✂️ Extracting main content from: ${url}`);

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OpenClawBot/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        const html = await response.text();

        // Simple content extraction (removes scripts, styles, etc.)
        const extracted = extractMainContent(html);

        console.log(`✓ Extracted ${extracted.length} characters\n`);

        return {
          content: [
            {
              type: 'text',
              text: `Extracted Content from: ${url}\n\n${extracted.substring(0, 10000)}\n\n[Content truncated at 10,000 characters]`,
            },
          ],
        };
      } catch (error) {
        console.error(`✗ Failed to extract content: ${(error as Error).message}`);
        throw error;
      }
    }
  }

  return {};
});

/**
 * Extract search results from DuckDuckGo HTML
 */
function extractSearchResults(html, numResults) {
  const results = [];

  // Simple regex-based extraction (DuckDuckGo specific)
  const resultRegex = /class="result__a".*?href="(https?:[^"]+)".*?class="result__a"[^>]*>([^<]+)<\/a>/g;
  const snippetRegex = /class="result__snippet"[^>]*>([^<]+)<\/a>/g;
  const urlRegex = /class="result__url"[^>]*>(https?:[^<]+)<\/a>/g;

  const resultMatches = html.match(resultRegex) || [];
  const snippetMatches = html.match(snippetRegex) || [];

  for (let i = 0; i < Math.min(resultMatches.length, numResults); i++) {
    const urlMatch = resultMatches[i];
    const snippetMatch = snippetMatches[i];

    let url = '';
    if (urlMatch) {
      const urlResult = urlMatch.match(/href="([^"]+)"/);
      if (urlResult) {
        url = urlResult[1];
      }
    }

    let snippet = '';
    if (snippetMatch) {
      snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
      if (snippet.length > 200) {
        snippet = snippet.substring(0, 200) + '...';
      }
    }

    if (url) {
      results.push({
        title: snippet.substring(0, 100),
        url,
        snippet: snippet,
      });
    }
  }

  return results;
}

/**
 * Extract main content from HTML
 */
function extractMainContent(html) {
  // Remove scripts, styles, etc.
  let text = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take middle 50% (main content)
  const start = Math.floor(text.length * 0.25);
  const end = Math.floor(text.length * 0.75);

  return text.substring(start, end);
}

/**
 * Convert HTML to text
 */
function htmlToText(html) {
  let text = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return text;
}

/**
 * Start MCP server
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     MCP Server for Web Access                   ║');
  console.log('║           (No API key required!)              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Check for express
  try {
    require('express');
    console.log('✓ Express installed - can run HTTP server');
  } catch (e) {
    console.log('✗ Express not installed - running in stdio mode');
    console.log('  Install with: npm install express\n');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('MCP Server connected!\n');
  console.log('Available tools:');
  console.log('  - web_search: Search the web (DuckDuckGo, no API key)');
  console.log('  - web_read: Read a webpage');
  console.log('  - web_extract: Extract main content from webpage\n');
  console.log('\n🚀 Ready to provide web access to local LLMs!');
}

main().catch(console.error);
