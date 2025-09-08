import { describe, it, expect } from 'vitest';
import { cleanCodeResponse } from '../../src/utils/code-cleaner.js';

describe('CodeCleaner', () => {
  describe('cleanCodeResponse', () => {
    it('should remove markdown code blocks with language specifier', () => {
      const input = '```javascript\nconst x = 1;\n```';
      const output = cleanCodeResponse(input);
      expect(output).toBe('const x = 1;');
    });

    it('should remove markdown code blocks without language specifier', () => {
      const input = '```\nfunction test() {}\n```';
      const output = cleanCodeResponse(input);
      expect(output).toBe('function test() {}');
    });

    it('should handle multiple code blocks', () => {
      const input = '```js\nconst a = 1;\n```\nSome text\n```\nconst b = 2;\n```';
      const output = cleanCodeResponse(input);
      expect(output).not.toContain('```');
      // The function only returns the first code block
      expect(output).toBe('const a = 1;');
    });

    it('should preserve code without markdown', () => {
      const code = 'function test() {\n  return 42;\n}';
      expect(cleanCodeResponse(code)).toBe(code);
    });

    it('should remove language hints', () => {
      const input = 'Here is the code:\n```python\ndef hello():\n    pass\n```';
      const output = cleanCodeResponse(input);
      expect(output).not.toContain('```');
      expect(output).not.toContain('python');
      expect(output).toContain('def hello():');
    });

    it('should handle empty input', () => {
      expect(cleanCodeResponse('')).toBe('');
      expect(cleanCodeResponse(null)).toBe(null);
      expect(cleanCodeResponse(undefined)).toBe(undefined);
    });

    it('should remove explanatory text before code blocks', () => {
      const input = 'Here is your implementation:\n\n```javascript\nconst x = 1;\n```\n\nThis code does...';
      const output = cleanCodeResponse(input);
      expect(output).not.toContain('Here is your implementation');
      expect(output).not.toContain('This code does');
      expect(output).toContain('const x = 1;');
    });

    it('should handle nested backticks in code', () => {
      const input = '```javascript\nconst str = `template ${var}`;\n```';
      const output = cleanCodeResponse(input);
      expect(output).toBe('const str = `template ${var}`;');
    });
  });
});