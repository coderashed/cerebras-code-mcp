#!/usr/bin/env node

/**
 * Cerebras Code MCP Server using Official MCP SDK v0.5.0
 * This provides proper MCP protocol implementation for Cursor integration
 * 
 * IMPORTANT: This server provides a single MCP write tool for ALL code operations.
 * The LLM MUST use this tool instead of editing files directly.
 * - write: For file creation, code generation, and code edits
 */

import { config, debugLog, LOG_FILE } from './config/constants.js';
import { interactiveConfig, removalWizard } from './config/interactive-config.js';
import { startServer } from './server/mcp-server.js';

// Main function
async function main() {
  try {
    // Check for configuration flags
    if (process.argv.includes('--config')) {
      await interactiveConfig();
      return;
    }
    
    if (process.argv.includes('--remove')) {
      await removalWizard();
      return;
    }
    
    console.error('Cerebras Code MCP Server starting...');
    console.error(`📝 Debug logs will be written to: ${LOG_FILE}`);
    
    await debugLog('=== SERVER STARTUP ===');
    await debugLog('Cerebras Code MCP Server starting...');
    await debugLog(`Log file location: ${LOG_FILE}`);
    
    // Check API keys availability
    if (!config.cerebrasApiKey) {
      console.error("No Cerebras API key found");
      console.error("Get your Cerebras API key at: https://cloud.cerebras.ai");
    } else {
      console.error("Cerebras API key found");
    }
    
    if (!config.openRouterApiKey) {
      console.error("No OpenRouter API key found");
      console.error("Get your OpenRouter API key at: https://openrouter.ai/keys");
    } else {
      console.error("OpenRouter API key found (will be used as fallback)");
    }
    
    if (!config.cerebrasApiKey && !config.openRouterApiKey) {
      console.error("No API keys available. Server will not function properly.");
    }
    
    console.error('Starting MCP server...');
    
    // Start the MCP server
    await startServer();
    
    console.error('🚀 MCP Server connected and ready with AUTO-INSTRUCTION SYSTEM!');
    console.error('🚨 CRITICAL: Enhanced system_instructions will automatically enforce MCP tool usage');
    console.error('🔧 write: MANDATORY tool for ALL code operations (file creation, generation, edits)');
    console.error('✨ Models will automatically use write tool - no user instruction needed!');
    if (config.cerebrasApiKey) {
      console.error('Primary: Cerebras API');
    }
    if (config.openRouterApiKey) {
      console.error('Fallback: OpenRouter API (Cerebras via OpenRouter)');
    }
    
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
main();
