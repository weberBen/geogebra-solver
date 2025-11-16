import { BaseModule } from '../BaseModule.js';
import { SnapshotManager } from '../SnapshotManager.js';
import { SnapshotRow } from './SnapshotRow.js';

/**
 * Snapshot history panel component.
 * Displays optimization history with before/after snapshots and restore functionality.
 *
 * @class
 * @extends BaseModule
 *
 * @fires SnapshotHistory#restore-snapshot - When user clicks restore button
 *
 * @example
 * const history = document.createElement('snapshot-history');
 * history.addEventListener('restore-snapshot', (e) => {
 *   console.log('Restore:', e.detail.snapshot);
 * });
 */
export class SnapshotHistory extends BaseModule {
    constructor() {
        super();

        this.state = {
            visible: true
        };

        this.manager = new SnapshotManager({ maxSnapshots: 50 });
        this.rowRenderer = SnapshotRow;

        // Listen to manager events
        this.manager.on('snapshot:created', () => this.render());
        this.manager.on('snapshot:deleted', () => this.render());
        this.manager.on('snapshots:cleared', () => this.render());
    }

    /**
     * Capture a "before" snapshot at optimization start.
     *
     * @param {Object} sliderValues - Current slider values
     * @param {string[]} selectedSliders - Sliders being optimized
     */
    captureBeforeSnapshot(sliderValues, selectedSliders) {
        this.manager.startOptimization();
        this.manager.createSnapshot({
            type: 'before-optimization',
            sliderValues,
            selectedSliders
        });
    }

    /**
     * Capture an "after" snapshot at optimization end.
     *
     * @param {Object} sliderValues - Final slider values
     * @param {Object} metrics - Optimization metrics
     * @param {string} status - 'complete' | 'stopped'
     */
    captureAfterSnapshot(sliderValues, metrics, status) {
        const selectedSliders = this.getLastSelectedSliders();

        this.manager.createSnapshot({
            type: status === 'complete'
                ? 'after-optimization-complete'
                : 'after-optimization-stopped',
            sliderValues,
            selectedSliders,
            metrics
        });
    }

    /**
     * Get selected sliders from the last "before" snapshot.
     *
     * @private
     * @returns {string[]} Array of slider names
     */
    getLastSelectedSliders() {
        const snapshots = this.manager.getSnapshots();
        const lastBefore = snapshots.find(s => s.type === 'before-optimization');
        return lastBefore ? lastBefore.selectedSliders : [];
    }

    /**
     * Toggle visibility of the module.
     */
    toggle() {
        this.setState({ visible: !this.state.visible });
    }

    /**
     * Clear all snapshots with confirmation.
     */
    clearAll() {
        const t = this.t.bind(this);
        if (confirm(t('snapshotHistory.confirmClear'))) {
            this.manager.clearAll();
        }
    }

    /**
     * Restore a snapshot.
     *
     * @param {string} snapshotId - ID of snapshot to restore
     */
    restoreSnapshot(snapshotId) {
        const result = this.manager.getSnapshotById(snapshotId);
        if (!result) return;

        const { snapshot, index } = result;

        // Get previous snapshot (index + 1 because array is newest first)
        const allSnapshots = this.manager.getSnapshots();
        const previousSnapshot = index < allSnapshots.length - 1
            ? allSnapshots[index + 1]
            : null;

        // Calculate deltas relative to previous snapshot
        const deltas = {};
        Object.keys(snapshot.sliderValues).forEach(sliderName => {
            const currentValue = snapshot.sliderValues[sliderName];
            const previousValue = previousSnapshot
                ? (previousSnapshot.sliderValues[sliderName] || 0)
                : currentValue;  // If first snapshot, delta = 0
            deltas[sliderName] = currentValue - previousValue;
        });

        // Emit event for parent to handle
        this.emit('restore-snapshot', {
            snapshot,
            sliderValues: snapshot.sliderValues,
            deltas
        });
    }

    /**
     * Get grouped snapshots (before/after pairs).
     *
     * @private
     * @returns {Array} Array of snapshot groups
     */
    getGroupedSnapshots() {
        return this.manager.getGroupedSnapshots();
    }

    /**
     * Render the module.
     */
    render() {
        const t = this.t.bind(this);
        const { visible } = this.state;
        const snapshots = this.manager.getSnapshots();

        if (!visible) {
            this.innerHTML = `
                <div class="snapshot-history snapshot-history--collapsed">
                    <button class="snapshot-history__toggle">
                        ${t('snapshotHistory.toggle')}
                    </button>
                </div>
            `;
            this.attachToggleListener();
            return;
        }

        this.innerHTML = `
            <div class="snapshot-history">
                <div class="snapshot-history__header">
                    <h2 class="snapshot-history__title">${t('snapshotHistory.title')}</h2>
                    <div class="snapshot-history__actions">
                        <button class="snapshot-history__toggle">
                            ${t('snapshotHistory.toggle')}
                        </button>
                        <button class="snapshot-history__clear" ${snapshots.length === 0 ? 'disabled' : ''}>
                            ${t('snapshotHistory.clearAll')}
                        </button>
                    </div>
                </div>
                <div class="snapshot-history__content">
                    ${this.renderTable()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render the snapshot table.
     *
     * @private
     * @returns {string} HTML for the table
     */
    renderTable() {
        const t = this.t.bind(this);
        const snapshots = this.manager.getSnapshots();

        if (snapshots.length === 0) {
            return `
                <div class="snapshot-history__empty">
                    ${t('snapshotHistory.noSnapshots')}
                </div>
            `;
        }

        return `
            <table class="snapshot-history__table">
                <thead>
                    <tr>
                        <th>${t('snapshotHistory.columnTime')}</th>
                        <th>${t('snapshotHistory.columnType')}</th>
                        <th>${t('snapshotHistory.columnSliders')}</th>
                        <th>${t('snapshotHistory.columnMetrics')}</th>
                        <th>${t('snapshotHistory.columnActions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.renderSnapshots()}
                </tbody>
            </table>
        `;
    }

    /**
     * Render all snapshots as table rows.
     *
     * @private
     * @returns {string} HTML for snapshot rows
     */
    renderSnapshots() {
        const t = this.t.bind(this);
        const snapshots = this.manager.getSnapshots();

        return snapshots.map(snapshot => {
            const isAfter = snapshot.type !== 'before-optimization';
            return this.rowRenderer.render(snapshot, isAfter, t);
        }).join('');
    }

    /**
     * Attach toggle listener only.
     *
     * @private
     */
    attachToggleListener() {
        const toggleBtn = this.$('.snapshot-history__toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }

    /**
     * Attach all event listeners.
     *
     * @private
     */
    attachEventListeners() {
        // Toggle button
        this.attachToggleListener();

        // Clear all button
        const clearBtn = this.$('.snapshot-history__clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        // Restore buttons
        this.$$('.snapshot-history__restore').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const snapshotId = e.target.dataset.snapshotId;
                this.restoreSnapshot(snapshotId);
            });
        });
    }

    /**
     * Get the snapshot manager instance.
     *
     * @returns {SnapshotManager} The manager
     */
    getManager() {
        return this.manager;
    }
}

// Register custom element
customElements.define('snapshot-history', SnapshotHistory);
