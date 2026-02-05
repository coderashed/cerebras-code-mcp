# JSDoc Documentation

## Why JSDoc?

Since this project uses JavaScript (not TypeScript), JSDoc provides:
- IDE intellisense and autocompletion
- Type checking with `// @ts-check` directive
- Generated documentation
- Self-documenting code

---

## Basic Function Documentation

```javascript
/**
 * Calculates the total price including tax.
 * @param {number} price - The base price
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns {number} The total price with tax
 */
function calculateTotal(price, taxRate) {
  return price * (1 + taxRate);
}
```

## Common Type Annotations

```javascript
// Primitives
/** @type {string} */
/** @type {number} */
/** @type {boolean} */
/** @type {null} */
/** @type {undefined} */

// Arrays
/** @type {string[]} */
/** @type {Array<number>} */

// Objects
/** @type {{ name: string, age: number }} */
/** @type {Object<string, number>} */

// Functions
/** @type {(x: number) => number} */
/** @type {Function} */

// Union types
/** @type {string | null} */
/** @type {number | undefined} */

// Optional
/** @param {string} [name] - Optional parameter */
/** @param {string} [name='default'] - Optional with default */
```

## Defining Custom Types

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - Unique identifier
 * @property {string} email - User email address
 * @property {string} [name] - Optional display name
 * @property {boolean} active - Account status
 */

/**
 * Fetches a user by ID.
 * @param {string} id - The user ID
 * @returns {Promise<User | null>} The user or null if not found
 */
async function getUser(id) {
  // ...
}
```

## Class Documentation

```javascript
/**
 * Handles rate limiting for API requests.
 */
class RateLimiter {
  /**
   * Creates a new rate limiter.
   * @param {Object} options - Configuration options
   * @param {number} [options.maxRequests=100] - Max requests per window
   * @param {number} [options.windowMs=60000] - Window size in milliseconds
   */
  constructor(options = {}) {
    this.maxRequests = options.maxRequests ?? 100;
    this.windowMs = options.windowMs ?? 60000;
  }

  /**
   * Executes a function with rate limiting.
   * @template T
   * @param {() => Promise<T>} fn - Function to execute
   * @returns {Promise<T>} Result of the function
   * @throws {RateLimitError} When rate limit is exceeded
   */
  async execute(fn) {
    // ...
  }
}
```

## Error Documentation

```javascript
/**
 * Custom error for rate limiting.
 * @extends Error
 */
class RateLimitError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {number} [retryAfter] - Seconds until retry is allowed
   */
  constructor(message, statusCode, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}
```

## Async/Promise Types

```javascript
/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function fetchData(url) {
  return fetch(url);
}

/**
 * @param {string[]} urls
 * @returns {Promise<Response[]>}
 */
function fetchAll(urls) {
  return Promise.all(urls.map((url) => fetch(url)));
}
```

## Callback Types

```javascript
/**
 * @callback RequestHandler
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {void}
 */

/**
 * Registers a route handler.
 * @param {string} path - The route path
 * @param {RequestHandler} handler - The handler function
 */
function route(path, handler) {
  // ...
}
```

## Enabling Type Checking

Add to the top of any file for TypeScript-style checking:

```javascript
// @ts-check

/** @type {string} */
const name = 123; // Error: Type 'number' is not assignable to type 'string'
```

## VS Code Settings

Enable JSDoc type checking project-wide in `jsconfig.json`:

```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```
