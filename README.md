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

Rate limiting and multi-key support activates ONLY when both keys are configured:

```bash
# BOTH keys must be set to enable rate limiting
export CEREBRAS_FREE_KEY=your-free-key-here
export CEREBRAS_PAID_KEY=your-paid-key-here

# Routing strategy (optional, defaults to 'performance')
export ROUTING_STRATEGY=performance  # Options: 'performance', 'cost', 'balanced', 'roundrobin'
```

**Backward Compatibility**: 
- If you only set `CEREBRAS_API_KEY`: Original behavior (no rate limiting)
- If you set both `CEREBRAS_FREE_KEY` and `CEREBRAS_PAID_KEY`: Rate limiting activated with automatic failover

### How It Works

1. **Automatic Rate Tracking**: The system tracks request counts per model per key across minute/hour/day windows
2. **Intelligent Routing**: Requests are automatically routed to available keys based on the selected strategy
3. **Seamless Failover**: When one key hits its limit, requests automatically shift to other available keys
4. **Performance by Default**: Default strategy prefers paid tier for larger context windows and higher limits

### Rate Limits

The system respects your Cerebras account's rate limits, which vary by:
- **Model**: Different models have different limits
- **Tier**: Paid tiers typically have higher limits
- **Subscription**: Your specific plan determines exact numbers

To configure your specific limits, see [Updating Rate Limits](#7-updating-rate-limits) below.

### Routing Strategies

- **`performance`** (default): Uses paid tier first for 2x context window and higher limits, falls back to free
- **`cost`**: Uses free tier first to minimize costs, falls back to paid when needed
- **`balanced`**: Distributes load based on available capacity
- **`roundrobin`**: Alternates between available keys

### Example Scenario

With both free and paid keys configured (performance mode):
1. Requests start with paid tier (often has larger context window)
2. When paid tier hits rate limits → Automatically shifts to free tier
3. When limits reset → Returns to paid tier priority

Benefits of paid-first strategy:
- **Larger context windows** on paid tiers (e.g., 2x for some models)
- **Higher rate limits** (varies by subscription)
- **Better performance** for large codebases

Use `ROUTING_STRATEGY=cost` if you want to maximize free tier usage first.

This ensures you never hit rate limit errors while maximizing free tier usage!

## 7. Updating Rate Limits

The system includes default rate limits based on Cerebras' free tier. If your account has different limits, you can update them using the configuration script.

### How to Update Your Rate Limits

1. **Copy your rate limits** from the Cerebras dashboard
2. **Run the update script**:
   ```bash
   node scripts/update-rate-limits.js --tier free  # or --tier paid
   ```
3. **Paste the table** and type `END` when done

### Example Usage

```bash
$ node scripts/update-rate-limits.js --tier free
📋 Paste the FREE tier rate limits table from Cerebras dashboard
   (Type "END" on a new line when done)

[Paste your rate limits table here]
END

✅ Successfully updated rate limits
```

The script will parse your pasted rate limits and update the configuration automatically.