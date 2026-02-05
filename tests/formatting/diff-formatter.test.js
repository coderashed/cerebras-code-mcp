import { describe, it, expect } from 'vitest';
import { generateDiff, generateGitDiff } from '../../src/formatting/diff-formatter.js';

describe('generateDiff', () => {
  it('should return null when oldContent is null', () => {
    expect(generateDiff(null, 'new content')).toBeNull();
  });

  it('should return null when newContent is null', () => {
    expect(generateDiff('old content', null)).toBeNull();
  });

  it('should return null when both are null', () => {
    expect(generateDiff(null, null)).toBeNull();
  });

  it('should return null when content is identical', () => {
    expect(generateDiff('line1\nline2', 'line1\nline2')).toBeNull();
  });

  it('should show added lines', () => {
    const result = generateDiff('line1', 'line1\nline2');
    expect(result).toContain('+ line2');
  });

  it('should show removed lines', () => {
    const result = generateDiff('line1\nline2', 'line1');
    expect(result).toContain('- line2');
  });

  it('should show both added and removed lines', () => {
    const result = generateDiff('old line', 'new line');
    expect(result).toContain('+ new line');
    expect(result).toContain('- old line');
  });

  it('should handle multi-line changes', () => {
    const old = 'a\nb\nc';
    const newContent = 'a\nx\nc';
    const result = generateDiff(old, newContent);
    expect(result).toContain('+ x');
    expect(result).toContain('- b');
  });

  it('should show removed lines when new content is shorter', () => {
    const result = generateDiff('a\nb\nc', 'a');
    expect(result).toContain('- b');
    expect(result).toContain('- c');
    expect(result).not.toContain('+');
  });
});

describe('generateGitDiff', () => {
  it('should return null when newContent is null', () => {
    expect(generateGitDiff('old', null, 'file.js')).toBeNull();
  });

  it('should handle new file creation (no old content)', () => {
    const result = generateGitDiff(null, 'line1\nline2', '/path/to/file.js');

    expect(result).toContain('--- /dev/null');
    expect(result).toContain('+++ b/file.js');
    expect(result).toContain('@@ -0,0 +1,2 @@');
    expect(result).toContain('+line1');
    expect(result).toContain('+line2');
  });

  it('should handle empty old content as new file', () => {
    const result = generateGitDiff('', 'new content', '/path/file.js');
    expect(result).not.toBeNull();
  });

  it('should generate diff for modified files', () => {
    const old = 'line1\nline2';
    const newContent = 'line1\nline3';
    const result = generateGitDiff(old, newContent, '/path/to/file.js');

    expect(result).not.toBeNull();
    expect(result).toContain('file.js');
  });

  it('should extract filename from full path', () => {
    const result = generateGitDiff(null, 'content', '/long/path/to/myfile.ts');
    expect(result).toContain('myfile.ts');
  });
});