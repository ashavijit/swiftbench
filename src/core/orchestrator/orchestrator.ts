import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import { resolve } from 'node:path'

import type { BenchConfig, BenchResult, WorkerConfig } from '../../types.js'
import type { WorkerRequest, WorkerResponse } from '../worker/messages.js'
import { MetricsAggregator } from '../metrics/aggregator.js'
import { LifecycleManager } from './lifecycle.js'
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_DURATION_SEC,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_METHOD,
  MAX_WORKERS,
  VERSION
} from '../../constants.js'

/**
 * Normalized config with required fields
 */
type NormalizedConfig = {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  headers: Record<string, string>
  body: string | Buffer | null
  connections: number
  duration: number
  rate: number | null
  timeout: number
  rampUp: number
  warmup: number
  http2: boolean
  output: 'console' | 'json' | 'html' | 'csv'
  outputFile?: string
  thresholds?: {
    p99?: number
    p95?: number
    errorRate?: number
    minRps?: number
  }
}

/**
 * Normalizes benchmark configuration with defaults
 * @param config - User configuration
 * @returns Normalized configuration
 */
function normalizeConfig(config: BenchConfig): NormalizedConfig {
  return {
    url: config.url,
    method: config.method ?? DEFAULT_METHOD,
    headers: config.headers ?? {},
    body: config.body ?? null,
    connections: config.connections ?? DEFAULT_CONNECTIONS,
    duration: config.duration ?? DEFAULT_DURATION_SEC,
    rate: config.rate ?? null,
    timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
    rampUp: config.rampUp ?? 0,
    warmup: config.warmup ?? 0,
    http2: config.http2 ?? false,
    output: config.output ?? 'console',
    outputFile: config.outputFile,
    thresholds: config.thresholds
  }
}

/**
 * Calculates optimal worker count
 * @param connections - Total connections
 * @returns Number of workers to spawn
 */
function calculateWorkerCount(connections: number): number {
  const cpuCount = Math.max(1, cpus().length)
  return Math.min(MAX_WORKERS, cpuCount, connections)
}

/**
 * Gets worker script path
 * @returns Absolute path to worker script
 */
function getWorkerPath(): string {
  return resolve(__dirname, '..', 'core', 'worker', 'worker.js')
}

/**
 * Main benchmark orchestrator
 */
export class Orchestrator {
  private readonly config: NormalizedConfig
  private readonly aggregator: MetricsAggregator = new MetricsAggregator()
  private readonly workers: Map<number, Worker> = new Map()
  private readonly lifecycle: LifecycleManager
  private workerCount: number
  private completedWorkers: number = 0
  private resolvePromise: ((result: BenchResult) => void) | null = null
  private rejectPromise: ((error: Error) => void) | null = null
  private startTime: number = 0

  /**
   * Creates a benchmark orchestrator
   * @param config - Benchmark configuration
   */
  constructor(config: BenchConfig) {
    this.config = normalizeConfig(config)
    this.workerCount = calculateWorkerCount(this.config.connections)
    this.lifecycle = new LifecycleManager(this.config.duration, this.config.warmup)
  }

