import https from 'https';
import path from 'path';
import { RateLimitError } from './rate-limiter.js';
import { config } from '../config/constants.js';
import { readFileContent, getLanguageFromFile, expandContextPaths } from '../utils/file-utils.js';
import { cleanCodeResponse } from '../utils/code-cleaner.js';

export async function callCerebras(prompt, context = "", outputFile = "", language = null, contextFiles = [], existingContent = null) {
  try {
    if (!config.cerebrasApiKey) {
      throw new Error("No Cerebras API key found. Please set CEREBRAS_API_KEY environment variable.");
    }

    const detectedLanguage = getLanguageFromFile(outputFile, language);

    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;

    if (contextFiles && contextFiles.length > 0) {
      // Expand any directories to their files
      const expandedContextFiles = await expandContextPaths(contextFiles);

      const filteredContextFiles = expandedContextFiles.filter(file => {
        const resolvedContext = path.resolve(file);
        const resolvedOutput = path.resolve(outputFile);
        return resolvedContext !== resolvedOutput;
      });

      if (filteredContextFiles.length > 0) {
        const contextResults = await Promise.all(
          filteredContextFiles.map(async (contextFile) => {
            try {
              const content = await readFileContent(contextFile);
              if (content) {
                const contextLang = getLanguageFromFile(contextFile);
                return `\nFile: ${contextFile}\n\`\`\`${contextLang}\n${content}\n\`\`\`\n`;
              }
            } catch (error) {
              console.error(`Warning: Could not read context file ${contextFile}: ${error.message}`);
            }
            return null;
          })
        );

        const validContexts = contextResults.filter(Boolean);
        if (validContexts.length > 0) {
          fullPrompt = "Context Files:\n" + validContexts.join('') + "\n" + fullPrompt;
        }
      }
    }

    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }

    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.cerebrasModel,
      messages: [
        {
          role: "system",
          content: `You are an expert programmer. Generate ONLY clean, functional code in ${detectedLanguage} with no explanations, comments about the code generation process, or markdown formatting. Include necessary imports and ensure the code is ready to run. When modifying existing files, preserve the structure and style while implementing the requested changes. Output raw code only. Never use markdown code blocks.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: config.temperature,
      ...(config.topP !== undefined && { top_p: config.topP }),
      clear_thinking: config.clearThinking,
      stream: false
    };

    if (config.maxTokens) {
      requestData.max_tokens = config.maxTokens;
    }
    
    try {
      return await new Promise((resolve, reject) => {
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
              
              if (res.statusCode === 429) {
                const retryAfter = res.headers['retry-after'] ? parseInt(res.headers['retry-after']) : undefined;
                reject(new RateLimitError(`Cerebras rate limit exceeded`, 429, retryAfter));
                return;
              }
              
              if (res.statusCode === 200 && response.choices && response.choices[0]) {
                const rawContent = response.choices[0].message.content;
                const cleanedContent = cleanCodeResponse(rawContent);
                resolve(cleanedContent);
              } else {
                reject(new Error(`Cerebras API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse API response: ${parseError.message}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`));
        });
        
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout after 30 seconds'));
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      throw new Error(`Cerebras API call failed: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}