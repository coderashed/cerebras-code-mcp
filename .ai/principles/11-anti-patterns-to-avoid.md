# Anti-Patterns to Avoid

## God Class (Violates SRP)

```javascript
// BAD - class does everything
class OrderManager {
  createOrder() { /* ... */ }
  saveToDb() { /* ... */ }
  sendEmail() { /* ... */ }
  generatePdf() { /* ... */ }
  calculateTax() { /* ... */ }
}
```

**Fix:** Split into `Order`, `OrderRepository`, `EmailService`, `InvoiceGenerator`, `TaxCalculator`

---

## Spaghetti Conditionals

```javascript
// BAD - deeply nested
if (user) {
  if (user.active) {
    if (user.verified) {
      if (order) {
        // actual logic buried here
      }
    }
  }
}
```

**Fix:** Use guard clauses
```javascript
if (!user || !user.active || !user.verified) {
  return null;
}
if (!order) {
  return null;
}
// happy path here
```

---

## Magic Numbers

```javascript
// BAD
if (user.age >= 21 && total > 100) {
  discount = total * 0.15;
}
```

**Fix:** Use constants
```javascript
const LEGAL_DRINKING_AGE = 21;
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.15;

if (user.age >= LEGAL_DRINKING_AGE && total > DISCOUNT_THRESHOLD) {
  discount = total * DISCOUNT_RATE;
}
```

---

## Primitive Obsession

```javascript
// BAD - using strings for everything
function createUser(email, phone, zipCode) {
  // No validation, just raw strings
}
```

**Fix:** Use value objects or validation
```javascript
function createUser(email, phone, zipCode) {
  if (!isValidEmail(email)) throw new Error('Invalid email');
  if (!isValidPhone(phone)) throw new Error('Invalid phone');
  if (!isValidZipCode(zipCode)) throw new Error('Invalid zip code');
  // ...
}

// Or use classes
class Email {
  constructor(value) {
    if (!value.includes('@')) throw new Error('Invalid email');
    this.value = value;
  }
}
```

---

## Feature Envy

```javascript
// BAD - function uses another object's data excessively
function calculateBonus(employee) {
  return employee.salary * employee.years * employee.rating / 100;
}
```

**Fix:** Move method to the class that owns the data
```javascript
class Employee {
  calculateBonus() {
    return this.salary * this.years * this.rating / 100;
  }
}
```

---

## Callback Hell

```javascript
// BAD - nested callbacks
getData(function(a) {
  getMoreData(a, function(b) {
    getEvenMoreData(b, function(c) {
      getYetMoreData(c, function(d) {
        // finally do something
      });
    });
  });
});
```

**Fix:** Use async/await
```javascript
async function fetchAllData() {
  const a = await getData();
  const b = await getMoreData(a);
  const c = await getEvenMoreData(b);
  const d = await getYetMoreData(c);
  return d;
}
```

---

## Shotgun Surgery

**Symptom:** One change requires editing 10+ files

**Fix:** Consolidate related logic, use proper abstractions

---

## Hardcoded Configuration

```javascript
// BAD
const API_URL = 'https://api.production.com';
const TIMEOUT = 5000;
```

**Fix:** Use environment variables
```javascript
const API_URL = process.env.API_URL;
const TIMEOUT = parseInt(process.env.TIMEOUT) || 5000;
```

---

## Detection with ESLint

| Anti-Pattern | ESLint Rule |
|--------------|-------------|
| God Class | `complexity` (high on multiple methods) |
| Spaghetti | `max-depth`, `complexity` |
| Long Function | `max-lines-per-function`, `max-statements` |
| Magic Numbers | `no-magic-numbers` (can be noisy) |

```bash
# Find complex functions
npm run lint

# Check for complexity issues
npx eslint src/ --rule 'complexity: ["error", 10]'
```

---

## Mutable Shared State

```javascript
// BAD - global mutable state
let cache = {};

function getData(key) {
  if (cache[key]) return cache[key];
  cache[key] = fetchFromDb(key);
  return cache[key];
}
```

**Fix:** Use encapsulation or dependency injection
```javascript
function createCache() {
  const cache = new Map();

  return {
    get(key) {
      if (cache.has(key)) return cache.get(key);
      const value = fetchFromDb(key);
      cache.set(key, value);
      return value;
    },
    clear() {
      cache.clear();
    },
  };
}

// Inject where needed
const cache = createCache();
```
