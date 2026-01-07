/**
 * ANSI color codes
 */
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m"
} as const;

/**
 * Prints an info message
 * @param message - Message to print
 */
export function info(message: string): void {
  process.stdout.write(`${COLORS.cyan}info${COLORS.reset} ${message}\n`);
}

/**
 * Prints a success message
 * @param message - Message to print
 */
export function success(message: string): void {
  process.stdout.write(`${COLORS.green}done${COLORS.reset} ${message}\n`);
}

/**
 * Prints a warning message
 * @param message - Message to print
 */
export function warn(message: string): void {
  process.stdout.write(`${COLORS.yellow}warn${COLORS.reset} ${message}\n`);
}

/**
 * Prints an error message
 * @param message - Message to print
 */
export function error(message: string): void {
  process.stderr.write(`${COLORS.red}error${COLORS.reset} ${message}\n`);
}

/**
 * Prints the banner
 */
export function printBanner(): void {
  process.stdout.write(`\n${COLORS.bold}${COLORS.green}SwiftBench${COLORS.reset} ${COLORS.dim}High-performance API benchmarking${COLORS.reset}\n\n`);
}

/**
 * Prints a progress update
 * @param current - Current progress
 * @param total - Total items
 * @param label - Progress label
 */
export function progress(current: number, total: number, label: string): void {
  const percent = Math.round((current / total) * 100);
  const bar = "█".repeat(Math.round(percent / 5)) + "░".repeat(20 - Math.round(percent / 5));
  process.stdout.write(`\r${COLORS.dim}[${bar}]${COLORS.reset} ${percent}% ${label}`);
}

/**
 * Clears the current line
 */
export function clearLine(): void {
  process.stdout.write("\r\x1b[K");
}
