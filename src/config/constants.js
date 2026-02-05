// Configuration - API keys and settings
export const config = {
  // Cerebras configuration
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  cerebrasModel: process.env.CEREBRAS_MODEL || "zai-glm-4.7",
  maxTokens: process.env.CEREBRAS_MAX_TOKENS ? parseInt(process.env.CEREBRAS_MAX_TOKENS) : null,
  temperature: process.env.CEREBRAS_TEMPERATURE ? parseFloat(process.env.CEREBRAS_TEMPERATURE) : 0.9,
  topP: process.env.CEREBRAS_TOP_P ? parseFloat(process.env.CEREBRAS_TOP_P) : 0.95,
  clearThinking: process.env.CEREBRAS_CLEAR_THINKING === 'true',

  // OpenRouter configuration (fallback)
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || 'https://github.com/cerebras/cerebras-code-mcp',
  openRouterSiteName: process.env.OPENROUTER_SITE_NAME || 'Cerebras Code MCP',
  openRouterModel: 'qwen/qwen3-coder',

  // Rate limiting configuration
  rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 12,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 120,
  rateLimitMaxRetries: parseInt(process.env.RATE_LIMIT_MAX_RETRIES) || 6,
  rateLimitBaseDelayMs: parseInt(process.env.RATE_LIMIT_BASE_DELAY_MS) || 1000,
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 12,
};

// Debug logging to file  
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

export const LOG_FILE = path.join(os.homedir(), 'cerebras-mcp-debug.log');

// Debug logging disabled for performance
export async function debugLog(message) {
  // No-op: debug logging disabled
}