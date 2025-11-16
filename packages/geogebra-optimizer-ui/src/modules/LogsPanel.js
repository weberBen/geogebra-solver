import { BaseModule } from '../BaseModule.js';

/**
 * Logs display component.
 * Shows log messages from the optimization process.
 *
 * @class
 * @extends BaseModule
 *
 * @example
 * // HTML usage
 * <logs-panel></logs-panel>
 *
 * @example
 * // JavaScript usage
 * const logs = document.createElement('logs-panel');
 * logs.addEntry('Optimization started', 'info');
 * logs.addEntry('Error occurred', 'error');
 * logs.clear();
 */
export class LogsPanel extends BaseModule {
    constructor() {
        super();

        this.state = {
            logs: [],
            maxLogs: 100,
            autoScroll: true
        };
    }

    /**
     * Add a log entry.
     *
     * @param {string} message - Log message
     * @param {string} [level='info'] - Log level (info, warning, error, best)
     * @example
     * logsPanel.addEntry('Optimization complete', 'best');
     * logsPanel.addEntry('Warning: slow convergence', 'warning');
     */
    addEntry(message, level = 'info') {
        const entry = {
            message,
            level,
            timestamp: new Date()
        };

        const logs = [...this.state.logs, entry];

        // Keep only last N logs
        if (logs.length > this.state.maxLogs) {
            logs.shift();
        }

        this.setState({ logs });

        // Auto-scroll to bottom if enabled
        if (this.state.autoScroll) {
            setTimeout(() => {
                const container = this.$('.logs-panel__list');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 0);
        }
    }

    /**
     * Clear all log entries.
     * @example
     * logsPanel.clear();
     */
    clear() {
        this.setState({ logs: [] });
    }

    /**
     * Set maximum number of log entries to keep.
     *
     * @param {number} maxLogs - Maximum log entries
     * @example
     * logsPanel.setMaxLogs(200);
     */
    setMaxLogs(maxLogs) {
        this.setState({ maxLogs });
    }

    /**
     * Set auto-scroll behavior.
     *
     * @param {boolean} autoScroll - Enable/disable auto-scroll
     * @example
     * logsPanel.setAutoScroll(false);
     */
    setAutoScroll(autoScroll) {
        this.setState({ autoScroll });
    }

    /**
     * Renders the logs panel.
     */
    render() {
        const t = this.t.bind(this);
        const { logs } = this.state;

        const formatTime = (date) => {
            return date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };

        this.innerHTML = `
            <div class="logs-panel">
                <div class="logs-panel__header">
                    <h3 class="logs-panel__title">${t('logsPanel.title')}</h3>
                    <button class="logs-panel__clear">
                        ${t('logsPanel.clear')}
                    </button>
                </div>
                <div class="logs-panel__content">
                    <div class="logs-panel__list">
                        ${logs.length === 0 ? `
                            <div class="logs-panel__empty">${t('logsPanel.noLogs')}</div>
                        ` : logs.map(log => `
                            <div class="logs-panel__entry logs-panel__entry--${log.level}">
                                <span class="logs-panel__timestamp">${formatTime(log.timestamp)}</span>
                                <span class="logs-panel__level">[${t(`logsPanel.${log.level}`)}]</span>
                                <span class="logs-panel__message">${log.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners.
     * @private
     */
    attachEventListeners() {
        const clearBtn = this.$('.logs-panel__clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clear();
            });
        }
    }
}

// Register custom element
customElements.define('logs-panel', LogsPanel);