  /**
   * Runs the benchmark
   * @returns Benchmark result
   */
  async run(): Promise<BenchResult> {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject

      try {
        this.startTime = performance.now()
        this.lifecycle.start()
        this.spawnWorkers()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to start benchmark'
        reject(new Error(message))
      }
    })
  }

  /**
   * Stops the benchmark
   */
  stop(): void {
    for (const worker of this.workers.values()) {
      const stopMessage: WorkerRequest = { type: 'stop' }
      worker.postMessage(stopMessage)
    }
  }

  /**
   * Spawns worker threads
   */
  private spawnWorkers(): void {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(getWorkerPath(), {
        workerData: { workerId: i }
      })

      worker.on('message', (message: WorkerResponse) => {
        this.handleWorkerMessage(i, message)
      })

      worker.on('error', (error: Error) => {
        this.handleWorkerError(error)
      })

      worker.on('exit', (code: number) => {
        this.handleWorkerExit(i, code)
      })

      this.workers.set(i, worker)
    }
  }

  /**
   * Handles messages from workers
   * @param workerId - Worker identifier
   * @param message - Worker response message
   */
  private handleWorkerMessage(workerId: number, message: WorkerResponse): void {
    switch (message.type) {
      case 'ready':
        this.startWorker(workerId)
        break
      case 'metrics':
        this.aggregator.addSnapshot(message.payload)
        break
      case 'done':
        this.aggregator.addSnapshot(message.payload)
        this.handleWorkerComplete()
        break
      case 'error':
        this.handleWorkerError(new Error(message.message))
        break
    }
  }

  /**
   * Starts a worker with configuration
   * @param workerId - Worker identifier
   */
  private startWorker(workerId: number): void {
    const worker = this.workers.get(workerId)
    if (worker === undefined) {
      return
    }

    const connectionsPerWorker = Math.ceil(this.config.connections / this.workerCount)
    const ratePerWorker =
      this.config.rate !== null ? Math.ceil(this.config.rate / this.workerCount) : null

    const workerConfig: WorkerConfig = {
      id: workerId,
      url: this.config.url,
      method: this.config.method,
      headers: this.config.headers,
      body: this.config.body,
      connections: connectionsPerWorker,
      duration: this.config.duration,
      rate: ratePerWorker,
      timeout: this.config.timeout,
      http2: this.config.http2
    }

    const startMessage: WorkerRequest = { type: 'start', config: workerConfig }
    worker.postMessage(startMessage)
  }

  /**
   * Handles worker completion
   */
  private handleWorkerComplete(): void {
    this.completedWorkers++

    if (this.completedWorkers >= this.workerCount) {
      this.finalize()
    }
  }

  /**
   * Handles worker errors
   * @param error - Error that occurred
   */
  private handleWorkerError(error: Error): void {
    this.stop()
    this.rejectPromise?.(error)
  }

  /**
   * Handles worker exit
   * @param workerId - Worker identifier
   * @param code - Exit code
   */
  private handleWorkerExit(workerId: number, code: number): void {
    this.workers.delete(workerId)

    if (code !== 0 && this.completedWorkers < this.workerCount) {
      this.handleWorkerError(new Error(`Worker ${workerId} exited with code ${code}`))
    }
  }

  /**
   * Finalizes benchmark and creates result
   */
  private finalize(): void {
    const endTime = performance.now()
    const durationMs = endTime - this.startTime
    const durationSec = durationMs / 1000

    const metrics = this.aggregator.getMetrics()

    const result: BenchResult = {
      url: this.config.url,
      method: this.config.method,
      duration: Math.round(durationSec * 100) / 100,
      connections: this.config.connections,
      rate: this.config.rate,
      requests: {
        total: metrics.totalRequests,
        successful: metrics.successfulRequests,
        failed: metrics.failedRequests
      },
      throughput: {
        rps: Math.round((metrics.totalRequests / durationSec) * 100) / 100,
        bytesPerSecond: Math.round(metrics.totalBytes / durationSec),
        totalBytes: metrics.totalBytes
      },
      latency: metrics.latency,
      errors: metrics.errors,
      timestamp: new Date().toISOString(),
      meta: {
        version: VERSION,
        nodeVersion: process.version,
        platform: process.platform
      }
    }

    this.cleanup()
    this.lifecycle.complete()
    this.resolvePromise?.(result)
  }

  /**
   * Cleans up workers
   */
  private cleanup(): void {
    for (const worker of this.workers.values()) {
      worker.terminate().catch(() => {
        // Ignore termination errors
      })
    }
    this.workers.clear()
  }
}

/**
 * Runs a benchmark with the given configuration
 * @param config - Benchmark configuration
 * @returns Benchmark result
 */
export async function runBenchmark(config: BenchConfig): Promise<BenchResult> {
  const orchestrator = new Orchestrator(config)
  return orchestrator.run()
}
