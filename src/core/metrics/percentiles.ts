import type { LatencyStats } from "../../types.js";
import { Histogram } from "./histogram.js";

/**
 * Calculates percentile statistics from a histogram
 * @param histogram - Histogram to calculate percentiles from
 * @returns Latency statistics in milliseconds
 */
export function calculatePercentiles(histogram: Histogram): LatencyStats {
  const toMs = (us: number): number => us / 1000;

  return {
    min: toMs(histogram.getMin()),
    max: toMs(histogram.getMax()),
    mean: toMs(histogram.getMean()),
    stddev: toMs(histogram.getStdDev()),
    p50: toMs(histogram.getPercentile(50)),
    p75: toMs(histogram.getPercentile(75)),
    p90: toMs(histogram.getPercentile(90)),
    p95: toMs(histogram.getPercentile(95)),
    p99: toMs(histogram.getPercentile(99)),
    p999: toMs(histogram.getPercentile(99.9))
  };
}

/**
 * Rounds a number to specified decimal places
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Formats latency stats with consistent decimal places
 * @param stats - Latency statistics
 * @returns Formatted statistics
 */
export function formatLatencyStats(stats: LatencyStats): LatencyStats {
  return {
    min: roundTo(stats.min),
    max: roundTo(stats.max),
    mean: roundTo(stats.mean),
    stddev: roundTo(stats.stddev),
    p50: roundTo(stats.p50),
    p75: roundTo(stats.p75),
    p90: roundTo(stats.p90),
    p95: roundTo(stats.p95),
    p99: roundTo(stats.p99),
    p999: roundTo(stats.p999)
  };
}
