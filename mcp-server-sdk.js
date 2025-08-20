#!/usr/bin/env node

/**
 * Cerebras Code MCP Server using Official MCP SDK v0.5.0
 * This provides proper MCP protocol implementation for Cursor integration
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import https from 'https';
import fs from 'fs/promises';
import path from 'path';

// Configuration - API key must be set via MCP environment variables
const config = {
  apiKey: process.env.CEREBRAS_API_KEY,
  model: process.env.CEREBRAS_MODEL || "qwen-3-coder-480b",
  maxTokens: process.env.CEREBRAS_MAX_TOKENS ? parseInt(process.env.CEREBRAS_MAX_TOKENS) : null,
  temperature: parseFloat(process.env.CEREBRAS_TEMPERATURE) || 0.1
};

// Clean up markdown artifacts from API response
function cleanCodeResponse(response) {
  if (!response) return response;
  
  // Remove markdown code blocks
  let cleaned = response
    .replace(/```[a-zA-Z]*\n?/g, '')  // Remove opening ```html, ```python, etc.
    .replace(/```\n?/g, '')            // Remove closing ```
    .trim();
  
  // If the response starts with a language identifier on its own line, remove it
  const lines = cleaned.split('\n');
  if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
    lines.shift();
    cleaned = lines.join('\n').trim();
  }
  
  return cleaned;
}

// Create MCP server
const server = new Server({
  name: "cerebras-code-mcp",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Read file content safely
async function readFileContent(filePath) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (filePath.startsWith('/')) {
      absolutePath = filePath;
      console.error(`📍 Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`🏠 Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`🔄 Relative path converted: "${filePath}" → "${absolutePath}"`);
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
    if (filePath.startsWith('/')) {
      absolutePath = filePath;
      console.error(`📍 Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`🏠 Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`🔄 Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(absolutePath, content, 'utf-8');
    console.error(`📝 File written to: ${absolutePath}`);
    console.error(`📁 Current working directory: ${process.cwd()}`);
    console.error(`🔗 Original path: ${filePath}`);
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

// Call Cerebras Code API - generates only code, no explanations
async function callCerebras(prompt, context = "", outputFile = "", language = null) {
  try {
    // Check if API key is available
    if (!config.apiKey) {
      throw new Error("No Cerebras API key available. Set CEREBRAS_API_KEY environment variable or use through Cursor MCP.");
    }
    
    // Determine language from file extension or explicit parameter
    const detectedLanguage = getLanguageFromFile(outputFile, language);
    
    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
    
    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }
    
    // Read existing file content if it exists (for modification)
    const existingContent = await readFileContent(outputFile);
    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.model,
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
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: 'api.cerebras.ai',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${config.apiKey}`
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
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    throw new Error(`Cerebras API call failed: ${error.message}`);
  }
}

// Handle tools/list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "cerebras-code-write",
        description: "Generate code using Cerebras Code API and write it to a file. Use absolute paths (e.g., '/path/to/file.py') to write to specific directories, or relative paths to write to the server's current directory.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Description of what code to generate"
            },
            context: {
              type: "string",
              description: "Additional context or requirements (optional)"
            },
            outputFile: {
              type: "string",
              description: "Path to the file where code should be written. Use absolute paths like '/Users/username/project/file.py' to write to specific directories."
            },
            language: {
              type: "string",
              description: "Programming language to use (e.g., 'python', 'javascript', 'html'). If not specified, will be auto-detected from file extension."
            }
          },
          required: ["prompt", "outputFile"]
        }
      },
      {
        name: "cerebras-code-diff-edit",
        description: "Intelligently modify existing code files using Cerebras Code API. Use absolute paths (e.g., '/path/to/file.py') to modify files in specific directories, or relative paths for files in the server's current directory.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Description of what changes to make to the existing code"
            },
            context: {
              type: "string",
              description: "Additional context or requirements (optional)"
            },
            filePath: {
              type: "string",
              description: "Path to the file to modify. Use absolute paths like '/Users/username/project/file.py' to modify files in specific directories."
            },
            language: {
              type: "string",
              description: "Programming language to use (e.g., 'python', 'javascript', 'html'). If not specified, will be auto-detected from file extension."
            }
          },
          required: ["prompt", "filePath"]
        }
      }
    ]
  };
});

// Handle tools/call requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "cerebras-code-write") {
    try {
      const { 
        prompt, 
        context = "", 
        outputFile,
        language = null
      } = request.params.arguments;
      
      if (!prompt) {
        throw new Error("Prompt is required for cerebras-code-write tool");
      }
      
      if (!outputFile) {
        throw new Error("outputFile is required for cerebras-code-write tool");
      }
      
      // Check if file exists before generating code
      const fileExists = await readFileContent(outputFile);
      const fileOperation = fileExists ? "modified" : "created";
      
      // Generate code using Cerebras API
      const result = await callCerebras(prompt, context, outputFile, language);
      
      // Write the result to the file
      await writeFileContent(outputFile, result);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ Code ${fileOperation} and written to ${outputFile}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to generate code: ${error.message}`);
    }
  } else if (request.params.name === "cerebras-code-diff-edit") {
    try {
      const { 
        prompt, 
        context = "", 
        filePath,
        language = null
      } = request.params.arguments;
      
      if (!prompt) {
        throw new Error("Prompt is required for cerebras-code-diff-edit tool");
      }
      
      if (!filePath) {
        throw new Error("filePath is required for cerebras-code-diff-edit tool");
      }
      
      // Read existing file content
      const existingContent = await readFileContent(filePath);
      if (!existingContent) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Generate modified code using Cerebras API
      const modifiedContent = await callCerebras(prompt, context, filePath, language);
      
      // Write the modified content back to the file
      await writeFileContent(filePath, modifiedContent);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ File ${filePath} successfully modified with requested changes`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to modify file: ${error.message}`);
    }
  } else {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Main function
async function main() {
  try {
    // Check if API key is available (either from env or allow manual override)
    if (!config.apiKey) {
      console.error("⚠️  No API key found in environment variables");
      console.error("💡 You can still test the server manually by setting CEREBRAS_API_KEY");
      console.error("💡 Or use it through Cursor MCP which will provide the key automatically");
    } else {
      console.error(`🔑 API key found: ${config.apiKey.substring(0, 8)}...`);
    }
    
    console.error('🚀 Cerebras Code MCP Server starting...');
    console.error(`📝 Using model: ${config.model}`);
    console.error(`⚙️  Max tokens: ${config.maxTokens || 'not set (using API default)'}`);
    console.error(`🌡️  Temperature: ${config.temperature}`);
    console.error(`📁 Server working directory: ${process.cwd()}`);
    console.error('⏳ Starting MCP server...');
    
    // Create transport and run server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ MCP Server connected and ready!');
    console.error(`🔧 Available tools: cerebras-code-write, cerebras-code-diff-edit`);
    console.error(`📖 Use @cerebras-code-write in Cursor to generate code`);
    console.error(`📝 Use @cerebras-code-diff-edit in Cursor to modify existing files`);
    console.error(`💡 Example: @cerebras-code-write prompt: "Create a hello world function", outputFile: "hello.py"`);
    console.error(`💡 Example: @cerebras-code-diff-edit prompt: "Add error handling", filePath: "hello.py"`);
    console.error(`💡 Current working directory: ${process.cwd()}`);
    console.error(`💡 Path handling options:`);
    console.error(`   • Relative paths (e.g., "hello.py") → written to current server directory`);
    console.error(`   • Absolute paths (e.g., "/path/to/file.py") → written to exact location`);
    console.error(`   • Home paths (e.g., "~/Documents/file.py") → expanded from home directory`);
    console.error(`💡 Examples:`);
    console.error(`   • "hello.py" → "${path.join(process.cwd(), 'hello.py')}"`);
    console.error(`   • "/Users/Kevin.Taylor/Documents/GitHub/your-project/hello.py" → exact path`);
    console.error(`   • "~/Desktop/test.py" → "${path.join(process.env.HOME, 'Desktop/test.py')}"`);
    console.error(`💡 TIP: Use absolute paths to write files to specific directories!`);
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
main();
