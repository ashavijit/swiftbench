import { DEFAULT_WARMUP_SEC } from "../../constants.js";

/**
 * Lifecycle phase
 */
export type LifecyclePhase = "idle" | "warmup" | "running" | "cooldown" | "complete";

/**
 * Lifecycle manager for benchmark phases
 */
export class LifecycleManager {
  private phase: LifecyclePhase = "idle";
  private readonly warmupDuration: number;
  private readonly mainDuration: number;
  private startTime: number = 0;
  private warmupEndTime: number = 0;
  private mainEndTime: number = 0;

  /**
   * Creates a lifecycle manager
   * @param durationSec - Main benchmark duration in seconds
   * @param warmupSec - Warmup duration in seconds
   */
  constructor(durationSec: number, warmupSec: number = DEFAULT_WARMUP_SEC) {
    this.warmupDuration = warmupSec * 1000;
    this.mainDuration = durationSec * 1000;
  }

  /**
   * Starts the benchmark lifecycle
   */
  start(): void {
    this.startTime = performance.now();
    this.warmupEndTime = this.startTime + this.warmupDuration;
    this.mainEndTime = this.warmupEndTime + this.mainDuration;

    if (this.warmupDuration > 0) {
      this.phase = "warmup";
    } else {
      this.phase = "running";
    }
  }

  /**
   * Updates the current phase based on elapsed time
   * @returns Current phase
   */
  update(): LifecyclePhase {
    const now = performance.now();

    if (this.phase === "warmup" && now >= this.warmupEndTime) {
      this.phase = "running";
    }

    if (this.phase === "running" && now >= this.mainEndTime) {
      this.phase = "cooldown";
    }

    return this.phase;
  }

  /**
   * Gets the current phase
   * @returns Current lifecycle phase
   */
  getPhase(): LifecyclePhase {
    return this.phase;
  }

  /**
   * Checks if benchmark is in running phase
   * @returns True if in main benchmark phase
   */
  isRunning(): boolean {
    return this.phase === "running";
  }

  /**
   * Checks if benchmark should continue
   * @returns True if not complete
   */
  shouldContinue(): boolean {
    return this.phase !== "complete" && this.phase !== "cooldown";
  }

  /**
   * Marks lifecycle as complete
   */
  complete(): void {
    this.phase = "complete";
  }

  /**
   * Gets elapsed time in milliseconds
   * @returns Elapsed time since start
   */
  getElapsedMs(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Gets remaining time in main phase
   * @returns Remaining milliseconds
   */
  getRemainingMs(): number {
    if (this.phase === "running") {
      return Math.max(0, this.mainEndTime - performance.now());
    }
    return 0;
  }

  /**
   * Gets progress as percentage
   * @returns Progress from 0 to 100
   */
  getProgress(): number {
    const now = performance.now();
    const elapsed = now - this.warmupEndTime;
    return Math.min(100, Math.max(0, (elapsed / this.mainDuration) * 100));
  }
}
