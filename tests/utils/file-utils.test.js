import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileContent, writeFileContent, getLanguageFromFile } from '../../src/utils/file-utils.js';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
vi.mock('fs/promises');

describe('getLanguageFromFile', () => {
  it('should return explicit language when provided', () => {
    expect(getLanguageFromFile('test.py', 'javascript')).toBe('javascript');
    expect(getLanguageFromFile('test.js', 'PYTHON')).toBe('python');
  });

  it('should detect Python files', () => {
    expect(getLanguageFromFile('app.py')).toBe('python');
  });

  it('should detect JavaScript files', () => {
    expect(getLanguageFromFile('app.js')).toBe('javascript');
    expect(getLanguageFromFile('component.jsx')).toBe('javascript');
  });

  it('should detect TypeScript files', () => {
    expect(getLanguageFromFile('app.ts')).toBe('typescript');
    expect(getLanguageFromFile('component.tsx')).toBe('typescript');
  });

  it('should detect various languages', () => {
    expect(getLanguageFromFile('Main.java')).toBe('java');
    expect(getLanguageFromFile('main.cpp')).toBe('cpp');
    expect(getLanguageFromFile('main.c')).toBe('c');
    expect(getLanguageFromFile('Program.cs')).toBe('csharp');
    expect(getLanguageFromFile('main.go')).toBe('go');
    expect(getLanguageFromFile('main.rs')).toBe('rust');
    expect(getLanguageFromFile('app.rb')).toBe('ruby');
    expect(getLanguageFromFile('script.sh')).toBe('bash');
    expect(getLanguageFromFile('query.sql')).toBe('sql');
  });

  it('should detect web languages', () => {
    expect(getLanguageFromFile('index.html')).toBe('html');
    expect(getLanguageFromFile('styles.css')).toBe('css');
    expect(getLanguageFromFile('styles.scss')).toBe('scss');
    expect(getLanguageFromFile('styles.less')).toBe('less');
  });

  it('should detect data formats', () => {
    expect(getLanguageFromFile('data.json')).toBe('json');
    expect(getLanguageFromFile('config.xml')).toBe('xml');
    expect(getLanguageFromFile('config.yaml')).toBe('yaml');
    expect(getLanguageFromFile('config.yml')).toBe('yaml');
  });

  it('should return text for unknown extensions', () => {
    expect(getLanguageFromFile('readme.md')).toBe('text');
    expect(getLanguageFromFile('file.unknown')).toBe('text');
    expect(getLanguageFromFile('noextension')).toBe('text');
  });

  it('should handle uppercase extensions', () => {
    expect(getLanguageFromFile('app.JS')).toBe('javascript');
    expect(getLanguageFromFile('app.PY')).toBe('python');
  });
});

describe('readFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should read file with absolute path', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('file content');

    const result = await readFileContent('/absolute/path/file.js');

    expect(result).toBe('file content');
    expect(fs.readFile).toHaveBeenCalledWith('/absolute/path/file.js', 'utf-8');
  });

  it('should expand home path', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('home file');
    const originalHome = process.env.HOME;
    process.env.HOME = '/home/testuser';

    const result = await readFileContent('~/documents/file.js');

    expect(result).toBe('home file');
    expect(fs.readFile).toHaveBeenCalledWith('/home/testuser/documents/file.js', 'utf-8');

    process.env.HOME = originalHome;
  });

  it('should convert relative path to absolute', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('relative content');

    const result = await readFileContent('src/file.js');

    expect(result).toBe('relative content');
    expect(fs.readFile).toHaveBeenCalledWith(path.join(process.cwd(), 'src/file.js'), 'utf-8');
  });

  it('should return null for non-existent file', async () => {
    const error = new Error('File not found');
    error.code = 'ENOENT';
    vi.mocked(fs.readFile).mockRejectedValue(error);

    const result = await readFileContent('/nonexistent/file.js');

    expect(result).toBeNull();
  });

  it('should throw error for other read failures', async () => {
    const error = new Error('Permission denied');
    error.code = 'EACCES';
    vi.mocked(fs.readFile).mockRejectedValue(error);

    await expect(readFileContent('/protected/file.js'))
      .rejects.toThrow('Failed to read file /protected/file.js: Permission denied');
  });
});

describe('writeFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  it('should write file with absolute path', async () => {
    const result = await writeFileContent('/absolute/path/file.js', 'content');

    expect(result).toBe(true);
    expect(fs.mkdir).toHaveBeenCalledWith('/absolute/path', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith('/absolute/path/file.js', 'content', 'utf-8');
  });

  it('should expand home path for writing', async () => {
    const originalHome = process.env.HOME;
    process.env.HOME = '/home/testuser';

    const result = await writeFileContent('~/documents/file.js', 'content');

    expect(result).toBe(true);
    expect(fs.mkdir).toHaveBeenCalledWith('/home/testuser/documents', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith('/home/testuser/documents/file.js', 'content', 'utf-8');

    process.env.HOME = originalHome;
  });

  it('should convert relative path for writing', async () => {
    const result = await writeFileContent('src/file.js', 'content');

    expect(result).toBe(true);
    const expectedPath = path.join(process.cwd(), 'src/file.js');
    expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, 'content', 'utf-8');
  });

  it('should throw error on write failure', async () => {
    vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk full'));

    await expect(writeFileContent('/path/file.js', 'content'))
      .rejects.toThrow('Failed to write file /path/file.js: Disk full');
  });

  it('should create directory if it does not exist', async () => {
    await writeFileContent('/new/nested/dir/file.js', 'content');

    expect(fs.mkdir).toHaveBeenCalledWith('/new/nested/dir', { recursive: true });
  });
});
