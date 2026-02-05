# Testing Guide

This document covers the testing tools, processes, and conventions for the cerebras-code-mcp project.

## Tools

| Tool | Version | Purpose |
|------|---------|---------|
| [Vitest](https://vitest.dev/) | 4.x | Unit testing framework |
| [ESLint](https://eslint.org/) | 9.x | Code linting |
| [Prettier](https://prettier.io/) | 3.x | Code formatting |

## npm Scripts

### Testing

```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode (re-runs on file changes)
npm run test:coverage # Run tests with coverage report
```

### Linting

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors where possible
```

### Formatting

```bash
npm run format        # Format all files with Prettier
npm run format:check  # Check if files are formatted (CI-friendly)
```

## Directory Structure

Tests mirror the `src/` directory structure:

```
tests/
├── api/
│   ├── router/
│   │   └── router.test.js
│   ├── cerebras.test.js
│   ├── openrouter.test.js
│   └── rate-limiter.test.js
├── config/
│   └── constants.test.js
├── formatting/
│   ├── response-formatter.test.js
│   └── syntax-highlighter.test.js
├── server/
│   ├── agent-spawner.test.js
│   ├── mcp-server.test.js
│   ├── planner.test.js
│   ├── tool-handlers.test.js
│   └── worker.test.js
└── utils/
    ├── code-cleaner.test.js
    └── file-utils.test.js
```

## Writing Tests

### File Naming

- Test files must end with `.test.js`
- Place tests in the matching directory under `tests/`
- Example: `src/api/cerebras.js` → `tests/api/cerebras.test.js`

### Test Structure

```javascript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '../../src/path/to/module.js';

describe('myFunction', () => {
  it('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });

  it('should handle edge case', () => {
    expect(() => myFunction(badInput)).toThrow();
  });
});
```

### Common Assertions

```javascript
expect(value).toBe(expected)           // Strict equality
expect(value).toEqual(expected)        // Deep equality
expect(value).toBeTruthy()             // Truthy check
expect(value).toBeNull()               // Null check
expect(value).toBeUndefined()          // Undefined check
expect(value).toContain(item)          // Array/string contains
expect(fn).toThrow()                   // Throws error
expect(fn).toThrow('message')          // Throws specific error
```

### Mocking

```javascript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked');

// Mock a module
vi.mock('../../src/api/cerebras.js', () => ({
  callCerebras: vi.fn().mockResolvedValue('mocked response'),
}));

// Spy on existing function
const spy = vi.spyOn(object, 'method');
```

### Async Tests

```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});

it('should reject with error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error message');
});
```

## Configuration Files

### vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js'],
    },
  },
});
```

### eslint.config.js

Uses ESLint 9 flat config format with:
- Recommended JS rules
- Prettier compatibility (disables conflicting rules)
- Node.js globals
- Custom rules for unused vars and const preference

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

## CI Integration

For CI pipelines, use these commands:

```bash
# Check formatting (fails if not formatted)
npm run format:check

# Run linter (fails on errors)
npm run lint

# Run tests (fails on test failures)
npm test

# Run tests with coverage (optional)
npm run test:coverage
```

## Coverage

Run coverage report:

```bash
npm run test:coverage
```

This generates:
- Terminal output with coverage summary
- HTML report in `coverage/` directory

Coverage targets:
- Statements: 80%+
- Branches: 80%+
- Functions: 80%+
- Lines: 80%+
