# .ai Directory

This directory contains AI-assisted development artifacts for the TDD workflow.

## Structure

```
.ai/
├── README.md              # This file
├── tdd-workflow.md        # Master sequence diagram for TDD process
├── designs/               # UML diagrams created during planning phase
│   ├── _template-class.md
│   ├── _template-sequence.md
│   └── _template-state.md
└── principles/            # Coding standards and patterns
    ├── 00-coding-principles-index.md
    ├── 01-solid-principles.md
    ├── 02-gang-of-four-creational.md
    ├── 03-gang-of-four-structural.md
    ├── 04-gang-of-four-behavioral.md
    ├── 05-happy-path-programming.md
    ├── 06-jsdoc-documentation.md
    ├── 07-cyclomatic-complexity-eslint.md
    ├── 08-uml-diagrams-before-development.md
    ├── 09-complete-workflow-example.md
    ├── 10-code-review-checklist.md
    └── 11-anti-patterns-to-avoid.md
```

## Workflow

1. **Planning**: Create UML diagrams in `designs/` before any code
2. **Red**: Tests written to match UML structure
3. **Green**: Implementation to pass tests
4. **Blue**: Refactor to meet quality gates

## Design Files

Each feature/module gets its own design files:

```
designs/
├── batch-write/
│   ├── class-diagram.md
│   ├── sequence-planning.md
│   └── sequence-execution.md
├── rate-limiter/
│   ├── class-diagram.md
│   └── state-diagram.md
```

## Context Passed to Workers

When dispatching to Sonnet or Cerebras, always include:

1. **Principles** (`.ai/principles/*.md`)
2. **Relevant UML designs** (`designs/*.md`)
3. **Existing test files** (for Green/Blue phases)
4. **Quality gate output** (for Blue phase)

## Quality Gates

```bash
npm run lint           # ESLint - no errors
npm run format:check   # Prettier - code formatted
npm test               # Vitest - all tests pass
npm run test:coverage  # Coverage - >80%
```
