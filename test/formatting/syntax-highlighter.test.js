import { describe, it, expect } from 'vitest';
import { syntaxHighlight } from '../../src/formatting/syntax-highlighter.js';

describe('SyntaxHighlighter', () => {
  describe('syntaxHighlight', () => {
    it('should apply ANSI colors to JavaScript keywords', () => {
      const code = 'const x = 1;';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      // Should contain ANSI color codes
      expect(highlighted).toContain('\x1b[35m'); // Magenta for keywords
      expect(highlighted).toContain('const');
      expect(highlighted).toContain('\x1b[0m'); // Reset
    });

    it('should highlight strings in JavaScript', () => {
      const code = 'const msg = "hello world";';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      expect(highlighted).toContain('\x1b[33m'); // Yellow for strings
      expect(highlighted).toContain('"hello world"');
    });

    it('should highlight numbers', () => {
      const code = 'const num = 42;';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      expect(highlighted).toContain('\x1b[36m'); // Cyan for numbers
      expect(highlighted).toContain('42');
    });

    it('should highlight comments in JavaScript', () => {
      const code = '// This is a comment';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      expect(highlighted).toContain('\x1b[90m'); // Gray for comments
      expect(highlighted).toContain('// This is a comment');
    });

    it('should highlight Python keywords', () => {
      const code = 'def hello():\n    return True';
      const highlighted = syntaxHighlight(code, 'python');
      
      expect(highlighted).toContain('\x1b[35m'); // Magenta for keywords
      expect(highlighted).toContain('def');
      expect(highlighted).toContain('return');
      expect(highlighted).toContain('True');
    });

    it('should highlight Python comments', () => {
      const code = '# Python comment';
      const highlighted = syntaxHighlight(code, 'python');
      
      expect(highlighted).toContain('\x1b[90m'); // Gray for comments
      expect(highlighted).toContain('# Python comment');
    });

    it('should highlight function names', () => {
      const code = 'function test() {}';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      expect(highlighted).toContain('\x1b[34m'); // Blue for functions
      expect(highlighted).toContain('test');
    });

    it('should handle multi-line code', () => {
      const code = 'const x = 1;\nconst y = 2;';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      const lines = highlighted.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('const');
      expect(lines[1]).toContain('const');
    });

    it('should handle HTML tags', () => {
      const code = '<div class="test">Content</div>';
      const highlighted = syntaxHighlight(code, 'html');
      
      expect(highlighted).toContain('\x1b[35m'); // Keywords include HTML tags
      expect(highlighted).toContain('div');
    });

    it('should handle CSS properties', () => {
      const code = 'color: red; background: blue;';
      const highlighted = syntaxHighlight(code, 'css');
      
      expect(highlighted).toContain('\x1b[35m'); // Keywords include CSS properties
      expect(highlighted).toContain('color');
      expect(highlighted).toContain('background');
    });

    it('should handle unknown languages gracefully', () => {
      const code = 'some code here';
      const highlighted = syntaxHighlight(code, 'unknown');
      
      // Should still apply basic highlighting (numbers, strings)
      expect(highlighted).toBeDefined();
      expect(highlighted).toContain('some code here');
    });

    it('should preserve original code structure', () => {
      const code = '  const x = 1;\n    const y = 2;';
      const highlighted = syntaxHighlight(code, 'javascript');
      
      // Indentation should be preserved
      expect(highlighted).toContain('  ');
      expect(highlighted).toContain('    ');
    });
  });
});