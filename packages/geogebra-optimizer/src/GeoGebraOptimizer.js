import { EventBus } from './EventBus.js';
import { PyodideManager } from './PyodideManager.js';
import { GeoGebraManager } from './GeoGebraManager.js';
import { loadDefaultPython } from './defaultPython.js';
import { ProgressTracker } from './ProgressTracker.js';

/**
 * @typedef {Object} InitConfig
 * @property {HTMLElement} container - DOM container for GeoGebra applet
 * @property {string} geogebraXML - GeoGebra XML content
 * @property {Object} [geogebraOptions] - GeoGebra configuration options
 * @property {Object} [pyodideOptions] - PyOdide configuration options
 * @property {Object} [pythonFiles] - Python modules to load (uses defaults if not provided)
 * @property {string} [pythonFiles.optimizer] - Optimizer Python code (overrides default)
 * @property {string} [pythonFiles.fitness] - Fitness function Python code (overrides default)
 */

/**
 * @typedef {Object} OptimizeOptions
 * @property {string[]} selectedSliders - Names of sliders to optimize
 * @property {Object} [objectiveParams] - Objective function parameters
 * @property {number} [objectiveParams.lambda=0.01] - Regularization lambda
 * @property {Object} [solverParams] - CMA-ES solver parameters
 * @property {number} [solverParams.maxiter=100] - Maximum iterations
 * @property {number} [solverParams.popsize=10] - Population size
 * @property {number} [solverParams.sigma=0.5] - Initial step size
 * @property {number} [solverParams.tolfun=1e-6] - Tolerance for function value
 * @property {number} [solverParams.progressStep=1] - Progress notification step in percent (1 = notify every 1%)
 */

/**
 * @typedef {Object} OptimizationMetrics
 * @property {number} bestDistance - Best distance found
 * @property {number} bestFitness - Best fitness value
 * @property {number} regularizationPenalty - Regularization penalty
 * @property {number} totalDelta - Total change from initial values
 * @property {number} generation - Current generation number
 * @property {number} evaluations - Total evaluations performed
 */

/**
 * Main class for GeoGebra optimization using CMA-ES algorithm.
 * Orchestrates PyOdide (Python in browser) and GeoGebra for optimization tasks.
 *
 * @class
 * @extends EventBus
 * @fires GeoGebraOptimizer#pyodide:loading
 * @fires GeoGebraOptimizer#pyodide:ready
 * @fires GeoGebraOptimizer#geogebra:loading
 * @fires GeoGebraOptimizer#geogebra:ready
 * @fires GeoGebraOptimizer#constraints:loaded
 * @fires GeoGebraOptimizer#ready
 * @fires GeoGebraOptimizer#optimization:start
 * @fires GeoGebraOptimizer#optimization:progress
 * @fires GeoGebraOptimizer#optimization:newBest
 * @fires GeoGebraOptimizer#optimization:complete
 * @fires GeoGebraOptimizer#optimization:stopped
 * @fires GeoGebraOptimizer#error
 * @fires GeoGebraOptimizer#log
 *
 * @example
 * import { GeoGebraOptimizer } from 'geogebra-optimizer';
 *
 * const optimizer = new GeoGebraOptimizer();
 *
 * // Listen to events
 * optimizer.on('ready', ({ ggbApi, sliders }) => {
 *   console.log('Ready with sliders:', sliders);
 * });
 *
 * optimizer.on('optimization:newBest', ({ solution, metrics }) => {
 *   console.log('New best solution:', metrics.bestDistance);
 * });
 *
 * // Initialize
 * await optimizer.init({
 *   container: document.getElementById('ggb-container'),
 *   geogebraXML: xmlContent,
 *   pythonFiles: {
 *     optimizer: optimizerCode,
 *     fitness: fitnessCode
 *   }
 * });
 *
 * // Optimize
 * await optimizer.optimize({
 *   selectedSliders: ['AB', 'BC', 'CD'],
 *   objectiveParams: { lambda: 0.01 },
 *   solverParams: { maxiter: 100 }
 * });
 */
