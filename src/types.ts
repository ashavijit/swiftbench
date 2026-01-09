/**
 * HTTP methods supported by SwiftBench
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * Output format for benchmark results
 */
export type OutputFormat = 'console' | 'json' | 'html' | 'csv'

/**
 * HTTP protocol version
 */
export type HttpVersion = '1.1' | '2'

/**
 * Benchmark configuration options
 */
export type BenchConfig = {
  url: string
  method?: HttpMethod
  headers?: Record<string, string>
  body?: string | Buffer
  connections?: number
  duration?: number
  rate?: number
  timeout?: number
  rampUp?: number
  warmup?: number
  http2?: boolean
  output?: OutputFormat
  outputFile?: string
  thresholds?: ThresholdConfig
  info?: boolean
}

/**
 * Simple benchmark options (subset of BenchConfig)
 */
export type BenchOptions = Omit<BenchConfig, 'url'>

/**
 * Threshold configuration for CI quality gates
 */
export type ThresholdConfig = {
  p99?: number
  p95?: number
  errorRate?: number
  minRps?: number
}

/**
 * Latency statistics in milliseconds
 */
export type LatencyStats = {
  min: number
  max: number
  mean: number
  stddev: number
  p50: number
  p75: number
  p90: number
  p95: number
  p99: number
  p999: number
}

/**
 * Error breakdown by status code
 */
export type ErrorBreakdown = {
  timeouts: number
  connectionErrors: number
  byStatusCode: Record<number, number>
}

/**
 * Detailed connection/server info
 */
export type DevToolsInfo = {
  ip: string | null
  server: string | null
  poweredBy: string | null
  requestId: string | null
  handshakeTime: number | null
}

/**
 * Complete benchmark result
 */
export type BenchResult = {
  url: string
  method: HttpMethod
  duration: number
  connections: number
  rate: number | null
  requests: {
    total: number
    successful: number
    failed: number
  }
  throughput: {
    rps: number
    bytesPerSecond: number
    totalBytes: number
  }
  latency: LatencyStats
  errors: ErrorBreakdown
  timestamp: string
  meta: {
    version: string
    nodeVersion: string
    platform: string
  }
  devtools?: DevToolsInfo
}

/**
 * Worker configuration passed to thread
 */
export type WorkerConfig = {
  id: number
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body: string | Buffer | null
  connections: number
  duration: number
  rate: number | null
  timeout: number
  http2: boolean
}

/**
 * Metrics snapshot from worker
 */
export type MetricsSnapshot = {
  workerId: number
  requests: number
  successful: number
  failed: number
  bytes: number
  latencies: number[]
  errors: ErrorBreakdown
}

/**
 * Worker request messages (main -> worker)
 */
export type WorkerRequest = { type: 'start'; config: WorkerConfig } | { type: 'stop' }

/**
 * Worker response messages (worker -> main)
 */
export type WorkerResponse =
  | { type: 'ready'; workerId: number }
  | { type: 'metrics'; payload: MetricsSnapshot }
  | { type: 'done'; payload: MetricsSnapshot }
  | { type: 'error'; workerId: number; message: string }

/**
 * Scenario step definition
 */
export type ScenarioStep = {
  name: string
  url: string
  method?: HttpMethod
  headers?: Record<string, string>
  body?: string | Buffer
  delay?: number
  expect?: {
    status?: number
    maxLatency?: number
  }
}

/**
 * Scenario configuration
 */
export type ScenarioConfig = {
  name: string
  steps: ScenarioStep[]
  iterations?: number
  connections?: number
  duration?: number
}

/**
 * Reporter interface
 */
export type Reporter = {
  report(result: BenchResult): Promise<string>
}

/**
 * Internal histogram data transfer
 */
export type HistogramData = {
  buckets: Uint32Array
  count: number
  min: number
  max: number
  sum: number
}
