#!/usr/bin/env node

/**
 * Script to parse rate limits copied from Cerebras dashboard and update model configurations
 * 
 * Usage:
 * 1. Copy the rate limits table from Cerebras dashboard
 * 2. Run: node scripts/update-rate-limits.js --tier free
 * 3. Paste the table when prompted
 * 4. Type 'END' on a new line when done
 * 
 * The script will parse the pasted data and update src/providers/model-configs.js
 */

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const tierIndex = args.indexOf('--tier');
const tier = tierIndex !== -1 && args[tierIndex + 1] ? args[tierIndex + 1] : null;

if (!tier || !['free', 'paid'].includes(tier)) {
  console.error('Usage: node update-rate-limits.js --tier <free|paid>');
  console.error('Example: node update-rate-limits.js --tier free');
  process.exit(1);
}

/**
 * Parse the pasted rate limits table from Cerebras
 */
function parseRateLimits(input) {
  const lines = input.split('\n');
  const models = {};
  
  let currentModel = null;
  let currentContext = null;
  let collectingRequests = false;
  let collectingTokens = false;
  let nextLineIsMinute = false;
  let nextLineIsHour = false;
  let nextLineIsDay = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || (line.includes('Model') && line.includes('Max Context Length'))) continue;
    
    // Check if this line tells us what's coming next
    if (line === 'minute:') {
      nextLineIsMinute = true;
      continue;
    } else if (line === 'hour:') {
      nextLineIsHour = true;
      continue;
    } else if (line === 'day:') {
      nextLineIsDay = true;
      continue;
    }
    
    // Process rate limit values that come after minute:/hour:/day:
    if (nextLineIsMinute || nextLineIsHour || nextLineIsDay) {
      const value = parseInt(line.replace(/,/g, ''));
      if (!isNaN(value) && currentModel) {
        if (!models[currentModel]) {
          models[currentModel] = {
            contextWindow: currentContext,
            limits: { requests: {}, tokens: {} }
          };
        }
        
        const targetLimits = collectingRequests ? models[currentModel].limits.requests : models[currentModel].limits.tokens;
        
        if (nextLineIsMinute) {
          targetLimits.minute = value;
          nextLineIsMinute = false;
        } else if (nextLineIsHour) {
          targetLimits.hour = value;
          nextLineIsHour = false;
        } else if (nextLineIsDay) {
          targetLimits.day = value;
          nextLineIsDay = false;
        }
      }
      continue;
    }
    
    // Check if this is "Requests" or "Tokens" marker
    if (line === 'Requests') {
      collectingRequests = true;
      collectingTokens = false;
      continue;
    } else if (line === 'Tokens') {
      collectingRequests = false;
      collectingTokens = true;
      continue;
    }
    
    // Check if this is a model line
    const parts = line.split(/\s{2,}|\t/);
    if (parts.length >= 3) {
      const potentialModel = parts[0];
      const potentialContext = parts[1].replace(/,/g, '');
      
      // Check if this looks like a model line
      if (/^[a-z0-9\-\.]+$/i.test(potentialModel) && /^\d+$/.test(potentialContext)) {
        currentModel = potentialModel;
        currentContext = parseInt(potentialContext);
        
        // Check what type this line introduces
        if (parts[2] === 'Requests') {
          collectingRequests = true;
          collectingTokens = false;
        } else if (parts[2] === 'Tokens') {
          collectingRequests = false;
          collectingTokens = true;
        }
      }
    }
  }
  
  return models;
}

/**
 * Update the model-configs.js file with new rate limits
 */
