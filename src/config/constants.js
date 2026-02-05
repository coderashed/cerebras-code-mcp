import path from 'path';
import os from 'os';
import fs from 'fs/promises';

export const config = {
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  cerebrasModel: process.env.CEREBRAS_MODEL || "zai-glm-4.7",
  maxTokens: process.env.CEREBRAS_MAX_TOKENS ? parseInt(process.env.CEREBRAS_MAX_TOKENS) : null,
  temperature: process.env.CEREBRAS_TEMPERATURE ? parseFloat(process.env.CEREBRAS_TEMPERATURE) : 0.9,
  topP: process.env.CEREBRAS_TOP_P ? parseFloat(process.env.CEREBRAS_TOP_P) : 0.95,
  clearThinking: process.env.CEREBRAS_CLEAR_THINKING === 'true',
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || 'https://github.com/cerebras/cerebras-code-mcp',
  openRouterSiteName: process.env.OPENROUTER_SITE_NAME || 'Cerebras Code MCP',
  openRouterModel: 'qwen/qwen3-coder',
  rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 12,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 120,
  rateLimitMaxRetries: parseInt(process.env.RATE_LIMIT_MAX_RETRIES) || 6,
  rateLimitBaseDelayMs: parseInt(process.env.RATE_LIMIT_BASE_DELAY_MS) || 1000,
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 12,
};

export const LOG_FILE = path.join(os.homedir(), 'cerebras-mcp-debug.log');

const debugEnabled = process.env.CEREBRAS_DEBUG === 'true';

export const debugLog = debugEnabled
  ? async (message) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ${message}`);
      await fs.appendFile(LOG_FILE, `[${timestamp}] ${message}\n`).catch(() => {});
    }
  : () => {};