"""
CMA-ES optimizer for GeoGebra with hard constraints (ConstrainedFitnessAL)
"""
import cma
import json


# Storage for current evaluation values (set from JavaScript)
_current_objective = None
_current_constraints = []  # List of constraint values (AL-transformed)


def initialize_optimizer(initial_guess, bounds_min, bounds_max, sigma=0.5, maxiter=100, popsize=10, tolfun=1e-6):
    """
    Initialize CMA-ES optimizer with ConstrainedFitnessAL

    Args:
        initial_guess: Initial parameter values
        bounds_min: Minimum bounds
        bounds_max: Maximum bounds
        sigma: Initial step size
        maxiter: Maximum number of iterations
        popsize: Population size
        tolfun: Tolerance on objective function

    Returns:
        Tuple (CMA-ES optimizer, ConstrainedFitnessAL)
    """
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
        cfun: ConstrainedFitnessAL instance

    Returns:
        "ok"
    """
    es.tell(solutions, fitnesses)
    cfun.update(es)
    return "ok"


def get_best_feasible(cfun):
    """
    Retrieve the best feasible solution found

    Args:
        cfun: ConstrainedFitnessAL instance

    Returns:
        JSON with {solution, objective, feasible} or None if no feasible solution
    """
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
