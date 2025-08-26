# Cerebras Code MCP Server

This MCP server is designed for **planning with another model** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model, and can be embedded in IDEs like Claude Code, Cursor, etc.

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


## 4. Append tool use instructions to the system prompt

Go to Settings > Rules and Memories > Add a rule (under User Rules)

Paste the following text:

```
CRITICAL: You MUST use the MCP `write` tool for ALL code operations. Do NOT edit files directly. The write tool handles file creation, code generation, and modifications automatically.
```

## 6. Add OpenRouter as a backup in case you hit your Cerebras rate limits
Visit [OpenRouter](https://openrouter.ai/) and get a key to use as a fallback provider.

You can set this key in your MCP settings under OPENROUTER_API_KEY, and it will trigger automatically if anything goes wrong with calling Cerebras.