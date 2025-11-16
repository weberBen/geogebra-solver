/**
 * EventBus - Simple EventEmitter implementation
 * Allows components to communicate via events
 */
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Register a listener for an event
     * @param {string} event - Event name
     * @param {Function} callback - Function to call
     * @returns {Function} Function to unsubscribe
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Register a listener that will only be called once
     * @param {string} event - Event name
     * @param {Function} callback - Function to call
     * @returns {Function} Function to unsubscribe
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };

        return this.on(event, onceWrapper);
    }

    /**
     * Unsubscribe a listener
     * @param {string} event - Event name
     * @param {Function} callback - Function to remove
     */
    off(event, callback) {
        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
            callbacks.splice(index, 1);
        }

        // Clean up if no more listeners
        if (callbacks.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Data to pass to listeners
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
     * Remove all listeners
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Return the number of listeners for an event
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }
}
