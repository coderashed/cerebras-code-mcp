import { describe, it, expect } from 'vitest';
import { cleanCodeResponse } from '../../src/utils/code-cleaner.js';

describe('cleanCodeResponse', () => {
  it('should return null/undefined unchanged', () => {
    expect(cleanCodeResponse(null)).toBe(null);
    expect(cleanCodeResponse(undefined)).toBe(undefined);
  });

  it('should return empty string unchanged', () => {
    expect(cleanCodeResponse('')).toBe('');
  });

  it('should return plain text trimmed when no code blocks', () => {
    expect(cleanCodeResponse('  hello world  ')).toBe('hello world');
  });

  it('should extract code from single code block with language', () => {
    const input = '```javascript\nconst x = 5;\n```';
    expect(cleanCodeResponse(input)).toBe('const x = 5;');
  });

  it('should extract code from code block without language', () => {
    const input = '```\nconst x = 5;\n```';
    expect(cleanCodeResponse(input)).toBe('const x = 5;');
  });

  it('should return first code block when multiple present', () => {
    const input = '```javascript\nconst first = 1;\n```\n```javascript\nconst second = 2;\n```';
    expect(cleanCodeResponse(input)).toBe('const first = 1;');
  });

  it('should strip language identifier on its own line', () => {
    const input = '```\npython\nprint("hello")\n```';
    expect(cleanCodeResponse(input)).toBe('print("hello")');
  });

  it('should not strip content that looks like language but is code', () => {
    const input = '```javascript\nconst python = "snake";\n```';
    expect(cleanCodeResponse(input)).toBe('const python = "snake";');
  });

  it('should handle code block with extra whitespace', () => {
    const input = '```javascript\n\n  const x = 5;  \n\n```';
    expect(cleanCodeResponse(input)).toBe('const x = 5;');
  });

  it('should handle fallback path with partial markdown', () => {
    const input = '```javascript\nconst x = 5;';
    // No closing ```, falls back to regex cleanup
    const result = cleanCodeResponse(input);
    expect(result).toBe('const x = 5;');
  });

  it('should handle text surrounding code block', () => {
    const input = 'Here is the code:\n```javascript\nconst x = 5;\n```\nThat was the code.';
    expect(cleanCodeResponse(input)).toBe('const x = 5;');
  });

  it('should strip language identifier in fallback path without code blocks', () => {
    // No code blocks, just a language identifier on first line
    const input = 'javascript\nconsole.log("hello");';
    expect(cleanCodeResponse(input)).toBe('console.log("hello");');
  });
});
