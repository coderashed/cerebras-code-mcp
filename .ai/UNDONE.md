# Undone

Tasks and improvements identified but not yet implemented.

---

## Missing Test Coverage

**Current:** 80.33% line coverage (target: 80%) ✅ TARGET ACHIEVED
**Progress:** 6.06% → 58.43% → 80.33% (+74.27%)
**Tests:** 198 passing across 15 test files

### Completed (100% coverage)
- `api/cerebras.js` - ✅
- `api/openrouter.js` - ✅
- `api/rate-limiter.js` - ✅
- `api/router/router.js` - 87.5% ✅
- `formatting/diff-formatter.js` - ✅
- `formatting/response-formatter.js` - ✅
- `formatting/syntax-highlighter.js` - ✅
- `server/mcp-server.js` - ✅
- `server/tool-handlers.js` - ✅
- `server/planner.js` - ✅
- `server/agent-spawner.js` - 97.56% ✅
- `server/worker.js` - ✅
- `server/session-context.js` - ✅
- `utils/code-cleaner.js` - 89.47% ✅
- `utils/file-utils.js` - ✅
- `config/constants.js` - ✅

### Remaining (0% coverage)

| File | Priority | Complexity | Notes |
|------|----------|------------|-------|
| **config/interactive-config.js** | Low | High | Interactive CLI prompts - hard to unit test |

### Testing Patterns Used

**HTTP API modules (cerebras.js, openrouter.js):**
- Mock `https` with `vi.mock('https')` and `vi.hoisted()` for config
- Use EventEmitter for mock request/response
- Test success/error responses, rate limit handling, context files

**MCP Server (mcp-server.js):**
- Mock SDK classes inline with `vi.mock()` using class syntax
- Capture handlers from `setRequestHandler.mock.calls`
- Test tool registration, request routing

**Worker (worker.js):**
- Use `vi.hoisted()` for all mock functions
- Use `vi.resetModules()` + dynamic import to reload IIFE
- Test message passing, error propagation