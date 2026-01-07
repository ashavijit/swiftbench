import { parentPort, workerData } from "node:worker_threads";

import type { WorkerRequest, WorkerResponse } from "./messages.js";
import type { WorkerConfig } from "../../types.js";
import { RequestLoop } from "./loop.js";

let currentLoop: RequestLoop | null = null;

/**
 * Sends a message to the main thread
 * @param message - Response message
 */
function sendMessage(message: WorkerResponse): void {
  parentPort?.postMessage(message);
}

/**
 * Handles start command
 * @param config - Worker configuration
 */
async function handleStart(config: WorkerConfig): Promise<void> {
  currentLoop = new RequestLoop(config);

  currentLoop.onMetrics((snapshot) => {
    sendMessage({ type: "metrics", payload: snapshot });
  });

  try {
    const finalSnapshot = await currentLoop.run();
    sendMessage({ type: "done", payload: finalSnapshot });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown worker error";
    sendMessage({ type: "error", workerId: config.id, message });
  } finally {
    currentLoop = null;
  }
}

/**
 * Handles stop command
 */
function handleStop(): void {
  if (currentLoop !== null) {
    currentLoop.stop();
  }
}

/**
 * Handles incoming messages from main thread
 * @param message - Worker request message
 */
function handleMessage(message: WorkerRequest): void {
  switch (message.type) {
    case "start":
      void handleStart(message.config);
      break;
    case "stop":
      handleStop();
      break;
  }
}

parentPort?.on("message", handleMessage);

const initialWorkerId = (workerData as { workerId?: number } | undefined)?.workerId ?? 0;
sendMessage({ type: "ready", workerId: initialWorkerId });
