/**
 * EventBus - Simple EventEmitter implementation
 * Permet aux composants de communiquer via des événements
 */
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Enregistre un listener pour un événement
     * @param {string} event - Nom de l'événement
     * @param {Function} callback - Fonction à appeler
     * @returns {Function} Fonction pour se désinscrire
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event).push(callback);

        // Retourner une fonction de désinscription
        return () => this.off(event, callback);
    }

    /**
     * Enregistre un listener qui ne sera appelé qu'une seule fois
     * @param {string} event - Nom de l'événement
     * @param {Function} callback - Fonction à appeler
     * @returns {Function} Fonction pour se désinscrire
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };

        return this.on(event, onceWrapper);
    }

    /**
     * Désinscrit un listener
     * @param {string} event - Nom de l'événement
     * @param {Function} callback - Fonction à retirer
     */
    off(event, callback) {
        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
            callbacks.splice(index, 1);
        }

        // Nettoyer si plus de listeners
        if (callbacks.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Émet un événement
     * @param {string} event - Nom de l'événement
     * @param {*} data - Données à passer aux listeners
     */
    emit(event, data) {
        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for "${event}":`, error);
            }
        });
    }

    /**
     * Supprime tous les listeners
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Retourne le nombre de listeners pour un événement
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }
}
