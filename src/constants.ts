/**
 * Default number of concurrent connections
 */
export const DEFAULT_CONNECTIONS = 50;

/**
 * Default benchmark duration in seconds
 */
export const DEFAULT_DURATION_SEC = 10;

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Maximum number of worker threads
 */
export const MAX_WORKERS = 8;

/**
 * Number of histogram buckets for latency tracking
 */
export const HISTOGRAM_BUCKETS = 10000;

/**
 * Maximum latency value in microseconds (10 seconds)
 */
export const MAX_LATENCY_US = 10_000_000;

/**
 * Bucket width in microseconds
 */
export const BUCKET_WIDTH_US = MAX_LATENCY_US / HISTOGRAM_BUCKETS;

/**
 * Default warmup duration in seconds
 */
export const DEFAULT_WARMUP_SEC = 0;

/**
 * Default ramp-up duration in seconds
 */
export const DEFAULT_RAMP_UP_SEC = 0;

/**
 * Metrics reporting interval in milliseconds
 */
export const METRICS_INTERVAL_MS = 1000;

/**
 * Package version
 */
export const VERSION = "0.1.0";

/**
 * HTTP status codes considered successful
 */
export const SUCCESS_STATUS_CODES = new Set([200, 201, 202, 204, 301, 302, 304]);

/**
 * Default HTTP method
 */
export const DEFAULT_METHOD = "GET";

/**
 * Default output format
 */
export const DEFAULT_OUTPUT_FORMAT = "console";

/**
 * Exit codes for CI integration
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  THRESHOLD_EXCEEDED: 1,
  ERROR: 2
} as const;
