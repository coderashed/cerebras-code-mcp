// Configuration - API keys and settings
export const config = {
  // Cerebras configuration
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  cerebrasModel: process.env.CEREBRAS_MODEL || "qwen-3-coder-480b",
  maxTokens: process.env.CEREBRAS_MAX_TOKENS ? parseInt(process.env.CEREBRAS_MAX_TOKENS) : null,
  temperature: parseFloat(process.env.CEREBRAS_TEMPERATURE) || 0.1,
  
  // OpenRouter configuration (fallback)
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || 'https://github.com/cerebras/cerebras-code-mcp',
  openRouterSiteName: process.env.OPENROUTER_SITE_NAME || 'Cerebras Code MCP',
  openRouterModel: 'qwen/qwen3-coder'
};

// Debug logging to file  
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

export const LOG_FILE = path.join(os.homedir(), 'cerebras-mcp-debug.log');

export async function debugLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Log to stderr (console)
  console.error(message);
  
  // Also append to file
  try {
    await fs.appendFile(LOG_FILE, logMessage);
  } catch (error) {
    // Ignore file write errors
  }
}
