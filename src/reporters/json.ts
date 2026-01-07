import type { BenchResult, Reporter } from "../types.js";

/**
 * JSON reporter for CI integration and data export
 */
export class JsonReporter implements Reporter {
  private readonly pretty: boolean;

  /**
   * Creates a JSON reporter
   * @param pretty - Whether to format with indentation
   */
  constructor(pretty: boolean = true) {
    this.pretty = pretty;
  }

  /**
   * Generates JSON output
   * @param result - Benchmark result
   * @returns JSON string
   */
  report(result: BenchResult): Promise<string> {
    if (this.pretty) {
      return Promise.resolve(JSON.stringify(result, null, 2));
    }
    return Promise.resolve(JSON.stringify(result));
  }
}

/**
 * Creates a JSON reporter
 * @param pretty - Whether to format with indentation
 * @returns JSON reporter instance
 */
export function createJsonReporter(pretty: boolean = true): Reporter {
  return new JsonReporter(pretty);
}
