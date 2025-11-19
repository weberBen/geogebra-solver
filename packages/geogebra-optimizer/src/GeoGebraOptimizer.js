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
 * @typedef {Object} Constraint
 * @property {string} expr - GeoGebra expression (e.g., "Distance(A',A)", "angle(ABC)")
 * @property {string} op - Operator: "=", "<", ">", "<=", ">="
 * @property {number} value - Target value for the constraint
 * @property {number} [tolerance] - Tolerance for the constraint (uses default if not provided)
 */

/**
 * @typedef {Object} OptimizeOptions
 * @property {string[]} selectedSliders - Names of sliders to optimize
 * @property {Constraint[]} [constraints] - List of constraints (defaults to Distance(A',A)=0)
 * @property {number} [defaultTolerance=1e-4] - Default tolerance for constraints without explicit tolerance
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
            // Create managers
            this.pyodideManager = new PyodideManager(pyodideOptions);
            this.geogebraManager = new GeoGebraManager(geogebraOptions);

            // Forward events
            this.forwardEvents(this.pyodideManager, ['pyodide:loading', 'pyodide:ready', 'error', 'log']);
            this.forwardEvents(this.geogebraManager, ['geogebra:loading', 'geogebra:ready', 'constraints:loaded', 'slider:changed', 'sliders:updated', 'error']);

            // Load PyOdide and GeoGebra in parallel
            await Promise.all([
                this.pyodideManager.init().then(() => {
                    this.state.pyodideReady = true;
                }),
                this.geogebraManager.init(container, geogebraXML).then(() => {
                    this.state.geogebraReady = true;
                })
            ]);

            // Load Python modules (use defaults if not provided)
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
     * Forward events from a manager
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
     * // Constrained optimization with default constraint (Distance(A',A) = 0)
     * await optimizer.optimize({
     *   selectedSliders: ['AB', 'BC'],
     *   defaultTolerance: 1e-4,
     *   solverParams: {
     *     maxiter: 100,
     *     popsize: 10,
     *     sigma: 0.5,
     *     tolfun: 1e-6
     *   }
     * });
     *
     * @example
     * // Constrained optimization with custom constraints
     * await optimizer.optimize({
     *   selectedSliders: ['AB', 'BC'],
     *   constraints: [
     *     { expr: "Distance(A',A)", op: "=", value: 0, tolerance: 1e-4 },
     *     { expr: "Distance(A,B)", op: ">", value: 10, tolerance: 0.5 }
     *   ],
     *   defaultTolerance: 1e-4,
     *   solverParams: {
     *     maxiter: 100,
     *     popsize: 10
     *   }
     * });
     */
    async optimize(options) {
        const {
            selectedSliders,
            constraints,
            defaultTolerance = 1e-4,
            solverParams = { maxiter: 100, popsize: 10, sigma: 0.5, tolfun: 1e-6, progressStep: 1 }
        } = options;

        if (this.optimizationRunning) {
            throw new Error('Optimization already running');
        }

        if (!selectedSliders || selectedSliders.length === 0) {
            throw new Error('No sliders selected');
        }

        if (!constraints || constraints.length === 0) {
            throw new Error('No constraints provided. Constraints are required for optimization.');
        }

        this.optimizationRunning = true;
        this.stopRequested = false;
        this.state.isOptimizing = true;

        // Initialize progress tracker
        const maxEvaluations = solverParams.maxiter * solverParams.popsize;
        this.progressTracker = new ProgressTracker(maxEvaluations, solverParams.progressStep || 1);

        this.emit('optimization:start', { selectedSliders, solverParams, constraints, defaultTolerance });

        try {
            // Prepare bounds and initial values
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

            // Initialize CMA-ES optimizer with ConstrainedFitnessAL
            const initCode = `
            es, cfun = initialize_optimizer(
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
                message: 'Optimizer initialized successfully',
                level: 'info',
                timestamp: new Date()
            });

            let generation = 0;
            let totalEvaluations = 0;
            let bestFitness = Infinity;
            let bestDistance = Infinity;
            let bestSolution = null;
            let bestObjective = Infinity;
            let bestConstraintsViolation = Infinity;
            let bestFeasibleSolution = null;
            let bestFeasibleDistance = Infinity;

            const initialValues = [...bounds.initial];

            // Optimization loop
            while (!this.stopRequested && generation < solverParams.maxiter) {
                // Ask for a new population
                const solutionsJson = await this.pyodideManager.runPython(`ask_solutions(es)`);
                const solutions = JSON.parse(solutionsJson);

                // Evaluate each solution
                const fitnesses = [];
                for (const solution of solutions) {
                    // Update sliders
                    this.updateSliders(solution, selectedSliders);
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // Calculate objective (L2 penalty) and constraints
                    const result = this.calculateFitnessWithConstraints(
                        solution,
                        initialValues,
                        sliderObjects,
                        constraints,
                        defaultTolerance
                    );

                    // Evaluate augmented Lagrangian fitness in Python
                    const fitnessAL = await this.pyodideManager.runPython(
                        `_current_objective = ${result.objective}; _current_constraints = ${JSON.stringify(result.alConstraints)}; cfun(${JSON.stringify(solution)})`
                    );
                    const fitness = parseFloat(fitnessAL);
                    result.fitness = fitness;

                    fitnesses.push(fitness);
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

                    // Check if solution is feasible
                    const isFeasible = await this.pyodideManager.runPython(`is_feasible(cfun)`);
                    const feasible = isFeasible === 'True';

                    // Update if better solution
                    if (result.fitness < bestFitness) {
                        bestFitness = result.fitness;
                        bestDistance = result.distance;
                        bestSolution = [...solution];
                        bestObjective = result.objective;
                        bestConstraintsViolation = result.constraintViolation;
                    }

                    // Track best feasible solution separately
                    if (feasible && result.distance < bestFeasibleDistance) {
                        bestFeasibleDistance = result.distance;
                        bestFeasibleSolution = [...solution];

                        // Calculer deltas
                        const deltas = this.calculateDeltas(solution, initialValues, selectedSliders);

                        const metrics = {
                            bestObjective: result.objective,          // L2 objective
                            bestConstraintsViolation: result.constraintViolation,
                            bestDistance: bestFeasibleDistance,       // Legacy
                            totalDelta: deltas.totalDelta,
                            generation,
                            evaluations: totalEvaluations,
                            feasible: true
                        };

                        this.emit('optimization:newBest', {
                            solution,
                            metrics,
                            deltas: deltas.sliderDeltas
                        });

                        this.emit('log', {
                            message: `New best feasible solution: distance=${bestFeasibleDistance.toFixed(6)}, L2=${result.objective.toFixed(6)}`,
                            level: 'info',
                            timestamp: new Date()
                        });
                    }

                    if (this.stopRequested) break;
                }

                if (this.stopRequested) break;

                // Return results to CMA-ES and update AL coefficients
                await this.pyodideManager.runPython(
                    `tell_results(es, ${JSON.stringify(solutions)}, ${JSON.stringify(fitnesses)}, cfun)`
                );

                generation++;

                // Emit progress
                const currentResult = this.calculateFitnessWithConstraints(
                    solutions[0],
                    initialValues,
                    sliderObjects,
                    constraints,
                    defaultTolerance
                );

                this.emit('optimization:progress', {
                    generation,
                    evaluations: totalEvaluations,
                    currentSolution: solutions[0],
                    metrics: {
                        currentObjective: currentResult.objective,
                        currentConstraintsViolation: currentResult.constraintViolation,
                        currentL2Penalty: currentResult.l2Penalty,
                        currentSoftPenalty: currentResult.softPenalty,
                        currentHardPenalty: currentResult.hardPenalty,
                        currentConstraintValues: currentResult.evaluatedConstraints,
                        bestObjective: bestObjective,
                        bestConstraintsViolation: bestConstraintsViolation,
                        currentDistance: currentResult.distance,  // Legacy
                        bestDistance,
                        bestFitness,
                        generation,
                        evaluations: totalEvaluations
                    },
                    constraints: constraints  // Pass constraints for UI display
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

            // Appliquer la meilleure solution faisable (ou meilleure solution si aucune faisable)
            const finalSolution = bestFeasibleSolution || bestSolution;
            if (finalSolution) {
                this.updateSliders(finalSolution, selectedSliders);
                const finalResult = this.calculateFitnessWithConstraints(
                    finalSolution,
                    initialValues,
                    sliderObjects,
                    constraints,
                    defaultTolerance
                );
                const deltas = this.calculateDeltas(finalSolution, initialValues, selectedSliders);

                const finalMetrics = {
                    bestObjective: finalResult.objective,
                    bestConstraintsViolation: finalResult.constraintViolation,
                    bestDistance: bestFeasibleSolution ? bestFeasibleDistance : bestDistance,  // Legacy
                    totalDelta: deltas.totalDelta,
                    generation,
                    evaluations: totalEvaluations,
                    feasible: bestFeasibleSolution !== null
                };

                const feasibilityMsg = bestFeasibleSolution
                    ? `Feasible solution found (violation=${finalResult.constraintViolation.toFixed(6)})`
                    : `No feasible solution (violation=${finalResult.constraintViolation.toFixed(6)})`;

                this.emit('log', {
                    message: feasibilityMsg,
                    level: bestFeasibleSolution ? 'info' : 'warn',
                    timestamp: new Date()
                });

                this.emit('optimization:complete', {
                    bestSolution: finalSolution,
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
     * Update sliders with new values
     */
    updateSliders(values, selectedSliders) {
        const updates = {};
        selectedSliders.forEach((name, index) => {
            updates[name] = values[index];
        });
        this.geogebraManager.setSliderValues(updates);
    }

    /**
     * Transform user constraints to ConstrainedFitnessAL format (g(x) ≤ 0)
     *
     * @param {Constraint[]} constraints - User-defined constraints
     * @param {number[]} evaluatedValues - Evaluated constraint values
     * @param {number} defaultTolerance - Default tolerance
     * @returns {number[]} Array of constraint values for AL (≤ 0 is feasible)
     */
    transformConstraintsForAL(constraints, evaluatedValues, defaultTolerance) {
        const alConstraints = [];

        for (let i = 0; i < constraints.length; i++) {
            const constraint = constraints[i];
            const g = evaluatedValues[i];  // Evaluated value
            const tol = constraint.tolerance ?? defaultTolerance;
            // Note: All constraints are of the form: expression op 0

            // If constraint is disabled, return a value that always satisfies it
            // All AL constraints are in g(x) <= 0 format, so -1e10 is always satisfied
            if (constraint.enabled === false) {
                switch (constraint.operator) {
                    case '=':
                        // Equality constraints generate 2 AL constraints
                        alConstraints.push(-1e10);
                        alConstraints.push(-1e10);
                        break;
                    default:
                        // Inequality constraints generate 1 AL constraint
                        alConstraints.push(-1e10);
                        break;
                }
                continue;
            }

            switch (constraint.operator) {
                case '=':
                    // g = 0 → [-tol ≤ g ≤ tol]
                    // Transformed: [g-tol ≤ 0, -g-tol ≤ 0]
                    alConstraints.push(g - tol);
                    alConstraints.push(-g - tol);
                    break;

                case '>':
                    // g > 0 → -g < 0
                    alConstraints.push(-g - tol);
                    break;

                case '>=':
                    // g >= 0 → -g ≤ 0
                    alConstraints.push(-g + tol);
                    break;

                case '<':
                    // g < 0 → g < 0
                    alConstraints.push(g + tol);
                    break;

                case '<=':
                    // g <= 0 → g ≤ 0
                    alConstraints.push(g - tol);
                    break;

                default:
                    throw new Error(`Unknown operator: ${constraint.operator}`);
            }
        }

        return alConstraints;
    }

    /**
     * Evaluate constraints using GeoGebra API
     * For now, uses faker for testing until GeoGebra parsing is implemented
     *
     * @param {Constraint[]} constraints - Constraints to evaluate
     * @returns {number[]} Evaluated constraint values
     */
    evaluateConstraints(constraints) {
        return constraints.map(constraint => {
            // TODO: Parse and evaluate real GeoGebra expressions
            // For now, evaluate using GeoGebra API
            const expr = constraint.expression;

            if (!expr) {
                throw new Error('Constraint has no expression:', constraint);
            }

            try {
                // Try to evaluate the expression using GeoGebra API
                const ggbApi = this.geogebraManager.getAPI();
                const value = ggbApi.getValue(expr);

                // If getValue works, return the value
                if (typeof value !== 'number'|| isNaN(value)) {
                    throw new Error('Cannot evaluate constraint:', constraint);
                }

                return value;
            } catch (e) {
                throw new Error('Cannot evaluate constraint:', constraint, "Error:", e);
            }
        });
    }

    /**
     * Calculate constraint violation metric for display
     * @param {number[]} alConstraints - AL-transformed constraints
     * @returns {number} Mean violation (0 if all satisfied)
     */
    calculateConstraintViolation(alConstraints) {
        if (alConstraints.length === 0) return 0;

        const violations = alConstraints.map(g => Math.max(0, g));
        return violations.reduce((sum, v) => sum + v, 0) / violations.length;
    }

    /**
     * Calculate fitness with generic constraints
     * Objective: L2 penalty (without lambda) + soft constraint penalties
     * Constraints: User-defined hard and soft constraints
     * Note: Hidden sliders are excluded from L2 penalty but still used as optimization variables
     */
    calculateFitnessWithConstraints(currentValues, initialValues, sliderObjects, constraints, defaultTolerance) {
        // Calculate L2 penalty only on NON-hidden sliders (base objective)
        let l2Penalty = 0;
        if (currentValues && initialValues) {
            for (let i = 0; i < currentValues.length; i++) {
                // Skip hidden sliders in L2 penalty calculation
                if (sliderObjects[i] && sliderObjects[i].hidden) {
                    continue;
                }

                const diff = currentValues[i] - initialValues[i];
                const weight = sliderObjects[i]?.weight !== undefined ? sliderObjects[i].weight : 1;
                l2Penalty += weight * diff * diff;
            }
        }

        // Separate hard and soft constraints
        const hardConstraints = constraints.filter(c => c.type === 'hard');
        const softConstraints = constraints.filter(c => c.type === 'soft');

        // Evaluate all constraints
        const evaluatedConstraints = this.evaluateConstraints(constraints);

        // Process soft constraints: add penalties to objective
        let softPenalty = 0;
        softConstraints.forEach(constraint => {
            const idx = constraints.indexOf(constraint);
            const value = evaluatedConstraints[idx];
            const weight = constraint.weight !== undefined ? constraint.weight : 1;

            let penalty = 0;
            switch (constraint.operator) {
                case '<':
                case '<=':
                    // For <: penalize if value > 0
                    penalty = Math.max(0, value) ** 2;
                    break;
                case '>':
                case '>=':
                    // For >: penalize if value < 0 (i.e., -value > 0)
                    penalty = Math.max(0, -value) ** 2;
                    break;
                case '=':
                    // For =: penalize any deviation from 0
                    penalty = value ** 2;
                    break;
            }
            softPenalty += weight * penalty;
        });

        // Calculate hard constraints penalty (for display, not used in optimization)
        let hardPenalty = 0;
        hardConstraints.forEach(constraint => {
            // Skip disabled constraints in penalty display
            if (constraint.enabled === false) {
                return;
            }

            const idx = constraints.indexOf(constraint);
            const value = evaluatedConstraints[idx];
            const weight = constraint.weight !== undefined ? constraint.weight : 1;

            let penalty = 0;
            switch (constraint.operator) {
                case '<':
                case '<=':
                    penalty = Math.max(0, value) ** 2;
                    break;
                case '>':
                case '>=':
                    penalty = Math.max(0, -value) ** 2;
                    break;
                case '=':
                    penalty = value ** 2;
                    break;
            }
            hardPenalty += weight * penalty;
        });

        const objective = l2Penalty + softPenalty;

        // Process hard constraints: transform for ConstrainedFitnessAL
        const hardEvaluatedConstraints = [];
        hardConstraints.forEach(hc => {
            const idx = constraints.indexOf(hc);
            if (idx !== -1) {
                hardEvaluatedConstraints.push(evaluatedConstraints[idx]);
            }
        });

        const alConstraints = this.transformConstraintsForAL(
            hardConstraints,
            hardEvaluatedConstraints,
            defaultTolerance
        );
        const constraintViolation = this.calculateConstraintViolation(alConstraints);

        // Legacy distance for backward compatibility (first constraint if it's distance)
        const distance = evaluatedConstraints[0] || 0;

        return {
            objective,                      // L2 penalty + soft penalties
            l2Penalty,                      // L2 norm of slider changes
            softPenalty,                    // Soft constraint penalty
            hardPenalty,                    // Hard constraint penalty (for display)
            alConstraints,                  // Transformed hard constraints for ConstrainedFitnessAL
            constraintViolation,            // For display
            evaluatedConstraints,           // Raw evaluated values
            distance                        // Legacy
        };
    }

    /**
     * Calculate deltas for each slider
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
     * Calculate deltas between current and initial slider values
     * @param {number[]} currentValues - Current values
     * @param {number[]} initialValues - Initial values
     * @param {string[]} selectedSliders - Names of selected sliders
     * @returns {Object} Object with deltas { sliderName: delta, ... }
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
     * Stop optimization
     */
    stop() {
        this.stopRequested = true;
    }

    /**
     * Reset the optimizer
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
     * Get parsed constraints from GeoGebra XML.
     *
     * @returns {Array<{type: string, operator: string, label: string, expression: string}>} Array of constraints
     * @example
     * const constraints = optimizer.getConstraints();
     * console.log(constraints); // [{ type: 'hard', operator: '=', label: 'A=A\'', expression: 'Distance[A, A\']' }]
     */
    getConstraints() {
        return this.geogebraManager.getConstraints();
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
     * Clean up resources
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
