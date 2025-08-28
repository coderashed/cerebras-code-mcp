import https from 'https';
import path from 'path';
import { config } from '../config/constants.js';
import { readFileContent, getLanguageFromFile } from '../utils/file-utils.js';
import { cleanCodeResponse } from '../utils/code-cleaner.js';

// Call OpenRouter API as fallback to Cerebras
export async function callOpenRouter(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  try {
    // Check if OpenRouter API key is available
    if (!config.openRouterApiKey) {
      throw new Error("No OpenRouter API key available. Set OPENROUTER_API_KEY environment variable.");
    }
    
    // Determine language from file extension or explicit parameter
    const detectedLanguage = getLanguageFromFile(outputFile, language);
    
    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
    
    // Add context files if provided (excluding the output file itself)
    if (contextFiles && contextFiles.length > 0) {
      // Filter out the output file from context files to avoid duplication
      const filteredContextFiles = contextFiles.filter(file => {
        const resolvedContext = path.resolve(file);
        const resolvedOutput = path.resolve(outputFile);
        return resolvedContext !== resolvedOutput;
      });
      
      if (filteredContextFiles.length > 0) {
        let contextContent = "Context Files:\n";
        for (const contextFile of filteredContextFiles) {
          try {
            const content = await readFileContent(contextFile);
            if (content) {
              const contextLang = getLanguageFromFile(contextFile);
              contextContent += `\nFile: ${contextFile}\n\`\`\`${contextLang}\n${content}\n\`\`\`\n`;
            }
          } catch (error) {
            console.error(`Warning: Could not read context file ${contextFile}: ${error.message}`);
          }
        }
        fullPrompt = contextContent + "\n" + fullPrompt;
      }
    }
    
    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }
    
    // Read existing file content if it exists (for modification)
    const existingContent = await readFileContent(outputFile);
    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.openRouterModel,
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
      provider: {
        order: ['cerebras'],
        allow_fallbacks: false
      },
      temperature: config.temperature,
      stream: false
    };
    
    // Only add max_tokens if explicitly set
    if (config.maxTokens) {
      requestData.max_tokens = config.maxTokens;
    }
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${config.openRouterApiKey}`,
          'HTTP-Referer': config.openRouterSiteUrl,
          'X-Title': config.openRouterSiteName
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
              const rawContent = response.choices[0].message.content;
              const cleanedContent = cleanCodeResponse(rawContent);
              resolve(cleanedContent);
            } else {
              reject(new Error(`OpenRouter API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse API response: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    throw new Error(`OpenRouter API call failed: ${error.message}`);
  }
}
