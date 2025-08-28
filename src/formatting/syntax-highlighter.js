// Simple ANSI syntax highlighting
export function syntaxHighlight(code, language) {
  // ANSI color codes
  const colors = {
    keyword: '\x1b[35m',     // Magenta
    string: '\x1b[33m',      // Yellow  
    comment: '\x1b[90m',     // Gray
    number: '\x1b[36m',      // Cyan
    function: '\x1b[34m',    // Blue
    reset: '\x1b[0m'
  };

  // Language-specific keywords
  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'return', 'await', 'async', 'import', 'export', 'from', 'class', 'extends', 'new', 'this', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined'],
    python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
    html: ['DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta'],
    css: ['color', 'background', 'border', 'margin', 'padding', 'font', 'width', 'height', 'display', 'position', 'top', 'left', 'right', 'bottom', 'flex', 'grid', 'transform', 'transition', 'animation']
  };

  const languageKeywords = keywords[language] || [];
  
  // Apply syntax highlighting line by line
  return code.split('\n').map(line => {
    let highlighted = line;
    
    // Highlight comments first (to avoid highlighting keywords inside comments)
    if (language === 'javascript' || language === 'css') {
      highlighted = highlighted.replace(/(\/\/.*$|\/\*.*?\*\/)/g, `${colors.comment}$1${colors.reset}`);
    } else if (language === 'python') {
      highlighted = highlighted.replace(/(#.*$)/g, `${colors.comment}$1${colors.reset}`);
    } else if (language === 'html') {
      highlighted = highlighted.replace(/(<!--.*?-->)/g, `${colors.comment}$1${colors.reset}`);
    }
    
    // Highlight strings (simple approach - doesn't handle escapes perfectly)
    highlighted = highlighted.replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, (match) => {
      return `${colors.string}${match}${colors.reset}`;
    });
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, `${colors.number}$1${colors.reset}`);
    
    // Highlight keywords
    languageKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      highlighted = highlighted.replace(regex, `${colors.keyword}$1${colors.reset}`);
    });
    
    // Highlight function names (simple heuristic)
    if (language === 'javascript' || language === 'python') {
      highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*\(/g, `${colors.function}$1${colors.reset}(`);
    }
    
    return highlighted;
  }).join('\n');
}
