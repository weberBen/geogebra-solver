import { BaseModule } from '../BaseModule.js';

/**
 * Progress bar component for optimization tracking.
 * Displays a visual progress bar with percentage and evaluation counts.
 *
 * @class
 * @extends BaseModule
 *
 * @example
 * const progressBar = document.createElement('progress-bar');
 * progressBar.initProps({ localize: t });
 * progressBar.setProgress(45.5, 455, 1000);
 * document.body.appendChild(progressBar);
 */
export class ProgressBar extends BaseModule {
    constructor() {
        super();

        this.state = {
            percent: 0,
            evaluations: 0,
            maxEvaluations: 0,
            isActive: false
        };
    }

    /**
     * Set progress values.
     *
     * @param {number} percent - Progress percentage (0-100)
     * @param {number} evaluations - Current evaluations count
     * @param {number} maxEvaluations - Maximum evaluations count
     */
    setProgress(percent, evaluations, maxEvaluations) {
        this.setState({
            percent: Math.min(100, Math.max(0, percent)),
            evaluations,
            maxEvaluations,
            isActive: true
        });
    }

    /**
     * Reset progress bar to initial state.
     */
    reset() {
        this.setState({
            percent: 0,
            evaluations: 0,
            maxEvaluations: 0,
            isActive: false
        });
    }

    /**
     * Render the progress bar.
     */
    render() {
        const t = this.t.bind(this);
        const { percent, evaluations, maxEvaluations, isActive } = this.state;

        const percentFormatted = percent.toFixed(1);
        const fillWidth = Math.min(100, Math.max(0, percent));

        this.innerHTML = `
            <div class="progress-bar ${isActive ? 'progress-bar--active' : ''}">
                <div class="progress-bar__header">
                    <span class="progress-bar__label">${t('progressBar.optimization')}</span>
                    <span class="progress-bar__percent">${percentFormatted}%</span>
                </div>
                <div class="progress-bar__track">
                    <div class="progress-bar__fill" style="width: ${fillWidth}%">
                        <div class="progress-bar__shine"></div>
                    </div>
                </div>
                <div class="progress-bar__footer">
                    <span class="progress-bar__count">
                        ${evaluations} / ${maxEvaluations} ${t('progressBar.evaluations')}
                    </span>
                </div>
            </div>

            <style>
                .progress-bar {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    padding: 1rem;
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    opacity: 0.5;
                    transition: opacity 0.3s ease;
                }

                .progress-bar--active {
                    opacity: 1;
                }

                .progress-bar__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .progress-bar__label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #333;
                }

                .progress-bar__percent {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #1976d2;
                }

                .progress-bar__track {
                    position: relative;
                    height: 24px;
                    background: #f5f5f5;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .progress-bar__fill {
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    background: linear-gradient(90deg, #1976d2 0%, #42a5f5 100%);
                    border-radius: 12px;
                    transition: width 0.3s ease;
                    overflow: hidden;
                }

                .progress-bar__shine {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.3) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    animation: progress-shine 2s ease-in-out infinite;
                }

                @keyframes progress-shine {
                    0% {
                        left: -100%;
                    }
                    50%, 100% {
                        left: 200%;
                    }
                }

                .progress-bar__footer {
                    display: flex;
                    justify-content: center;
                    margin-top: 0.5rem;
                }

                .progress-bar__count {
                    font-size: 0.75rem;
                    color: #666;
                    font-variant-numeric: tabular-nums;
                }
            </style>
        `;
    }
}

customElements.define('progress-bar', ProgressBar);
