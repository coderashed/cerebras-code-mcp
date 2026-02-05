import { describe, it, expect } from 'vitest';
import { syntaxHighlight } from '../../src/formatting/syntax-highlighter.js';

describe('syntaxHighlight', () => {
  const ANSI = {
    keyword: '\x1b[35m',
    string: '\x1b[33m',
    comment: '\x1b[90m',
    number: '\x1b[36m',
    function: '\x1b[34m',
    reset: '\x1b[0m'
  };

  describe('JavaScript', () => {
    it('should highlight keywords', () => {
      const result = syntaxHighlight('const x = 5;', 'javascript');
      expect(result).toContain(`${ANSI.keyword}const${ANSI.reset}`);
    });

    it('should highlight strings', () => {
      const result = syntaxHighlight('const name = "hello";', 'javascript');
      expect(result).toContain(`${ANSI.string}"hello"${ANSI.reset}`);
    });

    it('should highlight single-quoted strings', () => {
      const result = syntaxHighlight("const name = 'world';", 'javascript');
      expect(result).toContain(`${ANSI.string}'world'${ANSI.reset}`);
    });

    it('should highlight numbers', () => {
      const result = syntaxHighlight('const x = 42;', 'javascript');
      expect(result).toContain(`${ANSI.number}42${ANSI.reset}`);
    });

    it('should highlight decimal numbers', () => {
      const result = syntaxHighlight('const pi = 3.14;', 'javascript');
      expect(result).toContain(`${ANSI.number}3.14${ANSI.reset}`);
    });

    it('should highlight // comments', () => {
      const result = syntaxHighlight('x = 1; // comment', 'javascript');
      expect(result).toContain(`${ANSI.comment}// comment${ANSI.reset}`);
    });

    it('should highlight /* */ comments', () => {
      const result = syntaxHighlight('x = 1; /* block */', 'javascript');
      expect(result).toContain(`${ANSI.comment}/* block */${ANSI.reset}`);
    });

    it('should highlight function calls', () => {
      const result = syntaxHighlight('myFunction()', 'javascript');
      expect(result).toContain(`${ANSI.function}myFunction${ANSI.reset}(`);
    });

    it('should highlight multiple keywords', () => {
      const result = syntaxHighlight('async function test() { return await promise; }', 'javascript');
      expect(result).toContain(`${ANSI.keyword}async${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}function${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}return${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}await${ANSI.reset}`);
    });

    it('should handle multi-line code', () => {
      const code = 'const a = 1;\nconst b = 2;';
      const result = syntaxHighlight(code, 'javascript');
      const lines = result.split('\n');
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain(`${ANSI.keyword}const${ANSI.reset}`);
      expect(lines[1]).toContain(`${ANSI.keyword}const${ANSI.reset}`);
    });
  });

  describe('Python', () => {
    it('should highlight Python keywords', () => {
      const result = syntaxHighlight('def foo(): return True', 'python');
      expect(result).toContain(`${ANSI.keyword}def${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}return${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}True${ANSI.reset}`);
    });

    it('should highlight Python # comments', () => {
      const result = syntaxHighlight('x = 1  # comment', 'python');
      expect(result).toContain(`${ANSI.comment}# comment${ANSI.reset}`);
    });

    it('should highlight function calls in Python', () => {
      const result = syntaxHighlight('print("hello")', 'python');
      expect(result).toContain(`${ANSI.function}print${ANSI.reset}(`);
    });
  });

  describe('HTML', () => {
    it('should highlight HTML tags (as keywords)', () => {
      const result = syntaxHighlight('<div><span></span></div>', 'html');
      expect(result).toContain(`${ANSI.keyword}div${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}span${ANSI.reset}`);
    });

    it('should highlight HTML comments', () => {
      const result = syntaxHighlight('<!-- comment -->', 'html');
      expect(result).toContain(`${ANSI.comment}<!-- comment -->${ANSI.reset}`);
    });
  });

  describe('CSS', () => {
    it('should highlight CSS properties', () => {
      const result = syntaxHighlight('color: red; margin: 10px;', 'css');
      expect(result).toContain(`${ANSI.keyword}color${ANSI.reset}`);
      expect(result).toContain(`${ANSI.keyword}margin${ANSI.reset}`);
    });

    it('should highlight CSS comments', () => {
      const result = syntaxHighlight('/* style */ color: blue;', 'css');
      expect(result).toContain(`${ANSI.comment}/* style */${ANSI.reset}`);
    });
  });

  describe('Unknown language', () => {
    it('should still highlight strings and numbers', () => {
      const result = syntaxHighlight('x = "hello" + 42', 'unknown');
      expect(result).toContain(`${ANSI.string}"hello"${ANSI.reset}`);
      expect(result).toContain(`${ANSI.number}42${ANSI.reset}`);
    });

    it('should not highlight keywords for unknown language', () => {
      const result = syntaxHighlight('const x = 1;', 'unknown');
      expect(result).not.toContain(`${ANSI.keyword}const${ANSI.reset}`);
    });
  });
});
