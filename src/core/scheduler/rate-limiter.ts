/**
 * Token bucket rate limiter for stable RPS under bursty scheduling
 */
export class RateLimiter {
  private readonly ratePerSecond: number
  private readonly intervalMs: number
  private tokens: number
  private lastRefill: number

  /**
   * Creates a token bucket rate limiter
   * @param ratePerSecond - Maximum requests per second
   */
  constructor(ratePerSecond: number) {
    this.ratePerSecond = ratePerSecond
    this.intervalMs = 1000 / ratePerSecond
    this.tokens = ratePerSecond
    this.lastRefill = performance.now()
  }

  /**
   * Attempts to acquire a token, waiting if necessary
   * @returns Promise that resolves when token is acquired
   */
  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    const waitTime = this.intervalMs - ((performance.now() - this.lastRefill) % this.intervalMs)
    await this.sleep(Math.max(0, waitTime))
    this.refill()
    this.tokens -= 1
  }

  /**
   * Tries to acquire a token without waiting
   * @returns True if token was acquired
   */
  tryAcquire(): boolean {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }

    return false
  }

  /**
   * Gets current token count
   * @returns Available tokens
   */
  getTokens(): number {
    this.refill()
    return this.tokens
  }

  /**
   * Gets the configured rate
   * @returns Rate per second
   */
  getRate(): number {
    return this.ratePerSecond
  }

  /**
   * Refills tokens based on elapsed time
   */
  private refill(): void {
    const now = performance.now()
    const elapsed = now - this.lastRefill
    const tokensToAdd = (elapsed / 1000) * this.ratePerSecond

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.ratePerSecond, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }

  /**
   * Sleeps for specified milliseconds
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Creates a rate limiter if rate is specified
 * @param rate - Requests per second (null for unlimited)
 * @returns Rate limiter or null
 */
export function createRateLimiter(rate: number | null): RateLimiter | null {
  if (rate === null || rate <= 0) {
    return null
  }
  return new RateLimiter(rate)
}
