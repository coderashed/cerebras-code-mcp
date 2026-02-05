# Cerebras Code MCP Server v1.2.0

This MCP server is designed for **planning with Claude Code** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model, and can be embedded in IDEs like Claude Code, with beta support for Cursor.

## ✨ New in v1.2

- **Project Restructure**: Organized project into smaller, more manageable components for DX purposes
- **Stronger Instruction**: Improved `write` usage count among models
- **Claude Code - Enhanced Visual Diffs**: Displays changes/edits in a pretty format
- **Hide User API Key**: For security, doesn't display entered API keys in the terminal
- **Update Config Wizard for Messy Configs**: Ensure user setup always works despite previous installs

## 1. Install the NPM Package
```bash
npm install -g cerebras-code-mcp
```

## 2. Get Cerebras API key
Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key

[OPTIONAL] Add OpenRouter as a backup in case you hit your Cerebras rate limits
Visit [OpenRouter](https://openrouter.ai/) and get a key to use as a fallback provider.

You can set this key in your MCP settings under OPENROUTER_API_KEY, and it will trigger automatically if anything goes wrong with calling Cerebras.


## 3. Run the Setup Wizard for Claude Code / Cursor
```bash
cerebras-mcp --config
```

Use the setup wizard to configure the tool on your machine.

If you're using Cursor, it will ask you to copy and paste a prompt into your Cursor User Rules.

## 4. Usage

### `write` Tool

The `write` tool handles single file operations:

- **Natural language prompts**: Just describe what you want in plain English
- **Context files**: Include multiple files as context for better code understanding
- **Visual diffs**: See changes with Git-style diffs

Example:
```
write({
  file_path: "/path/to/api.ts",
  prompt: "Create a REST API with Express.js that handles user authentication",
  context_files: ["/path/to/types.ts"]  // optional
})
```

### `batch_write` Tool

The `batch_write` tool executes multiple file operations in parallel using worker threads. It supports two modes:

#### Auto Mode (Recommended)

Just describe what you want to build. The planner automatically determines what files to create:

```
batch_write({
  prompt: "Create a user authentication module with login, logout, and session management in src/auth/",
  shared_context: "Use TypeScript, functional patterns, include JSDoc comments",
  shared_context_files: ["/path/to/existing/types.ts"]
})
```

The planner will:
1. Analyze your prompt
2. Determine what files need to be created (e.g., `login.ts`, `logout.ts`, `session.ts`)
3. Generate detailed prompts for each file
4. Execute all file operations in parallel

#### Manual Mode

For explicit control, provide an `operations` array:

```
batch_write({
  shared_context: "Use TypeScript with strict mode",
  operations: [
    { file_path: "src/api.ts", prompt: "Create the API client" },
    { file_path: "src/types.ts", prompt: "Create type definitions" },
    { file_path: "src/utils.ts", prompt: "Create helper utilities" }
  ]
})
```

#### Shared Context

Both modes support shared context that applies to all operations:

- `shared_context`: Text instructions (style guidelines, patterns, standards)
- `shared_context_files`: Reference files that all operations can see

This ensures consistency across all generated files.

## Configuration

### Environment Variables

#### API Keys

| Variable | Description |
|----------|-------------|
| `CEREBRAS_API_KEY` | Your Cerebras API key (required) |
| `OPENROUTER_API_KEY` | OpenRouter API key for fallback (optional) |

#### Model Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CEREBRAS_MODEL` | `zai-glm-4.7` | Model to use |
| `CEREBRAS_MAX_TOKENS` | (none) | Max tokens for response |
| `CEREBRAS_TEMPERATURE` | `0.1` | Temperature for generation |

#### Rate Limiting

The server uses a sliding window rate limiter to handle API rate limits gracefully. Requests are queued and retried automatically on 429 errors.

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Sliding window size in ms (60s) |
| `RATE_LIMIT_MAX_REQUESTS` | `30` | Max requests per window |
| `RATE_LIMIT_MAX_RETRIES` | `3` | Retry attempts on rate limit |
| `RATE_LIMIT_BASE_DELAY_MS` | `1000` | Base delay for exponential backoff |
| `MAX_CONCURRENT_REQUESTS` | `3` | Max parallel requests in batch operations |