import https from 'https';
import { config } from '../config/constants.js';
import { readFileContent } from '../utils/file-utils.js';

/**
 * Plans a batch operation by calling the LLM to break down a task into individual file operations.
 *
 * @param {string} prompt - The high-level task description
 * @param {string} sharedContext - Optional shared context/instructions
 * @param {string[]} sharedContextFiles - Optional array of file paths for context
 * @returns {Promise<{file_path: string, prompt: string}[]>} - Array of planned operations
 */
export async function planBatchOperation(prompt, sharedContext = null, sharedContextFiles = []) {
  // Build context from files if provided
  let fileContextStr = '';
  if (sharedContextFiles && sharedContextFiles.length > 0) {
    const contextResults = await Promise.all(
      sharedContextFiles.map(async (filePath) => {
        try {
          const content = await readFileContent(filePath);
          if (content) {
            return `File: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
          }
        } catch (error) {
          console.error(`Warning: Could not read context file ${filePath}: ${error.message}`);
        }
        return null;
      })
    );
    const validContexts = contextResults.filter(Boolean);
    if (validContexts.length > 0) {
      fileContextStr = '\n\nReference Files:\n' + validContexts.join('\n\n');
    }
  }

  const systemPrompt = `You are a code planning assistant. Your job is to break down a coding task into individual file operations.

Given a task description, you must return a JSON array of operations. Each operation specifies:
- file_path: The absolute or relative path where the file should be created/modified
- prompt: A detailed prompt describing exactly what code to generate for that file

IMPORTANT RULES:
1. Return ONLY valid JSON - no markdown, no explanation, no code blocks
2. The response must be a JSON array: [{"file_path": "...", "prompt": "..."}, ...]
3. Each prompt should be detailed and self-contained
4. Infer appropriate file paths from the task description
5. If a base directory is mentioned, use it for all file paths
6. Include all necessary files to complete the task

Example output:
[{"file_path": "src/auth/login.ts", "prompt": "Create a login function that takes email and password, validates them, and returns a JWT token..."}, {"file_path": "src/auth/logout.ts", "prompt": "Create a logout function that invalidates the current session..."}]`;

  let userPrompt = prompt;
  if (sharedContext) {
    userPrompt = `Context/Instructions: ${sharedContext}\n\nTask: ${prompt}`;
  }
  if (fileContextStr) {
    userPrompt += fileContextStr;
  }

  const requestData = {
    model: config.cerebrasModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3, // Lower temperature for more consistent planning
    stream: false
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestData);

    const options = {
      hostname: 'api.cerebras.ai',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${config.cerebrasApiKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200 && response.choices && response.choices[0]) {
            const content = response.choices[0].message.content.trim();

            // Try to parse as JSON
            try {
              // Handle potential markdown code blocks
              let jsonStr = content;
              if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
              }

              const operations = JSON.parse(jsonStr);

              if (!Array.isArray(operations)) {
                reject(new Error('Planner did not return an array of operations'));
                return;
              }

              // Validate each operation
              for (const op of operations) {
                if (!op.file_path || !op.prompt) {
                  reject(new Error('Each operation must have file_path and prompt'));
                  return;
                }
              }

              resolve(operations);
            } catch (parseError) {
              reject(new Error(`Failed to parse planner response as JSON: ${parseError.message}\nResponse: ${content}`));
            }
          } else {
            reject(new Error(`Planner API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse API response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Planner request failed: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Planner request timeout after 30 seconds'));
    });

    req.write(postData);
    req.end();
  });
}
