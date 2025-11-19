import { LayoutManager } from './LayoutManager.js';
import { GeoGebraFrame } from './modules/GeoGebraFrame.js';
import { VariablePanel } from './modules/VariablePanel.js';
import { ControlButtons } from './modules/ControlButtons.js';
import { SolverParams } from './modules/SolverParams.js';
import { MetricsPanel } from './modules/MetricsPanel.js';
import { ConstraintsPanel } from './modules/ConstraintsPanel.js';
import { GeoGebraEvaluator } from './modules/GeoGebraEvaluator.js';
import { LogsPanel } from './modules/LogsPanel.js';
import { SnapshotHistory } from './modules/SnapshotHistory.js';
import { ExportPanel } from './modules/ExportPanel.js';
import { ProgressBar } from './modules/ProgressBar.js';
import { ExportManager } from '../../geogebra-optimizer/src/ExportManager.js';

/**
 * @typedef {Object} UIConfig
 * @property {HTMLElement} container - Container element for the UI
 * @property {Object} optimizer - GeoGebraOptimizer instance
 * @property {string} [locale='en'] - Locale code (en, fr, etc.)
 * @property {Function} [localize] - Custom localization function
 * @property {Object} [layout] - Layout configuration
 * @property {Array} [modules] - Module configuration override
 * @property {Object} [variablePanelProps] - VariablePanel configuration
 * @property {Object} [solverParamsProps] - SolverParams configuration
 * @property {Object} [exportPanelProps] - ExportPanel configuration
 * @property {Object} [defaultParams] - DEPRECATED: Use solverParamsProps instead
 * @property {Object} [webhookConfig] - DEPRECATED: Use exportPanelProps.webhookConfig instead
 */

/**
 * Main UI orchestrator for GeoGebra Optimizer.
 * Manages layout, modules, localization, and connects everything to the optimizer.
 *
 * @class
 *
 * @example
 * import { GeoGebraOptimizer } from 'geogebra-optimizer';
 * import { GeoGebraOptimizerUI } from 'geogebra-optimizer-ui';
 *
 * const optimizer = new GeoGebraOptimizer();
 * const ui = new GeoGebraOptimizerUI({
 *   container: document.getElementById('app'),
 *   optimizer,
 *   locale: 'fr',
 *   webhookConfig: {
 *     allowedInputFormats: ['svg', 'png'],
 *     params: { outputFormat: 'dxf', tolerance: '0.01mm' },
 *     paramLabels: {
 *       outputFormat: { label: 'Format', description: 'Output format' },
 *       tolerance: { label: 'Tolerance', description: 'Conversion precision' }
 *     },
 *     description: 'Custom Export',
 *     warning: 'Warning message here'
 *   }
 * });
 *
 * await ui.init({
 *   geogebraXML: xmlContent,
 *   pythonFiles: { optimizer: code1, fitness: code2 }
 * });
 */
export class GeoGebraOptimizerUI {
    /**
     * Create a new GeoGebraOptimizerUI instance.
     *
     * @param {UIConfig} config - UI configuration
     */
    constructor(config) {
        const {
            container,
            optimizer,
            locale = 'en',
            localize = null,
            layout = {},
            modules = null,
            defaultParams = {},
            webhookConfig = null,
            variablePanelProps = {},
            solverParamsProps = {},
            exportPanelProps = {}
        } = config;

        this.container = container;
        this.optimizer = optimizer;
        this.locale = locale;
        this.translations = null;

        // Backward compatibility: Migrate old defaultParams to new module props
        const migratedSolverProps = {
            ...(defaultParams && Object.keys(defaultParams).length > 0 && {
                defaults: {
                    ...(defaultParams.maxiter !== undefined && { maxiter: defaultParams.maxiter }),
                    ...(defaultParams.popsize !== undefined && { popsize: defaultParams.popsize }),
                    ...(defaultParams.sigma !== undefined && { sigma: defaultParams.sigma }),
                    ...(defaultParams.tolfun !== undefined && { tolfun: defaultParams.tolfun })
                }
            }),
            ...solverParamsProps
        };

        const migratedExportProps = {
            ...(webhookConfig && { webhookConfig }),
            ...exportPanelProps
        };

        // Store module-specific props
        this.variablePanelProps = variablePanelProps;
        this.solverParamsProps = migratedSolverProps;
        this.exportPanelProps = migratedExportProps;

        // Set up localization
        this.localize = localize || this.createLocalizeFunction.bind(this);

        // Create layout manager
        this.layoutManager = new LayoutManager({
            gridTemplateRows: layout.gridTemplateRows || 'auto 1fr auto',
            gridTemplateColumns: layout.gridTemplateColumns || '2fr 1fr',
            gap: layout.gap || '1rem',
            ...layout
        });

        // Set up modules (default or custom)
        if (modules) {
            this.layoutManager.setModules(modules);
        } else {
            this.setupDefaultModules();
        }
    }

