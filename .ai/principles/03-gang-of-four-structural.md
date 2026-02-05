# GoF Structural Patterns

## Relevance to JavaScript

| Pattern | Recommendation | Reason |
|---------|----------------|--------|
| **Adapter** | Use | Wrapping third-party APIs is common |
| **Facade** | Use | Simplifying complex subsystems is always useful |
| **Composite** | Use | Tree structures (DOM, files) are common |
| **Decorator** | Use (functions) | Function composition preferred over class wrappers |
| **Proxy** | Use | Native `Proxy` object is powerful |
| **Bridge** | Rarely needed | Over-engineered for most JS |
| **Flyweight** | Rarely needed | JS engines optimize memory well |

---

## Adapter (Recommended)

Wrap third-party APIs to match your interface.

```javascript
class StripeAdapter {
  constructor(stripe) {
    this.stripe = stripe;
  }

  async charge(amount) {
    // Convert our interface (dollars) to Stripe's (cents)
    return this.stripe.createCharge(Math.round(amount * 100));
  }
}

const payments = new StripeAdapter(stripeClient);
await payments.charge(29.99);
```

## Facade (Recommended)

Hide complex subsystems behind a simple interface.

```javascript
class VideoConverter {
  async convert(file, format) {
    const codec = await CodecFactory.extract(file);
    const audio = await AudioMixer.process(file);
    return Encoder.encode(codec, audio, format);
  }
}

// Simple API hides complexity
const converter = new VideoConverter();
await converter.convert('video.avi', 'mp4');
```

## Decorator (Use Function Composition)

Prefer function decorators over class wrappers.

```javascript
// Function decorator pattern
function withLogging(fn) {
  return async (...args) => {
    console.log(`Calling with`, args);
    const result = await fn(...args);
    console.log(`Result:`, result);
    return result;
  };
}

function withRetry(fn, maxRetries = 3) {
  return async (...args) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (e) {
        if (i === maxRetries - 1) throw e;
      }
    }
  };
}

// Compose decorators
const fetchUser = withLogging(withRetry(async (id) => {
  return await api.getUser(id);
}));
```

## Proxy (Use Native Proxy)

JS has a built-in `Proxy` object.

```javascript
// Caching proxy
function withCache(target, ttl = 60000) {
  const cache = new Map();

  return new Proxy(target, {
    get(obj, prop) {
      if (typeof obj[prop] !== 'function') return obj[prop];

      return async (...args) => {
        const key = `${prop}:${JSON.stringify(args)}`;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.time < ttl) {
          return cached.value;
        }

        const result = await obj[prop](...args);
        cache.set(key, { value: result, time: Date.now() });
        return result;
      };
    },
  });
}

const cachedApi = withCache(api);
```

## Composite (Recommended)

Useful for tree structures.

```javascript
class File {
  constructor(name, size) {
    this.name = name;
    this._size = size;
  }
  size() { return this._size; }
}

class Directory {
  constructor(name) {
    this.name = name;
    this.children = [];
  }
  add(child) { this.children.push(child); }
  size() {
    return this.children.reduce((sum, child) => sum + child.size(), 0);
  }
}
```
