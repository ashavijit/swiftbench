import { HISTOGRAM_BUCKETS, MAX_LATENCY_US, BUCKET_WIDTH_US } from '../../constants.js'

import type { HistogramData } from '../../types.js'

/**
 * High-performance histogram for latency tracking
 * Uses pre-allocated Uint32Array to avoid allocations in hot path
 */
export class Histogram {
  private readonly buckets: Uint32Array
  private count: number = 0
  private min: number = Number.MAX_SAFE_INTEGER
  private max: number = 0
  private sum: number = 0

  /**
   * Creates a new histogram with pre-allocated buckets
   */
  constructor() {
    this.buckets = new Uint32Array(HISTOGRAM_BUCKETS)
  }

  /**
   * Records a latency value in microseconds
   * @param valueUs - Latency in microseconds
   */
  record(valueUs: number): void {
    const clampedValue = Math.min(valueUs, MAX_LATENCY_US - 1)
    const bucketIndex = Math.floor(clampedValue / BUCKET_WIDTH_US)
    const safeIndex = Math.min(bucketIndex, HISTOGRAM_BUCKETS - 1)

    const current = this.buckets[safeIndex]
    if (current !== undefined) {
      this.buckets[safeIndex] = current + 1
    }
    this.count++
    this.sum += valueUs

    if (valueUs < this.min) {
      this.min = valueUs
    }
    if (valueUs > this.max) {
      this.max = valueUs
    }
  }

  /**
   * Gets the total number of recorded values
   * @returns Total count
   */
  getCount(): number {
    return this.count
  }

  /**
   * Gets the minimum recorded value
   * @returns Minimum value in microseconds
   */
  getMin(): number {
    return this.count > 0 ? this.min : 0
  }

  /**
   * Gets the maximum recorded value
   * @returns Maximum value in microseconds
   */
  getMax(): number {
    return this.max
  }

  /**
   * Gets the mean value
   * @returns Mean in microseconds
   */
  getMean(): number {
    return this.count > 0 ? this.sum / this.count : 0
  }

  /**
   * Gets the sum of all values
   * @returns Sum in microseconds
   */
  getSum(): number {
    return this.sum
  }

  /**
   * Gets a percentile value
   * @param percentile - Percentile (0-100)
   * @returns Value at percentile in microseconds
   */
  getPercentile(percentile: number): number {
    if (this.count === 0) {
      return 0
    }

    const targetCount = Math.ceil((percentile / 100) * this.count)
    let cumulative = 0

    for (let i = 0; i < HISTOGRAM_BUCKETS; i++) {
      const bucketValue = this.buckets[i]
      if (bucketValue !== undefined) {
        cumulative += bucketValue
      }
      if (cumulative >= targetCount) {
        return (i + 0.5) * BUCKET_WIDTH_US
      }
    }

    return MAX_LATENCY_US
  }

  /**
   * Calculates standard deviation
   * @returns Standard deviation in microseconds
   */
  getStdDev(): number {
    if (this.count < 2) {
      return 0
    }

    const mean = this.getMean()
    let sumSquaredDiff = 0
    let counted = 0

    for (let i = 0; i < HISTOGRAM_BUCKETS; i++) {
      const bucketCount = this.buckets[i]
      if (bucketCount !== undefined && bucketCount > 0) {
        const bucketMidpoint = (i + 0.5) * BUCKET_WIDTH_US
        const diff = bucketMidpoint - mean
        sumSquaredDiff += diff * diff * bucketCount
        counted += bucketCount
      }
    }

    return Math.sqrt(sumSquaredDiff / counted)
  }

  /**
   * Exports histogram data for transfer
   * @returns Histogram data object
   */
  export(): HistogramData {
    return {
      buckets: new Uint32Array(this.buckets),
      count: this.count,
      min: this.min,
      max: this.max,
      sum: this.sum
    }
  }

  /**
   * Imports histogram data
   * @param data - Histogram data to import
   */
  import(data: HistogramData): void {
    for (let i = 0; i < HISTOGRAM_BUCKETS; i++) {
      const current = this.buckets[i]
      const incoming = data.buckets[i]
      if (current !== undefined) {
        this.buckets[i] = current + (incoming ?? 0)
      }
    }
    this.count += data.count
    this.sum += data.sum

    if (data.count > 0) {
      if (data.min < this.min) {
        this.min = data.min
      }
      if (data.max > this.max) {
        this.max = data.max
      }
    }
  }

  /**
   * Merges another histogram into this one
   * @param other - Histogram to merge
   */
  merge(other: Histogram): void {
    this.import(other.export())
  }

  /**
   * Resets all histogram data
   */
  reset(): void {
    this.buckets.fill(0)
    this.count = 0
    this.min = Number.MAX_SAFE_INTEGER
    this.max = 0
    this.sum = 0
  }
}
