import { workerData, parentPort } from 'worker_threads';
import { readFileContent, writeFileContent } from '../utils/file-utils.js';
import { routeAPICall } from '../api/router/router.js';
import { formatEditResponse, formatCreateResponse } from '../formatting/response-formatter.js';
import path from 'path';

(async () => {
  try {
    const { file_path, prompt, context_files, shared_context } = workerData;

    const existingContent = await readFileContent(file_path);

    // Prepend shared context to prompt if provided
    const fullPrompt = shared_context ? `${shared_context}\n\n${prompt}` : prompt;

    const result = await routeAPICall(fullPrompt, "", file_path, null, context_files, existingContent);

    await writeFileContent(file_path, result);

    const fileName = path.basename(file_path);

    let response;
    if (existingContent === null) {
      response = formatCreateResponse(fileName, result, file_path);
    } else {
      response = formatEditResponse(fileName, existingContent, result, file_path);
    }

    if (response) {
      parentPort.postMessage({ content: [response] });
    } else {
      parentPort.postMessage({ content: [] });
    }
  } catch (error) {
    parentPort.postMessage({
      content: [{ type: "text", text: error.message }]
    });
  }
})();