import type { BenchConfig, OutputFormat, HttpMethod } from '../types.js'
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_DURATION_SEC,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_METHOD,
  DEFAULT_OUTPUT_FORMAT
} from '../constants.js'

/**
 * Parsed CLI flags
 */
export type ParsedFlags = {
  urls: string[]
  method: HttpMethod
  connections: number
  duration: number
  rate: number | null
  timeout: number
  rampUp: number | null
  warmup: number | null
  headers: Record<string, string>
  body: string | null
  http2: boolean
  output: OutputFormat
  outputFile: string | null
  p99Threshold: number | null
  errorRateThreshold: number | null
  compare: boolean
  help: boolean
  version: boolean
}

/**
 * Prints help message
 */
export function printHelp(): void {
  const help = `
SwiftBench - High-performance API benchmarking tool

USAGE:
  swiftbench <url> [options]
  swiftbench --compare <url1> <url2> [url3...] [options]

OPTIONS:
  -c, --connections <n>    Number of concurrent connections (default: ${DEFAULT_CONNECTIONS})
  -d, --duration <n>       Test duration in seconds (default: ${DEFAULT_DURATION_SEC})
  --rate <n>               Requests per second limit
  --ramp-up <n>            Ramp-up time in seconds
  --warmup <n>             Warmup time in seconds
  --timeout <n>            Request timeout in ms (default: ${DEFAULT_TIMEOUT_MS})
  -m, --method <method>    HTTP method (default: GET)
  -H, --header <header>    Add header (can be used multiple times)
  --body <data>            Request body
  --json <data>            JSON request body (sets Content-Type)
  --http2                  Use HTTP/2
  --output <format>        Output format: console, json, html, csv
  -o <file>                Output file path
  --p99 <ms>               P99 latency threshold for CI
  --error-rate <rate>      Error rate threshold (0-1) for CI
  --compare                Compare multiple URLs (framework comparison)
  -h, --help               Show this help message
  -v, --version            Show version

EXAMPLES:
  swiftbench http://localhost:3000
  swiftbench http://localhost:3000 -c 200 -d 30
  swiftbench http://localhost:3000 --rate 1000 --output json -o result.json
  swiftbench http://localhost:3000/api -m POST --json '{"key": "value"}'
  swiftbench --compare http://localhost:3000 http://localhost:3001 -c 100 -d 10
`
  process.stdout.write(help)
}

/**
 * Parses command line arguments
 * @param args - Command line arguments
 * @returns Parsed flags
 */
export function parseFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = {
    urls: [],
    method: DEFAULT_METHOD,
    connections: DEFAULT_CONNECTIONS,
    duration: DEFAULT_DURATION_SEC,
    rate: null,
    timeout: DEFAULT_TIMEOUT_MS,
    rampUp: null,
    warmup: null,
    headers: {},
    body: null,
    http2: false,
    output: DEFAULT_OUTPUT_FORMAT,
    outputFile: null,
    p99Threshold: null,
    errorRateThreshold: null,
    compare: false,
    help: false,
    version: false
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === undefined) {
      i++
      continue
    }

    if (arg === '-h' || arg === '--help') {
      flags.help = true
      i++
      continue
    }

    if (arg === '-v' || arg === '--version') {
      flags.version = true
      i++
      continue
    }

    if (arg === '--compare') {
      flags.compare = true
      i++
      continue
    }

    if (arg === '-c' || arg === '--connections') {
      flags.connections = parseInt(args[++i] ?? String(DEFAULT_CONNECTIONS), 10)
      i++
      continue
    }

    if (arg === '-d' || arg === '--duration') {
      flags.duration = parseInt(args[++i] ?? String(DEFAULT_DURATION_SEC), 10)
      i++
      continue
    }

    if (arg === '--rate') {
      flags.rate = parseInt(args[++i] ?? '0', 10)
      i++
      continue
    }

    if (arg === '--ramp-up') {
      flags.rampUp = parseInt(args[++i] ?? '0', 10)
      i++
      continue
    }

    if (arg === '--warmup') {
      flags.warmup = parseInt(args[++i] ?? '0', 10)
      i++
      continue
    }

    if (arg === '--timeout') {
      flags.timeout = parseInt(args[++i] ?? String(DEFAULT_TIMEOUT_MS), 10)
      i++
      continue
    }

    if (arg === '-m' || arg === '--method') {
      const method = (args[++i] ?? 'GET').toUpperCase() as HttpMethod
      flags.method = method
      i++
      continue
    }

    if (arg === '-H' || arg === '--header') {
      const header = args[++i] ?? ''
      const colonIndex = header.indexOf(':')
      if (colonIndex > 0) {
        const key = header.substring(0, colonIndex).trim()
        const value = header.substring(colonIndex + 1).trim()
        flags.headers[key] = value
      }
      i++
      continue
    }

    if (arg === '--body') {
      flags.body = args[++i] ?? null
      i++
      continue
    }

    if (arg === '--json') {
      flags.body = args[++i] ?? null
      flags.headers['Content-Type'] = 'application/json'
      i++
      continue
    }

    if (arg === '--http2') {
      flags.http2 = true
      i++
      continue
    }

    if (arg === '--output') {
      const format = args[++i] ?? 'console'
      if (format === 'console' || format === 'json' || format === 'html' || format === 'csv') {
        flags.output = format
      }
      i++
      continue
    }

    if (arg === '-o') {
      flags.outputFile = args[++i] ?? null
      i++
      continue
    }

    if (arg === '--p99') {
      flags.p99Threshold = parseFloat(args[++i] ?? '0')
      i++
      continue
    }

    if (arg === '--error-rate') {
      flags.errorRateThreshold = parseFloat(args[++i] ?? '0')
      i++
      continue
    }

    if (!arg.startsWith('-')) {
      flags.urls.push(arg)
    }

    i++
  }

  return flags
}

/**
 * Converts parsed flags to bench config
 * @param flags - Parsed CLI flags
 * @returns Bench configuration
 */
export function flagsToConfig(flags: ParsedFlags): BenchConfig | null {
  if (flags.urls.length === 0) {
    return null
  }

  const config: BenchConfig = {
    url: flags.urls[0] ?? '',
    method: flags.method,
    headers: flags.headers,
    connections: flags.connections,
    duration: flags.duration,
    timeout: flags.timeout,
    http2: flags.http2,
    output: flags.output,
    outputFile: flags.outputFile ?? undefined
  }

  if (flags.body !== null) {
    config.body = flags.body
  }

  if (flags.rate !== null) {
    config.rate = flags.rate
  }

  if (flags.rampUp !== null) {
    config.rampUp = flags.rampUp
  }

  if (flags.warmup !== null) {
    config.warmup = flags.warmup
  }

  if (flags.p99Threshold !== null || flags.errorRateThreshold !== null) {
    config.thresholds = {}
    if (flags.p99Threshold !== null) {
      config.thresholds.p99 = flags.p99Threshold
    }
    if (flags.errorRateThreshold !== null) {
      config.thresholds.errorRate = flags.errorRateThreshold
    }
  }

  return config
}
