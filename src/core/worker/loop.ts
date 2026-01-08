import type { WorkerConfig, MetricsSnapshot, ErrorBreakdown } from '../../types.js'
import { HttpClient } from '../http/client.js'
import { createRateLimiter } from '../scheduler/rate-limiter.js'
import type { RateLimiter } from '../scheduler/rate-limiter.js'
import { SUCCESS_STATUS_CODES, METRICS_INTERVAL_MS } from '../../constants.js'

/**
 * Request loop state
 */
type LoopState = {
  running: boolean
  requests: number
  successful: number
  failed: number
  bytes: number
  latencies: number[]
  errors: ErrorBreakdown
}

/**
 * Creates initial loop state
 * @returns Initial state
 */
function createInitialState(): LoopState {
  return {
    running: true,
    requests: 0,
    successful: 0,
    failed: 0,
    bytes: 0,
    latencies: [],
    errors: {
      timeouts: 0,
      connectionErrors: 0,
      byStatusCode: {}
    }
  }
}

/**
 * Extracts path from URL
 * @param url - Full URL
 * @returns Path portion
 */
function extractPath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname + parsed.search
  } catch {
    return '/'
  }
}

/**
 * Main request loop running in worker thread
 */
export class RequestLoop {
  private readonly config: WorkerConfig
  private readonly client: HttpClient
  private readonly rateLimiter: RateLimiter | null
  private readonly path: string
  private state: LoopState
  private metricsCallback: ((snapshot: MetricsSnapshot) => void) | null = null
  private metricsInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Creates a request loop
   * @param config - Worker configuration
   */
  constructor(config: WorkerConfig) {
    this.config = config
    this.path = extractPath(config.url)
    this.state = createInitialState()

    const baseUrl = new URL(config.url).origin
    this.client = new HttpClient({
      baseUrl,
      connections: config.connections,
      timeout: config.timeout,
      http2: config.http2
    })

    this.rateLimiter = createRateLimiter(config.rate)
  }

  /**
   * Sets callback for periodic metrics reporting
   * @param callback - Function to call with metrics
   */
  onMetrics(callback: (snapshot: MetricsSnapshot) => void): void {
    this.metricsCallback = callback
  }

  /**
   * Starts the request loop
   * @returns Final metrics snapshot
   */
  async run(): Promise<MetricsSnapshot> {
    const endTime = performance.now() + this.config.duration * 1000

    this.startMetricsReporting()

    while (this.state.running && performance.now() < endTime) {
      if (this.rateLimiter !== null) {
        await this.rateLimiter.acquire()
      }

      if (!this.state.running) {
        break
      }

      await this.executeRequest()
    }

    this.stopMetricsReporting()
    await this.client.close()

    return this.getSnapshot()
  }

  /**
   * Stops the request loop
   */
  stop(): void {
    this.state.running = false
  }

  /**
   * Executes a single HTTP request
   */
  private async executeRequest(): Promise<void> {
    this.state.requests++

    try {
      const response = await this.client.execute(
        this.config.method,
        this.path,
        this.config.headers,
        this.config.body
      )

      this.state.latencies.push(response.latencyUs)
      this.state.bytes += response.bytes

      if (SUCCESS_STATUS_CODES.has(response.statusCode)) {
        this.state.successful++
      } else {
        this.state.failed++
        const count = this.state.errors.byStatusCode[response.statusCode] ?? 0
        this.state.errors.byStatusCode[response.statusCode] = count + 1
      }
    } catch (err: unknown) {
      this.state.failed++

      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.name === 'TimeoutError') {
          this.state.errors.timeouts++
        } else {
          this.state.errors.connectionErrors++
        }
      } else {
        this.state.errors.connectionErrors++
      }
    }
  }

  /**
   * Starts periodic metrics reporting
   */
  private startMetricsReporting(): void {
    if (this.metricsCallback === null) {
      return
    }

    this.metricsInterval = setInterval(() => {
      if (this.metricsCallback !== null) {
        this.metricsCallback(this.getSnapshot())
      }
    }, METRICS_INTERVAL_MS)
  }

  /**
   * Stops periodic metrics reporting
   */
  private stopMetricsReporting(): void {
    if (this.metricsInterval !== null) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
  }

  /**
   * Gets current metrics snapshot
   * @returns Metrics snapshot
   */
  private getSnapshot(): MetricsSnapshot {
    return {
      workerId: this.config.id,
      requests: this.state.requests,
      successful: this.state.successful,
      failed: this.state.failed,
      bytes: this.state.bytes,
      latencies: [...this.state.latencies],
      errors: { ...this.state.errors, byStatusCode: { ...this.state.errors.byStatusCode } }
    }
  }
}