    /**
     * Load translations for a given locale.
     *
     * @private
     * @param {string} locale - Locale code
     * @returns {Promise<Object>} Translations object
     */
    async loadTranslations(locale) {
        try {
            // Load from package locales
            const response = await fetch(`/packages/geogebra-optimizer-ui/locales/${locale}.json`);
            return await response.json();
        } catch (error) {
            console.warn(`Failed to load translations for locale ${locale}, using fallback`);
            return {};
        }
    }

    /**
     * Create localization function from loaded translations.
     *
     * @private
     * @param {string} key - Translation key (e.g., 'variablePanel.title')
     * @returns {string} Translated string
     */
    createLocalizeFunction(key) {
        if (!this.translations) {
            return key;
        }

        // Navigate nested object with dot notation
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Key not found, return original
            }
        }

        return typeof value === 'string' ? value : key;
    }

    /**
     * Set up default module layout.
     *
     * @private
     */
    setupDefaultModules() {
        const localize = this.localize;

        this.layoutManager.setModules([
            // Colonne 1 (gauche)
            {
                name: 'viewer',
                component: GeoGebraFrame,
                row: 1,
                col: 1,
                rowSpan: 3,
                props: { localize }
            },
            {
                name: 'controls',
                component: ControlButtons,
                row: 4,
                col: 1,
                props: { localize }
            },
            {
                name: 'progress',
                component: ProgressBar,
                row: 5,
                col: 1,
                props: { localize }
            },
            {
                name: 'evaluator',
                component: GeoGebraEvaluator,
                row: 6,
                col: 1,
                rowSpan: 2,
                props: { localize }
            },
            {
                name: 'snapshot',
                component: SnapshotHistory,
                row: 8,
                col: 1,
                props: { localize }
            },
            // Colonne 2 (droite)
            {
                name: 'variables',
                component: VariablePanel,
                row: 1,
                col: 2,
                props: {
                    localize,
                    ...this.variablePanelProps
                }
            },
            {
                name: 'constraints',
                component: ConstraintsPanel,
                row: 2,
                col: 2,
                props: { localize }
            },
            {
                name: 'metrics',
                component: MetricsPanel,
                row: 3,
                col: 2,
                rowSpan: 5,
                props: { localize }
            },
            {
                name: 'export',
                component: ExportPanel,
                row: 8,
                col: 2,
                props: {
                    localize,
                    ...this.exportPanelProps
                }
            },
            // Pleine largeur en bas
            {
                name: 'solver',
                component: SolverParams,
                row: 9,
                col: 1,
                colSpan: 2,
                props: {
                    localize,
                    ...this.solverParamsProps
                }
            },
            {
                name: 'logs',
                component: LogsPanel,
                row: 10,
                col: 1,
                colSpan: 2,
                props: { localize }
            }
        ]);
    }

    /**
     * Initialize the UI and optimizer.
     *
     * @async
     * @param {Object} optimizerConfig - Configuration for optimizer.init()
     * @returns {Promise<void>}
     *
     * @example
     * await ui.init({
     *   geogebraXML: xmlContent,
     *   pythonFiles: {
     *     optimizer: optimizerCode,
     *     fitness: fitnessCode
     *   }
     * });
     */
    async init(optimizerConfig) {
        // Load translations
        this.translations = await this.loadTranslations(this.locale);

        // Render layout
        this.layoutManager.render(this.container);

        // Get module references
        this.modules = {
            viewer: this.layoutManager.getModule('viewer'),
            variables: this.layoutManager.getModule('variables'),
            snapshot: this.layoutManager.getModule('snapshot'),
            controls: this.layoutManager.getModule('controls'),
            objective: this.layoutManager.getModule('objective'),
            solver: this.layoutManager.getModule('solver'),
            metrics: this.layoutManager.getModule('metrics'),
            constraints: this.layoutManager.getModule('constraints'),
            evaluator: this.layoutManager.getModule('evaluator'),
            logs: this.layoutManager.getModule('logs'),
            export: this.layoutManager.getModule('export'),
            progress: this.layoutManager.getModule('progress')
        };

        // Set up default webhook config if none provided
        if (this.modules.export && !this.exportPanelProps.webhookConfig) {
            const localize = this.localize;
            const defaultWebhookConfig = {
                allowedInputFormats: ['svg', 'png', 'xml'],
                params: {
                    outputFormat: 'dxf',
                    tolerance: '0.01mm',
                    optimize: true,
                    units: 'mm'
                },
                paramLabels: {
                    outputFormat: {
                        label: localize('webhookDefaults.dxf.outputFormat.label'),
                        description: localize('webhookDefaults.dxf.outputFormat.description')
                    },
                    tolerance: {
                        label: localize('webhookDefaults.dxf.tolerance.label'),
                        description: localize('webhookDefaults.dxf.tolerance.description')
                    },
                    optimize: {
                        label: localize('webhookDefaults.dxf.optimize.label'),
                        description: localize('webhookDefaults.dxf.optimize.description')
                    },
                    units: {
                        label: localize('webhookDefaults.dxf.units.label'),
                        description: localize('webhookDefaults.dxf.units.description')
                    }
                },
                description: localize('webhookDefaults.dxf.description'),
                info: '',
                warning: localize('webhookDefaults.dxf.warning')
            };

            this.modules.export.setWebhookConfig(defaultWebhookConfig);
        }

        // Connect optimizer events to UI
        this.setupOptimizerEvents();

        // Connect UI events to optimizer
        this.setupUIEvents();

        // Initialize optimizer
        const container = this.modules.viewer.getContainer();
        await this.optimizer.init({
            ...optimizerConfig,
            container
        });

        // Update constraints panel with parsed constraints
        const constraints = this.optimizer.getConstraints();
        console.log('[GeoGebraOptimizerUI] Constraints loaded:', constraints);
        if (this.modules.constraints) {
            this.modules.constraints.updateConstraints(constraints);
            const hardCount = constraints.filter(c => c.type === 'hard').length;
            const softCount = constraints.filter(c => c.type === 'soft').length;
            this.modules.logs?.addEntry(
                `Loaded ${constraints.length} constraint(s) (${hardCount} hard, ${softCount} soft)`,
                'info'
            );
        }

        // Set GeoGebra API for evaluator
        if (this.modules.evaluator) {
            this.modules.evaluator.setAPI(this.optimizer.getGeoGebraAPI());
        }

        // Create ExportManager
        this.exportManager = new ExportManager({
            geogebraManager: this.optimizer.geogebraManager,
            webhookUrl: null  // Configurable via UI
        });

        // Set up export event listeners
        this.setupExportEvents();
    }

    /**
     * Set up event listeners from optimizer to UI.
     *
     * @private
     */
    setupOptimizerEvents() {
        // PyOdide loading
        this.optimizer.on('pyodide:loading', () => {
            this.modules.logs?.addEntry('Loading Python (PyOdide)...', 'info');
            this.modules.controls?.setStatus('Loading Python...', 'loading');
        });

        this.optimizer.on('pyodide:ready', () => {
            this.modules.logs?.addEntry('Python ready!', 'info');
            this.modules.controls?.setReady(true);
            this.modules.controls?.setStatus('Ready to optimize', 'success');
        });

        // GeoGebra ready
        this.optimizer.on('geogebra:ready', () => {
            this.modules.logs?.addEntry('GeoGebra loaded', 'info');
            this.modules.viewer?.setLoading(false);
        });

        // Variables loaded
        this.optimizer.on('constraints:loaded', ({ variables }) => {
            this.modules.variables?.initVariables(variables, this.optimizer.getGeoGebraAPI());
            this.modules.logs?.addEntry(`Detected ${variables.length} variables`, 'info');

            // Metrics will be updated on first evaluation
        });

        // Optimization start
        this.optimizer.on('optimization:start', ({ selectedVariables }) => {
            this.modules.controls?.setRunning(true);
            this.modules.controls?.setStatus('Optimizing...', 'running');
            this.modules.logs?.addEntry(
                `Started optimization on ${selectedVariables.length} variables`,
                'info'
            );
            this.modules.variables?.clearDeltas();
            this.modules.progress?.reset();

            // Capture "before" snapshot
            if (this.modules.snapshot) {
                const ggbApi = this.optimizer.getGeoGebraAPI();
                const variableValues = {};
                selectedVariables.forEach(name => {
                    variableValues[name] = ggbApi.getValue(name);
                });
                this.modules.snapshot.captureBeforeSnapshot(variableValues, selectedVariables);
            }
        });

        // Optimization progress
        this.optimizer.on('optimization:progress', ({ generation, evaluations, metrics, constraints }) => {
            this.modules.metrics?.updateMetrics({
                generation,
                evaluations,
                currentObjective: metrics.currentObjective,
                currentMovementPenalty: metrics.currentMovementPenalty,
                currentSoftViolation: metrics.currentSoftViolation,
                bestObjective: metrics.bestObjective,
                bestHardViolation: metrics.bestHardViolation,
                cmaesMetrics: metrics.cmaesMetrics
            });

            // Update constraints panel with live values
            this.modules.constraints?.updateMetrics({
                constraintValues: metrics.currentConstraintValues,
                movementPenalty: metrics.currentMovementPenalty,
                softViolation: metrics.currentSoftViolation,
                cmaesMetrics: metrics.cmaesMetrics
            });
        });

        // Progress bar update (emitted at configurable thresholds)
        this.optimizer.on('optimization:progress-update', ({ percent, evaluations, maxEvaluations, deltas, variableValues }) => {
            this.modules.progress?.setProgress(percent, evaluations, maxEvaluations);
            this.modules.variables?.updateVariableValuesAndDeltas(variableValues, deltas);
        });

        // New best solution
        this.optimizer.on('optimization:newBest', ({ solution, metrics, deltas }) => {
            this.modules.metrics?.updateMetrics({
                bestObjective: metrics.bestObjective,
                bestHardViolation: metrics.bestHardViolation,
                bestMovementPenalty: metrics.bestMovementPenalty,
                bestSoftViolation: metrics.bestSoftViolation,
                generation: metrics.generation,
                evaluations: metrics.evaluations
            });
            this.modules.variables?.updateDeltas(deltas);
            this.modules.logs?.addEntry(
                `New best: objective=${metrics.bestObjective?.toFixed(6)}, hardViolation=${metrics.bestHardViolation?.toFixed(6)}`,
                'best'
            );
        });

        // Optimization complete
        this.optimizer.on('optimization:complete', ({ finalMetrics, deltas }) => {
            this.modules.controls?.setRunning(false);
            this.modules.controls?.setStatus(
                `Complete (${finalMetrics.generation} generations)`,
                'success'
            );
            this.modules.logs?.addEntry(
                `Optimization complete! Objective: ${finalMetrics.bestObjective?.toFixed(6)}, Constraints: ${finalMetrics.bestConstraintsViolation?.toFixed(6)}`,
                'best'
            );

            // Set progress to 100%
            const progress = this.optimizer.getProgress();
            if (progress) {
                this.modules.progress?.setProgress(100, progress.maxEvaluations, progress.maxEvaluations);
            }

            // Update variable values and deltas with best solution
            const ggbApi = this.optimizer.getGeoGebraAPI();
            const selectedVariables = Array.from(this.modules.variables.state.selectedVariables);
            const variableValues = {};
            selectedVariables.forEach(name => {
                variableValues[name] = ggbApi.getValue(name);
            });
            this.modules.variables?.updateVariableValuesAndDeltas(variableValues, deltas);

            // Re-enable variable value inputs
            this.modules.variables?.setOptimizing(false);

            // Capture "after" snapshot (complete)
            if (this.modules.snapshot) {
                this.modules.snapshot.captureAfterSnapshot(variableValues, finalMetrics, 'complete');
            }
        });

        // Optimization stopped
        this.optimizer.on('optimization:stopped', () => {
            this.modules.controls?.setRunning(false);
            this.modules.controls?.setStatus('Stopped', 'warning');
            this.modules.logs?.addEntry('Optimization stopped by user', 'warning');

            // Re-enable variable value inputs
            this.modules.variables?.setOptimizing(false);

            // Capture "after" snapshot (stopped)
            if (this.modules.snapshot) {
                const ggbApi = this.optimizer.getGeoGebraAPI();
                const selectedVariables = Array.from(this.modules.variables.state.selectedVariables);
                const variableValues = {};
                selectedVariables.forEach(name => {
                    variableValues[name] = ggbApi.getValue(name);
                });
                // Get current metrics from metrics panel
                const currentMetrics = {
                    bestDistance: this.modules.metrics.state.bestDistance,
                    generation: this.modules.metrics.state.generation,
                    evaluations: this.modules.metrics.state.evaluations
                };
                this.modules.snapshot.captureAfterSnapshot(variableValues, currentMetrics, 'stopped');
            }
        });

        // Errors
        this.optimizer.on('error', ({ error, context }) => {
            this.modules.controls?.setStatus(`Error: ${error.message}`, 'error');
            this.modules.logs?.addEntry(`ERROR (${context}): ${error.message}`, 'error');
            // Re-enable variable value inputs on error
            this.modules.variables?.setOptimizing(false);
            console.error('Optimizer error:', error);
        });

        // General logs
        this.optimizer.on('log', ({ message, level }) => {
            this.modules.logs?.addEntry(message, level);
        });

        // Export events (will be set up after ExportManager is created)
        // Note: ExportManager is created after optimizer.init() in init() method
    }

    /**
     * Set up export event listeners.
     * Called after ExportManager is instantiated.
     *
     * @private
     */
    setupExportEvents() {
        if (!this.exportManager) return;

        this.exportManager.on('export:start', ({ format, method }) => {
            this.modules.logs?.addEntry(
                `Exporting ${format} (${method})...`,
                'info'
            );

            // Show loading indicator for webhook exports
            if (method === 'webhook') {
                this.modules.export?.setExporting(true);
            }
        });

        this.exportManager.on('export:complete', ({ format, filename }) => {
            this.modules.logs?.addEntry(
                `Export complete: ${filename}`,
                'info'
            );

            // Hide loading indicator
            this.modules.export?.setExporting(false);
        });

        this.exportManager.on('error', ({ error, context }) => {
            this.modules.logs?.addEntry(
                `Export error in ${context}: ${error.message}`,
                'error'
            );

            // Show error in export panel for webhook errors
            if (context && context.includes('exportWebhook')) {
                this.modules.export?.setExportError(error.message);
            }
        });
    }

    /**
     * Set up event listeners from UI to optimizer.
     *
     * @private
     */
    setupUIEvents() {
        // Start optimization
        this.modules.controls?.addEventListener('start-optimization', async () => {
            try {
                const { variables } = this.modules.variables.getSelectedVariables();

                if (variables.length === 0) {
                    this.modules.logs?.addEntry('No variables selected', 'warning');
                    return;
                }

                // Get constraints from optimizer
                const constraints = this.optimizer.getConstraints();

                if (!constraints || constraints.length === 0) {
                    this.modules.logs?.addEntry('No constraints found. Cannot start optimization.', 'error');
                    this.modules.controls?.setStatus('Error: No constraints', 'error');
                    return;
                }

                // Disable variable value inputs during optimization
                this.modules.variables?.setOptimizing(true);

                const solverParams = this.modules.solver.getParams();

                await this.optimizer.optimize({
                    selectedVariables: variables,
                    constraints: constraints,
                    solverParams
                });
            } catch (error) {
                // Handle any synchronous errors
                this.modules.controls?.setStatus(`Error: ${error.message}`, 'error');
                this.modules.logs?.addEntry(`ERROR: ${error.message}`, 'error');
                this.modules.variables?.setOptimizing(false);
                console.error('Optimization error:', error);
            }
        });

        // Stop optimization
        this.modules.controls?.addEventListener('stop-optimization', () => {
            this.optimizer.stop();
            // Re-enable variable value inputs
            this.modules.variables?.setOptimizing(false);
        });

        // Restore snapshot
        this.modules.snapshot?.addEventListener('restore-snapshot', (e) => {
            const { variableValues, deltas } = e.detail;

            // Update variable values in GeoGebra and UI
            this.modules.variables?.updateVariableValues(variableValues);
            // Update deltas display
            this.modules.variables?.updateDeltas(deltas);

            // Log the restoration
            const variableNames = Object.keys(variableValues).join(', ');
            this.modules.logs?.addEntry(
                `Restored snapshot: ${variableNames}`,
                'info'
            );
        });

        // Export events
        this.modules.export?.addEventListener('export-svg', (e) => {
            this.exportManager.exportSVG(e.detail.options);
        });

        this.modules.export?.addEventListener('export-png', (e) => {
            this.exportManager.exportPNG(e.detail.options);
        });

        this.modules.export?.addEventListener('export-pdf', (e) => {
            this.exportManager.exportPDF(e.detail.options);
        });

        this.modules.export?.addEventListener('export-json', (e) => {
            this.exportManager.exportXML(e.detail.options);
        });

        this.modules.export?.addEventListener('export-webhook', (e) => {
            const { webhookUrl, dataType, dataParams, params } = e.detail;

            this.exportManager.exportWebhook(
                webhookUrl,
                dataType,
                dataParams,
                params
            );
        });
    }

    /**
     * Get the layout manager instance.
     *
     * @returns {LayoutManager} Layout manager
     * @example
     * const layout = ui.getLayoutManager();
     * layout.addModule({ name: 'custom', component: CustomModule, row: 6, col: 1 });
     */
    getLayoutManager() {
        return this.layoutManager;
    }

    /**
     * Get all module instances.
     *
     * @returns {Object} Object mapping module names to elements
     * @example
     * const modules = ui.getModules();
     * modules.variables.updateDeltas({ AB: 0.5 });
     */
    getModules() {
        return this.modules;
    }

    /**
     * Get a specific module instance.
     *
     * @param {string} name - Module name
     * @returns {HTMLElement|undefined} Module element
     * @example
     * const logsPanel = ui.getModule('logs');
     * logsPanel.addEntry('Custom message', 'info');
     */
    getModule(name) {
        return this.modules[name];
    }

    /**
     * Destroy the UI and clean up resources.
     *
     * @example
     * ui.destroy();
     */
    destroy() {
        this.optimizer.destroy();
        this.layoutManager.destroy();
        this.modules = {};
    }
}
