export type {
  BenchConfig,
  BenchOptions,
  BenchResult,
  LatencyStats,
  ErrorBreakdown,
  ThresholdConfig,
  HttpMethod,
  OutputFormat,
  ScenarioConfig,
  ScenarioStep,
  Reporter
} from './types.js'

export { runBenchmark } from './core/orchestrator/orchestrator.js'
export { createConsoleReporter } from './reporters/console.js'
export { createJsonReporter } from './reporters/json.js'
export { createHtmlReporter } from './reporters/html.js'
export { createCsvReporter } from './reporters/csv.js'

import type { BenchConfig, BenchOptions, BenchResult } from './types.js'
import { runBenchmark } from './core/orchestrator/orchestrator.js'

/**
 * Runs a benchmark against a URL
 * @param url - Target URL or full config
 * @param options - Benchmark options (when url is string)
 * @returns Benchmark result
 * @example
 * // Simple usage
 * const result = await bench("http://localhost:3000");
 *
 * // With options
 * const result = await bench("http://localhost:3000", {
 *   connections: 200,
 *   duration: 30
 * });
 *
 * // Full config
 * const result = await bench({
 *   url: "http://localhost:3000/api",
 *   method: "POST",
 *   rate: 500,
 *   duration: 20
 * });
 */
export async function bench(url: string, options?: BenchOptions): Promise<BenchResult>
export async function bench(config: BenchConfig): Promise<BenchResult>
export async function bench(
  urlOrConfig: string | BenchConfig,
  options?: BenchOptions
): Promise<BenchResult> {
  if (typeof urlOrConfig === 'string') {
    const config: BenchConfig = {
      url: urlOrConfig,
      ...options
    }
    return runBenchmark(config)
  }
  return runBenchmark(urlOrConfig)
}

/**
 * Creates a typed configuration object
 * @param config - Benchmark configuration
 * @returns The same configuration (typed)
 * @example
 * export default defineConfig({
 *   target: "http://localhost:3000",
 *   connections: 200,
 *   duration: 30
 * });
 */
export function defineConfig(config: BenchConfig): BenchConfig {
  return config
}
