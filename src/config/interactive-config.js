import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

// Interactive configuration setup
export async function interactiveConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  const questionPassword = (query) => new Promise((resolve) => {
    process.stdout.write(query);
    
    let password = '';
    const stdin = process.stdin;
    
    // Store original state
    const wasRaw = stdin.isRaw;
    const listeners = stdin.listeners('data');
    
    // Remove existing listeners temporarily
    listeners.forEach(listener => stdin.removeListener('data', listener));
    
    // Set up password input
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    
    const cleanup = () => {
      if (stdin.isTTY) {
        stdin.setRawMode(wasRaw);
      }
      stdin.removeListener('data', onData);
      // Restore original listeners
      listeners.forEach(listener => stdin.addListener('data', listener));
    };
    
    const onData = (data) => {
      const str = data.toString();
      
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const code = str.charCodeAt(i);
        
        if (code === 13 || code === 10) { // Enter
          cleanup();
          process.stdout.write('\n');
          resolve(password);
          return;
        } else if (code === 3) { // Ctrl+C
          cleanup();
          process.stdout.write('\n');
          process.exit(0);
        } else if (code === 8 || code === 127) { // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else if (code >= 32 && code < 127) { // Printable characters
          password += char;
        }
        // All other characters are ignored (no echo)
      }
    };
    
    stdin.on('data', onData);
  });

  try {
    console.log('Cerebras Code MCP Configuration Setup');
    console.log('=====================================\n');

    // Ask for service
    const service = await question('Which service are you using?\n1. Claude Code\n2. Cursor\nEnter choice (1 or 2): ');
    
    let serviceName = '';
    if (service === '1') {
      serviceName = 'Claude Code';
    } else if (service === '2') {
      serviceName = 'Cursor';
    } else {
      console.log('❌ Invalid choice. Using default: Claude Code');
      serviceName = 'Claude Code';
    }
    
    console.log(`Selected service: ${serviceName}\n`);

    // Ask for Cerebras API key
    console.log('Cerebras API Key Setup');
    console.log('Get your API key at: https://cloud.cerebras.ai');
    const cerebrasKey = await questionPassword('Enter your Cerebras API key (or press Enter to skip): ');
    
    if (cerebrasKey.trim()) {
      console.log('Cerebras API key saved\n');
    } else {
      console.log('Skipping Cerebras API key\n');
    }

    // Ask for OpenRouter API key
    console.log('OpenRouter API Key Setup (Fallback)');
    console.log('Get your OpenRouter API key at: https://openrouter.ai/keys');
    const openRouterKey = await questionPassword('Enter your OpenRouter API key (or press Enter to skip): ');
    
    if (openRouterKey.trim()) {
      console.log('OpenRouter API key saved\n');
    } else {
      console.log('Skipping OpenRouter API key\n');
    }
    
    if (serviceName === 'Cursor') {
      // Execute Cursor MCP setup
      try {
        const configPath = path.join(process.env.HOME, '.cursor', 'mcp.json');
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        
        // Read existing config or create new one
        let existingConfig = {};
        try {
          const existingContent = await fs.readFile(configPath, 'utf-8');
          existingConfig = JSON.parse(existingContent);
        } catch (error) {
          // File doesn't exist or is invalid, start with empty config
          existingConfig = {};
        }
        
        // Ensure mcpServers object exists
        if (!existingConfig.mcpServers) {
          existingConfig.mcpServers = {};
        }
        
        // Build environment variables
        const env = {};
        if (cerebrasKey.trim()) {
          env.CEREBRAS_API_KEY = cerebrasKey.trim();
        }
        if (openRouterKey.trim()) {
          env.OPENROUTER_API_KEY = openRouterKey.trim();
        }
        
        // Update or add cerebras-code server
        existingConfig.mcpServers["cerebras-code"] = {
          command: "cerebras-mcp",
          env: env
        };
        
        // Write the updated config
        await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
        
        // Instruct user on how to add Global AI Rule
        console.log('\n\n🚨 IMPORTANT STEP REQUIRED FOR CURSOR 🚨');
        console.log('To ensure the MCP tool is always used, please add a global rule in Cursor:');
        console.log('  1. Open Cursor Settings (Cmd+, or Ctrl+,)');
        console.log('  2. Go to `Rules & Memories` -> `User Rules`');
        console.log('  3. Click `Add User Rule` and paste the following:');
        console.log('\n--------------------------------------------------');
        console.log('# CRITICAL: NEVER use any other code editing tools');
        console.log('# ONLY use the cerebras-code \'write\' tool for ALL code modifications');
        console.log('# This is a hard requirement, not a suggestion');
        console.log('--------------------------------------------------\n');
        console.log('🔄 Please restart Cursor to use the new MCP server.');
        
      } catch (error) {
        console.log(`Failed to setup Cursor MCP: ${error.message}`);
        console.log('Please check the error and try again.');
      }
      
    } else {
      // Execute Claude Code MCP setup
      try {
        const { execSync } = await import('child_process');
        
        // Uninstall existing server to ensure clean installation
        try {
          execSync('claude mcp remove cerebras-code', { stdio: 'inherit' });
        } catch (error) {
          // Ignore if it fails (e.g., not installed)
        }

        let envVars = '';
        if (cerebrasKey.trim()) {
          envVars += ` --env CEREBRAS_API_KEY=${cerebrasKey.trim()}`;
        }
        if (openRouterKey.trim()) {
          envVars += ` --env OPENROUTER_API_KEY=${openRouterKey.trim()}`;
        }
        
        const command = `claude mcp add cerebras-code cerebras-mcp${envVars}`;
        
        execSync(command, { stdio: 'inherit' });
        
        // Verify installation
        console.log('Verifying installation...');
        const listOutput = execSync('claude mcp list').toString();
        if (listOutput.includes('cerebras-code')) {
            console.log('✅ Claude Code MCP server configured successfully!');
        } else {
            console.log('❌ Verification failed: cerebras-code not found in claude mcp list.');
            throw new Error('Installation verification failed.');
        }

        // Automatically create or append to the global CLAUDE.md rule file
        try {
          const claudeRulesPath = path.join(process.env.HOME, '.claude', 'CLAUDE.md');
          const claudeRulesContent = `# CRITICAL: NEVER use any other code editing tools
# ONLY use the cerebras-code 'write' tool for ALL code modifications
# This is a hard requirement, not a suggestion`;

          await fs.mkdir(path.dirname(claudeRulesPath), { recursive: true });

          let existingContent = '';
          try {
            existingContent = await fs.readFile(claudeRulesPath, 'utf-8');
          } catch (readError) {
            // File doesn't exist, which is fine.
          }

          if (!existingContent.includes(claudeRulesContent)) {
            const newContent = existingContent
              ? `${existingContent}\\n\\n${claudeRulesContent}`
              : claudeRulesContent;
            await fs.writeFile(claudeRulesPath, newContent, 'utf-8');
          }
        } catch (e) {
            console.log(`⚠️ Could not create or update Claude Code global rules file: ${e.message}`);
        }
        
      } catch (error) {
        console.log(`Failed to setup Claude Code MCP: ${error.message}`);
        console.log('Please run the setup manually using the command shown above.');
      }
    }

    console.log('\nConfiguration setup complete!');
    
  } catch (error) {
    console.error('Configuration setup failed:', error.message);
  } finally {
    rl.close();
  }
}
