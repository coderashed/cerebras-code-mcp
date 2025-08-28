import { createPatch } from 'diff';
import path from 'path';
import { syntaxHighlight } from './syntax-highlighter.js';
import { getLanguageFromFile } from '../utils/file-utils.js';

export function formatEditResponse(fileName, existingContent, newContent, filePath) {
  const language = getLanguageFromFile(filePath);
  
  const oldLines = existingContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Use the diff library to get a proper diff
  const patch = createPatch(fileName, existingContent, newContent);
  const patchLines = patch.split('\n');
  
  // Count additions and removals
  let additions = 0;
  let removals = 0;
  let formattedDiff = [];
  
  // Parse the patch to extract changes and line numbers
  let lineNumber = 0;
  let inHunk = false;
  
  for (const line of patchLines) {
    if (line.startsWith('@@')) {
      // Extract starting line number from hunk header
      const match = line.match(/@@ -\d+,?\d* \+(\d+)/);
      if (match) {
        lineNumber = parseInt(match[1]);
        inHunk = true;
      }
    } else if (inHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        const codeLine = line.substring(1);
        let highlighted = codeLine;
        if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
          highlighted = syntaxHighlight(codeLine, language === 'typescript' ? 'javascript' : language);
        }
        // Handle empty lines properly - use non-breaking space for empty lines  
        if (highlighted.trim()) {
          formattedDiff.push(`    ${String(lineNumber).padStart(3)} \x1b[32m+\x1b[0m ${highlighted}`);
        } else {
          formattedDiff.push(`    ${String(lineNumber).padStart(3)} \x1b[32m+\x1b[0m \u00A0`);
        }
        lineNumber++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removals++;
        const codeLine = line.substring(1);
        let highlighted = codeLine;
        if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
          highlighted = syntaxHighlight(codeLine, language === 'typescript' ? 'javascript' : language);
        }
        // Handle empty lines properly - use non-breaking space for empty lines  
        if (highlighted.trim()) {
          formattedDiff.push(`    ${String(lineNumber).padStart(3)} \x1b[31m-\x1b[0m ${highlighted}`);
        } else {
          formattedDiff.push(`    ${String(lineNumber).padStart(3)} \x1b[31m-\x1b[0m \u00A0`);
        }
        // Don't increment line number for removals
      } else if (line.startsWith(' ') || line === '') {
        // Context line (starts with space) - apply syntax highlighting
        const contextLine = line.startsWith(' ') ? line.substring(1) : line;
        let highlighted = contextLine;
        if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
          highlighted = syntaxHighlight(contextLine, language === 'typescript' ? 'javascript' : language);
        }
        // Handle empty lines properly - maintain alignment with +/- symbols  
        if (highlighted.trim()) {
          formattedDiff.push(`    ${String(lineNumber).padStart(3)}   ${highlighted}`);
        } else {
          // Empty context line - use non-breaking space to prevent trimming
          formattedDiff.push(`    ${String(lineNumber).padStart(3)}   \u00A0`);
        }
        lineNumber++;
      }
    }
  }

  if (formattedDiff.length > 0) {
    const summary = `    Updated \x1b[1m${fileName}\x1b[0m with \x1b[32m${additions}\x1b[0m addition${additions !== 1 ? 's' : ''} and \x1b[31m${removals}\x1b[0m removal${removals !== 1 ? 's' : ''}`;
    
    return {
      type: "text",
      text: `\x1b[32m●\x1b[0m Update(\x1b[1m${fileName}\x1b[0m)\n${summary}\n${formattedDiff.join('\n')}`
    };
  }
  
  return null;
}

export function formatCreateResponse(fileName, content, filePath) {
  const language = getLanguageFromFile(filePath);
  
  // Apply syntax highlighting if supported
  let highlightedCode = content;
  if (['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
    highlightedCode = syntaxHighlight(content, language === 'typescript' ? 'javascript' : language);
  }
  
  const lines = highlightedCode.split('\n');
  const lineCount = lines.length;
  
  // Format the lines with line numbers
  let formattedContent = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Handle empty lines properly - use non-breaking space for empty lines
    if (line.trim()) {
      formattedContent.push(`    ${String(i + 1).padStart(3)} \x1b[32m+\x1b[0m ${line}`);
    } else {
      formattedContent.push(`    ${String(i + 1).padStart(3)} \x1b[32m+\x1b[0m \u00A0`);
    }
  }
  
  const summary = `    Created \x1b[1m${fileName}\x1b[0m with \x1b[32m${lineCount}\x1b[0m line${lineCount !== 1 ? 's' : ''}`;
  
  // For very long files, truncate the middle
  if (formattedContent.length > 50) {
    const preview = [
      ...formattedContent.slice(0, 20),
      `\x1b[90m    ... ${formattedContent.length - 40} lines hidden ...\x1b[0m`,
      ...formattedContent.slice(-20)
    ];
    formattedContent = preview;
  }
  
  return {
    type: "text",
    text: `\x1b[32m●\x1b[0m Create(\x1b[1m${fileName}\x1b[0m)\n${summary}\n${formattedContent.join('\n')}`
  };
}
