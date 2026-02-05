# Performance Intuitions

Observations and ideas for improving performance in the codebase.

## Current Bottlenecks

1. **External API latency** - Cerebras/OpenRouter calls take 500ms-2s each
2. **Sequential file reads** - Context files read before API call
3. **Cold TCP connections** - New HTTPS connection per request
4. **No caching** - Same prompts re-processed every time

## High-Impact Improvements

### 1. HTTP Connection Pooling

**Current:** Each API call creates a new TCP connection (3-way handshake + TLS negotiation).

**Improvement:** Use an HTTP agent with `keepAlive: true` or switch to `undici`.

```javascript
import { Agent } from 'https';

const agent = new Agent({ keepAlive: true, maxSockets: 10 });

// Reuse in all requests
https.request({ ...options, agent });
```

**Expected gain:** 50-100ms per request after first call.

### 2. Parallel Context File Reads + API Call Preparation

**Current:** Read files → Build prompt → Make API call (sequential).

**Improvement:** Start building the request while files are still being read.

```javascript
const [contextContent, requestTemplate] = await Promise.all([
  readContextFiles(files),
  prepareRequestTemplate(prompt),
]);
```

**Expected gain:** Minimal (file reads are fast), but cleaner.

### 3. Response Streaming

**Current:** Buffer entire response, then parse.

**Improvement:** Stream response and parse incrementally for faster time-to-first-token.

```javascript
// For batch operations, start processing files as soon as planner returns each one
// Instead of waiting for full JSON array
```

**Expected gain:** Better perceived latency, especially for large responses.

### 4. Prompt/Response Caching

**Current:** Every request hits the API.

**Improvement:** Cache responses for identical prompts (with TTL).

```javascript
const cache = new Map();

async function cachedAPICall(prompt, ...args) {
  const key = hashPrompt(prompt, args);
  if (cache.has(key)) return cache.get(key);

  const result = await apiCall(prompt, ...args);
  cache.set(key, result);
  return result;
}
```

**Expected gain:** 100% for repeated identical requests (returns in <1ms).

**Caveat:** Only useful if same prompts are common. May not apply here.

### 5. Use `undici` Instead of `https`

**Current:** Node.js built-in `https` module.

**Improvement:** `undici` is faster (used internally by `fetch` in Node 18+).

```javascript
import { request } from 'undici';

const { body } = await request('https://api.cerebras.ai/v1/chat/completions', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify(data),
});

const response = await body.json();
```

**Expected gain:** 10-20% faster HTTP handling.

### 6. Batch API Calls (If API Supports)

**Current:** One API call per file in batch operations.

**Improvement:** If Cerebras API supports batch endpoints, send multiple prompts in one request.

**Expected gain:** Significant reduction in round-trips.

**Caveat:** Depends on API capabilities.

## Medium-Impact Improvements

### 7. Pre-warm Rate Limiter

**Current:** Rate limiter starts cold, first requests may queue unnecessarily.

**Improvement:** Initialize with knowledge of recent request history if available.

### 8. Worker Thread Pool

**Current:** New worker thread spawned per file in batch operations.

**Improvement:** Maintain a pool of warm workers ready to accept tasks.

```javascript
const workerPool = new WorkerPool({ size: 4 });
const result = await workerPool.execute(task);
```

**Expected gain:** Eliminates worker startup overhead (~10-50ms per worker).

### 9. Lazy Module Loading

**Current:** All modules loaded at startup.

**Improvement:** Dynamically import heavy modules only when needed.

```javascript
// Instead of top-level import
const { createPatch } = await import('diff');
```

**Expected gain:** Faster cold start, negligible for runtime.

## Low-Impact (Micro-optimizations)

### 10. Avoid Redundant `JSON.stringify`

**Current:** Request body stringified, then `Buffer.byteLength` called.

**Improvement:** Calculate length from string directly.

```javascript
const postData = JSON.stringify(requestData);
const contentLength = Buffer.byteLength(postData); // Already doing this, fine
```

### 11. Reuse Buffers

For high-throughput scenarios, reuse buffers instead of allocating new ones.

**Expected gain:** Negligible for current use case.

## Measurement Before Optimization

Before implementing any of these, measure actual performance:

```javascript
console.time('api-call');
const result = await callCerebras(...);
console.timeEnd('api-call');
```

Or use:
```bash
node --cpu-prof --heap-prof src/index.js
```

## Priority Ranking

| Improvement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| HTTP keep-alive | Low | Medium | 1 |
| Worker thread pool | Medium | Medium | 2 |
| `undici` migration | Low | Low-Medium | 3 |
| Response streaming | High | Medium | 4 |
| Caching | Medium | Situational | 5 |

## Notes

- The main bottleneck is **external API latency** which we can't optimize
- Focus on reducing overhead around API calls, not the calls themselves
- Measure before and after any changes
- Don't over-optimize for marginal gains
