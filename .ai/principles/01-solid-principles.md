# SOLID Principles

## Quick Reference

| Principle | Rule | Violation Sign |
|-----------|------|----------------|
| **S**ingle Responsibility | One reason to change | Class has unrelated methods |
| **O**pen/Closed | Extend, don't modify | Adding features requires editing existing code |
| **L**iskov Substitution | Subclasses must be substitutable | Subclass throws unexpected exceptions |
| **I**nterface Segregation | Small, focused interfaces | Classes implement empty methods |
| **D**ependency Inversion | Depend on abstractions | Importing concrete classes in business logic |

---

## S - Single Responsibility

```javascript
// BAD - multiple responsibilities
class User {
  saveToDb() { /* persistence */ }
  sendEmail() { /* notification */ }
  generateReport() { /* reporting */ }
}

// GOOD - separated
class User { /* data only */ }
class UserRepository { /* persistence */ }
class EmailService { /* notification */ }
```

## O - Open/Closed

```javascript
// BAD - must modify to add types
function calculate(shapeType) {
  if (shapeType === 'circle') { /* ... */ }
  else if (shapeType === 'square') { /* ... */ }  // adding rectangle = modify this
}

// GOOD - extend via new classes
class Circle {
  area() { return Math.PI * this.radius ** 2; }
}

class Square {
  area() { return this.side ** 2; }
}

class Rectangle {  // new shape, no changes needed
  area() { return this.width * this.height; }
}

function calculateArea(shape) {
  return shape.area();  // works with any shape
}
```

## L - Liskov Substitution

```javascript
// BAD - subclass breaks contract
class Bird {
  fly() { return 'flying'; }
}

class Penguin extends Bird {
  fly() { throw new Error('Cannot fly'); }  // breaks!
}

// GOOD - proper hierarchy
class Bird {
  move() { /* abstract */ }
}

class FlyingBird extends Bird {
  move() { return this.fly(); }
  fly() { return 'flying'; }
}

class SwimmingBird extends Bird {
  move() { return this.swim(); }
  swim() { return 'swimming'; }
}
```

## I - Interface Segregation

```javascript
// BAD - fat interface
class Worker {
  work() { }
  eat() { }   // robots don't eat
  sleep() { } // robots don't sleep
}

// GOOD - segregated (use composition)
const workable = {
  work() { /* ... */ }
};

const eatable = {
  eat() { /* ... */ }
};

// Human uses both, Robot only uses workable
const human = { ...workable, ...eatable };
const robot = { ...workable };
```

## D - Dependency Inversion

```javascript
// BAD - depends on concrete
class UserService {
  constructor() {
    this.db = new MySQLDatabase();  // tight coupling
  }
}

// GOOD - depends on abstraction (injected)
class UserService {
  constructor(db) {  // any database that has query()
    this.db = db;
  }

  getUser(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// Usage - inject dependency
const service = new UserService(new PostgresDatabase());
```
