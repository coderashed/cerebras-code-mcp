# Cerebras Code MCP Server v1.2.3

This MCP server is designed for **planning with Claude Code, Cline, or Cursor** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model, and can be embedded in IDEs like Claude Code and Cline, with beta support for Cursor.

## ✨ New in v1.2.3

- **Multiple API Keys with Rate Limiting**: Support for parallel API keys with automatic rate limit tracking
- **Intelligent Request Routing**: Automatically routes requests to available keys to avoid throttling
- **Cost Optimization**: Prefers free tier keys when available, falls back to paid tier as needed

## ✨ Previous in v1.2.2

- **Project Restructure**: Organized project into smaller, more manageable components for DX purposes
- **Stronger Instruction**: Improved `write` usage count among models
- **Claude Code - Enhanced Visual Diffs**: Displays changes/edits in a pretty format
- **Hide User API Key**: For security, doesn't display entered API keys in the terminal
- **Update Config Wizard for Messy Configs**: Added a removal wizard that helps uninstall

## 1. Install the NPM Package
```bash
npm install -g cerebras-code-mcp
```

## 2. Get Cerebras API key
Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key

[OPTIONAL] Add OpenRouter as a backup in case you hit your Cerebras rate limits
Visit [OpenRouter](https://openrouter.ai/) and get a key to use as a fallback provider.

You can set this key in your MCP settings under OPENROUTER_API_KEY, and it will trigger automatically if anything goes wrong with calling Cerebras.


## 3. Run the Setup Wizard for Claude Code / Cursor / Cline
```bash
cerebras-mcp --config
```

Use the setup wizard to configure the tool on your machine.

If you're using Cursor, it will ask you to copy and paste a prompt into your Cursor User Rules.

## 4. Removal/Cleanup (Optional)
```bash
cerebras-mcp --remove
```

Use the removal wizard to clean up configurations for any IDE or perform a complete cleanup.

## 5. Usage

The MCP tool will appear as `write` in your tool list. It supports:

- **Natural language prompts**: Just describe what you want in plain English
- **Context files**: Include multiple files as context for better code understanding
- **Visual diffs**: See changes with Git-style diffs

Example usage:
```
Create a REST API with Express.js that handles user authentication
```

## 6. Multiple API Keys & Rate Limiting (Advanced)

The server now supports using multiple Cerebras API keys in parallel to avoid rate limit errors. This is especially useful when working with models that have restrictive limits like `qwen-3-coder-480b`.

### Configuration

Set environment variables for your API keys:

```bash
# Primary/Free tier key
export CEREBRAS_FREE_KEY=your-free-key-here
# or use the existing CEREBRAS_API_KEY
export CEREBRAS_API_KEY=your-free-key-here

# Secondary/Paid tier key (optional)
export CEREBRAS_PAID_KEY=your-paid-key-here

# Routing strategy (optional, defaults to 'cost')
export ROUTING_STRATEGY=cost  # Options: 'cost', 'balanced', 'roundrobin'
```

### How It Works

1. **Automatic Rate Tracking**: The system tracks request counts per model per key across minute/hour/day windows
2. **Intelligent Routing**: Requests are automatically routed to available keys based on the selected strategy
3. **Seamless Failover**: When one key hits its limit, requests automatically shift to other available keys
4. **Cost Optimization**: Default strategy prefers free tier keys to minimize costs

### Rate Limits by Model

The system respects Cerebras' rate limits for each model and tier:

**Free Tier Examples:**
- `llama-3.3-70b`: 30 req/min, 900 req/hour, 14,400 req/day
- `qwen-3-coder-480b`: 10 req/min, 100 req/hour, 100 req/day (very limited!)

**Paid Tier Examples:**
- `llama-3.3-70b`: Same as free tier
- `qwen-3-coder-480b`: 50 req/min, 3,000 req/hour, 72,000 req/day (5x-720x more!)

### Routing Strategies

- **`cost`** (default): Uses free tier keys first, falls back to paid when needed
- **`balanced`**: Distributes load based on available capacity
- **`roundrobin`**: Alternates between available keys

### Example Scenario

With both free and paid keys configured:
1. First 10 requests to `qwen-3-coder-480b` → Free tier
2. Next 40 requests → Automatically shift to paid tier
3. After 1 minute, free tier resets → Can use free tier again

This ensures you never hit rate limit errors while maximizing free tier usage!