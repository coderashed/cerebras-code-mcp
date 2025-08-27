# Cerebras Code MCP Server v1.1.0

This MCP server is designed for **planning with another model** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model, and can be embedded in IDEs like Claude Code, Cursor, etc.

## ✨ New in v1.1.0

- **Context Files Support**: Include multiple files as context for better code generation
- **Smart Deduplication**: Automatically filters output file from context to avoid duplication
- **Enhanced Tool**: Improved `write` tool with context files support
- **Enhanced Visual Diffs**: Git-style diffs with emoji indicators (✅ additions, ❌ removals, 🔍 changes)
- **Better Error Handling**: Gracefully handles missing context files and API failures

## 1. Install
```bash
npm install -g cerebras-code-mcp
```

## 2. Run the command to setup on Cursor/Claude Code
```bash
cerebras-mcp --config
```

You can also use this link to [install quickly to Cursor](https://cursor.com/en/install-mcp?name=cerebras-code&config=eyJjb21tYW5kIjoiY2VyZWJyYXMtbWNwIiwiZW52Ijp7IkNFUkVCUkFTX0FQSV9LRVkiOiJ5b3VyLWNlcmVicmFzLWtleS1oZXJlIiwiT1BFTlJPVVRFUl9BUElfS0VZIjoieW91ci1vcGVucm91dGVyLWtleS1oZXJlIn19)

## 3. Get Cerebras API key
Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key


## 4. Usage in Cursor

The MCP tool will appear as `write` in your tool list. It supports:

- **Natural language prompts**: Just describe what you want in plain English
- **Context files**: Include multiple files as context for better code understanding
- **Visual diffs**: See changes with emoji-enhanced Git-style diffs

Example usage:
```
Use the write tool to create a REST API with Express.js that handles user authentication
```

## 6. Add OpenRouter as a backup in case you hit your Cerebras rate limits
Visit [OpenRouter](https://openrouter.ai/) and get a key to use as a fallback provider.

You can set this key in your MCP settings under OPENROUTER_API_KEY, and it will trigger automatically if anything goes wrong with calling Cerebras.