export class GeoGebraOptimizer extends EventBus {
    constructor() {
        super();

        this.pyodideManager = null;
        this.geogebraManager = null;
        this.optimizationRunning = false;
        this.stopRequested = false;

        this.state = {
            isReady: false,
            isOptimizing: false,
            pyodideReady: false,
            geogebraReady: false
        };
    }

    /**
     * Initialize the optimizer with GeoGebra and PyOdide.
     * Loads PyOdide and GeoGebra in parallel for better performance.
     *
     * @async
     * @param {InitConfig} config - Initialization configuration
     * @returns {Promise<void>}
     * @throws {Error} If initialization fails
     *
     * @fires GeoGebraOptimizer#pyodide:loading - When PyOdide starts loading
     * @fires GeoGebraOptimizer#pyodide:ready - When PyOdide is ready
     * @fires GeoGebraOptimizer#geogebra:loading - When GeoGebra starts loading
     * @fires GeoGebraOptimizer#geogebra:ready - When GeoGebra is ready
     * @fires GeoGebraOptimizer#constraints:loaded - When sliders are detected
     * @fires GeoGebraOptimizer#ready - When both are ready
     * @fires GeoGebraOptimizer#error - On initialization error
     *
     * @example
     * await optimizer.init({
     *   container: document.getElementById('ggb'),
     *   geogebraXML: '<xml>...</xml>',
     *   pythonFiles: {
     *     optimizer: 'def initialize_optimizer...',
     *     fitness: 'def calculate_fitness...'
     *   }
     * });
     */
    async init(config) {
        const {
            container,
            geogebraXML,
            geogebraOptions = {},
            pyodideOptions = {},
            pythonFiles = {}
        } = config;

        try {
            // Créer les managers
            this.pyodideManager = new PyodideManager(pyodideOptions);
            this.geogebraManager = new GeoGebraManager(geogebraOptions);

            // Forward des events
            this.forwardEvents(this.pyodideManager, ['pyodide:loading', 'pyodide:ready', 'error', 'log']);
            this.forwardEvents(this.geogebraManager, ['geogebra:loading', 'geogebra:ready', 'constraints:loaded', 'slider:changed', 'sliders:updated', 'error']);

            // Charger PyOdide et GeoGebra en parallèle
            await Promise.all([
                this.pyodideManager.init().then(() => {
                    this.state.pyodideReady = true;
                }),
                this.geogebraManager.init(container, geogebraXML).then(() => {
                    this.state.geogebraReady = true;
                })
            ]);

            // Charger les modules Python (utiliser les défauts si non fournis)
            let finalPythonFiles = pythonFiles;
            if (!pythonFiles || (!pythonFiles.optimizer && !pythonFiles.fitness)) {
                this.emit('log', {
                    message: 'Loading default Python modules from package',
                    level: 'info',
                    timestamp: new Date()
                });
                finalPythonFiles = await loadDefaultPython();
            }

            if (finalPythonFiles.optimizer || finalPythonFiles.fitness) {
                await this.pyodideManager.loadPythonModules(finalPythonFiles);
            }

            this.state.isReady = true;
            this.emit('ready', {
                ggbApi: this.geogebraManager.getAPI(),
                sliders: this.geogebraManager.getSliders()
            });
        } catch (error) {
            this.emit('error', {
                error,
                context: 'GeoGebraOptimizer.init'
            });
            throw error;
        }
    }

    /**
     * Forward les événements d'un manager
     */
    forwardEvents(manager, events) {
        events.forEach(event => {
            manager.on(event, (data) => this.emit(event, data));
        });
    }

