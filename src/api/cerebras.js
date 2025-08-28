import https from 'https';
import path from 'path';
import { config } from '../config/constants.js';
import { readFileContent, getLanguageFromFile } from '../utils/file-utils.js';
import { cleanCodeResponse } from '../utils/code-cleaner.js';
// Call Cerebras Code API - generates only code, no explanations
export async function callCerebras(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  try {
    // Check if Cerebras API key is available
    if (!config.cerebrasApiKey) {
      throw new Error("No Cerebras API key found. Please set CEREBRAS_API_KEY environment variable.");
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
      stream: false
    };
    
    // Only add max_tokens if explicitly set
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
        
        // Add timeout to prevent hanging requests
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout after 30 seconds'));
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      // Re-throw the error for the router to handle fallback logic
      throw new Error(`Cerebras API call failed: ${error.message}`);
    }
  } catch (error) {
    // Re-throw any setup errors for the router to handle fallback logic
    throw error;
  }
}
