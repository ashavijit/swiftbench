import type { BenchResult, Reporter } from "../types.js";

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  magenta: "\x1b[35m"
} as const;

/**
 * Box drawing characters
 */
const BOX = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  cross: "┼",
  teeDown: "┬",
  teeUp: "┴",
  teeRight: "├",
  teeLeft: "┤"
} as const;

/**
 * Formats a number with thousands separator
 * @param num - Number to format
 * @returns Formatted string
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Formats bytes to human readable string
 * @param bytes - Bytes to format
 * @returns Formatted string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Formats duration in milliseconds for table
 * @param ms - Milliseconds
 * @returns Formatted string
 */
function formatMsShort(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  return `${ms.toFixed(2)} ms`;
}

/**
 * Pads a string to center
 * @param str - String to pad
 * @param width - Target width
 * @returns Centered string
 */
function center(str: string, width: number): string {
  const padding = Math.max(0, width - str.length);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return " ".repeat(left) + str + " ".repeat(right);
}


function tableRow(cells: string[], widths: number[]): string {
  const formatted = cells.map((cell, i) => {
    const width = widths[i] ?? 10;
    return center(cell, width);
  });
  return `${BOX.vertical}${formatted.join(BOX.vertical)}${BOX.vertical}`;
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
  const segments = widths.map(w => BOX.horizontal.repeat(w));
  return `${left}${segments.join(mid)}${right}`;
}

/**
 * Creates a styled table
 * @param headers - Header row
 * @param rows - Data rows
 * @param widths - Column widths
 * @returns Complete table string
 */
function createTable(headers: string[], rows: string[][], widths: number[]): string {
  const lines: string[] = [];
  lines.push(tableSeparator(widths, BOX.topLeft, BOX.teeDown, BOX.topRight));
  lines.push(tableRow(headers, widths));
  lines.push(tableSeparator(widths, BOX.teeRight, BOX.cross, BOX.teeLeft));
  for (const row of rows) {
    lines.push(tableRow(row, widths));
  }
  lines.push(tableSeparator(widths, BOX.bottomLeft, BOX.teeUp, BOX.bottomRight));
  return lines.join("\n");
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
  async report(result: BenchResult): Promise<string> {
    const lines: string[] = [];
    const errorRate = result.requests.total > 0 
      ? ((result.requests.failed / result.requests.total) * 100).toFixed(2)
      : "0.00";

    lines.push("");
    lines.push(`${COLORS.bold}${COLORS.green}SwiftBench${COLORS.reset} ${COLORS.dim}v${result.meta.version}${COLORS.reset}`);
    lines.push(`Running ${result.duration}s test @ ${COLORS.cyan}${result.url}${COLORS.reset}`);
    lines.push(`${result.connections} connections${result.rate !== null ? ` | ${formatNumber(result.rate)} req/s limit` : ""}`);
    lines.push("");

    const latencyWidths = [10, 10, 10, 10, 10, 10, 10, 10];
    const latencyHeaders = ["Stat", "Min", "p50", "p90", "p99", "Avg", "Stdev", "Max"];
    const latencyRows = [
      [
        "Latency",
        formatMsShort(result.latency.min),
        formatMsShort(result.latency.p50),
        formatMsShort(result.latency.p90),
        formatMsShort(result.latency.p99),
        formatMsShort(result.latency.mean),
        formatMsShort(result.latency.stddev),
        formatMsShort(result.latency.max)
      ]
    ];
    lines.push(createTable(latencyHeaders, latencyRows, latencyWidths));
    lines.push("");

    const throughputWidths = [12, 14, 14, 14];
    const throughputHeaders = ["Stat", "Avg/sec", "Total", "Duration"];

    const throughputRows = [
      [
        "Requests",
        formatNumber(Math.round(result.throughput.rps)),
        formatNumber(result.requests.total),
        `${result.duration}s`
      ],
      [
        "Transfer",
        formatBytes(result.throughput.bytesPerSecond),
        formatBytes(result.throughput.totalBytes),
        `${result.duration}s`
      ]
    ];
    lines.push(createTable(throughputHeaders, throughputRows, throughputWidths));
    lines.push("");

    const summaryWidths = [15, 15, 15, 15];
    const summaryHeaders = ["Total Reqs", "Successful", "Failed", "Error Rate"];
    const summaryRows = [
      [
        formatNumber(result.requests.total),
        `${COLORS.green}${formatNumber(result.requests.successful)}${COLORS.reset}`,
        result.requests.failed > 0 ? `${COLORS.red}${formatNumber(result.requests.failed)}${COLORS.reset}` : "0",
        parseFloat(errorRate) > 1 ? `${COLORS.red}${errorRate}%${COLORS.reset}` : `${errorRate}%`
      ]
    ];
    lines.push(createTable(summaryHeaders, summaryRows, summaryWidths));
    lines.push("");

    if (result.errors.timeouts > 0 || result.errors.connectionErrors > 0) {
      lines.push(`${COLORS.yellow}Errors:${COLORS.reset}`);
      if (result.errors.timeouts > 0) {
        lines.push(`  Timeouts: ${COLORS.red}${formatNumber(result.errors.timeouts)}${COLORS.reset}`);
      }
      if (result.errors.connectionErrors > 0) {
        lines.push(`  Connection Errors: ${COLORS.red}${formatNumber(result.errors.connectionErrors)}${COLORS.reset}`);
      }
      for (const [code, count] of Object.entries(result.errors.byStatusCode)) {
        lines.push(`  HTTP ${code}: ${COLORS.red}${formatNumber(count)}${COLORS.reset}`);
      }
      lines.push("");
    }

    lines.push(`${COLORS.bold}${formatNumber(result.requests.total)}${COLORS.reset} requests in ${result.duration}s, ${formatBytes(result.throughput.totalBytes)} read`);
    lines.push(`${COLORS.dim}Completed at ${result.timestamp}${COLORS.reset}`);
    lines.push("");

    const output = lines.join("\n");

    process.stdout.write(output);

    return output;
  }
}

/**
 * Creates a console reporter
 * @returns Console reporter instance
 */
export function createConsoleReporter(): Reporter {
  return new ConsoleReporter();
}
