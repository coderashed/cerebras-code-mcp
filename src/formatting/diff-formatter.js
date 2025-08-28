import { createPatch } from 'diff';
import path from 'path';

// Generate a simple diff between old and new content
export function generateDiff(oldContent, newContent) {
  if (!oldContent || !newContent) return null;
  
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let diff = [];
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      // Lines are identical, skip
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      // New line added
      diff.push(`+ ${newLines[j]}`);
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      // Line removed
      diff.push(`- ${oldLines[i]}`);
      i++;
    }
  }
  
  return diff.length > 0 ? diff.join('\n') : null;
}

// Generate a proper Git-style diff using the diff library
export function generateGitDiff(oldContent, newContent, filePath) {
  if (!newContent) return null;

  // Handle new file creation
  if (!oldContent) {
    const newLines = newContent.split('\n');
    const fileName = filePath.split('/').pop();
    const gitDiff = [
      `--- /dev/null`,
      `+++ b/${fileName}`,
      `@@ -0,0 +1,${newLines.length} @@`
    ];

    // Add all new lines with + prefix
    newLines.forEach(line => {
      gitDiff.push(`+${line}`);
    });

    return gitDiff.join('\n');
  }

  // Use the diff library to create a standard patch
  const fileName = filePath.split('/').pop();
  const patch = createPatch(fileName, oldContent, newContent, 'a/' + fileName, 'b/' + fileName);
  
  // Return the patch directly without modifications for clean output
  return patch;
}
