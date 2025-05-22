/**
 * Base Simulation Engine class
 * Provides the foundation for different types of simulations
 */
class SimulationEngine {
  /**
   * Constructor for the simulation engine
   */
  constructor() {
    this.eventQueue = [];
    this.currentTime = 0;
    this.entities = [];
    this.resources = {};
    this.config = {};
    this.results = {};
    this.isRunning = false;
  }

  /**
   * Initialize the simulation with configuration
   * @param {Object} config - Configuration parameters for the simulation
   */
  initialize(config) {
    this.config = config;
    this.currentTime = 0;
    this.eventQueue = [];
    this.entities = [];
    this.resources = {};
    this.results = {};
    this.isRunning = false;
    
    // This method should be overridden by subclasses
    this._initializeResources();
    this._scheduleInitialEvents();
  }

  /**
   * Initialize resources based on configuration
   * This method should be overridden by subclasses
   * @protected
   */
  _initializeResources() {
    // To be implemented by subclasses
  }

  /**
   * Schedule initial events
   * This method should be overridden by subclasses
   * @protected
   */
  _scheduleInitialEvents() {
    // To be implemented by subclasses
  }

  /**
   * Schedule an event to occur at a specific time
   * @param {number} time - The time at which the event should occur
   * @param {Object} entity - The entity associated with the event
   * @param {string} eventType - The type of event
   * @param {Object} data - Additional data for the event
   */
  scheduleEvent(time, entity, eventType, data = {}) {
    this.eventQueue.push({
      time,
      entity,
      eventType,
      data
    });
    
    // Sort the event queue by time
    this.eventQueue.sort((a, b) => a.time - b.time);
  }

  /**
   * Process the next event in the queue
   * @returns {boolean} - True if an event was processed, false if the queue is empty
   */
  processNextEvent() {
    if (this.eventQueue.length === 0) {
      return false;
    }
    
    const event = this.eventQueue.shift();
    this.currentTime = event.time;
    
    // Process the event based on its type
    this._processEvent(event);
    
    return true;
  }

  /**
   * Process an event
   * This method should be overridden by subclasses
   * @param {Object} event - The event to process
   * @protected
   */
  _processEvent(event) {
    // To be implemented by subclasses
    console.log(`Processing event: ${event.eventType} at time ${event.time}`);
  }

  /**
   * Run the simulation until a specified end time
   * @param {number} endTime - The time at which to end the simulation
   * @returns {Object} - The simulation results
   */
  run(endTime) {
    this.isRunning = true;
    
    while (this.isRunning && this.currentTime < endTime && this.processNextEvent()) {
      // Continue processing events
    }
    
    this.isRunning = false;
    
    // Collect and return results
    return this.collectResults();
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Collect results from the simulation
   * This method should be overridden by subclasses
   * @returns {Object} - The simulation results
   */
  collectResults() {
    // To be implemented by subclasses
    return this.results;
  }

  /**
   * Add an entity to the simulation
   * @param {Object} entity - The entity to add
   */
  addEntity(entity) {
    this.entities.push(entity);
  }

  /**
   * Remove an entity from the simulation
   * @param {Object} entity - The entity to remove
   */
  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  /**
   * Add a resource to the simulation
   * @param {string} resourceId - The ID of the resource
   * @param {Object} resource - The resource to add
   */
  addResource(resourceId, resource) {
    this.resources[resourceId] = resource;
  }

  /**
   * Get a resource from the simulation
   * @param {string} resourceId - The ID of the resource
   * @returns {Object} - The resource
   */
  getResource(resourceId) {
    return this.resources[resourceId];
  }
}

// Export the SimulationEngine class
export default SimulationEngine;
