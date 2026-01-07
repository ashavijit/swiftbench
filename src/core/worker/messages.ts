import type { WorkerConfig, MetricsSnapshot, ErrorBreakdown } from "../../types.js";

/**
 * Worker request messages (main thread -> worker)
 */
export type WorkerRequest =
  | { type: "start"; config: WorkerConfig }
  | { type: "stop" };

/**
 * Worker response messages (worker -> main thread)
 */
export type WorkerResponse =
  | { type: "ready"; workerId: number }
  | { type: "metrics"; payload: MetricsSnapshot }
  | { type: "done"; payload: MetricsSnapshot }
  | { type: "error"; workerId: number; message: string };

/**
 * Creates an empty error breakdown
 * @returns Empty error breakdown object
 */
export function createEmptyErrorBreakdown(): ErrorBreakdown {
  return {
    timeouts: 0,
    connectionErrors: 0,
    byStatusCode: {}
  };
}

/**
 * Creates an empty metrics snapshot
 * @param workerId - Worker identifier
 * @returns Empty metrics snapshot
 */
export function createEmptyMetricsSnapshot(workerId: number): MetricsSnapshot {
  return {
    workerId,
    requests: 0,
    successful: 0,
    failed: 0,
    bytes: 0,
    latencies: [],
    errors: createEmptyErrorBreakdown()
  };
}
