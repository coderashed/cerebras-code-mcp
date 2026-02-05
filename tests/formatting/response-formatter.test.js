import { describe, it, expect } from 'vitest';
import { formatEditResponse, formatCreateResponse } from '../../src/formatting/response-formatter.js';

describe('formatEditResponse', () => {
  it('should return null when no changes made', () => {
    const result = formatEditResponse('file.js', 'same', 'same', '/path/file.js');
    expect(result).toBeNull();
  });

  it('should format response for additions', () => {
    const result = formatEditResponse('file.js', 'line1', 'line1\nline2', '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.type).toBe('text');
    expect(result.text).toContain('Update');
    expect(result.text).toContain('file.js');
    expect(result.text).toContain('addition');
  });

  it('should format response for removals', () => {
    const result = formatEditResponse('file.js', 'line1\nline2', 'line1', '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.text).toContain('removal');
  });

  it('should count additions and removals correctly', () => {
    const old = 'a\nb\nc';
    const newContent = 'a\nx\ny\nc';
    const result = formatEditResponse('file.js', old, newContent, '/path/file.js');

    expect(result).not.toBeNull();
    // x and y are added, b is removed
    expect(result.text).toContain('addition');
    expect(result.text).toContain('removal');
  });

  it('should handle empty lines in additions', () => {
    const result = formatEditResponse('file.js', 'line1', 'line1\n\nline3', '/path/file.js');
    expect(result).not.toBeNull();
  });

  it('should handle empty lines in removals', () => {
    const result = formatEditResponse('file.js', 'line1\n\nline3', 'line1\nline3', '/path/file.js');
    expect(result).not.toBeNull();
  });

  it('should include ANSI color codes', () => {
    const result = formatEditResponse('file.js', 'old', 'new', '/path/file.js');

    expect(result).not.toBeNull();
    // Green for additions: \x1b[32m
    expect(result.text).toContain('\x1b[32m');
    // Red for removals: \x1b[31m
    expect(result.text).toContain('\x1b[31m');
  });
});

describe('formatCreateResponse', () => {
  it('should format response for new file', () => {
    const result = formatCreateResponse('new.js', 'const x = 1;', '/path/new.js');

    expect(result.type).toBe('text');
    expect(result.text).toContain('Create');
    expect(result.text).toContain('new.js');
    expect(result.text).toContain('1');
    expect(result.text).toContain('line');
  });

  it('should handle multi-line content', () => {
    const content = 'line1\nline2\nline3';
    const result = formatCreateResponse('file.js', content, '/path/file.js');

    expect(result.text).toContain('3');
    expect(result.text).toContain('lines');
  });

  it('should show singular "line" for single line', () => {
    const result = formatCreateResponse('file.js', 'single line', '/path/file.js');
    expect(result.text).toMatch(/1.*line[^s]/);
  });

  it('should truncate very long files', () => {
    // Create content with more than 50 lines
    const lines = Array(60).fill('line content').join('\n');
    const result = formatCreateResponse('file.js', lines, '/path/file.js');

    expect(result.text).toContain('lines hidden');
  });

  it('should include line numbers', () => {
    const result = formatCreateResponse('file.js', 'line1\nline2\nline3', '/path/file.js');

    expect(result.text).toMatch(/\s+1\s/);
    expect(result.text).toMatch(/\s+2\s/);
    expect(result.text).toMatch(/\s+3\s/);
  });

  it('should handle empty lines in content', () => {
    const result = formatCreateResponse('file.js', 'line1\n\nline3', '/path/file.js');
    expect(result).not.toBeNull();
    expect(result.text).toContain('3');
  });

  it('should include green color for additions', () => {
    const result = formatCreateResponse('file.js', 'content', '/path/file.js');
    expect(result.text).toContain('\x1b[32m');
  });
});
