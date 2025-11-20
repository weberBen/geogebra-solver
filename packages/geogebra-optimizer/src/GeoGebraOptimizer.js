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
 * @property {string[]} selectedVariables - Names of variables to optimize
 * @property {Constraint[]} [constraints] - List of constraints
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
 * optimizer.on('ready', ({ ggbApi, variables }) => {
 *   console.log('Ready with variables:', variables);
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
 * // Optimize with constraints
 * await optimizer.optimize({
 *   selectedVariables: ['AB', 'BC', 'CD'],
 *   constraints: [
 *     { expr: "Distance(A', A)", op: "=", value: 0, tolerance: 1e-4 }
 *   ],
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
     * @fires GeoGebraOptimizer#constraints:loaded - When variables are detected
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
            this.forwardEvents(this.geogebraManager, ['geogebra:loading', 'geogebra:ready', 'constraints:loaded', 'variable:changed', 'variables:updated', 'error']);

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
                variables: this.geogebraManager.getVariables()
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
     * Optimizes selected variables to minimize distance between points while
     * applying regularization to keep changes small.
     *
     * @async
     * @param {OptimizeOptions} options - Optimization options
     * @returns {Promise<void>}
     * @throws {Error} If optimization is already running or no variables selected
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
     * // Constrained optimization with
     * await optimizer.optimize({
     *   selectedVariables: ['AB', 'BC'],
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
     *   selectedVariables: ['AB', 'BC'],
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
            selectedVariables,
            constraints: rawConstraints,
            defaultTolerance = 1e-4,
            solverParams = { maxiter: 100, popsize: 10, sigma: 0.5, tolfun: 1e-6, progressStep: 1 }
        } = options;

        if (this.optimizationRunning) {
            throw new Error('Optimization already running');
        }

        if (!selectedVariables || selectedVariables.length === 0) {
            throw new Error('No variables selected');
        }

        // Handle empty or missing constraints
        let constraints;
        if (!rawConstraints || rawConstraints.length === 0) {
            console.warn('No constraints provided. Optimization will run with objective function only.');
            this.emit('log', {
                level: 'warning',
                message: 'No constraints provided. Optimization will run with objective function only.'
            });
            constraints = []; // Initialize as empty array to avoid undefined errors
        } else {
            constraints = rawConstraints;
        }

        this.optimizationRunning = true;
        this.stopRequested = false;
        this.state.isOptimizing = true;

        // Initialize progress tracker
        const maxEvaluations = solverParams.maxiter * solverParams.popsize;
        this.progressTracker = new ProgressTracker(maxEvaluations, solverParams.progressStep || 1);

        this.emit('optimization:start', { selectedVariables, solverParams, constraints, defaultTolerance });

        try {
            // Prepare bounds and initial values
            const bounds = { min: [], max: [], initial: [] };
            const variableObjects = [];

            selectedVariables.forEach(name => {
                const variable = this.geogebraManager.getVariable(name);
                if (variable) {
                    bounds.min.push(variable.min);
                    bounds.max.push(variable.max);
                    bounds.initial.push(variable.value);
                    variableObjects.push(variable);
                }
            });

            // Initialize CMA-ES optimizer with or without ConstrainedFitnessAL
            const hasConstraints = constraints.length > 0 ? 'True' : 'False';
            
            const initCode = `
            es, cfun = initialize_optimizer(
                ${JSON.stringify(bounds.initial)},
                ${JSON.stringify(bounds.min)},
                ${JSON.stringify(bounds.max)},
                sigma=${solverParams.sigma},
                maxiter=${solverParams.maxiter},
                popsize=${solverParams.popsize},
                tolfun=${solverParams.tolfun},
                has_constraints=${hasConstraints}
            )
            "initialized"
            `;
            await this.pyodideManager.runPython(initCode);

            this.emit('log', {
                message: 'Optimizer initialized successfully',
                level: 'info',
                timestamp: new Date()
            });

            // Control GeoGebra rendering based on repaintingMode
            const repaintingMode = solverParams.repaintingMode || 'auto';
            if (repaintingMode === 'auto' || repaintingMode === 'never') {
                this.geogebraManager.setRepaintingActive(false);
                this.emit('log', {
                    message: `GeoGebra rendering disabled (mode: ${repaintingMode})`,
                    level: 'info',
                    timestamp: new Date()
                });
            } else if (repaintingMode === 'always') {
                this.geogebraManager.setRepaintingActive(true);
                this.emit('log', {
                    message: 'GeoGebra rendering always enabled (mode: always)',
                    level: 'info',
                    timestamp: new Date()
                });
            }

            let generation = 0;
            let totalEvaluations = 0;
            let bestFitness = Infinity;
            let bestSolution = null;
            let bestObjective = Infinity;
            let bestHardViolation = Infinity;
            let bestFeasibleSolution = null;
            let bestFeasibleObjective = Infinity;

            const initialValues = [...bounds.initial];

            // Optimization loop
            while (!this.stopRequested && generation < solverParams.maxiter) {
                // Ask for a new population
                const solutionsJson = await this.pyodideManager.runPython(`ask_solutions(es)`);
                const solutions = JSON.parse(solutionsJson);

                // Prepare batch evaluation data
                const evaluations = [];
                for (const solution of solutions) {
                    // Update variables
                    this.updateVariables(solution, selectedVariables);
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // Calculate objective and constraints
                    const result = this.calculateFitnessWithConstraints(
                        solution,
                        initialValues,
                        variableObjects,
                        constraints,
                        defaultTolerance
                    );

                    evaluations.push({
                        solution: solution,
                        objective: result.objective,
                        alConstraints: result.alConstraints,
                        movementPenalty: result.movementPenalty,
                        softConstraintsViolation: result.softConstraintsViolation,
                        evaluatedConstraints: result.evaluatedConstraints
                    });
                }

                // Batch evaluate all solutions in Python (single call!)
                const batchResultJson = await this.pyodideManager.runPython(
                    `evaluate_batch(${JSON.stringify(evaluations)})`
                );
                const batchResult = JSON.parse(batchResultJson);
                const { fitnesses, feasibilities, cmaesMetrics } = batchResult;

                // Process results
                for (let i = 0; i < solutions.length; i++) {
                    const solution = solutions[i];
                    const fitness = fitnesses[i];
                    const feasible = feasibilities[i];
                    const evalData = evaluations[i];

                    totalEvaluations++;

                    // Update progress tracker and emit event if threshold crossed
                    const shouldNotify = this.progressTracker.update(totalEvaluations);
                    if (shouldNotify) {
                        // Calculate current deltas and get variable values
                        const currentDeltas = this.calculateCurrentDeltas(solution, initialValues, selectedVariables);
                        const variableValues = this.geogebraManager.getVariableValues();

                        this.emit('optimization:progress-update', {
                            ...this.progressTracker.getProgress(),
                            deltas: currentDeltas,
                            variableValues: variableValues
                        });
                    }

                    // Update if better solution (overall best by fitness)
                    if (fitness < bestFitness) {
                        bestFitness = fitness;
                        bestSolution = [...solution];
                        bestObjective = evalData.objective;
                        bestHardViolation = cmaesMetrics?.hardViolation ?? 0;
                    }

                    // Track best feasible solution separately (compare by objective)
                    if (feasible && evalData.objective < bestFeasibleObjective) {
                        bestFeasibleObjective = evalData.objective;
                        bestFeasibleSolution = [...solution];

                        // Calculer deltas
                        const deltas = this.calculateDeltas(solution, initialValues, selectedVariables);

                        const metrics = {
                            bestObjective: evalData.objective,
                            bestHardViolation: cmaesMetrics?.hardViolation ?? 0,
                            bestMovementPenalty: evalData.movementPenalty,
                            bestSoftViolation: evalData.softConstraintsViolation,
                            totalDelta: deltas.totalDelta,
                            generation,
                            evaluations: totalEvaluations,
                            feasible: true
                        };

                        this.emit('optimization:newBest', {
                            solution,
                            metrics,
                            deltas: deltas.variableDeltas
                        });

                        this.emit('log', {
                            message: `New best feasible solution: objective=${evalData.objective.toFixed(6)} (movement=${evalData.movementPenalty.toFixed(6)}, soft=${evalData.softConstraintsViolation.toFixed(6)})`,
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

                // Emit progress (use last evaluation data)
                const lastEvalData = evaluations[evaluations.length - 1];

                this.emit('optimization:progress', {
                    generation,
                    evaluations: totalEvaluations,
                    currentSolution: solutions[solutions.length - 1],
                    metrics: {
                        currentObjective: lastEvalData.objective,
                        currentMovementPenalty: lastEvalData.movementPenalty,
                        currentSoftViolation: lastEvalData.softConstraintsViolation,
                        currentConstraintValues: lastEvalData.evaluatedConstraints,
                        bestObjective: bestObjective,
                        bestHardViolation: bestHardViolation,
                        bestFitness,
                        generation,
                        evaluations: totalEvaluations,
                        // CMA-ES metrics (exact values from last solution)
                        cmaesMetrics: cmaesMetrics
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

            // Get best feasible solution from CMA-ES
            const bestFeasibleJson = await this.pyodideManager.runPython(`get_best_feasible(cfun)`);
            const bestFeasibleFromCMAES = JSON.parse(bestFeasibleJson);

            // Appliquer la meilleure solution faisable (ou meilleure solution si aucune faisable)
            const finalSolution = bestFeasibleSolution || bestSolution;
            if (finalSolution) {
                this.updateVariables(finalSolution, selectedVariables);
                const finalResult = this.calculateFitnessWithConstraints(
                    finalSolution,
                    initialValues,
                    variableObjects,
                    constraints,
                    defaultTolerance
                );
                const deltas = this.calculateDeltas(finalSolution, initialValues, selectedVariables);

                const finalMetrics = {
                    bestObjective: bestFeasibleSolution ? bestFeasibleObjective : bestObjective,
                    bestMovementPenalty: finalResult.movementPenalty,
                    bestSoftViolation: finalResult.softConstraintsViolation,
                    bestHardViolation: bestHardViolation,
                    totalDelta: deltas.totalDelta,
                    generation,
                    evaluations: totalEvaluations,
                    feasible: bestFeasibleSolution !== null
                };

                const feasibilityMsg = bestFeasibleSolution
                    ? `Feasible solution found (objective=${bestFeasibleObjective.toFixed(6)}, hardViolation=${bestHardViolation.toFixed(6)})`
                    : `No feasible solution (objective=${bestObjective.toFixed(6)}, hardViolation=${bestHardViolation.toFixed(6)})`;

                this.emit('log', {
                    message: feasibilityMsg,
                    level: bestFeasibleSolution ? 'info' : 'warn',
                    timestamp: new Date()
                });

                this.emit('optimization:complete', {
                    bestSolution: finalSolution,
                    finalMetrics,
                    deltas: deltas.variableDeltas,
                    bestFeasibleFromCMAES: bestFeasibleFromCMAES  // Include CMA-ES best feasible
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
            // Re-enable GeoGebra rendering based on repaintingMode
            const repaintingMode = solverParams.repaintingMode || 'auto';
            if (repaintingMode === 'auto') {
                // Auto mode: restore rendering after optimization
                this.geogebraManager.setRepaintingActive(true);
            }
            // For 'always' and 'never': don't change (already in desired state)

            this.optimizationRunning = false;
            this.state.isOptimizing = false;
        }
    }

    /**
     * Update variables with new values
     */
    updateVariables(values, selectedVariables) {
        const updates = {};
        selectedVariables.forEach((name, index) => {
            updates[name] = values[index];
        });
        this.geogebraManager.setVariableValues(updates);
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
                    // g >= 0 → -g ≤ 0 (relaxed contraint: g ≥ -tol)
                    alConstraints.push(-g - tol);
                    break;

                case '<':
                    // g < 0 → g < 0 (relaxed contraint: g ≤ tol)
                    alConstraints.push(g - tol);
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
     * Calculate fitness with constraints
     *
     * Returns only what's needed for CMA-ES:
     * - objective (movement + soft)
     * - alConstraints (hard, transformed)
     *
     * Hard violations are retrieved from CMA-ES (not calculated here)
     */
    calculateFitnessWithConstraints(currentValues, initialValues, variableObjects, constraints, defaultTolerance) {
        // Movement penalty (minimize parameter changes)
        let movementPenalty = 0;
        if (currentValues && initialValues) {
            for (let i = 0; i < currentValues.length; i++) {
                // Skip hidden parameters
                if (variableObjects[i]?.hidden) {
                    continue;
                }

                const diff = currentValues[i] - initialValues[i];
                const weight = variableObjects[i]?.weight ?? 1;
                movementPenalty += weight * diff * diff;
            }
        }

        // Separate hard and soft constraints
        const hardConstraints = constraints.filter(c => c.type === 'hard');
        const softConstraints = constraints.filter(c => c.type === 'soft');

        // Evaluate all constraints via GeoGebra
        const evaluatedConstraints = this.evaluateConstraints(constraints);

        // Soft constraints violation
        let softConstraintsViolation = 0;
        softConstraints.forEach(constraint => {
            const idx = constraints.indexOf(constraint);
            const value = evaluatedConstraints[idx];
            const weight = constraint.weight ?? 1;

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
            softConstraintsViolation += weight * penalty;
        });

        // Objective for CMA-ES
        const objective = movementPenalty + softConstraintsViolation;

        // Transform hard constraints for AL
        const hardEvaluatedConstraints = hardConstraints.map(hc => {
            const idx = constraints.indexOf(hc);
            return idx !== -1 ? evaluatedConstraints[idx] : 0;
        });

        const alConstraints = this.transformConstraintsForAL(
            hardConstraints,
            hardEvaluatedConstraints,
            defaultTolerance
        );

        return {
            objective,                      // Movement + soft
            movementPenalty,                // Regularization
            softConstraintsViolation,       // Soft penalties
            alConstraints,                  // Hard (g ≤ 0 format)
            evaluatedConstraints            // Raw values
        };
    }

    /**
     * Calculate deltas for each variable
     */
    calculateDeltas(currentValues, initialValues, selectedVariables) {
        let totalDelta = 0;
        const variableDeltas = {};

        selectedVariables.forEach((name, index) => {
            const delta = currentValues[index] - initialValues[index];
            totalDelta += Math.abs(delta);
            variableDeltas[name] = delta;
        });

        return { totalDelta, variableDeltas };
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
     * Calculate deltas between current and initial variable values
     * @param {number[]} currentValues - Current values
     * @param {number[]} initialValues - Initial values
     * @param {string[]} selectedVariables - Names of selected variables
     * @returns {Object} Object with deltas { variableName: delta, ... }
     */
    calculateCurrentDeltas(currentValues, initialValues, selectedVariables) {
        const deltas = {};

        if (!currentValues || !initialValues || !selectedVariables) {
            return deltas;
        }

        for (let i = 0; i < selectedVariables.length; i++) {
            const variableName = selectedVariables[i];
            const delta = currentValues[i] - initialValues[i];
            deltas[variableName] = delta;
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
     * Get all available variables from GeoGebra.
     *
     * @returns {Array<Object>} Array of variable objects with name, min, max, value, etc.
     * @example
     * const variables = optimizer.getVariables();
     * console.log(variables[0]); // { name: 'AB', min: 0, max: 10, value: 5, ... }
     */
    getVariables() {
        return this.geogebraManager.getVariables();
    }

    /**
     * Get a specific variable by name.
     *
     * @param {string} name - Variable name
     * @returns {Object|undefined} Variable object or undefined if not found
     * @example
     * const variable = optimizer.getVariable('AB');
     * if (variable) console.log(variable.value);
     */
    getVariable(name) {
        return this.geogebraManager.getVariable(name);
    }

    /**
     * Get current values of all variables.
     *
     * @returns {Object<string, number>} Object mapping variable names to values
     * @example
     * const values = optimizer.getVariableValues();
     * console.log(values); // { AB: 5, BC: 3.2, CD: 7.8 }
     */
    getVariableValues() {
        return this.geogebraManager.getVariableValues();
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
