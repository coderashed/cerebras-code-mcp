# GoF Behavioral Patterns

## Relevance to JavaScript

| Pattern | Recommendation | Reason |
|---------|----------------|--------|
| **Strategy** | Avoid classes | Just pass functions |
| **Observer** | Use EventEmitter | Built into Node.js |
| **Command** | Avoid classes | Closures work better |
| **Chain of Responsibility** | Use | Middleware pattern is common |
| **State** | Use (simplified) | Object literals work well |
| **Template Method** | Avoid | Higher-order functions preferred |
| **Iterator** | Avoid | Built into language (`for...of`) |
| **Mediator** | Rarely needed | Event-based patterns preferred |

---

## Chain of Responsibility (Recommended)

This is the middleware pattern - very common in JS.

```javascript
class Handler {
  #next = null;

  setNext(handler) {
    this.#next = handler;
    return handler;
  }

  handle(request) {
    if (this.#next) return this.#next.handle(request);
    return null;
  }
}

class AuthHandler extends Handler {
  handle(request) {
    if (!request.token) return { error: 'Unauthorized' };
    return super.handle(request);
  }
}

class RateLimitHandler extends Handler {
  handle(request) {
    if (this.isLimited(request)) return { error: 'Too many requests' };
    return super.handle(request);
  }
}

// Build chain
const auth = new AuthHandler();
auth.setNext(new RateLimitHandler());
```

## Observer (Use EventEmitter)

Don't build custom observer classes. Use Node's EventEmitter.

```javascript
import { EventEmitter } from 'events';

class OrderService extends EventEmitter {
  create(order) {
    // ... create order
    this.emit('created', order);
  }
}

const orders = new OrderService();
orders.on('created', (order) => sendEmail(order));
orders.on('created', (order) => updateInventory(order));
```

## State (Simplified)

Use object literals instead of state classes.

```javascript
const states = {
  draft: {
    publish: (doc) => { doc.state = states.review; },
    edit: (doc, text) => { doc.content = text; },
  },
  review: {
    approve: (doc) => { doc.state = states.published; },
    reject: (doc) => { doc.state = states.draft; },
  },
  published: {
    publish: () => console.log('Already published'),
  },
};

const doc = { content: '', state: states.draft };
doc.state.publish(doc);  // moves to review
doc.state.approve(doc);  // moves to published
```

---

## Avoid These (Use Functions Instead)

### Strategy

Don't create strategy classes. Pass functions.

```javascript
// DON'T do this
class CreditCardStrategy { pay(amount) { /*...*/ } }
class PayPalStrategy { pay(amount) { /*...*/ } }
const processor = new Processor(new CreditCardStrategy());

// DO this - just pass a function
const payWithCard = (amount) => { /*...*/ };
const payWithPayPal = (amount) => { /*...*/ };

function checkout(amount, payFn) {
  return payFn(amount);
}

checkout(100, payWithCard);
```

### Command

Closures replace command classes.

```javascript
// DON'T do this
class InsertCommand {
  constructor(editor, text) { this.editor = editor; this.text = text; }
  execute() { this.editor.insert(this.text); }
  undo() { this.editor.delete(this.text); }
}

// DO this - closure captures state
function insertCommand(editor, text) {
  return {
    execute: () => editor.insert(text),
    undo: () => editor.delete(text),
  };
}
```

### Iterator

Built into JavaScript. Don't implement.

```javascript
// DON'T implement iterator classes

// DO use built-in iteration
for (const item of collection) { /*...*/ }

// Or generators for custom iteration
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}

for (const n of range(0, 5)) console.log(n);
```

### Template Method

Use higher-order functions instead.

```javascript
// DON'T do this
class DataProcessor {
  process(src) {
    const data = this.extract(src);  // abstract
    return this.transform(data);      // abstract
  }
}

// DO this - pass functions
async function processData(src, extractFn, transformFn) {
  const data = await extractFn(src);
  return transformFn(data);
}

processData('file.csv', parseCSV, normalizeRows);
```
