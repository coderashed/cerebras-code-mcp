import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleWriteTool } from './tool-handlers.js';

// Create MCP server with enhanced auto-instructions
export const server = new Server({
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

// Register tool handlers
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "write") {
    return await handleWriteTool(request.params.arguments);
  } else {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
