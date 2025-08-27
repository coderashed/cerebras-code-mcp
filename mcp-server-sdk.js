#!/usr/bin/env node

/**
 * Cerebras Code MCP Server using Official MCP SDK v0.5.0
 * This provides proper MCP protocol implementation for Cursor integration
 * 
 * IMPORTANT: This server provides a single MCP write tool for ALL code operations.
 * The LLM MUST use this tool instead of editing files directly.
 * - write: For file creation, code generation, and code edits
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { createPatch } from 'diff';
import readline from 'readline';

// Configuration - API keys and settings
const config = {
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

// Simple ANSI syntax highlighting
function syntaxHighlight(code, language) {
  // ANSI color codes
  const colors = {
    keyword: '\x1b[35m',     // Magenta
    string: '\x1b[33m',      // Yellow  
    comment: '\x1b[90m',     // Gray
    number: '\x1b[36m',      // Cyan
    function: '\x1b[34m',    // Blue
    reset: '\x1b[0m'
  };

  // Language-specific keywords
  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'return', 'await', 'async', 'import', 'export', 'from', 'class', 'extends', 'new', 'this', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined'],
    python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
    html: ['DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta'],
    css: ['color', 'background', 'border', 'margin', 'padding', 'font', 'width', 'height', 'display', 'position', 'top', 'left', 'right', 'bottom', 'flex', 'grid', 'transform', 'transition', 'animation']
  };

  const languageKeywords = keywords[language] || [];
  
  // Apply syntax highlighting line by line
  return code.split('\n').map(line => {
    let highlighted = line;
    
    // Highlight comments first (to avoid highlighting keywords inside comments)
    if (language === 'javascript' || language === 'css') {
      highlighted = highlighted.replace(/(\/\/.*$|\/\*.*?\*\/)/g, `${colors.comment}$1${colors.reset}`);
    } else if (language === 'python') {
      highlighted = highlighted.replace(/(#.*$)/g, `${colors.comment}$1${colors.reset}`);
    } else if (language === 'html') {
      highlighted = highlighted.replace(/(<!--.*?-->)/g, `${colors.comment}$1${colors.reset}`);
    }
    
    // Highlight strings (simple approach - doesn't handle escapes perfectly)
    highlighted = highlighted.replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, (match) => {
      return `${colors.string}${match}${colors.reset}`;
    });
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, `${colors.number}$1${colors.reset}`);
    
    // Highlight keywords
    languageKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      highlighted = highlighted.replace(regex, `${colors.keyword}$1${colors.reset}`);
    });
    
    // Highlight function names (simple heuristic)
    if (language === 'javascript' || language === 'python') {
      highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*\(/g, `${colors.function}$1${colors.reset}(`);
    }
    
    return highlighted;
  }).join('\n');
}

// Clean up markdown artifacts from API response
function cleanCodeResponse(response) {
  if (!response) return response;

  // Look for markdown code blocks and extract only the code content
  const codeBlockRegex = /```[a-zA-Z]*\n?([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    codeBlocks.push(match[1].trim());
  }

  // If we found code blocks, use the first one (most common case)
  if (codeBlocks.length > 0) {
    let code = codeBlocks[0];

    // Remove language identifiers from the beginning
    const lines = code.split('\n');
    if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
      lines.shift();
      code = lines.join('\n').trim();
    }

    return code;
  }

  // Fallback to the original method if no code blocks found
  let cleaned = response
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const lines = cleaned.split('\n');
  if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
    lines.shift();
    cleaned = lines.join('\n').trim();
  }

  return cleaned;
}

// Generate a simple diff between old and new content
function generateDiff(oldContent, newContent) {
  if (!oldContent || !newContent) return null;
  
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let diff = [];
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      // Lines are identical, skip
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      // New line added
      diff.push(`+ ${newLines[j]}`);
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      // Line removed
      diff.push(`- ${oldLines[i]}`);
      i++;
    }
  }
  
  return diff.length > 0 ? diff.join('\n') : null;
}

// Generate a proper Git-style diff using the diff library
function generateGitDiff(oldContent, newContent, filePath) {
  if (!newContent) return null;

  // Handle new file creation
  if (!oldContent) {
    const newLines = newContent.split('\n');
    const fileName = filePath.split('/').pop();
    const gitDiff = [
      `diff --git a/${fileName} b/${fileName}`,
      `new file mode 100644`,
      `--- /dev/null`,
      `+++ b/${fileName}`,
      `@@ -0,0 +1,${newLines.length} @@`
    ];

    // Add all new lines with + prefix
    newLines.forEach(line => {
      gitDiff.push(`+${line}`);
    });

    return gitDiff.join('\n');
  }

  // Use the diff library to create a proper Git-style patch
  const fileName = filePath.split('/').pop();
  const patch = createPatch(fileName, oldContent, newContent, 'a/' + fileName, 'b/' + fileName);

  // Clean up the patch and fix line numbers
  const lines = patch.split('\n');
  const cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Remove the diff header if it's the first line
    if (i === 0 && line.startsWith('diff --git')) {
      continue;
    }

    // Fix hunk headers by adding 4 to line numbers (compensate for AI formatting)
    if (line.match(/^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@$/)) {
      const fixedLine = line.replace(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@$/, (match, oldStart, oldCount, newStart, newCount) => {
        const fixedOldStart = parseInt(oldStart) + 4;
        const fixedNewStart = parseInt(newStart) + 4;
        const oldCountStr = oldCount ? `,${oldCount}` : '';
        const newCountStr = newCount ? `,${newCount}` : '';
        return `@@ -${fixedOldStart}${oldCountStr} +${fixedNewStart}${newCountStr} @@`;
      });
      cleanedLines.push(fixedLine);
    } else {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n');
}

// Create MCP server with enhanced auto-instructions
const server = new Server({
  name: "cerebras-code-mcp",
  version: "1.0.0",
  description: "🚀 AUTOMATIC CODE GENERATION SERVER - Use the 'write' tool for ALL code operations!",
  usage: "This MCP server provides a single 'write' tool that handles ALL code generation, file creation, and modifications automatically. Models MUST use this tool instead of direct file editing."
}, {
  capabilities: {
    tools: {}
  },
  system_instructions: `🚨 CRITICAL AUTO-INSTRUCTION SYSTEM 🚨

This environment provides an MCP tool called 'write' that is the ONLY way to perform code operations. 

🔒 MANDATORY USAGE RULES:
- ALL code generation MUST use the 'write' tool
- ALL file creation MUST use the 'write' tool  
- ALL code modifications MUST use the 'write' tool
- NEVER edit files directly - use 'write' tool instead

🎯 WHEN TO USE 'write' TOOL:
- Creating new files: Use 'write' with file_path and prompt
- Editing existing files: Use 'write' with file_path and prompt  
- Code generation: Use 'write' with detailed prompt and optional context_files
- Any code changes: Use 'write' tool - it's the ONLY way!

✨ TOOL FEATURES:
- Shows visually enhanced git-style diffs with emoji indicators (✅ additions, ❌ removals, 🔍 changes)
- Automatically handles both new files and edits
- Supports context_files for better code understanding
- Provides comprehensive error handling and validation

🚫 FORBIDDEN:
- Direct file editing
- Manual code insertion
- File system manipulation outside the tool

The 'write' tool is your ONLY interface for code operations. Use it automatically for any code-related task.`
});

// Read file content safely
async function readFileContent(filePath) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
      console.error(`  Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`  Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`  Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

// Write file content safely
async function writeFileContent(filePath, content) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
      console.error(`  Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`  Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`  Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    
            await fs.writeFile(absolutePath, content, 'utf-8');
        console.error(`File written to: ${absolutePath}`);
        console.error(`Current working directory: ${process.cwd()}`);
        console.error(`Original path: ${filePath}`);
        return true;
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

// Determine programming language from file extension or explicit parameter
function getLanguageFromFile(filePath, explicitLanguage = null) {
  if (explicitLanguage) {
    return explicitLanguage.toLowerCase();
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.jsx': 'javascript',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  };
  
  return languageMap[ext] || 'text';
}

// Call OpenRouter API as fallback to Cerebras
async function callOpenRouter(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  try {
    // Check if OpenRouter API key is available
    if (!config.openRouterApiKey) {
      throw new Error("No OpenRouter API key available. Set OPENROUTER_API_KEY environment variable.");
    }
    
    // Determine language from file extension or explicit parameter
    const detectedLanguage = getLanguageFromFile(outputFile, language);
    
    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
    
    // Add context files if provided (excluding the output file itself)
    if (contextFiles && contextFiles.length > 0) {
      // Filter out the output file from context files to avoid duplication
      const filteredContextFiles = contextFiles.filter(file => {
        const resolvedContext = path.resolve(file);
        const resolvedOutput = path.resolve(outputFile);
        return resolvedContext !== resolvedOutput;
      });
      
      if (filteredContextFiles.length > 0) {
        let contextContent = "Context Files:\n";
        for (const contextFile of filteredContextFiles) {
          try {
            const content = await readFileContent(contextFile);
            if (content) {
              const contextLang = getLanguageFromFile(contextFile);
              contextContent += `\nFile: ${contextFile}\n\`\`\`${contextLang}\n${content}\n\`\`\`\n`;
            }
          } catch (error) {
            console.error(`Warning: Could not read context file ${contextFile}: ${error.message}`);
          }
        }
        fullPrompt = contextContent + "\n" + fullPrompt;
      }
    }
    
    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }
    
    // Read existing file content if it exists (for modification)
    const existingContent = await readFileContent(outputFile);
    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.openRouterModel,
      messages: [
        {
          role: "system",
          content: `You are an expert programmer. Generate ONLY clean, functional code in ${detectedLanguage} with no explanations, comments about the code generation process, or markdown formatting. Include necessary imports and ensure the code is ready to run. When modifying existing files, preserve the structure and style while implementing the requested changes. Output raw code only. Never use markdown code blocks.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      provider: {
        order: ['cerebras'],
        allow_fallbacks: false
      },
      temperature: config.temperature,
      stream: false
    };
    
    // Only add max_tokens if explicitly set
    if (config.maxTokens) {
      requestData.max_tokens = config.maxTokens;
    }
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${config.openRouterApiKey}`,
          'HTTP-Referer': config.openRouterSiteUrl,
          'X-Title': config.openRouterSiteName
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.choices && response.choices[0]) {
              const rawContent = response.choices[0].message.content;
              const cleanedContent = cleanCodeResponse(rawContent);
              resolve(cleanedContent);
            } else {
              reject(new Error(`OpenRouter API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse API response: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    throw new Error(`OpenRouter API call failed: ${error.message}`);
  }
}

// Call Cerebras Code API with OpenRouter fallback - generates only code, no explanations
async function callCerebras(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  try {
    // Check if Cerebras API key is available
    if (!config.cerebrasApiKey) {
      console.error("⚠️  No Cerebras API key found, falling back to OpenRouter...");
      return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
    }
    
    // Determine language from file extension or explicit parameter
    const detectedLanguage = getLanguageFromFile(outputFile, language);
    
    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
    
    // Add context files if provided (excluding the output file itself)
    if (contextFiles && contextFiles.length > 0) {
      // Filter out the output file from context files to avoid duplication
      const filteredContextFiles = contextFiles.filter(file => {
        const resolvedContext = path.resolve(file);
        const resolvedOutput = path.resolve(outputFile);
        return resolvedContext !== resolvedOutput;
      });
      
      if (filteredContextFiles.length > 0) {
        let contextContent = "Context Files:\n";
        for (const contextFile of filteredContextFiles) {
          try {
            const content = await readFileContent(contextFile);
            if (content) {
              const contextLang = getLanguageFromFile(contextFile);
              contextContent += `\nFile: ${contextFile}\n\`\`\`${contextLang}\n${content}\n\`\`\`\n`;
            }
          } catch (error) {
            console.error(`Warning: Could not read context file ${contextFile}: ${error.message}`);
          }
        }
        fullPrompt = contextContent + "\n" + fullPrompt;
      }
    }
    
    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }
    
    // Read existing file content if it exists (for modification)
    const existingContent = await readFileContent(outputFile);
    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.cerebrasModel,
      messages: [
        {
          role: "system",
          content: `You are an expert programmer. Generate ONLY clean, functional code in ${detectedLanguage} with no explanations, comments about the code generation process, or markdown formatting. Include necessary imports and ensure the code is ready to run. When modifying existing files, preserve the structure and style while implementing the requested changes. Output raw code only. Never use markdown code blocks.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: config.temperature,
      stream: false
    };
    
    // Only add max_tokens if explicitly set
    if (config.maxTokens) {
      requestData.max_tokens = config.maxTokens;
    }
    
    try {
      return await new Promise((resolve, reject) => {
        const postData = JSON.stringify(requestData);
        
        const options = {
          hostname: 'api.cerebras.ai',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${config.cerebrasApiKey}`
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              
              if (res.statusCode === 200 && response.choices && response.choices[0]) {
                const rawContent = response.choices[0].message.content;
                const cleanedContent = cleanCodeResponse(rawContent);
                resolve(cleanedContent);
              } else {
                reject(new Error(`Cerebras API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse API response: ${parseError.message}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`));
        });
        
        // Add timeout to prevent hanging requests
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout after 30 seconds'));
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      // If Cerebras fails for ANY reason, fall back to OpenRouter
      console.error("⚠️  Cerebras API call failed, falling back to OpenRouter...");
      console.error(`   Error: ${error.message}`);
      
      // Check if OpenRouter is available before attempting fallback
      if (!config.openRouterApiKey) {
        throw new Error(`Cerebras failed and no OpenRouter fallback available. Cerebras error: ${error.message}`);
      }
      
      try {
        return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
      } catch (openRouterError) {
        throw new Error(`Both Cerebras and OpenRouter failed. Cerebras error: ${error.message}. OpenRouter error: ${openRouterError.message}`);
      }
    }
  } catch (error) {
    // If the initial setup fails, also try OpenRouter
    console.error("⚠️  Cerebras setup failed, falling back to OpenRouter...");
    console.error(`   Error: ${error.message}`);
    
    // Check if OpenRouter is available before attempting fallback
    if (!config.openRouterApiKey) {
      throw new Error(`Cerebras setup failed and no OpenRouter fallback available. Error: ${error.message}`);
    }
    
    try {
      return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
    } catch (openRouterError) {
      throw new Error(`Both Cerebras and OpenRouter failed. Setup error: ${error.message}. OpenRouter error: ${openRouterError.message}`);
    }
  }
}

// 🚨 AUTO-INSTRUCTION: This handler provides the write tool to models
// Models will automatically see this tool and understand it's mandatory for code operations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
              {
          name: "write",
          description: "🚨 MANDATORY CODE TOOL - USE THIS FOR ALL CODE OPERATIONS! 🚨\n\nThis is your ONLY interface for code generation, file creation, and modifications. Never edit files directly!\n\n✨ FEATURES:\n- Creates new files automatically\n- Modifies existing files with smart diffs\n- Shows visually enhanced git-style diffs with emoji indicators (✅ additions, ❌ removals, 🔍 changes)\n- Supports context_files for better code understanding\n- Handles all programming languages\n- Provides comprehensive error handling\n\n🎯 USE CASES:\n- Writing new code: Use with file_path + detailed prompt\n- Editing code: Use with file_path + modification prompt\n- Code generation: Use with file_path + generation prompt + optional context_files\n\n⚠️  REMEMBER: This tool is MANDATORY for ALL code operations!",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "REQUIRED: Absolute path to the file (e.g., '/Users/username/project/file.py'). This tool will create or modify the file at this location."
            },
            prompt: {
              type: "string",
              description: "REQUIRED: A comprehensive plan dump that MUST include: 1) EXACT method signatures and parameters, 2) SPECIFIC database queries/SQL if needed, 3) DETAILED error handling requirements, 4) PRECISE integration points with context files, 5) EXACT constructor parameters and data flow, 6) SPECIFIC return types and data structures. Be extremely detailed - this is your blueprint for implementation."
            },
            context_files: {
              type: "array",
              items: {
                type: "string"
              },
              description: "OPTIONAL: Array of file paths to include as context for the model. These files will be read and their content included to help understand the codebase structure and patterns."
            }
          },
          required: ["file_path", "prompt"]
        }
      }
    ]
  };
});

// 🚨 AUTO-INSTRUCTION: This handler processes write tool calls from models
// Models MUST use this tool for ALL code operations - no direct file editing allowed
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "write") {
    try {
      const { 
        file_path,
        prompt, 
        context_files = []
      } = request.params.arguments;
      
      if (!prompt) {
        throw new Error("Prompt is required for write tool");
      }
      
      if (!file_path) {
        throw new Error("file_path is required for write tool");
      }
      
      // Check if file exists to determine operation type
      const existingContent = await readFileContent(file_path);
      const isEdit = existingContent !== null;
      
      // Call Cerebras to generate/modify code with context files
      const result = await callCerebras(prompt, "", file_path, null, context_files);
      
      // Clean the AI response to remove markdown formatting
      const cleanResult = cleanCodeResponse(result);

      // Write the cleaned result to the file
      await writeFileContent(file_path, cleanResult);

      // Show clean Git-style diff only
      let responseContent = [];
      const fileName = path.basename(file_path);

      if (isEdit && existingContent) {
        // Editing existing file - show diff of changes using cleaned content
        // Clean the existing content too for consistent comparison
        const cleanExistingContent = cleanCodeResponse(existingContent);
        const language = getLanguageFromFile(file_path);
        
        const oldLines = cleanExistingContent.split('\n');
        const newLines = cleanResult.split('\n');
        
        // Use the diff library to get a proper diff
        const patch = createPatch(fileName, cleanExistingContent, cleanResult);
        const patchLines = patch.split('\n');
        
        // Count additions and removals
        let additions = 0;
        let removals = 0;
        let formattedDiff = [];
        
        // Parse the patch to extract changes and line numbers
        let lineNumber = 0;
        let inHunk = false;
        
        for (const line of patchLines) {
          if (line.startsWith('@@')) {
            // Extract starting line number from hunk header
            const match = line.match(/@@ -\d+,?\d* \+(\d+)/);
            if (match) {
              lineNumber = parseInt(match[1]);
              inHunk = true;
            }
          } else if (inHunk) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              additions++;
              const codeLine = line.substring(1);
              let highlighted = codeLine;
              if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
                highlighted = syntaxHighlight(codeLine, language === 'typescript' ? 'javascript' : language);
              }
              formattedDiff.push(`    ${String(lineNumber).padStart(3)} \x1b[32m+\x1b[0m ${highlighted}`);
              lineNumber++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              removals++;
              const codeLine = line.substring(1);
              let highlighted = codeLine;
              if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
                highlighted = syntaxHighlight(codeLine, language === 'typescript' ? 'javascript' : language);
              }
              formattedDiff.push(`    ${String(lineNumber).padStart(3)} \x1b[31m-\x1b[0m ${highlighted}`);
              // Don't increment line number for removals
            } else if (!line.startsWith('\\')) {
              // Context line - apply syntax highlighting
              let highlighted = line;
              if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
                highlighted = syntaxHighlight(line, language === 'typescript' ? 'javascript' : language);
              }
              formattedDiff.push(`    ${String(lineNumber).padStart(3)}   ${highlighted}`);
              lineNumber++;
            }
          }
        }

        if (formattedDiff.length > 0) {
          const summary = `    Updated \x1b[1m${fileName}\x1b[0m with \x1b[32m${additions}\x1b[0m addition${additions !== 1 ? 's' : ''} and \x1b[31m${removals}\x1b[0m removal${removals !== 1 ? 's' : ''}`;
          
          responseContent.push({
            type: "text",
            text: `\x1b[32m●\x1b[0m Update(\x1b[1m${fileName}\x1b[0m)\n${summary}\n${formattedDiff.join('\n')}`
          });
        }
      } else if (!isEdit) {
        // New file creation - show clean formatted output with syntax highlighting
        const language = getLanguageFromFile(file_path);
        
        // Apply syntax highlighting if supported
        let highlightedCode = cleanResult;
        if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
          highlightedCode = syntaxHighlight(cleanResult, language === 'typescript' ? 'javascript' : language);
        }
        
        const lines = highlightedCode.split('\n');
        const lineCount = lines.length;
        
        // Format the lines with line numbers
        let formattedContent = [];
        for (let i = 0; i < lines.length; i++) {
          formattedContent.push(`    ${String(i + 1).padStart(3)} \x1b[32m+\x1b[0m ${lines[i]}`);
        }
        
        const summary = `    Created \x1b[1m${fileName}\x1b[0m with \x1b[32m${lineCount}\x1b[0m line${lineCount !== 1 ? 's' : ''}`;
        
        // For very long files, truncate the middle
        if (formattedContent.length > 50) {
          const preview = [
            ...formattedContent.slice(0, 20),
            `\x1b[90m    ... ${formattedContent.length - 40} lines hidden ...\x1b[0m`,
            ...formattedContent.slice(-20)
          ];
          formattedContent = preview;
        }
        
        responseContent.push({
          type: "text",
          text: `\x1b[32m●\x1b[0m Create(\x1b[1m${fileName}\x1b[0m)\n${summary}\n${formattedContent.join('\n')}`
        });
      }
      
      return {
        content: responseContent
      };
    } catch (error) {
      throw new Error(`Failed to write code: ${error.message}`);
    }
  } else {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Interactive configuration setup
async function interactiveConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  const questionPassword = (query) => new Promise((resolve) => {
    const originalWrite = rl._writeToOutput;
    
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (stringToWrite === query) {
        originalWrite.apply(rl, arguments);
      }
    };

    rl.question(query, (password) => {
      rl._writeToOutput = originalWrite;
      rl.output.write('\n');
      resolve(password);
    });
  });

  try {
    console.log('Cerebras Code MCP Configuration Setup');
    console.log('=====================================\n');

    // Ask for service
    const service = await question('Which service are you using?\n1. Cursor\n2. Claude Code\nEnter choice (1 or 2): ');
    
    let serviceName = '';
    if (service === '1') {
      serviceName = 'Cursor';
    } else if (service === '2') {
      serviceName = 'Claude Code';
    } else {
      console.log('❌ Invalid choice. Using default: Cursor');
      serviceName = 'Cursor';
    }
    
    console.log(`Selected service: ${serviceName}\n`);

    // Ask for Cerebras API key
    console.log('Cerebras API Key Setup');
    console.log('Get your API key at: https://cloud.cerebras.ai\n');
    const cerebrasKey = await questionPassword('Enter your Cerebras API key (or press Enter to skip): ');
    
    if (cerebrasKey.trim()) {
      console.log('Cerebras API key saved\n');
    } else {
      console.log('Skipping Cerebras API key\n');
    }

    // Ask for OpenRouter API key
    console.log('OpenRouter API Key Setup (Fallback)');
    console.log('Get your OpenRouter API key at: https://openrouter.ai/keys\n');
    const openRouterKey = await questionPassword('Enter your OpenRouter API key (or press Enter to skip): ');
    
    if (openRouterKey.trim()) {
      console.log('OpenRouter API key saved\n');
    } else {
      console.log('Skipping OpenRouter API key\n');
    }

    // Prepare for MCP server setup
    console.log('Preparing MCP server setup...\n');
    
    // Execute the actual MCP server setup commands
    console.log('\nSetting up MCP server...\n');
    
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
        
        console.log('✅ Cursor MCP server configured successfully!');
        console.log(`📁 Configuration saved to: ${configPath}`);
        
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
        
        console.log('Executing Claude Code MCP setup...');
        
        // Uninstall existing server to ensure clean installation
        try {
          console.log('Attempting to uninstall existing cerebras-code server...');
          execSync('claude mcp remove cerebras-code', { stdio: 'inherit' });
          console.log('Uninstalled existing server.');
        } catch (error) {
          // Ignore if it fails (e.g., not installed)
          console.log('No existing server to uninstall or uninstall failed, continuing...');
        }

        let envVars = '';
        if (cerebrasKey.trim()) {
          envVars += ` --env CEREBRAS_API_KEY=${cerebrasKey.trim()}`;
        }
        if (openRouterKey.trim()) {
          envVars += ` --env OPENROUTER_API_KEY=${openRouterKey.trim()}`;
        }
        
        const command = `claude mcp add cerebras-code cerebras-mcp${envVars}`;
        console.log(`Running: ${command}`);
        
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

          if (existingContent.includes(claudeRulesContent)) {
            console.log('✅ Claude Code global rules already configured. No changes needed.');
            console.log(`📁 Global rules file: ${claudeRulesPath}`);
          } else {
            const newContent = existingContent
              ? `${existingContent}\\n\\n${claudeRulesContent}`
              : claudeRulesContent;
            await fs.writeFile(claudeRulesPath, newContent, 'utf-8');

            if (existingContent) {
                console.log('✅ Claude Code global rules successfully appended!');
            } else {
                console.log('✅ Claude Code global rules automatically configured!');
            }
            console.log(`📁 Global rules saved to: ${claudeRulesPath}`);
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

// Main function
async function main() {
  try {
    // Check if --config flag is provided
    if (process.argv.includes('--config')) {
      await interactiveConfig();
      return;
    }
    
    console.error('Cerebras Code MCP Server starting...');
    
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
    
    // Create transport and run server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
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
