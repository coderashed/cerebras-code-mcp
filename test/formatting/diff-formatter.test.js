import { describe, it, expect } from 'vitest';
import { generateDiff, generateGitDiff } from '../../src/formatting/diff-formatter.js';

describe('DiffFormatter', () => {
  describe('generateDiff', () => {
    it('should detect added lines', () => {
      const oldContent = 'line1\nline2';
      const newContent = 'line1\nline2\nline3';
      const diff = generateDiff(oldContent, newContent);
      
      expect(diff).toBeTruthy();
      expect(diff).toContain('+ line3');
    });

    it('should detect removed lines', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline3';
      const diff = generateDiff(oldContent, newContent);
      
      expect(diff).toBeTruthy();
      expect(diff).toContain('- line2');
    });

    it('should detect changed lines', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2-modified\nline3';
      const diff = generateDiff(oldContent, newContent);
      
      expect(diff).toBeTruthy();
      expect(diff).toContain('- line2');
      expect(diff).toContain('+ line2-modified');
    });

    it('should return null for identical content', () => {
      const content = 'unchanged\ncontent\nhere';
      const diff = generateDiff(content, content);
      expect(diff).toBeNull();
    });

    it('should handle empty inputs', () => {
      expect(generateDiff('', '')).toBeNull();
      expect(generateDiff(null, null)).toBeNull();
      expect(generateDiff(undefined, undefined)).toBeNull();
    });

    it('should handle one empty input', () => {
      const content = 'some content';
      // generateDiff returns null if either input is empty/falsy
      expect(generateDiff('', content)).toBeNull();
      expect(generateDiff(content, '')).toBeNull();
    });
  });

  describe('generateGitDiff', () => {
    it('should handle new file creation', () => {
      const newContent = 'new file content\nline 2';
      const diff = generateGitDiff(null, newContent, '/path/to/file.js');
      
      expect(diff).toContain('--- /dev/null');
      expect(diff).toContain('+++ b/file.js');
      expect(diff).toContain('+new file content');
      expect(diff).toContain('+line 2');
      expect(diff).toContain('@@ -0,0 +1,2 @@');
    });

    it('should handle file modification', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2-modified\nline3';
      const diff = generateGitDiff(oldContent, newContent, '/path/to/file.js');
      
      // The diff library creates patches in a specific format
      expect(diff).toContain('file.js');
      expect(diff).toContain('-line2');
      expect(diff).toContain('+line2-modified');
      expect(diff).toContain('@@');
    });

    it('should return null when new content is empty', () => {
      const diff = generateGitDiff('old content', '', '/path/to/file.js');
      expect(diff).toBeNull();
    });

    it('should extract filename from path', () => {
      const diff = generateGitDiff(null, 'content', '/very/long/path/to/myfile.py');
      expect(diff).toContain('+++ b/myfile.py');
    });

    it('should handle Windows-style paths', () => {
      const diff = generateGitDiff(null, 'content', 'C:\\Users\\test\\file.js');
      expect(diff).toContain('file.js');
    });

    it('should create proper unified diff format', () => {
      const oldContent = 'function old() {\n  return 1;\n}';
      const newContent = 'function new() {\n  return 2;\n}';
      const diff = generateGitDiff(oldContent, newContent, 'test.js');
      
      expect(diff).toMatch(/^---/m);
      expect(diff).toMatch(/^\+\+\+/m);
      expect(diff).toMatch(/^@@/m);
    });
  });
});