    /**
     * Start optimization using CMA-ES algorithm.
     * Optimizes selected sliders to minimize distance between points while
     * applying regularization to keep changes small.
     *
     * @async
     * @param {OptimizeOptions} options - Optimization options
     * @returns {Promise<void>}
     * @throws {Error} If optimization is already running or no sliders selected
     *
     * @fires GeoGebraOptimizer#optimization:start - When optimization starts
     * @fires GeoGebraOptimizer#optimization:progress - On each generation
     * @fires GeoGebraOptimizer#optimization:newBest - When better solution found
     * @fires GeoGebraOptimizer#optimization:complete - When optimization completes
     * @fires GeoGebraOptimizer#optimization:stopped - If stopped by user
     * @fires GeoGebraOptimizer#error - On optimization error
     * @fires GeoGebraOptimizer#log - For informational messages
     *
     * @example
     * await optimizer.optimize({
     *   selectedSliders: ['AB', 'BC'],
     *   objectiveParams: { lambda: 0.01 },
     *   solverParams: {
     *     maxiter: 100,
     *     popsize: 10,
     *     sigma: 0.5,
     *     tolfun: 1e-6
     *   }
     * });
     */
    async optimize(options) {
        const {
            selectedSliders,
            objectiveParams = { lambda: 0.01 },
            solverParams = { maxiter: 100, popsize: 10, sigma: 0.5, tolfun: 1e-6, progressStep: 1 }
        } = options;

        if (this.optimizationRunning) {
            throw new Error('Optimization already running');
        }

        if (!selectedSliders || selectedSliders.length === 0) {
            throw new Error('No sliders selected');
        }

        this.optimizationRunning = true;
        this.stopRequested = false;
        this.state.isOptimizing = true;

        // Initialize progress tracker
        const maxEvaluations = solverParams.maxiter * solverParams.popsize;
        this.progressTracker = new ProgressTracker(maxEvaluations, solverParams.progressStep || 1);

        this.emit('optimization:start', { selectedSliders, objectiveParams, solverParams });

        try {
            // Préparer les bornes et valeurs initiales
            const bounds = { min: [], max: [], initial: [] };
            const sliderObjects = [];

            selectedSliders.forEach(name => {
                const slider = this.geogebraManager.getSlider(name);
                if (slider) {
                    bounds.min.push(slider.min);
                    bounds.max.push(slider.max);
                    bounds.initial.push(slider.value);
                    sliderObjects.push(slider);
                }
            });

            const { lambda } = objectiveParams;

            // Initialiser l'optimiseur CMA-ES
            const initCode = `
es = initialize_optimizer(
    ${JSON.stringify(bounds.initial)},
    ${JSON.stringify(bounds.min)},
    ${JSON.stringify(bounds.max)},
    sigma=${solverParams.sigma},
    maxiter=${solverParams.maxiter},
    popsize=${solverParams.popsize},
    tolfun=${solverParams.tolfun}
)
"initialized"
`;
            await this.pyodideManager.runPython(initCode);
            this.emit('log', {
                message: 'Optimiseur initialisé avec succès',
                level: 'info',
                timestamp: new Date()
            });

            let generation = 0;
            let totalEvaluations = 0;
            let bestFitness = Infinity;
            let bestDistance = Infinity;
            let bestSolution = null;

            const initialValues = [...bounds.initial];

            // Boucle d'optimisation
            while (!this.stopRequested && generation < solverParams.maxiter) {
                // Demander une nouvelle population
                const solutionsJson = await this.pyodideManager.runPython(`ask_solutions(es)`);
                const solutions = JSON.parse(solutionsJson);

                // Évaluer chaque solution
                const fitnesses = [];
                for (const solution of solutions) {
                    // Mettre à jour les sliders
                    this.updateSliders(solution, selectedSliders);
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // Calculer fitness
                    const result = this.calculateFitness(solution, initialValues, lambda, sliderObjects);
                    fitnesses.push(result.fitness);
                    totalEvaluations++;

                    // Update progress tracker and emit event if threshold crossed
                    const shouldNotify = this.progressTracker.update(totalEvaluations);
                    if (shouldNotify) {
                        // Calculate current deltas and get slider values
                        const currentDeltas = this.calculateCurrentDeltas(solution, initialValues, selectedSliders);
                        const sliderValues = this.geogebraManager.getSliderValues();

                        this.emit('optimization:progress-update', {
                            ...this.progressTracker.getProgress(),
                            deltas: currentDeltas,
                            sliderValues: sliderValues
                        });
                    }

                    // Mettre à jour si meilleure solution
                    if (result.fitness < bestFitness) {
                        bestFitness = result.fitness;
                        bestDistance = result.distance;
                        bestSolution = [...solution];

                        // Calculer deltas
                        const deltas = this.calculateDeltas(solution, initialValues, selectedSliders);

                        const metrics = {
                            bestDistance,
                            bestFitness,
                            regularizationPenalty: result.penalty,
                            totalDelta: deltas.totalDelta,
                            generation,
                            evaluations: totalEvaluations
                        };

                        this.emit('optimization:newBest', {
                            solution,
                            metrics,
                            deltas: deltas.sliderDeltas
                        });
                    }

                    if (this.stopRequested) break;
                }

                if (this.stopRequested) break;

                // Retourner les résultats à CMA-ES
                await this.pyodideManager.runPython(
                    `tell_results(es, ${JSON.stringify(solutions)}, ${JSON.stringify(fitnesses)})`
                );

                generation++;

                // Émettre progression
                const currentResult = this.calculateFitness(solutions[0], initialValues, lambda, sliderObjects);
                this.emit('optimization:progress', {
                    generation,
                    evaluations: totalEvaluations,
                    currentSolution: solutions[0],
                    metrics: {
                        currentDistance: currentResult.distance,
                        bestDistance,
                        bestFitness,
                        generation,
                        evaluations: totalEvaluations
                    }
                });

                // Vérifier la convergence
                const stopDict = await this.pyodideManager.runPython(`check_convergence(es)`);
                if (stopDict !== '{}') {
                    this.emit('log', {
                        message: 'Convergence atteinte: ' + stopDict,
                        level: 'info',
                        timestamp: new Date()
                    });
                    break;
                }
            }

            // Appliquer la meilleure solution
            if (bestSolution) {
                this.updateSliders(bestSolution, selectedSliders);
                const finalResult = this.calculateFitness(bestSolution, initialValues, lambda, sliderObjects);
                const deltas = this.calculateDeltas(bestSolution, initialValues, selectedSliders);

                const finalMetrics = {
                    bestDistance,
                    bestFitness,
                    regularizationPenalty: finalResult.penalty,
                    totalDelta: deltas.totalDelta,
                    generation,
                    evaluations: totalEvaluations
                };

                this.emit('optimization:complete', {
                    bestSolution,
                    finalMetrics,
                    deltas: deltas.sliderDeltas
                });
            }

            if (this.stopRequested) {
                this.emit('optimization:stopped', {});
            }
        } catch (error) {
            this.emit('error', {
                error,
                context: 'GeoGebraOptimizer.optimize'
            });
            throw error;
        } finally {
            this.optimizationRunning = false;
            this.state.isOptimizing = false;
        }
    }

