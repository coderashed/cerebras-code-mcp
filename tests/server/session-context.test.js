import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn()
}));

import { 
  setSessionContext, 
  getSessionContext, 
  getProjectConfig,
  resolveContext 
} from '../../src/server/session-context.js';

describe('session-context', () => {
  beforeEach(() => {
    setSessionContext({ shared_context: null, shared_context_files: null });
  });

  describe('setSessionContext', () => {
    it('should set shared_context', () => {
      setSessionContext({ shared_context: 'test context' });
      const result = getSessionContext();
      expect(result.shared_context).toBe('test context');
    });

    it('should set shared_context_files', () => {
      setSessionContext({ shared_context_files: ['/file1.js', '/file2.js'] });
      const result = getSessionContext();
      expect(result.shared_context_files).toEqual(['/file1.js', '/file2.js']);
    });

    it('should append to shared_context when append is true', () => {
      setSessionContext({ shared_context: 'first' });
      setSessionContext({ shared_context: 'second', append: true });
      const result = getSessionContext();
      expect(result.shared_context).toBe('first\nsecond');
    });

    it('should deduplicate shared_context_files when appending', () => {
      setSessionContext({ shared_context_files: ['/file1.js'] });
      setSessionContext({ shared_context_files: ['/file1.js', '/file2.js'], append: true });
      const result = getSessionContext();
      expect(result.shared_context_files).toEqual(['/file1.js', '/file2.js']);
    });

    it('should append to null shared_context_files', () => {
      // session starts as null from beforeEach
      setSessionContext({ shared_context_files: ['/file1.js'], append: true });
      const result = getSessionContext();
      expect(result.shared_context_files).toEqual(['/file1.js']);
    });

    it('should replace context when append is false', () => {
      setSessionContext({ shared_context: 'old', shared_context_files: ['/old.js'] });
      setSessionContext({ shared_context: 'new', shared_context_files: ['/new.js'] });
      const result = getSessionContext();
      expect(result.shared_context).toBe('new');
      expect(result.shared_context_files).toEqual(['/new.js']);
    });
  });

  describe('getSessionContext', () => {
    it('should return a copy of session context', () => {
      setSessionContext({ shared_context: 'test' });
      const result1 = getSessionContext();
      const result2 = getSessionContext();
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('getProjectConfig', () => {
    it('should return project config', () => {
      const result = getProjectConfig();
      expect(result).toHaveProperty('shared_context');
      expect(result).toHaveProperty('shared_context_files');
    });
  });

  describe('resolveContext', () => {
    it('should use call params when provided', () => {
      setSessionContext({ shared_context: 'session', shared_context_files: ['/session.js'] });
      const result = resolveContext({ 
        shared_context: 'call', 
        shared_context_files: ['/call.js'] 
      });
      expect(result.shared_context).toBe('call');
      expect(result.shared_context_files).toEqual(['/call.js']);
    });

    it('should fall back to session context when call params not provided', () => {
      setSessionContext({ shared_context: 'session', shared_context_files: ['/session.js'] });
      const result = resolveContext({});
      expect(result.shared_context).toBe('session');
      expect(result.shared_context_files).toEqual(['/session.js']);
    });

    it('should fall back to project config when session is null', () => {
      // session is null from beforeEach, so should fall through to projectConfig defaults
      const result = resolveContext({});
      expect(result.shared_context).toBeNull();
      expect(result.shared_context_files).toEqual([]); // from projectConfig default
    });
  });
});