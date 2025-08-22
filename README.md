# Cerebras Code MCP Server

This MCP server is designed for **planning with another model** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model, and can be embedded in IDEs like Claude Code, Cursor, etc.

## 1. Install
```bash
npm install -g cerebras-code-mcp
```

## 2. Run the command to test
```bash
cerebras-mcp
```

## 3. Get Cerebras API key
Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key

## 4. Add to your editor:

[![Install Cerebras MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=cerebras-code&config=eyJjb21tYW5kIjoiY2VyZWJyYXMtbWNwIiwiZW52Ijp7IkNFUkVCUkFTX0FQSV9LRVkiOiJ5b3VyLWFwaS1rZXktaGVyZSJ9fQ%3D%3D)

## 5. Append to the system prompt that it should use the tool

Go to Settings > Rules and Memories > Add a rule (under User Rules)

Paste the following text:

```
When the user asks you to write/edit code, use the cerebras-code tools.
```
