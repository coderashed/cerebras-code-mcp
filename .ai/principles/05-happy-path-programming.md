# Happy Path Programming

## Rules

1. **Guard clauses first** - Exit early for invalid cases
2. **Flat over nested** - Max 2-3 indentation levels
3. **Happy path at top level** - Success logic not buried in else blocks

---

## Guard Clauses

```javascript
// BAD - nested success path
function process(order) {
  if (order) {
    if (order.items) {
      if (order.status !== 'cancelled') {
        // actual logic buried here
        return calculate(order);
      }
    }
  }
  return null;
}

// GOOD - guard clauses
function process(order) {
  if (!order) return null;
  if (!order.items) return null;
  if (order.status === 'cancelled') return null;

  // happy path - flat and clear
  return calculate(order);
}
```

## Extract Complex Conditions

```javascript
// BAD
if (user.active && !user.banned && user.emailVerified && user.age >= 18) {
  // ...
}

// GOOD
function isEligible(user) {
  return user.active && !user.banned && user.emailVerified && user.age >= 18;
}

if (isEligible(user)) {
  // ...
}
```

## Fail Fast

```javascript
// Throw errors immediately on invalid input
function createUser(email, password) {
  if (!email.includes('@')) {
    throw new Error('Invalid email');
  }
  if (password.length < 8) {
    throw new Error('Password too short');
  }

  // happy path
  return new User(email, hashPassword(password));
}
```

## Async/Await Happy Path

```javascript
// BAD - nested promises
function fetchUserData(userId) {
  return getUser(userId).then((user) => {
    if (user) {
      return getOrders(user.id).then((orders) => {
        if (orders.length > 0) {
          return formatResponse(user, orders);
        }
        return null;
      });
    }
    return null;
  });
}

// GOOD - flat async/await with guards
async function fetchUserData(userId) {
  const user = await getUser(userId);
  if (!user) return null;

  const orders = await getOrders(user.id);
  if (orders.length === 0) return null;

  return formatResponse(user, orders);
}
```

## Quality Check

```javascript
// High complexity often indicates buried happy path
// Use ESLint complexity rule to detect issues

// eslint.config.js
export default [
  {
    rules: {
      complexity: ['error', 10], // Max cyclomatic complexity
      'max-depth': ['error', 4], // Max nesting depth
    },
  },
];
```
