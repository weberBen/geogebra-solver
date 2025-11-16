"""
Optimiseur CMA-ES pour GeoGebra
"""
import cma
import json


def initialize_optimizer(initial_guess, bounds_min, bounds_max, sigma=0.5, maxiter=100, popsize=10, tolfun=1e-6):
    """
    Initialise l'optimiseur CMA-ES

    Args:
        initial_guess: Valeurs initiales des paramètres
        bounds_min: Bornes minimales
        bounds_max: Bornes maximales
        sigma: Écart-type initial
        maxiter: Nombre maximum d'itérations
        popsize: Taille de la population
        tolfun: Tolérance sur la fonction objectif

    Returns:
        Optimiseur CMA-ES initialisé
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

    return es


def ask_solutions(es):
    """
    Demande une nouvelle population de solutions

    Args:
        es: Optimiseur CMA-ES

    Returns:
        Liste de solutions (JSON)
    """
    solutions = es.ask()
    return json.dumps([list(sol) for sol in solutions])


def tell_results(es, solutions, fitnesses):
    """
    Retourne les résultats d'évaluation à l'optimiseur

    Args:
        es: Optimiseur CMA-ES
        solutions: Solutions évaluées
        fitnesses: Valeurs de fitness correspondantes

    Returns:
        "ok"
    """
    es.tell(solutions, fitnesses)
    return "ok"


def check_convergence(es):
    """
    Vérifie si l'optimiseur a convergé

    Args:
        es: Optimiseur CMA-ES

    Returns:
        Dictionnaire de critères d'arrêt (vide si pas convergé)
    """
    return str(es.stop())
