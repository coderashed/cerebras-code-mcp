import path from 'path';
import { debugLog } from '../config/constants.js';
import { readFileContent, writeFileContent } from '../utils/file-utils.js';
import { cleanCodeResponse } from '../utils/code-cleaner.js';
import { formatEditResponse, formatCreateResponse } from '../formatting/response-formatter.js';

// Dynamic router selection based on environment variables
// Use enhanced router (with rate limiting) only if multiple keys are configured
// Otherwise use original router for backward compatibility
const useEnhancedRouter = !!(process.env.CEREBRAS_FREE_KEY && process.env.CEREBRAS_PAID_KEY);

const { routeAPICall } = useEnhancedRouter 
  ? await import('../api/router/enhanced-router.js')
  : await import('../api/router/router.js');

// Tool handler for the write tool
export async function handleWriteTool(args) {
  try {
    // Get IDE identification from environment variable
    const ideSource = process.env.CEREBRAS_MCP_IDE || 'unknown';
    
    await debugLog('=== MCP REQUEST DEBUG ===');
    await debugLog(`IDE Source: ${ideSource}`);
    await debugLog(`Tool called: write`);
    await debugLog(`Arguments: ${JSON.stringify(args, null, 2)}`);
    await debugLog('========================');
    
    const { 
      file_path,
      prompt, 
      context_files = []
    } = args;
    
    if (!prompt) {
      throw new Error("Prompt is required for write tool");
    }
    
    if (!file_path) {
      throw new Error("file_path is required for write tool");
    }
    
    // Check if file exists to determine operation type
    const existingContent = await readFileContent(file_path);
    const isEdit = existingContent !== null;
    
    await debugLog('=== FILE OPERATION DEBUG ===');
    await debugLog(`File path: ${file_path}`);
    await debugLog(`File exists: ${isEdit}`);
    await debugLog(`Existing content length: ${existingContent ? existingContent.length : 0}`);
    await debugLog('============================');
    
    // Route API call to appropriate provider to generate/modify code with context files
    const result = await routeAPICall(prompt, "", file_path, null, context_files);
    
    // Clean the AI response to remove markdown formatting
    const cleanResult = cleanCodeResponse(result);

    // Write the cleaned result to the file
    await writeFileContent(file_path, cleanResult);

    // Format the response based on operation type
    let responseContent = [];
    const fileName = path.basename(file_path);

    if (isEdit && existingContent) {
      // Clean the existing content too for consistent comparison
      const cleanExistingContent = cleanCodeResponse(existingContent);
      const editResponse = formatEditResponse(fileName, cleanExistingContent, cleanResult, file_path);
      if (editResponse) {
        responseContent.push(editResponse);
      }
    } else if (!isEdit) {
      const createResponse = formatCreateResponse(fileName, cleanResult, file_path);
      responseContent.push(createResponse);
    }
    
    const response = {
      content: responseContent
    };
    
    // Log the full response for debugging
    await debugLog('=== MCP RESPONSE DEBUG ===');
    await debugLog(`IDE Source: ${ideSource}`);
    await debugLog('Response type: Standard text diff');
    await debugLog(`Number of content items: ${responseContent.length}`);
    await debugLog(`Response structure: ${JSON.stringify(response, null, 2)}`);
    await debugLog('=========================');
    
    return response;
  } catch (error) {
    // Get IDE identification from environment variable (in case of error)
    const ideSource = process.env.CEREBRAS_MCP_IDE || 'unknown';
    
    await debugLog('=== MCP ERROR DEBUG ===');
    await debugLog(`IDE Source: ${ideSource}`);
    await debugLog(`Error occurred: ${error.message}`);
    await debugLog('=======================');
    
    // Return a standard text error if something goes wrong
    return {
      content: [{
        type: "text",
        text: `Error in cerebras-mcp server: ${error.message}`
      }]
    };
  }
}
