/**
 * GeoGebra Optimizer UI
 * Web Components-based UI framework for geogebra-optimizer
 *
 * @module geogebra-optimizer-ui
 */

// Main classes
export { GeoGebraOptimizerUI } from './src/GeoGebraOptimizerUI.js';
export { LayoutManager } from './src/LayoutManager.js';
export { BaseModule } from './src/BaseModule.js';

// UI Modules/Components
export { GeoGebraFrame } from './src/modules/GeoGebraFrame.js';
export { VariablePanel } from './src/modules/VariablePanel.js';
export { VariableRow } from './src/modules/VariableRow.js';
export { ControlButtons } from './src/modules/ControlButtons.js';
export { SolverParams } from './src/modules/SolverParams.js';
export { MetricsPanel } from './src/modules/MetricsPanel.js';
export { LogsPanel } from './src/modules/LogsPanel.js';
export { SnapshotHistory } from './src/modules/SnapshotHistory.js';
export { SnapshotRow } from './src/modules/SnapshotRow.js';
export { ExportPanel } from './src/modules/ExportPanel.js';

// Data Layer
export { SnapshotManager } from './src/SnapshotManager.js';

/**
 * Load localization file for a given locale.
 *
 * @param {string} locale - Locale code (e.g., 'en', 'fr')
 * @returns {Promise<Object>} Translations object
 * @example
 * import { loadLocale } from 'geogebra-optimizer-ui';
 * const translations = await loadLocale('fr');
 */
export async function loadLocale(locale) {
    const response = await fetch(`./locales/${locale}.json`);
    return await response.json();
}

/**
 * Create a localization function from a translations object.
 *
 * @param {Object} translations - Translations object
 * @returns {Function} Localization function
 * @example
 * import { createLocalizeFunction } from 'geogebra-optimizer-ui';
 * const translations = { variablePanel: { title: 'Variables' } };
 * const t = createLocalizeFunction(translations);
 * console.log(t('variablePanel.title')); // 'Variables'
 */
export function createLocalizeFunction(translations) {
    return function localize(key) {
        const keys = key.split('.');
        let value = translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }

        return typeof value === 'string' ? value : key;
    };
}
