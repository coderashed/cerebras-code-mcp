// Clean up markdown artifacts from API response
export function cleanCodeResponse(response) {
  if (!response) return response;

  // Look for markdown code blocks and extract only the code content
  const codeBlockRegex = /```[a-zA-Z]*\n?([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    codeBlocks.push(match[1].trim());
  }

  // If we found code blocks, use the first one (most common case)
  if (codeBlocks.length > 0) {
    let code = codeBlocks[0];

    // Remove language identifiers from the beginning
    const lines = code.split('\n');
    if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
      lines.shift();
      code = lines.join('\n').trim();
    }

    return code;
  }

  // Fallback to the original method if no code blocks found
  let cleaned = response
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const lines = cleaned.split('\n');
  if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
    lines.shift();
    cleaned = lines.join('\n').trim();
  }

  return cleaned;
}
