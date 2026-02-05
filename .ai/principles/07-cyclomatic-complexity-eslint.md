# Cyclomatic Complexity with ESLint

## Quality Gates

```bash
# Must pass before merge
npm run lint        # No ESLint errors (includes complexity)
npm run format:check # Code is formatted
npm test            # All tests pass
```

## Complexity Grades

| Complexity | Grade | Action |
|------------|-------|--------|
| 1-5 | A | Excellent |
| 6-10 | B | Acceptable |
| 11-20 | C | **Refactor required** |
| 21+ | D-F | **Reject PR** |

## What Adds Complexity (+1 each)

- `if`, `else if`, `for`, `while`, `do`, `switch case`
- `&&`, `||` in conditions
- Ternary expressions `? :`
- `catch` blocks
- Optional chaining with nullish ops `?.`, `??`

## ESLint Configuration

```javascript
// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      // Cyclomatic complexity - max 10 per function
      complexity: ['error', { max: 10 }],

      // Max nesting depth
      'max-depth': ['error', { max: 4 }],

      // Max lines per function
      'max-lines-per-function': [
        'warn',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],

      // Max statements per function
      'max-statements': ['warn', { max: 15 }],
    },
  },
];
```

## Quick Commands

```bash
# Check for lint issues (includes complexity)
npm run lint

# Auto-fix what's possible
npm run lint:fix

# Check specific file
npx eslint src/api/router.js
```

## CI Check (GitHub Actions)

```yaml
- name: Lint
  run: npm run lint

- name: Format Check
  run: npm run format:check

- name: Test
  run: npm test
```

## Pre-commit Hook

Using `lint-staged` with `husky`:

```json
// package.json
{
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"]
  }
}
```

## Reducing Complexity

### Extract Functions

```javascript
// BAD - complexity 12
function processOrder(order) {
  if (!order) return null;
  if (!order.items) return null;
  if (order.status === 'cancelled') return null;

  let total = 0;
  for (const item of order.items) {
    if (item.discount) {
      total += item.price * (1 - item.discount);
    } else {
      total += item.price;
    }
  }

  if (total > 100) {
    total *= 0.9;
  }

  return { ...order, total };
}

// GOOD - complexity 4 each
function validateOrder(order) {
  return order && order.items && order.status !== 'cancelled';
}

function calculateItemTotal(item) {
  return item.discount ? item.price * (1 - item.discount) : item.price;
}

function applyBulkDiscount(total) {
  return total > 100 ? total * 0.9 : total;
}

function processOrder(order) {
  if (!validateOrder(order)) return null;

  const subtotal = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const total = applyBulkDiscount(subtotal);

  return { ...order, total };
}
```

### Use Lookup Tables

```javascript
// BAD - high complexity
function getStatusMessage(status) {
  if (status === 'pending') return 'Waiting for approval';
  else if (status === 'approved') return 'Order approved';
  else if (status === 'shipped') return 'On the way';
  else if (status === 'delivered') return 'Delivered';
  else return 'Unknown status';
}

// GOOD - complexity 1
const STATUS_MESSAGES = {
  pending: 'Waiting for approval',
  approved: 'Order approved',
  shipped: 'On the way',
  delivered: 'Delivered',
};

function getStatusMessage(status) {
  return STATUS_MESSAGES[status] ?? 'Unknown status';
}
```
