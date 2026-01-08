import type { MetricsSnapshot, ErrorBreakdown, LatencyStats } from '../../types.js'
import { Histogram } from './histogram.js'
import { calculatePercentiles, formatLatencyStats } from './percentiles.js'

/**
 * Aggregated metrics from all workers
 */
export type AggregatedMetrics = {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalBytes: number
  latency: LatencyStats
  errors: ErrorBreakdown
}

/**
 * Aggregates metrics from multiple workers
 */
export class MetricsAggregator {
  private readonly histogram: Histogram = new Histogram()
  private totalRequests: number = 0
  private successfulRequests: number = 0
  private failedRequests: number = 0
  private totalBytes: number = 0
  private timeouts: number = 0
  private connectionErrors: number = 0
  private readonly statusCodes: Map<number, number> = new Map()

  /**
   * Adds a metrics snapshot from a worker
   * @param snapshot - Worker metrics snapshot
   */
  addSnapshot(snapshot: MetricsSnapshot): void {
    this.totalRequests += snapshot.requests
    this.successfulRequests += snapshot.successful
    this.failedRequests += snapshot.failed
    this.totalBytes += snapshot.bytes

    for (const latency of snapshot.latencies) {
      this.histogram.record(latency)
    }

    this.timeouts += snapshot.errors.timeouts
    this.connectionErrors += snapshot.errors.connectionErrors

    for (const [code, count] of Object.entries(snapshot.errors.byStatusCode)) {
      const statusCode = parseInt(code, 10)
      const existing = this.statusCodes.get(statusCode) ?? 0
      this.statusCodes.set(statusCode, existing + count)
    }
  }

  /**
   * Gets aggregated metrics
   * @returns Aggregated metrics from all workers
   */
  getMetrics(): AggregatedMetrics {
    const byStatusCode: Record<number, number> = {}
    for (const [code, count] of this.statusCodes) {
      byStatusCode[code] = count
    }

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      totalBytes: this.totalBytes,
      latency: formatLatencyStats(calculatePercentiles(this.histogram)),
      errors: {
        timeouts: this.timeouts,
        connectionErrors: this.connectionErrors,
        byStatusCode
      }
    }
  }

  /**
   * Resets all aggregated metrics
   */
  reset(): void {
    this.histogram.reset()
    this.totalRequests = 0
    this.successfulRequests = 0
    this.failedRequests = 0
    this.totalBytes = 0
    this.timeouts = 0
    this.connectionErrors = 0
    this.statusCodes.clear()
  }
}
