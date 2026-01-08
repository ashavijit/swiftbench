import type { BenchResult, Reporter } from '../types.js'

/**
 * Escapes a value for CSV
 * @param value - Value to escape
 * @returns Escaped string
 */
function escapeCSV(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * CSV reporter for data analysis
 */
export class CsvReporter implements Reporter {
  /**
   * Generates CSV output
   * @param result - Benchmark result
   * @returns CSV string
   */
  report(result: BenchResult): Promise<string> {
    const headers = [
      'url',
      'method',
      'timestamp',
      'duration_sec',
      'connections',
      'rate_limit',
      'total_requests',
      'successful_requests',
      'failed_requests',
      'rps',
      'bytes_per_sec',
      'total_bytes',
      'latency_min_ms',
      'latency_max_ms',
      'latency_mean_ms',
      'latency_stddev_ms',
      'latency_p50_ms',
      'latency_p75_ms',
      'latency_p90_ms',
      'latency_p95_ms',
      'latency_p99_ms',
      'latency_p999_ms',
      'errors_timeouts',
      'errors_connection',
      'version',
      'node_version',
      'platform'
    ]

    const values = [
      result.url,
      result.method,
      result.timestamp,
      result.duration,
      result.connections,
      result.rate ?? '',
      result.requests.total,
      result.requests.successful,
      result.requests.failed,
      result.throughput.rps,
      result.throughput.bytesPerSecond,
      result.throughput.totalBytes,
      result.latency.min,
      result.latency.max,
      result.latency.mean,
      result.latency.stddev,
      result.latency.p50,
      result.latency.p75,
      result.latency.p90,
      result.latency.p95,
      result.latency.p99,
      result.latency.p999,
      result.errors.timeouts,
      result.errors.connectionErrors,
      result.meta.version,
      result.meta.nodeVersion,
      result.meta.platform
    ]

    const headerLine = headers.join(',')
    const valueLine = values.map(escapeCSV).join(',')

    return Promise.resolve(`${headerLine}\n${valueLine}`)
  }
}

/**
 * Creates a CSV reporter
 * @returns CSV reporter instance
 */
export function createCsvReporter(): Reporter {
  return new CsvReporter()
}
