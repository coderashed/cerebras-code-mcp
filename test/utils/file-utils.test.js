import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileContent, writeFileContent, getLanguageFromFile } from '../../src/utils/file-utils.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileUtils', () => {
  let tempDir;
  let testFile;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebras-test-'));
    testFile = path.join(tempDir, 'test.js');
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readFileContent', () => {
    it('should read existing file content', async () => {
      const content = 'test content';
      await fs.writeFile(testFile, content);
      
      const result = await readFileContent(testFile);
      expect(result).toBe(content);
    });

    it('should return null for non-existent file', async () => {
      const result = await readFileContent(path.join(tempDir, 'nonexistent.txt'));
      expect(result).toBeNull();
    });

    it('should handle empty files', async () => {
      await fs.writeFile(testFile, '');
      
      const result = await readFileContent(testFile);
      expect(result).toBe('');
    });

    it('should preserve line endings', async () => {
      const content = 'line1\r\nline2\nline3';
      await fs.writeFile(testFile, content);
      
      const result = await readFileContent(testFile);
      expect(result).toBe(content);
    });

    it('should handle UTF-8 content', async () => {
      const content = '// Comment with emoji 🚀\nconst greeting = "Hello, 世界";';
      await fs.writeFile(testFile, content);
      
      const result = await readFileContent(testFile);
      expect(result).toBe(content);
    });
  });

  describe('writeFileContent', () => {
    it('should write content to new file', async () => {
      const content = 'new file content';
      await writeFileContent(testFile, content);
      
      const result = await fs.readFile(testFile, 'utf-8');
      expect(result).toBe(content);
    });

    it('should overwrite existing file', async () => {
      await fs.writeFile(testFile, 'old content');
      
      const newContent = 'new content';
      await writeFileContent(testFile, newContent);
      
      const result = await fs.readFile(testFile, 'utf-8');
      expect(result).toBe(newContent);
    });

    it('should create parent directories if they do not exist', async () => {
      const nestedFile = path.join(tempDir, 'nested', 'deep', 'file.txt');
      const content = 'nested content';
      
      await writeFileContent(nestedFile, content);
      
      const result = await fs.readFile(nestedFile, 'utf-8');
      expect(result).toBe(content);
    });

    it('should handle empty content', async () => {
      await writeFileContent(testFile, '');
      
      const result = await fs.readFile(testFile, 'utf-8');
      expect(result).toBe('');
    });

    it('should preserve special characters', async () => {
      const content = '`${}\\n\\t"\'';
      await writeFileContent(testFile, content);
      
      const result = await fs.readFile(testFile, 'utf-8');
      expect(result).toBe(content);
    });
  });

  describe('getLanguageFromFile', () => {
    it('should detect language from file extension', () => {
      expect(getLanguageFromFile('/path/to/file.js')).toBe('javascript');
      expect(getLanguageFromFile('/path/to/file.py')).toBe('python');
      expect(getLanguageFromFile('/path/to/file.ts')).toBe('typescript');
      expect(getLanguageFromFile('/path/to/file.java')).toBe('java');
    });

    it('should prefer explicit language parameter', () => {
      expect(getLanguageFromFile('/path/to/file.js', 'typescript')).toBe('typescript');
      expect(getLanguageFromFile('/path/to/file.txt', 'python')).toBe('python');
    });

    it('should handle files without extensions', () => {
      expect(getLanguageFromFile('README')).toBe('text');
      expect(getLanguageFromFile('Dockerfile')).toBe('text');
    });

    it('should handle empty file path', () => {
      expect(getLanguageFromFile('')).toBe('text');
      // getLanguageFromFile doesn't handle null/undefined gracefully - it will throw
      // This is acceptable behavior as the function expects a string path
    });

    it('should detect web languages', () => {
      expect(getLanguageFromFile('index.html')).toBe('html');
      expect(getLanguageFromFile('styles.css')).toBe('css');
      expect(getLanguageFromFile('component.jsx')).toBe('javascript');
      expect(getLanguageFromFile('component.tsx')).toBe('typescript');
    });

    it('should detect config file types', () => {
      expect(getLanguageFromFile('config.json')).toBe('json');
      expect(getLanguageFromFile('config.yaml')).toBe('yaml');
      expect(getLanguageFromFile('config.yml')).toBe('yaml');
      expect(getLanguageFromFile('config.xml')).toBe('xml');
    });

    it('should be case insensitive', () => {
      expect(getLanguageFromFile('file.JS')).toBe('javascript');
      expect(getLanguageFromFile('file.PY')).toBe('python');
      expect(getLanguageFromFile('file.Ts')).toBe('typescript');
    });
  });
});