# GoF Creational Patterns

## Relevance to JavaScript

| Pattern | Recommendation | Reason |
|---------|----------------|--------|
| **Singleton** | Avoid | ES modules are singletons by default |
| **Factory** | Use (simplified) | Factory functions are idiomatic |
| **Abstract Factory** | Rarely needed | Over-engineered for most JS |
| **Builder** | Use when needed | Useful for complex object construction |
| **Prototype** | Avoid | Use `structuredClone()` or spread |

---

## Factory (Recommended)

Use simple factory functions, not class hierarchies.

```javascript
function createNotification(type, recipient) {
  const factories = {
    email: () => ({ send: () => sendEmail(recipient) }),
    sms: () => ({ send: () => sendSMS(recipient) }),
    push: () => ({ send: () => sendPush(recipient) }),
  };

  const factory = factories[type];
  if (!factory) throw new Error(`Unknown type: ${type}`);
  return factory();
}

// Usage
const notification = createNotification('email', 'user@example.com');
notification.send();
```

## Builder (Use When Needed)

Useful for objects with many optional parameters.

```javascript
class RequestBuilder {
  #url = '';
  #headers = {};
  #body = null;

  url(url) {
    this.#url = url;
    return this;
  }

  header(key, value) {
    this.#headers[key] = value;
    return this;
  }

  body(data) {
    this.#body = data;
    return this;
  }

  build() {
    return { url: this.#url, headers: this.#headers, body: this.#body };
  }
}

// Usage
const request = new RequestBuilder()
  .url('/api/users')
  .header('Authorization', 'Bearer token')
  .build();
```

---

## Avoid These

### Singleton

ES modules are singletons. Don't create singleton classes.

```javascript
// DON'T do this
class Config {
  static #instance = null;
  constructor() {
    if (Config.#instance) return Config.#instance;
    Config.#instance = this;
  }
}

// DO this - module IS the singleton
// config.js
export default {
  apiKey: process.env.API_KEY,
  timeout: 5000,
};
```

### Prototype

Use built-in cloning instead of prototype pattern.

```javascript
// DON'T create clone methods
class Document {
  clone() { return new Document(this.title, this.content); }
}

// DO use structuredClone or spread
const clone = structuredClone(original);
const shallow = { ...original };
```
