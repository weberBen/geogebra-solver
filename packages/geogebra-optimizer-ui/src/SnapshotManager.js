import { EventBus } from '../../geogebra-optimizer/src/EventBus.js';

/**
 * Manages snapshot storage and operations.
 * Tracks variable values before/after optimization runs with circular buffer.
 *
 * @class
 * @extends EventBus
 *
 * @fires SnapshotManager#snapshot:created
 * @fires SnapshotManager#snapshot:deleted
 * @fires SnapshotManager#snapshots:cleared
 *
 * @example
 * const manager = new SnapshotManager({ maxSnapshots: 50 });
 * manager.on('snapshot:created', ({ snapshot }) => {
 *   console.log('New snapshot:', snapshot.id);
 * });
 */
export class SnapshotManager extends EventBus {
    /**
     * Create a new SnapshotManager.
     *
     * @param {Object} options - Configuration options
     * @param {number} [options.maxSnapshots=50] - Maximum snapshots to keep
     */
    constructor(options = {}) {
        super();

        this.snapshots = [];
        this.currentOptimizationId = null;
        this.maxSnapshots = options.maxSnapshots || 50;
    }

    /**
     * Generate a unique optimization ID.
     * Used to group before/after snapshot pairs.
     *
     * @private
     * @returns {string} Unique ID
     */
    generateOptimizationId() {
        return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start a new optimization session.
     * Generates new optimization ID for grouping snapshots.
     *
     * @returns {string} The new optimization ID
     */
    startOptimization() {
        this.currentOptimizationId = this.generateOptimizationId();
        return this.currentOptimizationId;
    }

    /**
     * Create a new snapshot.
     *
     * @param {Object} params - Snapshot parameters
     * @param {string} params.type - Snapshot type: 'before-optimization' | 'after-optimization-complete' | 'after-optimization-stopped'
     * @param {Object} params.variableValues - Object mapping variable names to values
     * @param {string[]} params.selectedVariables - Array of variable names being optimized
     * @param {Object} [params.metrics] - Optimization metrics (optional)
     * @returns {Object} The created snapshot
     *
     * @example
     * manager.createSnapshot({
     *   type: 'before-optimization',
     *   variableValues: { AB: 5.2, BC: 3.1 },
     *   selectedVariables: ['AB', 'BC']
     * });
     */
    createSnapshot({ type, variableValues, selectedVariables, metrics = {} }) {
        // Check if an "after" snapshot already exists for this optimization
        const isAfterSnapshot = type !== 'before-optimization';
        if (isAfterSnapshot && this.currentOptimizationId) {
            const existingAfterIndex = this.snapshots.findIndex(
                s => s.optimizationId === this.currentOptimizationId && s.type !== 'before-optimization'
            );

            // If an "after" snapshot exists, replace it
            // (This handles the case where both 'complete' and 'stopped' events fire)
            if (existingAfterIndex !== -1) {
                this.snapshots.splice(existingAfterIndex, 1);
            }
        }

        const snapshot = {
            id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            type,
            optimizationId: this.currentOptimizationId,
            variableValues: { ...variableValues },
            selectedVariables: [...selectedVariables ],
            metrics: { ...metrics }
        };

        // Add to beginning of array (newest first)
        this.snapshots.unshift(snapshot);

        // Enforce max limit (circular buffer)
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots = this.snapshots.slice(0, this.maxSnapshots);
        }

        this.emit('snapshot:created', { snapshot });

        return snapshot;
    }

    /**
     * Get all snapshots.
     *
     * @returns {Array<Object>} Array of all snapshots
     */
    getSnapshots() {
        return [...this.snapshots];
    }

    /**
     * Get a specific snapshot by ID.
     *
     * @param {string} id - Snapshot ID
     * @returns {{snapshot: Object, index: number}|null} Object with snapshot and its index, or null if not found
     */
    getSnapshotById(id) {
        const index = this.snapshots.findIndex(s => s.id === id);
        if (index === -1) return null;

        return {
            snapshot: this.snapshots[index],
            index
        };
    }

    /**
     * Get snapshots grouped by optimization ID.
     * Returns array of { optimizationId, before, after } objects.
     *
     * @returns {Array<Object>} Grouped snapshots
     */
    getGroupedSnapshots() {
        const groups = {};

        this.snapshots.forEach(snapshot => {
            const optId = snapshot.optimizationId;
            if (!groups[optId]) {
                groups[optId] = {
                    optimizationId: optId,
                    before: null,
                    after: null
                };
            }

            if (snapshot.type === 'before-optimization') {
                groups[optId].before = snapshot;
            } else {
                groups[optId].after = snapshot;
            }
        });

        return Object.values(groups);
    }

    /**
     * Delete a specific snapshot.
     *
     * @param {string} id - Snapshot ID to delete
     * @returns {boolean} True if deleted, false if not found
     */
    deleteSnapshot(id) {
        const index = this.snapshots.findIndex(s => s.id === id);
        if (index === -1) return false;

        const deleted = this.snapshots.splice(index, 1)[0];
        this.emit('snapshot:deleted', { snapshot: deleted });

        return true;
    }

    /**
     * Clear all snapshots.
     */
    clearAll() {
        const count = this.snapshots.length;
        this.snapshots = [];
        this.currentOptimizationId = null;
        this.emit('snapshots:cleared', { count });
    }

    /**
     * Get the current optimization ID.
     *
     * @returns {string|null} Current optimization ID or null
     */
    getCurrentOptimizationId() {
        return this.currentOptimizationId;
    }

    /**
     * Get snapshot count.
     *
     * @returns {number} Total number of snapshots
     */
    getCount() {
        return this.snapshots.length;
    }
}
