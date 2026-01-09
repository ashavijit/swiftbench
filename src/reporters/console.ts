import type { BenchResult, Reporter } from '../types.js'

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
} as const

/**
 * Box drawing characters
 */
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  cross: '┼',
  teeDown: '┬',
  teeUp: '┴',
  teeRight: '├',
  teeLeft: '┤'
} as const

/**
 * Formats a number with thousands separator
 * @param num - Number to format
 * @returns Formatted string
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Formats bytes to human readable string
 * @param bytes - Bytes to format
 * @returns Formatted string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Formats duration in milliseconds for table
 * @param ms - Milliseconds
 * @returns Formatted string
 */
function formatMsShort(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`
  return `${ms.toFixed(2)} ms`
}

/**
 * Strips ANSI color codes from string
 * @param str - String with color codes
 * @returns Clean string
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Pads a string to center
 * @param str - String to pad
 * @param width - Target width
 * @returns Centered string
 */
function center(str: string, width: number): string {
  const visibleLength = stripAnsi(str).length
  const padding = Math.max(0, width - visibleLength)
  const left = Math.floor(padding / 2)
  const right = padding - left
  return ' '.repeat(left) + str + ' '.repeat(right)
}

function tableRow(cells: string[], widths: number[]): string {
  const formatted = cells.map((cell, i) => {
    const width = widths[i] ?? 10
    return center(cell, width)
  })
  return `${BOX.vertical}${formatted.join(BOX.vertical)}${BOX.vertical}`
}

/**
 * Creates table separator
 * @param widths - Column widths
 * @param left - Left character
 * @param mid - Middle character
 * @param right - Right character
 * @returns Separator line
 */
function tableSeparator(widths: number[], left: string, mid: string, right: string): string {
  const segments = widths.map(w => BOX.horizontal.repeat(w))
  return `${left}${segments.join(mid)}${right}`
}

/**
 * Creates a styled table
 * @param headers - Header row
 * @param rows - Data rows
 * @param widths - Column widths
 * @returns Complete table string
 */
function createTable(headers: string[], rows: string[][], widths: number[]): string {
  const lines: string[] = []
  lines.push(tableSeparator(widths, BOX.topLeft, BOX.teeDown, BOX.topRight))
  lines.push(tableRow(headers, widths))
  lines.push(tableSeparator(widths, BOX.teeRight, BOX.cross, BOX.teeLeft))
  for (const row of rows) {
    lines.push(tableRow(row, widths))
  }
  lines.push(tableSeparator(widths, BOX.bottomLeft, BOX.teeUp, BOX.bottomRight))
  return lines.join('\n')
}

/**
 * Calculates grade based on latency and error rate
 */
function calculateGrade(p99: number, errorRate: number): { grade: string; color: string } {
  if (errorRate >= 10 || p99 >= 5000) return { grade: 'F', color: COLORS.red }
  if (errorRate >= 5 || p99 >= 1000) return { grade: 'D', color: COLORS.red }
  if (errorRate >= 1 || p99 >= 300) return { grade: 'C', color: COLORS.yellow }
  if (errorRate >= 0.1 || p99 >= 100) return { grade: 'B', color: COLORS.blue }
  if (p99 >= 50) return { grade: 'A', color: COLORS.green }
  return { grade: 'A+', color: COLORS.green }
}

/**
 * Console reporter for terminal output
 */
export class ConsoleReporter implements Reporter {
  /**
   * Generates formatted console output
   * @param result - Benchmark result
   * @returns Formatted string (also prints to console)
   */
  report(result: BenchResult): Promise<string> {
    const lines: string[] = []
    const errorRate =
      result.requests.total > 0
        ? ((result.requests.failed / result.requests.total) * 100).toFixed(2)
        : '0.00'

    lines.push('')
    lines.push(
      `${COLORS.cyan}┌────────────────────────────────────────────────────────┐${COLORS.reset}`
    )

    const visibleTitle = `⚡ SwiftBench v${result.meta.version}`
    const boxWidth = 56
    const padding = boxWidth - visibleTitle.length
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad

    lines.push(
      `${COLORS.cyan}│${COLORS.reset}${' '.repeat(leftPad)}${COLORS.bold}${COLORS.green}⚡ SwiftBench${COLORS.reset} ${COLORS.dim}v${result.meta.version}${COLORS.reset}${' '.repeat(rightPad)}${COLORS.cyan}│${COLORS.reset}`
    )
    lines.push(
      `${COLORS.cyan}└────────────────────────────────────────────────────────┘${COLORS.reset}`
    )
    
    // Performance Grade
    const grade = calculateGrade(result.latency.p99, parseFloat(errorRate))
    const gradeStr = ` Performance Grade: [ ${grade.color}${grade.grade}${COLORS.reset} ] `
    const gradePadding = Math.floor((58 - stripAnsi(gradeStr).length) / 2)
    lines.push(' '.repeat(gradePadding) + gradeStr)
    
    lines.push('')

    lines.push(
      `  ${COLORS.dim}Target:${COLORS.reset}    ${COLORS.cyan}${result.url}${COLORS.reset}`
    )
    lines.push(
      `  ${COLORS.dim}Conns:${COLORS.reset}     ${COLORS.yellow}${result.connections}${COLORS.reset} connections`
    )
    lines.push(
      `  ${COLORS.dim}Duration:${COLORS.reset}  ${COLORS.yellow}${result.duration}s${COLORS.reset}`
    )
    if (result.rate) {
      lines.push(
        `  ${COLORS.dim}Rate:${COLORS.reset}      ${COLORS.yellow}${formatNumber(result.rate)}${COLORS.reset} req/s`
      )
    }
    lines.push('')

    lines.push(`${COLORS.bold}Latency Distribution${COLORS.reset}`)
    lines.push(
      `${COLORS.dim}────────────────────────────────────────────────────────${COLORS.reset}`
    )

    const scale = result.latency.p99 > 0 ? result.latency.p99 : 1
    const p50Bar = '█'.repeat(Math.ceil((result.latency.p50 / scale) * 40))
    const p75Bar = '█'.repeat(Math.ceil((result.latency.p75 / scale) * 40))
    const p90Bar = '█'.repeat(Math.ceil((result.latency.p90 / scale) * 40))
    const p95Bar = '█'.repeat(Math.ceil((result.latency.p95 / scale) * 40))
    const p99Bar = '█'.repeat(40) // p99 is the scale

    lines.push(
      `  50%   ${COLORS.green}${formatMsShort(result.latency.p50).padEnd(9)}${COLORS.reset} ${COLORS.dim}│${COLORS.reset}${COLORS.green}${p50Bar}${COLORS.reset}`
    )
    lines.push(
      `  75%   ${COLORS.green}${formatMsShort(result.latency.p75).padEnd(9)}${COLORS.reset} ${COLORS.dim}│${COLORS.reset}${COLORS.green}${p75Bar}${COLORS.reset}`
    )
    lines.push(
      `  90%   ${COLORS.yellow}${formatMsShort(result.latency.p90).padEnd(9)}${COLORS.reset} ${COLORS.dim}│${COLORS.reset}${COLORS.yellow}${p90Bar}${COLORS.reset}`
    )
    lines.push(
      `  95%   ${COLORS.yellow}${formatMsShort(result.latency.p95).padEnd(9)}${COLORS.reset} ${COLORS.dim}│${COLORS.reset}${COLORS.yellow}${p95Bar}${COLORS.reset}`
    )
    lines.push(
      `  99%   ${COLORS.red}${formatMsShort(result.latency.p99).padEnd(9)}${COLORS.reset} ${COLORS.dim}│${COLORS.reset}${COLORS.red}${p99Bar}${COLORS.reset}`
    )
    lines.push('')

    if (result.devtools) {
      lines.push(`${COLORS.bold}Connection Details${COLORS.reset}`)
      lines.push(
        `${COLORS.dim}────────────────────────────────────────────────────────${COLORS.reset}`
      )
      if (result.devtools.ip)
        lines.push(
          `  ${COLORS.dim}IP Address:${COLORS.reset}   ${COLORS.cyan}${result.devtools.ip}${COLORS.reset}`
        )
      if (result.devtools.server)
        lines.push(`  ${COLORS.dim}Server:${COLORS.reset}       ${result.devtools.server}`)
      if (result.devtools.poweredBy)
        lines.push(`  ${COLORS.dim}Powered By:${COLORS.reset}   ${result.devtools.poweredBy}`)
      if (result.devtools.requestId)
        lines.push(`  ${COLORS.dim}Request ID:${COLORS.reset}   ${result.devtools.requestId}`)
      if (result.devtools.handshakeTime !== null) {
        lines.push(
          `  ${COLORS.dim}Handshake:${COLORS.reset}    ~${result.devtools.handshakeTime.toFixed(2)}ms (approx)`
        )
      }
      lines.push('')
    }

    const latencyWidths = [10, 10, 10, 10, 10, 10]
    const latencyHeaders = ['Stat', 'Avg', 'Stdev', 'Max', 'P99', 'P99.9']
    const latencyRows = [
      [
        'Latency',
        formatMsShort(result.latency.mean),
        formatMsShort(result.latency.stddev),
        formatMsShort(result.latency.max),
        formatMsShort(result.latency.p99),
        formatMsShort(result.latency.p999)
      ]
    ]
    lines.push(createTable(latencyHeaders, latencyRows, latencyWidths))
    lines.push('')

    const summaryWidths = [15, 15, 15, 15]
    const summaryHeaders = ['Total Reqs', 'RPS', 'Transfer', 'Error Rate']
    const summaryRows = [
      [
        formatNumber(result.requests.total),
        `${COLORS.green}${formatNumber(Math.round(result.throughput.rps))}${COLORS.reset}`,
        formatBytes(result.throughput.totalBytes),
        parseFloat(errorRate) > 0
          ? `${COLORS.red}${errorRate}%${COLORS.reset}`
          : `${COLORS.green}0.00%${COLORS.reset}`
      ]
    ]
    lines.push(createTable(summaryHeaders, summaryRows, summaryWidths))
    lines.push('')

    if (result.errors.timeouts > 0 || result.errors.connectionErrors > 0) {
      lines.push(`${COLORS.yellow}Errors:${COLORS.reset}`)
      if (result.errors.timeouts > 0) {
        lines.push(
          `  Timeouts: ${COLORS.red}${formatNumber(result.errors.timeouts)}${COLORS.reset}`
        )
      }
      if (result.errors.connectionErrors > 0) {
        lines.push(
          `  Connection Errors: ${COLORS.red}${formatNumber(result.errors.connectionErrors)}${COLORS.reset}`
        )
      }
      for (const [code, count] of Object.entries(result.errors.byStatusCode)) {
        lines.push(`  HTTP ${code}: ${COLORS.red}${formatNumber(count)}${COLORS.reset}`)
      }
      lines.push('')
    }

    // Result Footer
    lines.push(`${COLORS.dim}Finished in ${result.duration}s${COLORS.reset}`)
    lines.push('')

    const output = lines.join('\n')

    process.stdout.write(output)

    return Promise.resolve(output)
  }
}

/**
 * Creates a console reporter
 * @returns Console reporter instance
 */
export function createConsoleReporter(): Reporter {
  return new ConsoleReporter()
}
