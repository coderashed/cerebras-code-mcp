# Undone

Tasks and improvements identified but not yet implemented.

---

## Missing Test Coverage

**Current:** 6.06% statement coverage (target: 80%)

| File | Stmts | Branch | Funcs | Lines | Priority |
|------|-------|--------|-------|-------|----------|
| **api/cerebras.js** | 0% | 0% | 0% | 0% | High |
| **api/openrouter.js** | 0% | 0% | 0% | 0% | High |
| **api/rate-limiter.js** | 48.75% | 50% | 57.14% | 50.64% | Medium |
| **api/router/router.js** | 0% | 0% | 0% | 0% | High |
| **config/constants.js** | 100% | 86.36% | 0% | 100% | Low |
| **config/sensitive-config.js** | 0% | 0% | 0% | 0% | Medium |
| **formatting/diff-formatter.js** | 0% | 0% | 0% | 0% | Medium |
| **formatting/response-formatter.js** | 0% | 0% | 0% | 0% | Medium |
| **formatting/syntax-highlighter.js** | 0% | 0% | 0% | 0% | Low |
| **server/agent-spawner.js** | 0% | 0% | 0% | 0% | High |
| **server/mcp-server.js** | 0% | 0% | 0% | 0% | High |
| **server/planner.js** | 0% | 0% | 0% | 0% | High |
| **server/tool-handlers.js** | 0% | 0% | 0% | 0% | High |
| **server/worker.js** | 0% | 0% | 0% | 0% | Medium |
| **utils/code-cleaner.js** | 0% | 0% | 0% | 0% | Medium |
| **utils/file-utils.js** | 0% | 0% | 0% | 0% | Medium |

### Testing Strategy

**High Priority (core functionality):**
1. `api/cerebras.js` - Mock HTTP calls, test error handling
2. `api/openrouter.js` - Mock HTTP calls, test error handling
3. `api/router/router.js` - Test routing logic, provider selection
4. `server/tool-handlers.js` - Mock dependencies, test both tools
5. `server/mcp-server.js` - Test tool registration, request handling
6. `server/planner.js` - Mock API, test prompt parsing
7. `server/agent-spawner.js` - Mock workers, test concurrency

**Medium Priority (supporting modules):**
1. `api/rate-limiter.js` - Improve from 50% to 80%+
2. `utils/file-utils.js` - Test read/write operations
3. `utils/code-cleaner.js` - Test code extraction logic
4. `formatting/response-formatter.js` - Test diff generation
5. `server/worker.js` - Test worker thread communication
6. `config/sensitive-config.js` - Test config loading

**Low Priority (utilities):**
1. `formatting/syntax-highlighter.js` - Test highlighting output
2. `config/constants.js` - Already at 100% statements

## Debug Logging Flag

**File:** `src/config/constants.js`

**Current:** `debugLog` is hardcoded as a no-op.

**Improvement:** Make it configurable with zero-cost when disabled.

```javascript
const debugEnabled = process.env.CEREBRAS_DEBUG === 'true';

export const debugLog = debugEnabled
  ? async (message) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ${message}`);
      await fs.appendFile(LOG_FILE, `[${timestamp}] ${message}\n`).catch(() => {});
    }
  : () => {}; // Sync empty function - V8 inlines this to nothing
```

**Why:**
- Check happens once at module load
- When disabled, V8 inlines empty function to near-zero cost
- No conditional check on every call
- Sync no-op avoids Promise allocation

---

## Persistent Session Context

**Files:** `src/server/mcp-server.js`, `src/server/tool-handlers.js`

**Current:** `shared_context` and `shared_context_files` must be passed on every `write`/`batch_write` call, wasting tokens.

**Improvement:** Hybrid approach with config file + session state tool.

### 1. Project Config File (`.cerebras.json`)

Server loads defaults from project root at startup:

```json
{
  "shared_context": "Use TypeScript, functional patterns, JSDoc comments",
  "shared_context_files": ["src/types.ts", "src/utils/common.ts"]
}
```

### 2. Session State Tool (`set_context`)

```javascript
// Server-side state (in-memory)
let sessionContext = {
  shared_context: null,
  shared_context_files: []
};

// New MCP tool
{
  name: "set_context",
  description: "Set shared context for all subsequent write/batch_write calls this session",
  inputSchema: {
    type: "object",
    properties: {
      shared_context: {
        type: "string",
        description: "Text instructions applied to all operations"
      },
      shared_context_files: {
        type: "array",
        items: { type: "string" },
        description: "File paths to include as context for all operations"
      },
      append: {
        type: "boolean",
        description: "Append to existing context instead of replacing (default: false)"
      }
    }
  }
}
```

### 3. Context Resolution Order

In `handleWriteTool` and `handleBatchWriteTool`:

```javascript
function resolveContext(callParams) {
  return {
    shared_context: callParams.shared_context
      ?? sessionContext.shared_context
      ?? projectConfig.shared_context,
    shared_context_files: callParams.shared_context_files
      ?? sessionContext.shared_context_files
      ?? projectConfig.shared_context_files ?? []
  };
}
```

**Priority:** Call params > Session state > Project config

**Why:**
- Zero-token repeated calls (context stored server-side)
- Project config provides sensible defaults without any setup
- Session tool allows mid-session overrides
- Explicit call params still work for one-off overrides
- File contents can be cached after first read
