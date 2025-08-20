# 🚀 Cerebras Code MCP Server

A **Model Context Protocol (MCP) server** that provides seamless access to the **Cerebras Code API** directly within **Cursor**. This allows you to generate high-quality code using Cerebras' powerful AI models through Cursor's MCP integration.

## ✨ Features

- **🔌 Direct Cursor Integration**: Works seamlessly with Cursor's MCP system
- **🤖 Cerebras Code API**: Access to state-of-the-art code generation models
- **📝 Multi-language Support**: Auto-detects language from file extension
- **⚡ Real-time**: Instant code generation and file writing
- **📁 Direct File Writing**: Generates code directly into your workspace files
- **🔒 Secure**: API keys configured only in MCP settings, never in command line
- **🎯 Code Only**: Generates pure code with no explanations or markdown
- **📚 MCP Compliant**: Follows official Model Context Protocol specification

## 🚀 Quick Start

### 1. **Get Your Cerebras API Key**

1. Visit [Cerebras Console](https://console.cerebras.ai/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key (format: `csk-abc123def456ghi789`)

### 2. **Configure Cursor MCP Settings**

Edit your `~/.cursor/mcp.json` file and add the Cerebras server:

```json
{
  "mcpServers": {
    "cerebras-code": {
      "command": "node",
      "args": ["/path/to/your/cerebras-code-mcp/mcp-server-sdk.js"],
      "env": {
        "CEREBRAS_API_KEY": "csk-your-actual-api-key-here"
      }
    }
  }
}
```

**⚠️ Important**: Replace `csk-your-actual-api-key-here` with your real API key!

### 3. **Restart Cursor**

Restart Cursor completely for the new MCP server to load.

### 4. **Test the Tool**

Use the tool directly in Cursor:

```
@cerebras-code-write Write a function to calculate fibonacci numbers in Python
```

## 🛠️ Usage in Cursor

### **Generate Code to File**
```
@cerebras-code-write prompt: "Create a function to calculate fibonacci numbers", outputFile: "utils/math.py"
```

### **Generate with Context**
```
@cerebras-code-write prompt: "Create a React component for a todo list", context: "Using TypeScript and hooks", outputFile: "src/components/TodoList.tsx"
```

### **Modify Existing File**
```
@cerebras-code-diff-edit prompt: "Add error handling to the existing function", context: "This is a utility file for data processing", filePath: "src/utils/helpers.js"
```

## 🔧 MCP Tool Schema

The tool generates code and writes it directly to files:

```json
{
  "name": "cerebras-code-write",
  "description": "Generate code using Cerebras Code API and write it to a file. Generates only code, no explanations.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "A clear description of what code you want to generate. Be specific about requirements and functionality."
      },
      "context": {
        "type": "string",
        "description": "Additional context about your project, existing code, or specific requirements"
      },
      "outputFile": {
        "type": "string",
        "description": "Path to the file where the generated code should be written. Required parameter."
      }
    },
    "required": ["prompt", "outputFile"]
  }
}
```

## 📁 File Operations

### **Creating New Files**
- Specify `outputFile` path
- Set `modifyExisting: false` (optional, default is true)
- File will be created with generated code

### **Modifying Existing Files**
- Specify `outputFile` path
- Set `modifyExisting: true` (default)
- Existing file content is used as context
- Generated code replaces the file content

### **Smart Context Handling**
- When modifying files, the tool reads existing content
- Provides context to Cerebras API for better code generation
- Preserves file structure and style when possible

## ⚙️ Configuration Options

You can customize the model behavior through environment variables in your MCP configuration:

```json
{
  "mcpServers": {
    "cerebras-code": {
      "command": "node",
      "args": ["/path/to/mcp-server-sdk.js"],
      "env": {
        "CEREBRAS_API_KEY": "csk-your-api-key",
        "CEREBRAS_MODEL": "qwen-3-coder-480b",
        "CEREBRAS_MAX_TOKENS": "2048",
        "CEREBRAS_TEMPERATURE": "0.1"
      }
    }
  }
}
```

### Available Options:
- **`CEREBRAS_API_KEY`** (required): Your Cerebras API key
- **`CEREBRAS_MODEL`** (optional): Model to use (default: `qwen-3-coder-480b`)
- **`CEREBRAS_MAX_TOKENS`** (optional): Maximum tokens for generation (default: `2048`)
- **`CEREBRAS_TEMPERATURE`** (optional): Creativity level 0.0-1.0 (default: `0.1`)

## 🏗️ Architecture

```
┌─────────────┐    MCP Protocol    ┌──────────────────┐    HTTP API    ┌─────────────────┐
│   Cursor    │ ◄────────────────► │  MCP Server      │ ─────────────► │  Cerebras API   │
│             │                    │  (Node.js)       │               │                 │
│             │                    │                  │               │                 │
└─────────────┘                    └──────────────────┘               └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  File System    │
                                    │  Operations     │
                                    └─────────────────┘
```

## 📁 Project Structure

```
cerebras-code-mcp/
├── mcp-server-sdk.js      # Main MCP server using official SDK
├── test-mcp-server.js     # Test script for verification
├── package.json           # Project dependencies
├── README.md              # This file
├── SETUP.md               # Detailed setup instructions
└── .gitignore             # Git ignore patterns
```

## 🔐 Security

- **No Hardcoded Keys**: API keys are never stored in source code
- **MCP Environment Variables**: Secure configuration through Cursor's MCP system
- **Input Validation**: Proper MCP protocol validation
- **Error Handling**: Comprehensive error handling without exposing sensitive data
- **File Safety**: Safe file operations with proper error handling

## 🧪 Testing

Run the test script to verify everything works:

```bash
# Test with your API key
CEREBRAS_API_KEY="your-key" node test-mcp-server.js
```

## 🚨 Troubleshooting

### Server Won't Start
- Check your API key is set correctly in `~/.cursor/mcp.json`
- Ensure you have Node.js 18+ installed (`node --version`)
- Check the console for error messages

### Cursor Can't Connect
- Verify the MCP configuration in `~/.cursor/mcp.json`
- Ensure the working directory path is correct
- Restart Cursor after configuration changes
- Check that the server is running

### File Operation Errors
- Ensure the output file path is valid
- Check file permissions for the target directory
- Verify the file path is relative to your workspace root

### API Errors
- Verify your Cerebras API key is valid
- Check your API quota/limits
- Ensure you have access to the specified model

## 🔮 Future Enhancements

- **Streaming Responses**: Real-time code generation
- **Multiple Models**: Support for different Cerebras models
- **Code Context**: Better integration with existing codebase
- **Templates**: Pre-built code templates for common patterns
- **History**: Save and reuse successful code generations
- **Batch Operations**: Modify multiple files at once
- **Git Integration**: Automatic commit messages for generated code

## 📚 Resources

- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [Cerebras API Documentation](https://docs.cerebras.ai/)
- [Cursor MCP Integration](https://cursor.sh/docs/mcp)
- [Setup Guide](SETUP.md) - Detailed configuration instructions

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this MCP server!

---

**Ready to generate and modify code with Cerebras in Cursor! 🎉**
