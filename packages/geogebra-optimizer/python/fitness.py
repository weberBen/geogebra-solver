"""
Fonctions de calcul de fitness pour l'optimisation
"""


def calculate_regularization_penalty(current_values, initial_values):
    """
    Calcule la pénalité de régularisation L2

    Args:
        current_values: Valeurs actuelles des paramètres
        initial_values: Valeurs initiales des paramètres

    Returns:
        Somme des carrés des écarts
    """
    penalty = 0.0
    for i in range(len(current_values)):
        diff = current_values[i] - initial_values[i]
        penalty += diff * diff
    return penalty


def calculate_total_delta(current_values, initial_values):
    """
    Calcule la somme des valeurs absolues des écarts

    Args:
        current_values: Valeurs actuelles
        initial_values: Valeurs initiales

    Returns:
        Somme des |Δ|
    """
    total = 0.0
    for i in range(len(current_values)):
        total += abs(current_values[i] - initial_values[i])
    return total
