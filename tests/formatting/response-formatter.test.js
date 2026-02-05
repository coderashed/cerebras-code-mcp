import { describe, it, expect, vi, afterEach } from 'vitest';
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

  it('should handle typescript files by mapping to javascript highlighting', () => {
    const result = formatEditResponse('file.ts', 'const old = 1;', 'const new_ = 2;', '/path/file.ts');

    expect(result).not.toBeNull();
    expect(result.text).toContain('file.ts');
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

  it('should handle typescript files in create response', () => {
    const result = formatCreateResponse('file.ts', 'const x: number = 1;', '/path/file.ts');

    expect(result).not.toBeNull();
    expect(result.text).toContain('file.ts');
  });

  it('should include green color for additions', () => {
    const result = formatCreateResponse('file.js', 'content', '/path/file.js');
    expect(result.text).toContain('\x1b[32m');
  });
});

describe('formatEditResponse with IDE variants', () => {
  const originalIDE = process.env.CEREBRAS_MCP_IDE;

  afterEach(() => {
    if (originalIDE === undefined) {
      delete process.env.CEREBRAS_MCP_IDE;
    } else {
      process.env.CEREBRAS_MCP_IDE = originalIDE;
    }
  });

  it('should use emojis without ANSI colors for cursor IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'cursor';
    const result = formatEditResponse('file.js', 'old', 'new', '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.text).not.toContain('\x1b[');
    expect(result.text).toContain('Updated');
  });

  it('should use no emojis and no ANSI colors for crush IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'crush';
    const result = formatEditResponse('file.js', 'old', 'new', '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.text).not.toContain('\x1b[');
    expect(result.text).toContain('Updated');
    expect(result.text).not.toContain('✅');
  });

  it('should truncate large diffs in edit response', () => {
    const oldLines = Array(60).fill('old line').join('\n');
    const newLines = Array(60).fill('new line').join('\n');
    const result = formatEditResponse('file.js', oldLines, newLines, '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.text).toContain('lines hidden');
  });

  it('should truncate large diffs without ANSI colors for crush IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'crush';
    const oldLines = Array(40).fill('old line').join('\n');
    const newLines = Array(40).fill('new line').join('\n');
    const result = formatEditResponse('file.js', oldLines, newLines, '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.text).toContain('lines hidden');
    expect(result.text).not.toContain('\x1b[');
  });

  it('should show plural additions/removals without colors for crush IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'crush';
    const result = formatEditResponse('file.js', 'a\nb\nc', 'x\ny\nz', '/path/file.js');

    expect(result).not.toBeNull();
    expect(result.text).toContain('additions');
    expect(result.text).toContain('removals');
    expect(result.text).not.toContain('\x1b[');
  });
});

describe('formatCreateResponse with IDE variants', () => {
  const originalIDE = process.env.CEREBRAS_MCP_IDE;

  afterEach(() => {
    if (originalIDE === undefined) {
      delete process.env.CEREBRAS_MCP_IDE;
    } else {
      process.env.CEREBRAS_MCP_IDE = originalIDE;
    }
  });

  it('should use emojis without ANSI colors for cursor IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'cursor';
    const result = formatCreateResponse('new.js', 'const x = 1;', '/path/new.js');

    expect(result.text).not.toContain('\x1b[');
    expect(result.text).toContain('Created');
  });

  it('should use no emojis and no ANSI colors for crush IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'crush';
    const result = formatCreateResponse('new.js', 'const x = 1;', '/path/new.js');

    expect(result.text).not.toContain('\x1b[');
    expect(result.text).toContain('Created');
    expect(result.text).not.toContain('✨');
  });

  it('should use minimal diff style for cline IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'cline';
    const result = formatCreateResponse('new.js', 'const x = 1;', '/path/new.js');

    expect(result.text).not.toContain('\x1b[');
    expect(result.text).toContain('Created');
  });

  it('should format without ANSI colors for vscode IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'vscode';
    const result = formatCreateResponse('new.js', 'const x = 1;', '/path/new.js');

    expect(result.text).not.toContain('\x1b[');
    expect(result.text).toContain('Created');
  });

  it('should truncate long files without ANSI colors for crush IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'crush';
    const lines = Array(30).fill('line content').join('\n');
    const result = formatCreateResponse('file.js', lines, '/path/file.js');

    expect(result.text).toContain('lines hidden');
    expect(result.text).not.toContain('\x1b[');
  });

  it('should show plural lines without colors for crush IDE', () => {
    process.env.CEREBRAS_MCP_IDE = 'crush';
    const result = formatCreateResponse('new.js', 'line1\nline2\nline3', '/path/new.js');

    expect(result.text).toContain('3 lines');
    expect(result.text).not.toContain('\x1b[');
  });
});