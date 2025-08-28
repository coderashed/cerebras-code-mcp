# Adding a New AI Provider

This document shows how to add a new AI provider to the routing system.

## Example: Adding OpenAI Provider

### Step 1: Create the API module
Create `src/api/openai.js`:
```javascript
import https from 'https';
import { config } from '../config/constants.js';

export async function callOpenAI(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  if (!config.openaiApiKey) {
    throw new Error("No OpenAI API key found. Please set OPENAI_API_KEY environment variable.");
  }

  // Your OpenAI API implementation here
  // Should follow the same pattern as callCerebras/callOpenRouter
  
  return generatedCode;
}
```

### Step 2: Add configuration
In `src/config/constants.js`, add:
```javascript
export const config = {
  // ... existing config ...
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo'
};
```

### Step 3: Update the router
In `src/api/router/router.js`:

1. Add import:
```javascript
import { callOpenAI } from '../openai.js';
```

2. Add case to switch statements:
```javascript
case 'openai':
  return await callOpenAI(prompt, context, outputFile, language, contextFiles);
```

3. Update `determineProvider()`:
```javascript
function determineProvider() {
  if (config.cerebrasApiKey) {
    return 'cerebras';
  } else if (config.openaiApiKey) {
    return 'openai';
  } else if (config.openRouterApiKey) {
    return 'openrouter';
  }
  // ... rest of function
}
```

4. Update `getFallbackProvider()`:
```javascript
case 'openai':
  return config.cerebrasApiKey ? 'cerebras' : (config.openRouterApiKey ? 'openrouter' : null);
```

5. Update `getAvailableProviders()`:
```javascript
if (config.openaiApiKey) {
  providers.push({
    name: 'openai',
    model: config.openaiModel,
    available: true
  });
}
```

### Step 4: Test
That's it! The router will automatically:
- Use OpenAI if available
- Fall back to other providers if OpenAI fails
- Handle all error cases consistently

## Benefits of This Architecture

- **Zero changes needed in tool handlers** - they continue using `routeAPICall()`
- **Automatic fallback handling** - if one provider fails, others are tried
- **Consistent error handling** - all providers follow the same error patterns
- **Easy configuration** - just add environment variables
- **Clean separation** - each provider is isolated in its own module
