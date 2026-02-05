import path from 'path';
import { readFileContent, writeFileContent } from '../utils/file-utils.js';
import { routeAPICall } from '../api/router/router.js';
import { formatEditResponse, formatCreateResponse } from '../formatting/response-formatter.js';
import { spawnAgentBatch } from './agent-spawner.js';
import { planBatchOperation } from './planner.js';
import { resolveContext } from './session-context.js';

// Tool handler for the write tool
export async function handleWriteTool(args) {
  try {
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

    // Resolve context from session/project config if not provided
    const resolved = resolveContext({ shared_context_files: context_files.length > 0 ? context_files : undefined });
    const resolvedContextFiles = resolved.shared_context_files;

    // Check if file exists to determine operation type
    const existingContent = await readFileContent(file_path);
    const isEdit = existingContent !== null;

    // Route API call to appropriate provider to generate/modify code with context files
    // Pass existingContent to avoid redundant file reads in the API layer
    // Result is already cleaned by the API layer
    const result = await routeAPICall(prompt, "", file_path, null, resolvedContextFiles, existingContent);

    // Write the result to the file
    await writeFileContent(file_path, result);

    // Format the response based on operation type
    const responseContent = [];
    const fileName = path.basename(file_path);

    if (isEdit && existingContent) {
      const editResponse = formatEditResponse(fileName, existingContent, result, file_path);
      if (editResponse) {
        responseContent.push(editResponse);
      }
    } else if (!isEdit) {
      const createResponse = formatCreateResponse(fileName, result, file_path);
      responseContent.push(createResponse);
    }

    return {
      content: responseContent
    };
  } catch (error) {
    // Return a standard text error if something goes wrong
    return {
      content: [{
        type: "text",
        text: `Error in cerebras-code server: ${error.message}`
      }]
    };
  }
}

export async function handleBatchWriteTool(args) {
  try {
    const { prompt, shared_context, shared_context_files, operations } = args;

    // Resolve context from session/project config
    const resolved = resolveContext({ shared_context, shared_context_files });
    const resolvedContext = resolved.shared_context;
    const resolvedContextFiles = resolved.shared_context_files;

    let plannedOperations;

    // If operations provided directly, use them (manual mode)
    // Otherwise, use the planner to infer operations from the prompt (auto mode)
    if (operations && Array.isArray(operations) && operations.length > 0) {
      plannedOperations = operations;
    } else if (prompt) {
      // Use planner to break down the task
      plannedOperations = await planBatchOperation(prompt, resolvedContext, resolvedContextFiles);
    } else {
      throw new Error("Either 'prompt' or 'operations' must be provided");
    }

    if (!plannedOperations || plannedOperations.length === 0) {
      throw new Error("No operations to execute");
    }

    const result = await spawnAgentBatch(plannedOperations, resolvedContext, resolvedContextFiles);

    // Prepend planning info to the response
    const planSummary = {
      type: "text",
      text: `\x1b[36m◆\x1b[0m Planned \x1b[1m${plannedOperations.length}\x1b[0m file(s): ${plannedOperations.map(op => path.basename(op.file_path)).join(', ')}`
    };

    return {
      content: [planSummary, ...result.content]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error in cerebras-code server: ${error.message}`
      }]
    };
  }
}