    /**
     * Met à jour les sliders avec de nouvelles valeurs
     */
    updateSliders(values, selectedSliders) {
        const updates = {};
        selectedSliders.forEach((name, index) => {
            updates[name] = values[index];
        });
        this.geogebraManager.setSliderValues(updates);
    }

    /**
     * Calcule la fitness (distance + régularisation)
     * Note: Hidden sliders are excluded from L2 penalty but still used as optimization variables
     */
    calculateFitness(currentValues, initialValues, lambda, sliderObjects = []) {
        const distance = this.geogebraManager.calculateDistance('A', "A'");

        if (!currentValues || !initialValues) {
            return { fitness: distance, distance, penalty: 0 };
        }

        // Calculer la pénalité L2 seulement sur les sliders NON-cachés
        let penalty = 0;
        for (let i = 0; i < currentValues.length; i++) {
            // Skip hidden sliders in L2 penalty calculation
            if (sliderObjects[i] && sliderObjects[i].hidden) {
                continue;
            }

            const diff = currentValues[i] - initialValues[i];
            penalty += diff * diff;
        }

        const fitness = distance + lambda * penalty;

        return { fitness, distance, penalty };
    }

    /**
     * Calcule les deltas pour chaque slider
     */
    calculateDeltas(currentValues, initialValues, selectedSliders) {
        let totalDelta = 0;
        const sliderDeltas = {};

        selectedSliders.forEach((name, index) => {
            const delta = currentValues[index] - initialValues[index];
            totalDelta += Math.abs(delta);
            sliderDeltas[name] = delta;
        });

        return { totalDelta, sliderDeltas };
    }

