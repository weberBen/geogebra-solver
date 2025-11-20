"""
CMA-ES optimizer for GeoGebra with hard constraints (ConstrainedFitnessAL)
"""
import cma
import json


# Storage for current evaluation values (set from JavaScript)
_current_objective = None
_current_constraints = []  # List of constraint values (AL-transformed)
cfun = None  # ConstrainedFitnessAL instance (set by initialize_optimizer)


def initialize_optimizer(initial_guess, bounds_min, bounds_max, sigma=0.5, maxiter=100, popsize=10, tolfun=1e-6, has_constraints=True):
    """
    Initialize CMA-ES optimizer with or without ConstrainedFitnessAL

    Args:
        initial_guess: Initial parameter values
        bounds_min: Minimum bounds
        bounds_max: Maximum bounds
        sigma: Initial step size
        maxiter: Maximum number of iterations
        popsize: Population size
        tolfun: Tolerance on objective function
        has_constraints: Whether to use ConstrainedFitnessAL (default True)

    Returns:
        Tuple (CMA-ES optimizer, ConstrainedFitnessAL or None)
    """
    global cfun

    bounds = [bounds_min, bounds_max]

    opts = {
        'bounds': bounds,
        'verb_disp': 1,
        'verb_log': 0,
        'maxiter': maxiter,
        'popsize': popsize,
        'tolfun': tolfun
    }

    es = cma.CMAEvolutionStrategy(initial_guess, sigma, opts)

    # If no constraints, return None as cfun
    if not has_constraints:
        cfun = None
        return es, None

    # Define wrapper functions that use stored values
    def objective_wrapper(x):
        """Returns stored objective (L2 penalty)"""
        return _current_objective

    def constraints_wrapper(x):
        """Returns stored constraints (dynamic list, already transformed for AL)"""
        # Constraint must be <= 0 to be satisfied
        # Constraints are already transformed on JavaScript side
        return _current_constraints

    # Create ConstrainedFitnessAL instance
    # find_feasible_first=True forces the algorithm to find a feasible solution before optimizing
    cfun = cma.ConstrainedFitnessAL(
        objective_wrapper,
        constraints_wrapper,
        find_feasible_first=True
    )

    return es, cfun


def ask_solutions(es):
    """
    Request a new population of solutions

    Args:
        es: CMA-ES optimizer

    Returns:
        List of solutions (JSON)
    """
    solutions = es.ask()
    return json.dumps([list(sol) for sol in solutions])


def tell_results(es, solutions, fitnesses, cfun):
    """
    Return evaluation results to optimizer and update AL coefficients

    Args:
        es: CMA-ES optimizer
        solutions: Evaluated solutions
        fitnesses: Corresponding fitness values
        cfun: ConstrainedFitnessAL instance or None

    Returns:
        "ok"
    """
    es.tell(solutions, fitnesses)
    # Only update AL coefficients if we have constraints
    if cfun is not None:
        cfun.update(es)
    return "ok"


def get_best_feasible(cfun):
    """
    Retrieve the best feasible solution found

    Args:
        cfun: ConstrainedFitnessAL instance or None

    Returns:
        JSON with {solution, objective, feasible} or None if no feasible solution
    """
    # If no constraints, there's no best_feas to return
    if cfun is None:
        return json.dumps(None)

    if cfun.best_feas is None or cfun.best_feas.x is None:
        return json.dumps(None)

    return json.dumps({
        'solution': list(cfun.best_feas.x),
        'objective': float(cfun.best_feas.f),
        'feasible': True
    })


def is_feasible(cfun):
    """
    Check if the last evaluated solution is feasible

    Args:
        cfun: ConstrainedFitnessAL instance

    Returns:
        True if feasible, False otherwise
    """
    if not hasattr(cfun, 'G') or len(cfun.G) == 0:
        return False

    # A solution is feasible if all constraints are <= 0
    last_constraints = cfun.G[-1]
    return all(g <= 0 for g in last_constraints)


def check_convergence(es):
    """
    Check if the optimizer has converged

    Args:
        es: CMA-ES optimizer

    Returns:
        Dictionary of stopping criteria (empty if not converged)
    """
    return str(es.stop())


def get_cmaes_metrics(cfun, last_solution):
    """
    Get EXACT metrics from ConstrainedFitnessAL (no approximation)

    Args:
        cfun: ConstrainedFitnessAL instance
        last_solution: Last evaluated solution

    Returns:
        JSON with exact CMA-ES metrics
    """
    if not hasattr(cfun, 'G') or len(cfun.G) == 0:
        return json.dumps(None)

    # Last evaluated constraints (raw g(x) values)
    last_constraints = cfun.G[-1]

    # EXACT: True AL fitness
    true_al_fitness = cfun(last_solution)

    # EXACT: AL penalty = fitness_AL - objective
    al_penalty = true_al_fitness - _current_objective

    # EXACT: Violations (max(0, g))
    violations = [max(0, g) for g in last_constraints]
    hard_violation = max(violations) if violations else 0
    mean_violation = sum(violations) / len(violations) if violations else 0

    # EXACT: Feasibility
    is_feas = all(g <= 0 for g in last_constraints)

    # EXACT: Lagrange multipliers
    lambda_vals = list(cfun.lambda_) if hasattr(cfun, 'lambda_') else []

    # EXACT: Penalty factor
    mu_val = float(cfun.mu) if hasattr(cfun, 'mu') else 1.0

    return json.dumps({
        'lambda': lambda_vals,
        'mu': mu_val,
        'alFitness': float(true_al_fitness),
        'alPenalty': float(al_penalty),
        'hardViolation': float(hard_violation),
        'meanViolation': float(mean_violation),
        'isFeasible': is_feas,
        'constraints': list(last_constraints)
    })


def evaluate_batch(evaluations):
    """
    Evaluate a batch of solutions with exact CMA-ES metrics

    Args:
        evaluations: List of {
            'solution': [x1, x2, ...],
            'objective': float,
            'alConstraints': [g1, g2, ...]
        }

    Returns:
        JSON with {
            'fitnesses': [...],
            'feasibilities': [...],
            'cmaesMetrics': {...}  # Exact metrics from last eval
        }
    """
    global _current_objective, _current_constraints, cfun

    fitnesses = []
    feasibilities = []
    last_solution = None

    for eval_data in evaluations:
        solution = eval_data['solution']

        # Update global variables
        _current_objective = eval_data['objective']
        _current_constraints = eval_data['alConstraints']

        # If no constraints (cfun is None), use objective directly
        if cfun is None:
            fitness = _current_objective
            feasible = True  # Always feasible if no constraints
        else:
            # Evaluate with ConstrainedFitnessAL
            fitness = cfun(solution)
            feasible = is_feasible(cfun)

        fitnesses.append(float(fitness))
        feasibilities.append(feasible)
        last_solution = solution

    # Get EXACT metrics from last eval (only if constraints exist)
    cmaes_metrics = None
    if last_solution is not None and cfun is not None:
        metrics_json = get_cmaes_metrics(cfun, last_solution)
        cmaes_metrics = json.loads(metrics_json) if metrics_json else None

    return json.dumps({
        'fitnesses': fitnesses,
        'feasibilities': feasibilities,
        'cmaesMetrics': cmaes_metrics
    })
