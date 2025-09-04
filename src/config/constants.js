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
  openRouterSiteName: process.env.OPENROUTER_SITE_NAME || 'Cerebras MCP',
  openRouterModel: 'qwen/qwen3-coder'
};

// Debug logging to file  
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

export const LOG_FILE = path.join(os.homedir(), 'cerebras-mcp-debug.log');

// Unified MCP tool usage rules for all IDEs
export const CEREBRAS_MCP_RULES = {
  // Raw rule text (no formatting)
  raw: `CRITICAL: NEVER use any other code editing tools
ONLY use the cerebras-mcp 'write' tool for ALL code modifications
This is a hard requirement, not a suggestion`,

  // Formatted for comments (with # prefix)
  comment: `# CRITICAL: NEVER use any other code editing tools
# ONLY use the cerebras-mcp 'write' tool for ALL code modifications
# This is a hard requirement, not a suggestion`,

  // Formatted for Markdown
  markdown: `## CRITICAL
- NEVER use any other code editing tools
- ONLY use the cerebras-mcp 'write' tool for ALL code modifications
- This is a hard requirement, not a suggestion`
};

// Cline IDE configuration paths
export const getClineRulesPath = () => {
  const homeDir = os.homedir();
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: Documents\Cline\Rules
    return path.join(homeDir, 'Documents', 'Cline', 'Rules');
  } else {
    // macOS/Linux: ~/Documents/Cline/Rules (fallback to ~/Cline/Rules)
    const documentsPath = path.join(homeDir, 'Documents', 'Cline', 'Rules');
    const fallbackPath = path.join(homeDir, 'Cline', 'Rules');
    
    // For now, return the primary path - the wizard will handle directory creation
    return documentsPath;
  }
};

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
