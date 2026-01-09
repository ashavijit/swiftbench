import { lookup } from 'node:dns/promises'
import { writeFileSync } from 'node:fs'
import { request } from 'undici'

import type { BenchConfig, BenchResult, Reporter, DevToolsInfo } from '../../types.js'
import { runBenchmark } from '../../core/orchestrator/orchestrator.js'
import { createConsoleReporter } from '../../reporters/console.js'
import { createJsonReporter } from '../../reporters/json.js'
import { createHtmlReporter } from '../../reporters/html.js'
import { createCsvReporter } from '../../reporters/csv.js'
import { EXIT_CODES, DEFAULT_TIMEOUT_MS } from '../../constants.js'
import { info, error, success, warn, printBanner } from '../printer.js'

/**
 * Gets reporter based on output format
 * @param format - Output format
 * @returns Reporter instance
 */
function getReporter(format: string): Reporter {
  switch (format) {
    case 'json':
      return createJsonReporter()
    case 'html':
      return createHtmlReporter()
    case 'csv':
      return createCsvReporter()
    default:
      return createConsoleReporter()
  }
}

/**
 * Checks if a URL is reachable and collects info
 * @param url - URL to check
 * @param timeout - Timeout in milliseconds
 * @returns Reachability status and devtools info
 */
async function checkReachability(
  url: string,
  timeout: number
): Promise<{
  reachable: boolean
  statusCode?: number
  error?: string
  info?: DevToolsInfo
}> {
  try {
    const hostname = new URL(url).hostname
    const ip = await lookup(hostname)
      .then(r => r.address)
      .catch(() => null)

    const start = process.hrtime.bigint()
    const response = await request(url, {
      method: 'HEAD',
      headersTimeout: timeout,
      bodyTimeout: timeout
    })
    const end = process.hrtime.bigint()
    const handshakeTime = Number((end - start) / 1000000n) // Approximate

    await response.body.dump()

    const info: DevToolsInfo = {
      ip,
      server: (response.headers['server'] as string) || null,
      poweredBy: (response.headers['x-powered-by'] as string) || null,
      requestId:
        ((response.headers['x-request-id'] || response.headers['request-id']) as string) || null,
      handshakeTime
    }

    return { reachable: true, statusCode: response.statusCode, info }
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('ECONNREFUSED')) {
        return { reachable: false, error: 'Connection refused - server not running' }
      }
      if (err.message.includes('ENOTFOUND')) {
        return { reachable: false, error: 'Host not found - check URL' }
      }
      if (err.message.includes('ETIMEDOUT') || err.name === 'TimeoutError') {
        return { reachable: false, error: 'Connection timed out' }
      }
      return { reachable: false, error: err.message }
    }
    return { reachable: false, error: 'Unknown error' }
  }
}

/**
 * Checks thresholds and returns exit code
 * @param result - Benchmark result
 * @param config - Benchmark config
 * @returns Exit code
 */
function checkThresholds(result: BenchResult, config: BenchConfig): number {
  if (config.thresholds === undefined) {
    return EXIT_CODES.SUCCESS
  }

  const { p99, errorRate } = config.thresholds

  if (p99 !== undefined && result.latency.p99 > p99) {
    error(`P99 latency ${result.latency.p99.toFixed(2)}ms exceeds threshold ${p99}ms`)
    return EXIT_CODES.THRESHOLD_EXCEEDED
  }

  if (errorRate !== undefined && result.requests.total > 0) {
    const actualErrorRate = result.requests.failed / result.requests.total
    if (actualErrorRate > errorRate) {
      error(
        `Error rate ${(actualErrorRate * 100).toFixed(2)}% exceeds threshold ${(errorRate * 100).toFixed(2)}%`
      )
      return EXIT_CODES.THRESHOLD_EXCEEDED
    }
  }

  return EXIT_CODES.SUCCESS
}

/**
 * Runs the benchmark command
 * @param config - Benchmark configuration
 * @returns Exit code
 */
