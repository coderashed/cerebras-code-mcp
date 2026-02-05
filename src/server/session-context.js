import fs from 'fs/promises';
import path from 'path';

const projectConfig = {
  shared_context: null,
  shared_context_files: []
};

(async () => {
  try {
    const configPath = path.join(process.cwd(), '.cerebras.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    projectConfig.shared_context = config.shared_context || null;
    projectConfig.shared_context_files = config.shared_context_files || [];
  } catch {
    // No config file or invalid JSON - use defaults
  }
})();

const sessionContext = {
  shared_context: null,
  shared_context_files: []
};

export function setSessionContext({ shared_context, shared_context_files, append = false }) {
  if (append) {
    if (shared_context) {
      sessionContext.shared_context = sessionContext.shared_context
        ? sessionContext.shared_context + '\n' + shared_context
        : shared_context;
    }
    if (shared_context_files && shared_context_files.length > 0) {
      sessionContext.shared_context_files = [
        ...new Set([...sessionContext.shared_context_files, ...shared_context_files])
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
      ?? sessionContext.shared_context
      ?? projectConfig.shared_context,
    shared_context_files: callParams.shared_context_files
      ?? sessionContext.shared_context_files
      ?? projectConfig.shared_context_files ?? []
  };
}