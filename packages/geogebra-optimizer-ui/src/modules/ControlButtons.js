import { BaseModule } from '../BaseModule.js';

/**
 * Optimization control buttons component.
 * Provides Start and Stop buttons for optimization control.
 *
 * @class
 * @extends BaseModule
 *
 * @fires ControlButtons#start-optimization - When start button clicked
 * @fires ControlButtons#stop-optimization - When stop button clicked
 *
 * @example
 * // HTML usage
 * <control-buttons></control-buttons>
 *
 * @example
 * // JavaScript usage
 * const controls = document.createElement('control-buttons');
 * controls.addEventListener('start-optimization', () => {
 *   optimizer.optimize({ ... });
 * });
 * controls.setRunning(true); // Disable start, enable stop
 */
export class ControlButtons extends BaseModule {
    constructor() {
        super();

        this.state = {
            running: false,
            ready: false,
            status: ''
        };
    }

    /**
     * Set ready state (enable/disable start button).
     *
     * @param {boolean} ready - Ready state
     * @example
     * controls.setReady(true);
     */
    setReady(ready) {
        this.setState({ ready });
    }

    /**
     * Set running state (toggle start/stop buttons).
     *
     * @param {boolean} running - Running state
     * @example
     * controls.setRunning(true); // Shows stop button
     * controls.setRunning(false); // Shows start button
     */
    setRunning(running) {
        this.setState({ running });
    }

    /**
     * Set status message.
     *
     * @param {string} status - Status message
     * @param {string} [type='info'] - Status type (info, success, error, warning)
     * @example
     * controls.setStatus('Optimization complete!', 'success');
     */
    setStatus(status, type = 'info') {
        this.setState({ status, statusType: type });
    }

    /**
     * Renders the control buttons.
     */
    render() {
        const t = this.t.bind(this);
        const { running, ready, status, statusType } = this.state;

        this.innerHTML = `
            <div class="control-buttons">
                <div class="control-buttons__actions">
                    <button
                        class="control-buttons__start"
                        ${!ready || running ? 'disabled' : ''}
                    >
                        ${t('controlButtons.start')}
                    </button>
                    <button
                        class="control-buttons__stop"
                        ${!running ? 'disabled' : ''}
                    >
                        ${t('controlButtons.stop')}
                    </button>
                </div>
                ${status ? `
                    <div class="control-buttons__status control-buttons__status--${statusType}">
                        ${status}
                    </div>
                ` : ''}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners to buttons.
     * @private
     */
    attachEventListeners() {
        const startBtn = this.$('.control-buttons__start');
        const stopBtn = this.$('.control-buttons__stop');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.emit('start-optimization');
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.emit('stop-optimization');
            });
        }
    }
}

// Register custom element
customElements.define('control-buttons', ControlButtons);
