/**
 * Snapshot row renderer.
 * Factory class with static methods for rendering snapshot table rows.
 *
 * @class
 *
 * @example
 * const html = SnapshotRow.render(snapshot, true, t);
 */
export class SnapshotRow {
    /**
     * Render a complete snapshot row.
     *
     * @param {Object} snapshot - Snapshot data
     * @param {boolean} isAfter - Whether this is an "after" snapshot (for indentation)
     * @param {Function} t - Translation function
     * @returns {string} HTML string for the row
     */
    static render(snapshot, isAfter, t) {
        const rowClass = this.getRowClass(snapshot, isAfter);
        const pairId = snapshot.optimizationId;

        return `
            <tr class="${rowClass}" data-snapshot-id="${snapshot.id}" data-pair-id="${pairId}">
                ${this.renderTime(snapshot, t)}
                ${this.renderType(snapshot, isAfter, t)}
                ${this.renderVariables(snapshot, t)}
                ${this.renderMetrics(snapshot, t)}
                ${this.renderActions(snapshot, t)}
            </tr>
        `;
    }

    /**
     * Get CSS classes for the row based on snapshot type.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {boolean} isAfter - Whether this is an after snapshot
     * @returns {string} CSS class string
     */
    static getRowClass(snapshot, isAfter) {
        const classes = ['snapshot-history__row'];

        if (isAfter) {
            classes.push('snapshot-history__row--after');

            if (snapshot.type === 'after-optimization-complete') {
                classes.push('snapshot-history__row--complete');
            } else if (snapshot.type === 'after-optimization-stopped') {
                classes.push('snapshot-history__row--stopped');
            }
        } else {
            classes.push('snapshot-history__row--before');
        }

        classes.push('snapshot-history__row--pair');

        return classes.join(' ');
    }

    /**
     * Render the time cell.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {Function} t - Translation function
     * @returns {string} HTML for time cell
     */
    static renderTime(snapshot, t) {
        const time = new Date(snapshot.timestamp).toLocaleTimeString();
        return `<td class="snapshot-history__time">${time}</td>`;
    }

    /**
     * Render the type cell with icon.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {boolean} isAfter - Whether this is an after snapshot
     * @param {Function} t - Translation function
     * @returns {string} HTML for type cell
     */
    static renderType(snapshot, isAfter, t) {
        let icon = '';
        let label = '';

        if (snapshot.type === 'before-optimization') {
            icon = '<span class="snapshot-history__icon">▼</span>';
            label = t('snapshotHistory.typeBefore');
        } else if (snapshot.type === 'after-optimization-complete') {
            icon = '<span class="snapshot-history__icon snapshot-history__icon--complete">✓</span>';
            label = t('snapshotHistory.typeAfterComplete');
        } else if (snapshot.type === 'after-optimization-stopped') {
            icon = '<span class="snapshot-history__icon snapshot-history__icon--stopped">⊗</span>';
            label = t('snapshotHistory.typeAfterStopped');
        }

        const indent = isAfter ? '  ' : '';

        return `
            <td class="snapshot-history__type">
                ${icon}${indent}${label}
            </td>
        `;
    }

    /**
     * Render the variable values cell.
     * Shows up to 3 variables, then "..." if more.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {Function} t - Translation function
     * @param {number} [maxDisplay=3] - Maximum variables to display
     * @returns {string} HTML for variables cell
     */
    static renderVariables(snapshot, t, maxDisplay = 3) {
        const { variableValues, selectedVariables } = snapshot;
        const entries = Object.entries(variableValues);

        // Show only selected variables if available
        const relevantVariables = selectedVariables && selectedVariables.length > 0
            ? entries.filter(([name]) => selectedVariables.includes(name))
            : entries;

        const displayed = relevantVariables.slice(0, maxDisplay);
        const remaining = relevantVariables.length - maxDisplay;

        const variableText = displayed
            .map(([name, value]) => `${name}:${value.toFixed(2)}`)
            .join(', ');

        const moreText = remaining > 0 ? `, +${remaining}...` : '';

        return `
            <td class="snapshot-history__variables" title="${this.getFullVariableText(variableValues)}">
                ${variableText}${moreText}
            </td>
        `;
    }

    /**
     * Get full variable text for tooltip.
     *
     * @protected
     * @param {Object} variableValues - Variable values object
     * @returns {string} Full variable text
     */
    static getFullVariableText(variableValues) {
        return Object.entries(variableValues)
            .map(([name, value]) => `${name}: ${value.toFixed(3)}`)
            .join(', ');
    }

    /**
     * Render the metrics cell.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {Function} t - Translation function
     * @returns {string} HTML for metrics cell
     */
    static renderMetrics(snapshot, t) {
        const { metrics, type } = snapshot;

        // Before snapshots don't have metrics
        if (type === 'before-optimization') {
            return `<td class="snapshot-history__metrics">-</td>`;
        }

        // Format metrics if available
        if (metrics && metrics.bestDistance !== undefined) {
            const distance = `d:${metrics.bestDistance.toFixed(4)}`;
            const gen = metrics.generation !== undefined ? ` g:${metrics.generation}` : '';
            return `<td class="snapshot-history__metrics">${distance}${gen}</td>`;
        }

        return `<td class="snapshot-history__metrics">-</td>`;
    }

    /**
     * Render the actions cell with restore button.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {Function} t - Translation function
     * @returns {string} HTML for actions cell
     */
    static renderActions(snapshot, t) {
        return `
            <td class="snapshot-history__actions">
                <button class="snapshot-history__restore" data-snapshot-id="${snapshot.id}">
                    ${t('snapshotHistory.restore')}
                </button>
            </td>
        `;
    }
}
