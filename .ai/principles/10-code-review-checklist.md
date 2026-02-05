# Code Review Checklist

## 1. SOLID Principles Compliance

- [ ] **Single Responsibility Principle (SRP)**: Verify that every module, class, or function has responsibility over a single part of the functionality provided by the software.
    - *Check*: Does changing the database schema require changing the logging logic? If yes, this violates SRP.
- [ ] **Open/Closed Principle (OCP)**: Ensure software entities are open for extension but closed for modification.
    - *Check*: Can you add a new payment method without modifying the existing `PaymentProcessor` class logic?
- [ ] **Liskov Substitution Principle (LSP)**: Confirm that objects of a superclass shall be replaceable with objects of its subclasses without breaking the application.
    - *Check*: Does overriding a method in the subclass enforce stricter constraints (e.g., throwing an exception the parent doesn't) that break client expectations?
- [ ] **Interface Segregation Principle (ISP)**: Check that clients do not depend on interfaces that they do not use.
    - *Check*: Are there "fat" objects forcing consumers to handle unused methods? Split into focused modules.
- [ ] **Dependency Inversion Principle (DIP)**: Ensure high-level modules do not depend on low-level modules; both depend on abstractions.
    - *Check*: Is the code instantiating concrete database classes directly (e.g., `new MySQLConnection()`)? Inject a dependency instead.

**Example Review Comments:**
- "The `UserManager` class is handling both data validation and email notification logic. Please extract the email logic into a separate `NotificationService` to adhere to SRP."
- "This `switch` statement for handling report types violates OCP. Consider using the Strategy pattern to allow new report types to be added without modifying this class."

## 2. GoF Pattern Appropriateness

- [ ] **Necessity**: Confirm that a Design Pattern is actually needed to solve the specific problem and is not used for the sake of using it.
- [ ] **Correct Implementation**: Verify the pattern implementation follows the standard structure defined by the Gang of Four.
- [ ] **Clarity over Cleverness**: Ensure the use of the pattern improves code readability rather than obscuring the flow.
- [ ] **Performance Impact**: Assess if the pattern introduces unnecessary overhead (e.g., heavy use of Singleton or Prototype in a tight loop).

**Example Review Comments:**
- "A Singleton is used here for the database connection, but it is causing issues with testing due to shared state. Please pass the connection instance via Dependency Injection instead."
- "The Factory pattern implementation here is over-engineered for creating two simple object types. A simple conditional instantiation would be clearer."

## 3. JSDoc Documentation

- [ ] **Function Parameters**: Ensure all public function parameters have JSDoc type annotations.
- [ ] **Return Types**: Verify that all public methods explicitly declare their return types.
- [ ] **Complex Types**: Check that object types are fully documented with `@typedef`.
- [ ] **Error Cases**: Document what errors a function may throw with `@throws`.

**Example Review Comments:**
- "The `calculateTotal` function accepts `items` but lacks a type hint. Please add `@param {OrderItem[]} items`."
- "The return type should be `@returns {Promise<User | null>}` to indicate it may return null."

## 4. Happy Path Clarity

- [ ] **Primary Workflow Visibility**: Ensure the "happy path" (the success scenario) is immediately visible at the top level of the function without being buried in nested `if` statements.
- [ ] **Guard Clauses**: Check for the use of guard clauses to handle error conditions or edge cases early, returning or exiting quickly.
- [ ] **Indentation Levels**: Verify that the main logic does not exceed 3-4 levels of indentation.
- [ ] **Cognitive Load**: Ensure a reader can understand the main objective of the code within 5 seconds of scanning.

**Example Review Comments:**
- "The success logic is nested inside five levels of `if` statements. Please refactor using guard clauses (return early if validation fails) to flatten the structure."
- "It is difficult to see what happens when the request is valid because the error handling spans 30 lines before the success logic. Move error handling to the bottom or extract it."

## 5. Cyclomatic Complexity Thresholds

- [ ] **Function Complexity**: Ensure no function or method has a cyclomatic complexity greater than 10.
- [ ] **Nesting Depth**: Verify that nested control structures (loops/conditions) do not exceed a depth of 4.
- [ ] **Boolean Logic**: Check for overly complex boolean expressions (e.g., `if ((a && b) || (c && d) && !e)`) that should be extracted into named variables or functions.
- [ ] **Switch/Case Size**: If using switch statements, ensure they are not excessively long; consider polymorphism or lookup tables instead.

**Example Review Comments:**
- "The `processOrder` method has a complexity of 18. Please extract the validation logic and the shipping cost calculation into separate methods."
- "This `if` condition is too complex to parse mentally. Please extract the boolean logic into a descriptive variable named `isEligibleForDiscount`."

## 6. UML Documentation Exists

- [ ] **Class Diagrams**: Verify that UML Class diagrams exist for complex domains or new modules, showing relationships and attributes.
- [ ] **Sequence Diagrams**: Check for Sequence diagrams for critical workflows involving multiple components.
- [ ] **Currency**: Ensure diagrams are updated to reflect the current code state (not outdated artifacts from the initial design).
- [ ] **Accessibility**: Confirm diagrams are linked in the README or stored in the project's `.ai/designs/` folder.

**Example Review Comments:**
- "This interaction between the `OrderService`, `Inventory`, and `PaymentGateway` is complex. A Sequence Diagram would help verify the logic before we merge."
- "The Class Diagram in the docs folder still shows the old `User` attributes. Please update it to reflect the refactoring done last sprint."

## 7. Test Coverage

- [ ] **Unit Test Coverage**: Verify that new code meets the project's minimum coverage threshold (>80%).
- [ ] **Edge Cases**: Ensure tests cover null inputs, empty arrays, boundary values, and error scenarios.
- [ ] **Test Independence**: Check that tests do not depend on execution order and do not share state.
- [ ] **Mocking**: Verify that external dependencies (APIs, Database) are properly mocked using `vi.fn()` or `vi.mock()`.

**Example Review Comments:**
- "The coverage for the new `RefundCalculator` is only 40%. Please add test cases for partial refunds and edge cases where the amount is zero."
- "This unit test hits the actual database. It should be an integration test. Please mock the repository using `vi.mock()`."

## 8. Naming Conventions

- [ ] **Intention-Revealing Names**: Ensure variable and function names clearly state *why* they exist, *what* they do, and *how* they are used.
- [ ] **Standard Casing**: Adhere to JavaScript conventions:
    - `camelCase` for variables and functions
    - `PascalCase` for classes
    - `UPPER_SNAKE_CASE` for constants
- [ ] **Disambiguation**: Avoid names like `data1`, `info`, or `tmp` unless the scope is extremely short (a few lines).
- [ ] **Verbs and Nouns**: Ensure class names are nouns (`Customer`, `Order`) and method names are verbs (`calculateTotal`, `fetchUser`).

**Example Review Comments:**
- "The variable name `d` is not descriptive. Please rename it to `daysUntilExpiration`."
- "The method name `process()` is too vague. Please rename it to `processPayment()` to accurately reflect its responsibility."

## 9. Documentation Standards

- [ ] **JSDoc**: Ensure all public classes, methods, and functions have JSDoc comments describing parameters, return values, and exceptions raised.
- [ ] **Inline Comments**: Verify that code comments explain *why* a complex logic block exists, not *what* the code is doing (the code should speak for itself).
- [ ] **README Updates**: Check if the README.md has been updated with new environment variables or setup steps required for the new code.
- [ ] **Deprecation Warnings**: Ensure deprecated methods are marked with `@deprecated` and point to the replacement method.

**Example Review Comments:**
- "This complex regex lacks an explanation. Please add a comment breaking down what the pattern matches."
- "The `User` class is missing a JSDoc description. Please document the purpose of this class and its public attributes."

## 10. ESLint & Prettier Compliance

- [ ] **No Lint Errors**: Run `npm run lint` and ensure no errors.
- [ ] **Formatted Code**: Run `npm run format:check` and ensure code passes.
- [ ] **No Disabled Rules**: Check for `eslint-disable` comments; ensure they are justified and temporary.

**Example Review Comments:**
- "Please run `npm run format` before committing - the code has formatting issues."
- "The `eslint-disable-next-line` comment should include a reason why this rule is being disabled."
