# Cerebras Code MCP Server

This MCP server is designed for **planning with another model** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model.

## 1. Install
```bash
npm install -g cerebras-code-mcp
```

## 2. Run the command
```bash
cerebras-mcp
```

## 3. Get Cerebras API key
Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key

## 4. Add to Cursor mcp.json
Edit `~/.cursor/mcp.json` for Cursor and `~/.config/claude/mcp/config.json` for Claude Code:
```json
{
  "mcpServers": {
    "cerebras-code": {
      "command": "cerebras-mcp",
      "env": {
        "CEREBRAS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 5. Append to the system prompt that it should use the tool
Add this to your system prompt:
```
When the user asks you to write/edit code, use the cerebras-code tools.
```
