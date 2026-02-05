import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from '../config/constants.js';
import { cerebrasRateLimiter } from '../api/rate-limiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function spawnAgent(args) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, './worker.js');
    const worker = new Worker(workerPath, { workerData: args });
    
    let resultReceived = false;
    
    worker.on('message', (result) => {
      resultReceived = true;
      resolve(result);
    });
    
    worker.on('error', (error) => {
      reject(error);
    });
    
    worker.on('exit', (exitCode) => {
      if (exitCode !== 0 && !resultReceived) {
        reject(new Error(`Worker stopped with exit code ${exitCode}`));
      }
    });
  });
}

export async function spawnAgentBatch(operations, sharedContext = null, sharedContextFiles = []) {
  const concurrency = config.maxConcurrentRequests || 3;
  const results = [];
  const executing = new Set();

  for (const operation of operations) {
    const mergedOperation = {
      ...operation,
      shared_context: sharedContext,
      context_files: [...(sharedContextFiles || []), ...(operation.context_files || [])]
    };

    // Rate limiter gates when we can spawn - each worker makes one API call
    const promise = cerebrasRateLimiter.execute(() => spawnAgent(mergedOperation))
      .then(result => {
        executing.delete(promise);
        return result;
      })
      .catch(error => {
        executing.delete(promise);
        throw error;
      });

    results.push(promise);
    executing.add(promise);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  const finalResults = await Promise.allSettled(results);
  const successResults = finalResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  const failures = finalResults
    .filter(r => r.status === 'rejected')
    .map(r => r.reason.message);

  const content = successResults.flatMap(r => r.content);
  if (failures.length > 0) {
    content.push({ type: 'text', text: failures.join('\n') });
  }

  return { content };
}