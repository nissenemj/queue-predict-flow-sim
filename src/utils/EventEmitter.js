/**
 * EventEmitter.js
 * Simple event emitter implementation
 */

/**
 * EventEmitter class
 * Provides event handling functionality
 */
class EventEmitter {
  /**
   * Constructor for the EventEmitter class
   */
  constructor() {
    this.events = new Map();
  }
  
  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {EventEmitter} - This instance for chaining
   */
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event).push(handler);
    
    return this;
  }
  
  /**
   * Register a one-time event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {EventEmitter} - This instance for chaining
   */
  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler);
      handler(...args);
    };
    
    return this.on(event, onceHandler);
  }
  
  /**
   * Unregister an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {EventEmitter} - This instance for chaining
   */
  off(event, handler) {
    if (!this.events.has(event)) {
      return this;
    }
    
    const handlers = this.events.get(event);
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
    
    if (handlers.length === 0) {
      this.events.delete(event);
    }
    
    return this;
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @returns {boolean} - Whether the event had handlers
   */
  emit(event, data) {
    if (!this.events.has(event)) {
      return false;
    }
    
    const handlers = this.events.get(event);
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
    
    return true;
  }
  
  /**
   * Get all registered event names
   * @returns {Array} - Array of event names
   */
  eventNames() {
    return Array.from(this.events.keys());
  }
  
  /**
   * Get all handlers for an event
   * @param {string} event - Event name
   * @returns {Array} - Array of handlers
   */
  listeners(event) {
    return this.events.has(event) ? [...this.events.get(event)] : [];
  }
  
  /**
   * Get number of handlers for an event
   * @param {string} event - Event name
   * @returns {number} - Number of handlers
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }
  
  /**
   * Remove all handlers for an event
   * @param {string} event - Event name
   * @returns {EventEmitter} - This instance for chaining
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    
    return this;
  }
}

// Export the class
export { EventEmitter };
