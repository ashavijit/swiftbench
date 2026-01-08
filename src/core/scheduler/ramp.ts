/**
 * Ramp scheduler for gradual load increase/decrease
 */
export class RampScheduler {
  private readonly startRate: number
  private readonly targetRate: number
  private readonly rampUpMs: number
  private readonly startTime: number

  /**
   * Creates a ramp scheduler
   * @param targetRate - Target rate to reach
   * @param rampUpSeconds - Seconds to reach target rate
   * @param startRate - Starting rate (default: 0)
   */
  constructor(targetRate: number, rampUpSeconds: number, startRate: number = 0) {
    this.startRate = startRate
    this.targetRate = targetRate
    this.rampUpMs = rampUpSeconds * 1000
    this.startTime = performance.now()
  }

  /**
   * Gets the current rate based on elapsed time
   * @returns Current rate (connections or RPS)
   */
  getCurrentRate(): number {
    const elapsed = performance.now() - this.startTime

    if (elapsed >= this.rampUpMs) {
      return this.targetRate
    }

    const progress = elapsed / this.rampUpMs
    return this.startRate + (this.targetRate - this.startRate) * progress
  }

  /**
   * Checks if ramp-up is complete
   * @returns True if target rate is reached
   */
  isComplete(): boolean {
    return performance.now() - this.startTime >= this.rampUpMs
  }

  /**
   * Gets progress as percentage
   * @returns Progress from 0 to 100
   */
  getProgress(): number {
    const elapsed = performance.now() - this.startTime
    return Math.min(100, (elapsed / this.rampUpMs) * 100)
  }

  /**
   * Gets remaining time until ramp-up completes
   * @returns Remaining milliseconds
   */
  getRemainingMs(): number {
    const elapsed = performance.now() - this.startTime
    return Math.max(0, this.rampUpMs - elapsed)
  }
}

/**
 * Creates a ramp scheduler if ramp-up is specified
 * @param targetRate - Target rate to reach
 * @param rampUpSeconds - Ramp-up duration in seconds
 * @returns Ramp scheduler or null
 */
export function createRampScheduler(
  targetRate: number,
  rampUpSeconds: number | undefined
): RampScheduler | null {
  if (rampUpSeconds === undefined || rampUpSeconds <= 0) {
    return null
  }
  return new RampScheduler(targetRate, rampUpSeconds)
}
