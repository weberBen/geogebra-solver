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
                ${this.renderSliders(snapshot, t)}
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
     * Render the slider values cell.
     * Shows up to 3 sliders, then "..." if more.
     *
     * @protected
     * @param {Object} snapshot - Snapshot data
     * @param {Function} t - Translation function
     * @param {number} [maxDisplay=3] - Maximum sliders to display
     * @returns {string} HTML for sliders cell
     */
    static renderSliders(snapshot, t, maxDisplay = 3) {
        const { sliderValues, selectedSliders } = snapshot;
        const entries = Object.entries(sliderValues);

        // Show only selected sliders if available
        const relevantSliders = selectedSliders && selectedSliders.length > 0
            ? entries.filter(([name]) => selectedSliders.includes(name))
            : entries;

        const displayed = relevantSliders.slice(0, maxDisplay);
        const remaining = relevantSliders.length - maxDisplay;

        const sliderText = displayed
            .map(([name, value]) => `${name}:${value.toFixed(2)}`)
            .join(', ');

        const moreText = remaining > 0 ? `, +${remaining}...` : '';

        return `
            <td class="snapshot-history__sliders" title="${this.getFullSliderText(sliderValues)}">
                ${sliderText}${moreText}
            </td>
        `;
    }

    /**
     * Get full slider text for tooltip.
     *
     * @protected
     * @param {Object} sliderValues - Slider values object
     * @returns {string} Full slider text
     */
    static getFullSliderText(sliderValues) {
        return Object.entries(sliderValues)
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
