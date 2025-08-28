import fs from 'fs/promises';
import path from 'path';

// Read file content safely
export async function readFileContent(filePath) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
      console.error(`  Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`  Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`  Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

// Write file content safely
export async function writeFileContent(filePath, content) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
      console.error(`  Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`  Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`  Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(absolutePath, content, 'utf-8');
    console.error(`File written to: ${absolutePath}`);
    console.error(`Current working directory: ${process.cwd()}`);
    console.error(`Original path: ${filePath}`);
    return true;
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

// Determine programming language from file extension or explicit parameter
export function getLanguageFromFile(filePath, explicitLanguage = null) {
  if (explicitLanguage) {
    return explicitLanguage.toLowerCase();
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.jsx': 'javascript',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  };
  
  return languageMap[ext] || 'text';
}