async function updateModelConfigs(models, tier) {
  const configPath = path.join(__dirname, '..', 'src', 'providers', 'model-configs.js');
  
  try {
    // Read existing config
    let configContent = await fs.readFile(configPath, 'utf-8');
    
    // Parse existing MODEL_CONFIGS
    const configStart = configContent.indexOf('export const MODEL_CONFIGS = {');
    const configEnd = configContent.lastIndexOf('};') + 2;
    const existingConfigStr = configContent.substring(configStart, configEnd);
    
    // Create new config object
    let newConfig = 'export const MODEL_CONFIGS = {\n';
    
    // Get all unique model names from both existing and new
    const existingModels = existingConfigStr.match(/'[^']+'/g)?.map(m => m.replace(/'/g, '')) || [];
    const allModels = [...new Set([...Object.keys(models), ...existingModels.filter(m => !m.includes(':')).filter((m, i) => i % 2 === 0)])];
    
    for (const modelName of allModels) {
      const newData = models[modelName];
      
      // Try to preserve existing data for the other tier
      const existingFreeMatch = existingConfigStr.match(new RegExp(`'${modelName}':[\\s\\S]*?free:[\\s\\S]*?\\}[\\s\\S]*?\\}`));
      const existingPaidMatch = existingConfigStr.match(new RegExp(`'${modelName}':[\\s\\S]*?paid:[\\s\\S]*?\\}[\\s\\S]*?\\}`));
      
      newConfig += `  '${modelName}': {\n`;
      
      // Add free tier config
      newConfig += `    free: {\n`;
      if (tier === 'free' && newData) {
        newConfig += `      contextWindow: ${newData.contextWindow},\n`;
        newConfig += `      limits: {\n`;
        newConfig += `        requests: { minute: ${newData.limits.requests.minute}, hour: ${newData.limits.requests.hour}, day: ${newData.limits.requests.day} }\n`;
        if (newData.limits.tokens && Object.keys(newData.limits.tokens).length > 0) {
          newConfig += `        // tokens: { minute: ${newData.limits.tokens.minute}, hour: ${newData.limits.tokens.hour}, day: ${newData.limits.tokens.day} }\n`;
        }
        newConfig += `      }\n`;
      } else {
        // Keep existing free config or use defaults
        newConfig += `      contextWindow: 65536,\n`;
        newConfig += `      limits: {\n`;
        newConfig += `        requests: { minute: 30, hour: 900, day: 14400 }\n`;
        newConfig += `      }\n`;
      }
      newConfig += `    },\n`;
      
      // Add paid tier config
      newConfig += `    paid: {\n`;
      if (tier === 'paid' && newData) {
        newConfig += `      contextWindow: ${newData.contextWindow},\n`;
        newConfig += `      limits: {\n`;
        newConfig += `        requests: { minute: ${newData.limits.requests.minute}, hour: ${newData.limits.requests.hour}, day: ${newData.limits.requests.day} }\n`;
        if (newData.limits.tokens && Object.keys(newData.limits.tokens).length > 0) {
          newConfig += `        // tokens: { minute: ${newData.limits.tokens.minute}, hour: ${newData.limits.tokens.hour}, day: ${newData.limits.tokens.day} }\n`;
        }
        newConfig += `      }\n`;
      } else {
        // Keep existing paid config or use defaults
        newConfig += `      contextWindow: 65536,\n`;
        newConfig += `      limits: {\n`;
        newConfig += `        requests: { minute: 30, hour: 900, day: 14400 }\n`;
        newConfig += `      }\n`;
      }
      newConfig += `    }\n`;
      newConfig += `  }${allModels.indexOf(modelName) < allModels.length - 1 ? ',' : ''}\n`;
    }
    
    newConfig += '};\n';
    
    // Replace the MODEL_CONFIGS in the file
    const newContent = configContent.substring(0, configStart) + newConfig + configContent.substring(configEnd);
    
    // Write updated config
    await fs.writeFile(configPath, newContent);
    
    console.log(`✅ Successfully updated ${Object.keys(models).length} models for ${tier} tier`);
    console.log('\nUpdated models:');
    for (const [model, config] of Object.entries(models)) {
      console.log(`  - ${model}: ${config.limits.requests.minute}/${config.limits.requests.hour}/${config.limits.requests.day} requests`);
    }
    
  } catch (error) {
    console.error('❌ Error updating model configs:', error.message);
    process.exit(1);
  }
}

/**
 * Main function to collect input and process
 */
async function main() {
  console.log(`📋 Paste the ${tier.toUpperCase()} tier rate limits table from Cerebras dashboard`);
  console.log('   (Type "END" on a new line when done)\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let input = '';
  
  rl.on('line', (line) => {
    if (line.trim() === 'END') {
      rl.close();
    } else {
      input += line + '\n';
    }
  });
  
  rl.on('close', () => {
    if (!input.trim()) {
      console.error('❌ No input provided');
      process.exit(1);
    }
    
    console.log('\n🔄 Parsing rate limits...\n');
    const models = parseRateLimits(input);
    
    if (Object.keys(models).length === 0) {
      console.error('❌ No models found in the pasted data');
      console.error('   Make sure you copied the entire table including model names');
      process.exit(1);
    }
    
    console.log(`📊 Found ${Object.keys(models).length} models\n`);
    
    // Show what was parsed
    console.log('Parsed configuration:');
    for (const [model, config] of Object.entries(models)) {
      console.log(`\n${model}:`);
      console.log(`  Context: ${config.contextWindow}`);
      console.log(`  Requests: ${config.limits.requests.minute}/${config.limits.requests.hour}/${config.limits.requests.day} (min/hour/day)`);
      if (config.limits.tokens && Object.keys(config.limits.tokens).length > 0) {
        console.log(`  Tokens: ${config.limits.tokens.minute}/${config.limits.tokens.hour}/${config.limits.tokens.day} (min/hour/day)`);
      }
    }
    
    console.log('\n🔧 Updating model configurations...\n');
    updateModelConfigs(models, tier).then(() => {
      console.log('\n✨ Done! Model configurations have been updated.');
      console.log(`   Run the same command with --tier ${tier === 'free' ? 'paid' : 'free'} to update the other tier.`);
    });
  });
}

main();