export async function runCommand(config: BenchConfig): Promise<number> {
  printBanner()

  info(`Checking ${config.url}...`)
  const check = await checkReachability(config.url, config.timeout ?? DEFAULT_TIMEOUT_MS)

  if (!check.reachable) {
    error(`Target not reachable: ${check.error}`)
    return EXIT_CODES.ERROR
  }

  success(`Target reachable (HTTP ${check.statusCode})`)
  info(`Benchmarking ${config.url}`)
  info(
    `${config.connections ?? 50} connections | ${config.duration ?? 10}s duration${config.rate ? ` | ${config.rate} req/s` : ''}`
  )

  try {
    const result = await runBenchmark(config)

    // Attach DevTools info if requested and available
    if (config.info && check.info) {
      result.devtools = check.info
    }

    const reporter = getReporter(config.output ?? 'console')
    const output = await reporter.report(result)

    if (config.outputFile !== undefined) {
      writeFileSync(config.outputFile, output, 'utf-8')
      info(`Report saved to ${config.outputFile}`)
    }

    return checkThresholds(result, config)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    error(message)
    return EXIT_CODES.ERROR
  }
}

/**
 * Compare result for multiple URLs
 */
type CompareResult = {
  url: string
  rps: number
  p50: number
  p99: number
  errorRate: number
}

/**
 * Runs comparison benchmark across multiple URLs
 * @param urls - URLs to compare
 * @param config - Base benchmark configuration
 * @returns Exit code
 */
export async function compareCommand(urls: string[], config: BenchConfig): Promise<number> {
  printBanner()
  info(`Comparing ${urls.length} targets`)
  info(`${config.connections ?? 50} connections | ${config.duration ?? 10}s duration each`)

  const results: CompareResult[] = []

  for (const url of urls) {
    info(`\nChecking ${url}...`)
    const check = await checkReachability(url, config.timeout ?? DEFAULT_TIMEOUT_MS)

    if (!check.reachable) {
      warn(`Skipping ${url}: ${check.error}`)
      continue
    }

    success(`Target reachable (HTTP ${check.statusCode})`)
    info(`Benchmarking ${url}...`)

    try {
      const result = await runBenchmark({ ...config, url })
      const errorRate =
        result.requests.total > 0 ? (result.requests.failed / result.requests.total) * 100 : 0

      results.push({
        url,
        rps: result.throughput.rps,
        p50: result.latency.p50,
        p99: result.latency.p99,
        errorRate
      })

      info(
        `  RPS: ${Math.round(result.throughput.rps).toLocaleString()} | P99: ${result.latency.p99.toFixed(2)}ms`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      warn(`Failed ${url}: ${message}`)
    }
  }

  if (results.length === 0) {
    error('No successful benchmarks')
    return EXIT_CODES.ERROR
  }

  printComparisonTable(results)

  if (config.outputFile !== undefined) {
    const output = JSON.stringify({ comparison: results, config }, null, 2)
    writeFileSync(config.outputFile, output, 'utf-8')
    info(`Report saved to ${config.outputFile}`)
  }

  return EXIT_CODES.SUCCESS
}

/**
 * Prints comparison table
 * @param results - Comparison results
 */
function printComparisonTable(results: CompareResult[]): void {
  const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
  } as const

  const sorted = [...results].sort((a, b) => b.rps - a.rps)
  const maxRps = sorted[0]?.rps ?? 0

  process.stdout.write(`\n${COLORS.bold}${COLORS.cyan}Comparison Results${COLORS.reset}\n`)
  process.stdout.write(`${COLORS.dim}${'─'.repeat(80)}${COLORS.reset}\n`)
  process.stdout.write(
    `${COLORS.dim}${'URL'.padEnd(40)} ${'RPS'.padStart(12)} ${'P50'.padStart(10)} ${'P99'.padStart(10)} ${'Err%'.padStart(8)}${COLORS.reset}\n`
  )
  process.stdout.write(`${COLORS.dim}${'─'.repeat(80)}${COLORS.reset}\n`)

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    if (r === undefined) continue

    const urlDisplay = r.url.length > 38 ? r.url.substring(0, 35) + '...' : r.url
    const relPerf = maxRps > 0 ? Math.round((r.rps / maxRps) * 100) : 100
    const perfColor = i === 0 ? COLORS.green : relPerf >= 80 ? COLORS.yellow : COLORS.dim

    const rank =
      i === 0 ? `${COLORS.green}#1${COLORS.reset} ` : `${COLORS.dim}#${i + 1}${COLORS.reset} `

    process.stdout.write(
      `${rank}${urlDisplay.padEnd(37)} ${perfColor}${Math.round(r.rps).toLocaleString().padStart(12)}${COLORS.reset} ${r.p50.toFixed(2).padStart(8)}ms ${r.p99.toFixed(2).padStart(8)}ms ${r.errorRate.toFixed(2).padStart(6)}%\n`
    )
  }

  process.stdout.write(`${COLORS.dim}${'─'.repeat(80)}${COLORS.reset}\n\n`)
}