    /**
     * Get current optimization progress.
     * Returns exact progress values (not rounded).
     *
     * @returns {{percent: number, evaluations: number, maxEvaluations: number}|null}
     *          Progress information, or null if no optimization is running
     *
     * @example
     * const progress = optimizer.getProgress();
     * if (progress) {
     *   console.log(`${progress.percent}% - ${progress.evaluations}/${progress.maxEvaluations}`);
     * }
     */
    getProgress() {
        if (!this.progressTracker) {
            return null;
        }
        return this.progressTracker.getProgress();
    }

    /**
     * Calcule les deltas entre les valeurs actuelles et initiales des sliders
     * @param {number[]} currentValues - Valeurs actuelles
     * @param {number[]} initialValues - Valeurs initiales
     * @param {string[]} selectedSliders - Noms des sliders sélectionnés
     * @returns {Object} Objet avec les deltas { sliderName: delta, ... }
     */
    calculateCurrentDeltas(currentValues, initialValues, selectedSliders) {
        const deltas = {};

        if (!currentValues || !initialValues || !selectedSliders) {
            return deltas;
        }

        for (let i = 0; i < selectedSliders.length; i++) {
            const sliderName = selectedSliders[i];
            const delta = currentValues[i] - initialValues[i];
            deltas[sliderName] = delta;
        }

        return deltas;
    }

    /**
     * Arrête l'optimisation
     */
    stop() {
        this.stopRequested = true;
    }

    /**
     * Réinitialise l'optimiseur
     */
    reset() {
        this.stop();
        this.state.isOptimizing = false;
        this.optimizationRunning = false;
        this.stopRequested = false;
    }

    // Getters

    /**
     * Get all available sliders from GeoGebra.
     *
     * @returns {Array<Object>} Array of slider objects with name, min, max, value, etc.
     * @example
     * const sliders = optimizer.getSliders();
     * console.log(sliders[0]); // { name: 'AB', min: 0, max: 10, value: 5, ... }
     */
    getSliders() {
        return this.geogebraManager.getSliders();
    }

    /**
     * Get a specific slider by name.
     *
     * @param {string} name - Slider name
     * @returns {Object|undefined} Slider object or undefined if not found
     * @example
     * const slider = optimizer.getSlider('AB');
     * if (slider) console.log(slider.value);
     */
    getSlider(name) {
        return this.geogebraManager.getSlider(name);
    }

    /**
     * Get current values of all sliders.
     *
     * @returns {Object<string, number>} Object mapping slider names to values
     * @example
     * const values = optimizer.getSliderValues();
     * console.log(values); // { AB: 5, BC: 3.2, CD: 7.8 }
     */
    getSliderValues() {
        return this.geogebraManager.getSliderValues();
    }

    /**
     * Get the GeoGebra API instance for direct manipulation.
     *
     * @returns {Object} GeoGebra API object
     * @example
     * const ggbApi = optimizer.getGeoGebraAPI();
     * const x = ggbApi.getXcoord('A');
     */
    getGeoGebraAPI() {
        return this.geogebraManager.getAPI();
    }

    /**
     * Get the PyOdide API instance for running Python code.
     *
     * @returns {Object} PyOdide API object
     * @example
     * const pyodide = optimizer.getPyodideAPI();
     * const result = await pyodide.runPythonAsync('2 + 2');
     */
    getPyodideAPI() {
        return this.pyodideManager.getAPI();
    }

    /**
     * Get current state of the optimizer.
     *
     * @returns {Object} State object with isReady, isOptimizing, etc.
     * @example
     * const state = optimizer.getState();
     * if (state.isReady && !state.isOptimizing) {
     *   // Ready to start optimization
     * }
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        this.stop();
        if (this.pyodideManager) {
            this.pyodideManager.destroy();
        }
        if (this.geogebraManager) {
            this.geogebraManager.destroy();
        }
        this.removeAllListeners();
    }
}
