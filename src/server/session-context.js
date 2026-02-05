import fs from 'fs';
import path from 'path';

const projectConfig = {
  shared_context: null,
  shared_context_files: []
};

const sessionContext = {
  shared_context: null,
  shared_context_files: null
};

const configCache = new Map();

export function clearConfigCache() {
  configCache.clear();
}

function findProjectConfig(filePath) {
  const resolved = path.resolve(filePath);
  // If it's a directory, start there; if it's a file, start from its parent
  let currentDir;
  try {
    const stat = fs.statSync(resolved);
    currentDir = stat.isDirectory() ? resolved : path.dirname(resolved);
  } catch {
    // Path doesn't exist, assume it's a file path
    currentDir = path.dirname(resolved);
  }
  
  while (true) {
    if (configCache.has(currentDir)) {
      return configCache.get(currentDir);
    }
    
    const configPath = path.join(currentDir, '.cerebras.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        const result = { configPath, config };
        configCache.set(currentDir, result);
        return result;
      } catch {
        // Invalid JSON - continue searching up
      }
    }
    
    const parentDir = path.dirname(currentDir);
    
    if (parentDir === currentDir) {
      const result = { configPath: null, config: null };
      configCache.set(currentDir, result);
      return result;
    }
    
    currentDir = parentDir;
  }
}

export function resolveContextForFile(filePath, callParams = {}) {
  // Clear cache to ensure fresh lookups (can optimize later)
  configCache.clear();

  // First try to find config from the file path
  let { configPath, config } = findProjectConfig(filePath);

  // If not found and file is outside cwd, also try from cwd
  if (!config) {
    const cwdResult = findProjectConfig(process.cwd());
    configPath = cwdResult.configPath;
    config = cwdResult.config;
  }

  let projectSharedContextFiles = [];
  
  if (config && config.shared_context_files && config.shared_context_files.length > 0) {
    const configDir = configPath ? path.dirname(configPath) : process.cwd();
    projectSharedContextFiles = config.shared_context_files.map(file => 
      path.resolve(configDir, file)
    );
  }
  
  const result = {
    shared_context: callParams.shared_context
      ?? sessionContext.shared_context
      ?? (config?.shared_context || null),
    shared_context_files: callParams.shared_context_files
      ?? sessionContext.shared_context_files
      ?? projectSharedContextFiles
  };
  return result;
}

export function setSessionContext({ shared_context, shared_context_files, append = false }) {
  if (append) {
    if (shared_context) {
      sessionContext.shared_context = sessionContext.shared_context
        ? sessionContext.shared_context + '\n' + shared_context
        : shared_context;
    }
    if (shared_context_files && shared_context_files.length > 0) {
      sessionContext.shared_context_files = [
        ...new Set([...(sessionContext.shared_context_files || []), ...shared_context_files])
      ];
    }
  } else {
    if (shared_context !== undefined) {
      sessionContext.shared_context = shared_context;
    }
    if (shared_context_files !== undefined) {
      sessionContext.shared_context_files = shared_context_files;
    }
  }
}

export function getSessionContext() {
  return { ...sessionContext };
}

export function getProjectConfig() {
  return { ...projectConfig };
}

export function resolveContext(callParams = {}) {
  return {
    shared_context: callParams.shared_context
      ?? sessionContext.shared_context,
    shared_context_files: callParams.shared_context_files
      ?? sessionContext.shared_context_files ?? []
  };
}