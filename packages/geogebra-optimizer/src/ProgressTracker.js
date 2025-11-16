/**
 * Progress tracker for optimization process.
 * Tracks evaluation progress and emits notifications at configurable thresholds.
 *
 * @class
 *
 * @example
 * const tracker = new ProgressTracker(1000, 1); // 1000 max evaluations, notify every 1%
 *
 * for (let i = 0; i < 1000; i++) {
 *   const shouldNotify = tracker.update(i + 1);
 *   if (shouldNotify) {
 *     console.log(`Progress: ${tracker.currentProgress.percent}%`);
 *   }
 * }
 */
export class ProgressTracker {
    /**
     * Create a new ProgressTracker.
     *
     * @param {number} maxEvaluations - Total number of evaluations expected
     * @param {number} [step=1] - Notification step in percent (e.g., 1 = notify every 1%, 0.1 = every 0.1%)
     */
    constructor(maxEvaluations, step = 1) {
        if (maxEvaluations <= 0) {
            throw new Error('maxEvaluations must be greater than 0');
        }
        if (step <= 0 || step > 100) {
            throw new Error('step must be between 0 and 100');
        }

        this.maxEvaluations = maxEvaluations;
        this.step = step;

        /**
         * Current progress information (exact values, no rounding)
         * @type {{percent: number, evaluations: number, maxEvaluations: number}}
         */
        this.currentProgress = {
            percent: 0,
            evaluations: 0,
            maxEvaluations: maxEvaluations
        };

        // Track the last notified threshold to avoid duplicate notifications
        this.lastNotifiedThreshold = -1;
    }

    /**
     * Update progress with current evaluation count.
     * Returns true if a notification threshold has been crossed.
     *
     * @param {number} evaluations - Current number of evaluations completed
     * @returns {boolean} True if should emit notification (threshold crossed)
     *
     * @example
     * const tracker = new ProgressTracker(1000, 5); // Notify every 5%
     * tracker.update(50);  // 5% → returns true
     * tracker.update(51);  // Still 5.1% → returns false
     * tracker.update(100); // 10% → returns true
     */
    update(evaluations) {
        // Update current progress (exact values)
        this.currentProgress.evaluations = evaluations;
        this.currentProgress.percent = (evaluations / this.maxEvaluations) * 100;

        // Calculate current threshold based on step
        const currentThreshold = Math.floor(this.currentProgress.percent / this.step);

        // Check if we've crossed a new threshold
        if (currentThreshold > this.lastNotifiedThreshold) {
            this.lastNotifiedThreshold = currentThreshold;
            return true;
        }

        return false;
    }

    /**
     * Reset progress tracker to initial state.
     * Useful when starting a new optimization run.
     *
     * @example
     * tracker.reset();
     */
    reset() {
        this.currentProgress.percent = 0;
        this.currentProgress.evaluations = 0;
        this.lastNotifiedThreshold = -1;
    }

    /**
     * Get current progress information (exact values).
     *
     * @returns {{percent: number, evaluations: number, maxEvaluations: number}}
     *
     * @example
     * const progress = tracker.getProgress();
     * console.log(`${progress.percent}% - ${progress.evaluations}/${progress.maxEvaluations}`);
     */
    getProgress() {
        return { ...this.currentProgress };
    }

    /**
     * Check if optimization is complete (100%).
     *
     * @returns {boolean}
     */
    isComplete() {
        return this.currentProgress.evaluations >= this.maxEvaluations;
    }

    /**
     * Get progress percentage as a rounded value based on step.
     * Useful for display purposes.
     *
     * @returns {number} Progress percentage rounded to step precision
     *
     * @example
     * const tracker = new ProgressTracker(1000, 1);
     * tracker.update(456); // 45.6%
     * tracker.getRoundedPercent(); // Returns 45 (rounded to step=1)
     */
    getRoundedPercent() {
        return Math.floor(this.currentProgress.percent / this.step) * this.step;
    }
}
