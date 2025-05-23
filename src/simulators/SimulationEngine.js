import PriorityQueue from '../utils/PriorityQueue.js';
import EntityManager from '../utils/EntityManager.js';
import ResourceManager from '../utils/ResourceManager.js';
import EventLogger from '../utils/EventLogger.js';
import PredictionService from '../ml/PredictionService.js';

/**
 * Base Simulation Engine class
 * Provides the foundation for different types of simulations
 */
class SimulationEngine {
  /**
   * Constructor for the simulation engine
   * @param {Object} options - Simulation engine options
   * @param {boolean} options.debug - Whether debug mode is enabled
   * @param {boolean} options.logEvents - Whether to log events
   * @param {string} options.logLevel - Log level (debug, info, warn, error)
   * @param {boolean} options.enablePredictions - Whether to enable ML predictions
   * @param {Object} options.predictionService - Custom prediction service instance
   */
  constructor(options = {}) {
    // Simulation state
    this.eventQueue = new PriorityQueue((a, b) => a.priority - b.priority);
    this.currentTime = 0;
    this.config = {};
    this.results = {};
    this.isRunning = false;
    this.simulationSpeed = 1.0;
    this.pauseTime = null;

    // Entity and resource management
    this.entityManager = new EntityManager();
    this.resourceManager = new ResourceManager();

    // Event logging
    this.debug = options.debug || false;
    this.logger = new EventLogger({
      enabled: options.logEvents !== undefined ? options.logEvents : this.debug,
      logLevel: options.logLevel || (this.debug ? 'debug' : 'info'),
      logToConsole: this.debug
    });

    // Machine learning integration
    this.enablePredictions = options.enablePredictions !== undefined ? options.enablePredictions : false;
    this.predictionService = options.predictionService || new PredictionService({ logger: this.logger });

    // Statistics
    this.stats = {
      startTime: null,
      endTime: null,
      processingTime: 0,
      eventCount: 0,
      entityCount: 0,
      resourceCount: 0
    };

    // Event handlers
    this.eventHandlers = new Map();

    // Register default event handlers
    this._registerDefaultEventHandlers();
  }

  /**
   * Register default event handlers
   * @private
   */
  _registerDefaultEventHandlers() {
    // Default handler for simulation start
    this.registerEventHandler('simulation_start', (event) => {
      this.logger.info('simulation', 'Simulation started', null, {
        config: this.config
      }, event.time);
    });

    // Default handler for simulation end
    this.registerEventHandler('simulation_end', (event) => {
      this.logger.info('simulation', 'Simulation ended', null, {
        stats: this.stats
      }, event.time);
    });

    // Default handler for simulation pause
    this.registerEventHandler('simulation_pause', (event) => {
      this.logger.info('simulation', 'Simulation paused', null, {
        currentTime: event.time
      }, event.time);
    });

    // Default handler for simulation resume
    this.registerEventHandler('simulation_resume', (event) => {
      this.logger.info('simulation', 'Simulation resumed', null, {
        currentTime: event.time
      }, event.time);
    });
  }

  /**
   * Initialize the simulation with configuration
   * @param {Object} config - Configuration parameters for the simulation
   */
  initialize(config) {
    this.config = config;
    this.currentTime = 0;
    this.eventQueue.clear();
    this.entityManager.clear();
    this.resourceManager.clear();
    this.results = {};
    this.isRunning = false;
    this.pauseTime = null;

    // Reset statistics
    this.stats = {
      startTime: null,
      endTime: null,
      processingTime: 0,
      eventCount: 0,
      entityCount: 0,
      resourceCount: 0
    };

    // Clear event log
    this.logger.clear();

    // Log initialization
    this.logger.info('simulation', 'Simulation initialized', null, {
      config: this.config
    }, this.currentTime);

    // This method should be overridden by subclasses
    this._initializeResources();
    this._scheduleInitialEvents();

    // Schedule simulation start event
    this.scheduleEvent(0, null, 'simulation_start');
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
   * Register an event handler
   * @param {string} eventType - The type of event to handle
   * @param {Function} handler - The handler function
   */
  registerEventHandler(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType).push(handler);
  }

  /**
   * Unregister an event handler
   * @param {string} eventType - The type of event
   * @param {Function} handler - The handler function to remove
   * @returns {boolean} - True if the handler was removed
   */
  unregisterEventHandler(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      return false;
    }

    const handlers = this.eventHandlers.get(eventType);
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);

      if (handlers.length === 0) {
        this.eventHandlers.delete(eventType);
      }

      return true;
    }

    return false;
  }

  /**
   * Schedule an event to occur at a specific time
   * @param {number} time - The time at which the event should occur
   * @param {Object} entity - The entity associated with the event
   * @param {string} eventType - The type of event
   * @param {Object} data - Additional data for the event
   * @param {number} priority - Optional priority value (higher value = higher priority)
   * @returns {Object} - The scheduled event
   */
  scheduleEvent(time, entity, eventType, data = {}, priority = 0) {
    // Ensure time is not before current time
    if (time < this.currentTime) {
      this.logger.warn('simulation', `Attempted to schedule event in the past: ${eventType}`, entity, {
        scheduledTime: time,
        currentTime: this.currentTime
      }, this.currentTime);

      time = this.currentTime;
    }

    // Calculate effective priority
    let effectivePriority = priority;

    // Adjust priority based on entity attributes if available
    if (entity && entity.priorityScore) {
      effectivePriority += entity.priorityScore;
    }

    // Adjust priority based on event type
    if (eventType.includes('emergency')) {
      effectivePriority += 50; // Emergency events get high priority
    } else if (eventType.includes('urgent')) {
      effectivePriority += 30; // Urgent events get medium priority
    } else if (eventType.includes('transfer')) {
      effectivePriority += 20; // Transfer events get some priority
    }

    // Create event object
    const event = {
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time,
      entity,
      entityId: entity ? entity.id : null,
      eventType,
      data,
      priority: effectivePriority,
      processed: false,
      createdAt: this.currentTime
    };

    // Add to event queue with composite priority (time and priority)
    // Events at the same time will be processed in order of priority
    const compositePriority = time - (effectivePriority / 1000); // Subtract a fraction based on priority
    this.eventQueue.enqueue(event, compositePriority);

    // Log event scheduling
    if (this.debug) {
      this.logger.debug('simulation', `Scheduled event: ${eventType}`, entity, {
        scheduledTime: time,
        priority: effectivePriority,
        compositePriority,
        data
      }, this.currentTime);
    }

    return event;
  }

  /**
   * Cancel a scheduled event
   * @param {Object|string} eventOrId - The event or event ID to cancel
   * @returns {boolean} - True if the event was cancelled
   */
  cancelEvent(eventOrId) {
    const eventId = typeof eventOrId === 'object' ? eventOrId.id : eventOrId;

    // Find and remove the event from the queue
    const removed = this.eventQueue.remove(
      e => e.id === eventId,
      (a, b) => a.id === b.id
    );

    if (removed) {
      this.logger.debug('simulation', `Cancelled event: ${removed.eventType}`, removed.entity, {
        scheduledTime: removed.time
      }, this.currentTime);
    }

    return removed;
  }

  /**
   * Process the next event in the queue
   * @returns {boolean} - True if an event was processed, false if the queue is empty
   */
  processNextEvent() {
    if (this.eventQueue.isEmpty()) {
      return false;
    }

    // Get the next event
    const event = this.eventQueue.dequeue();

    // Update current time
    this.currentTime = event.time;

    // Mark event as processed
    event.processed = true;

    // Log event processing
    if (this.debug) {
      this.logger.debug('simulation', `Processing event: ${event.eventType}`, event.entity, {
        time: event.time,
        data: event.data
      }, this.currentTime);
    }

    // Process the event
    try {
      // Call event handlers
      if (this.eventHandlers.has(event.eventType)) {
        for (const handler of this.eventHandlers.get(event.eventType)) {
          handler(event);
        }
      }

      // Call the process event method
      this._processEvent(event);

      // Update statistics
      this.stats.eventCount++;

    } catch (error) {
      this.logger.error('simulation', `Error processing event: ${event.eventType}`, event.entity, {
        error: error.message,
        stack: error.stack
      }, this.currentTime);

      if (this.debug) {
        console.error('Error processing event:', error);
      }
    }

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
    if (this.debug) {
      console.log(`Processing event: ${event.eventType} at time ${event.time}`);
    }
  }

  /**
   * Run the simulation until a specified end time
   * @param {number} endTime - The time at which to end the simulation
   * @returns {Object} - The simulation results
   */
  run(endTime) {
    // Record start time
    const startWallTime = Date.now();
    this.stats.startTime = startWallTime;

    // Set running state
    this.isRunning = true;

    // Schedule simulation end event
    this.scheduleEvent(endTime, null, 'simulation_end');

    // Process events until end time or no more events
    while (this.isRunning && this.currentTime <= endTime && !this.eventQueue.isEmpty()) {
      this.processNextEvent();

      // Check if simulation should pause
      if (this.pauseTime !== null && this.currentTime >= this.pauseTime) {
        this.pause();
        break;
      }
    }

    // Record end time and processing time
    this.stats.endTime = Date.now();
    this.stats.processingTime = this.stats.endTime - startWallTime;

    // Update entity and resource counts
    this.stats.entityCount = this.entityManager.getEntityCount();
    this.stats.resourceCount = this.resourceManager.getAllResources().length;

    // Set running state
    this.isRunning = false;

    // Collect and return results
    return this.collectResults();
  }

  /**
   * Run the simulation step by step
   * @param {number} steps - Number of steps to run
   * @returns {boolean} - True if steps were processed, false if no more events
   */
  step(steps = 1) {
    if (!this.isRunning) {
      this.isRunning = true;
    }

    let stepsProcessed = 0;

    for (let i = 0; i < steps; i++) {
      if (!this.processNextEvent()) {
        break;
      }

      stepsProcessed++;
    }

    return stepsProcessed > 0;
  }

  /**
   * Pause the simulation
   * @param {number} atTime - Time at which to pause (if not provided, pause immediately)
   */
  pause() {
    if (this.isRunning) {
      this.isRunning = false;

      // Schedule pause event
      this.scheduleEvent(this.currentTime, null, 'simulation_pause');

      this.logger.info('simulation', 'Simulation paused', null, {
        currentTime: this.currentTime
      }, this.currentTime);
    }
  }

  /**
   * Resume the simulation
   */
  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.pauseTime = null;

      // Schedule resume event
      this.scheduleEvent(this.currentTime, null, 'simulation_resume');

      this.logger.info('simulation', 'Simulation resumed', null, {
        currentTime: this.currentTime
      }, this.currentTime);
    }
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
    this.pauseTime = null;

    this.logger.info('simulation', 'Simulation stopped', null, {
      currentTime: this.currentTime
    }, this.currentTime);
  }

  /**
   * Reset the simulation
   */
  reset() {
    this.initialize(this.config);

    this.logger.info('simulation', 'Simulation reset', null, {
      config: this.config
    }, this.currentTime);
  }

  /**
   * Set simulation speed
   * @param {number} speed - Simulation speed multiplier
   */
  setSimulationSpeed(speed) {
    this.simulationSpeed = speed;

    this.logger.info('simulation', 'Simulation speed changed', null, {
      speed
    }, this.currentTime);
  }

  /**
   * Collect results from the simulation
   * This method should be overridden by subclasses
   * @returns {Object} - The simulation results
   */
  collectResults() {
    // To be implemented by subclasses
    return {
      ...this.results,
      stats: this.stats
    };
  }

  /**
   * Add an entity to the simulation
   * @param {Object} entity - The entity to add
   * @returns {boolean} - True if the entity was added successfully
   */
  addEntity(entity) {
    const result = this.entityManager.addEntity(entity);

    if (result) {
      this.logger.debug('entity', `Entity added: ${entity.id}`, entity, {}, this.currentTime);
    }

    return result;
  }

  /**
   * Remove an entity from the simulation
   * @param {Object|string} entityOrId - The entity or entity ID to remove
   * @returns {boolean} - True if the entity was removed successfully
   */
  removeEntity(entityOrId) {
    const id = typeof entityOrId === 'object' ? entityOrId.id : entityOrId;
    const entity = this.entityManager.getEntity(id);

    if (!entity) {
      return false;
    }

    const result = this.entityManager.removeEntity(id);

    if (result) {
      this.logger.debug('entity', `Entity removed: ${id}`, entity, {}, this.currentTime);
    }

    return result;
  }

  /**
   * Get an entity by ID
   * @param {string} id - Entity ID
   * @returns {Object|null} - The entity or null if not found
   */
  getEntity(id) {
    return this.entityManager.getEntity(id);
  }

  /**
   * Get all entities
   * @returns {Array} - Array of all entities
   */
  getAllEntities() {
    return this.entityManager.getAllEntities();
  }

  /**
   * Get entities by type
   * @param {string} type - Entity type
   * @returns {Array} - Array of entities of the specified type
   */
  getEntitiesByType(type) {
    return this.entityManager.getEntitiesByType(type);
  }

  /**
   * Add a resource to the simulation
   * @param {string} resourceId - The ID of the resource
   * @param {Object} resource - The resource to add
   * @param {string} poolName - Optional pool name to add the resource to
   * @returns {boolean} - True if the resource was added successfully
   */
  addResource(resourceId, resource, poolName = null) {
    // Set resource ID if not already set
    if (!resource.id) {
      resource.id = resourceId;
    }

    const result = this.resourceManager.addResource(resource, poolName);

    if (result) {
      this.logger.debug('resource', `Resource added: ${resourceId}`, null, {
        poolName
      }, this.currentTime);
    }

    return result;
  }

  /**
   * Get a resource by ID
   * @param {string} resourceId - The ID of the resource
   * @returns {Object|null} - The resource or null if not found
   */
  getResource(resourceId) {
    return this.resourceManager.getResource(resourceId);
  }

  /**
   * Get all resources
   * @returns {Array} - Array of all resources
   */
  getAllResources() {
    return this.resourceManager.getAllResources();
  }

  /**
   * Get resources by type
   * @param {string} type - Resource type
   * @returns {Array} - Array of resources of the specified type
   */
  getResourcesByType(type) {
    return this.resourceManager.getResourcesByType(type);
  }

  /**
   * Allocate a resource to an entity
   * @param {string} resourceId - Resource ID
   * @param {Object} entity - Entity to allocate the resource to
   * @param {number} amount - Amount of resource to allocate
   * @returns {boolean} - True if allocation was successful
   */
  allocateResource(resourceId, entity, amount = 1) {
    const result = this.resourceManager.allocateResource(resourceId, entity, amount, this.currentTime);

    if (result) {
      this.logger.debug('resource', `Resource allocated: ${resourceId}`, entity, {
        amount
      }, this.currentTime);
    }

    return result;
  }

  /**
   * Release a resource from an entity
   * @param {string} resourceId - Resource ID
   * @param {Object} entity - Entity to release the resource from
   * @returns {boolean} - True if release was successful
   */
  releaseResource(resourceId, entity) {
    const result = this.resourceManager.releaseResource(resourceId, entity, this.currentTime);

    if (result) {
      this.logger.debug('resource', `Resource released: ${resourceId}`, entity, {}, this.currentTime);
    }

    return result;
  }

  /**
   * Get resource statistics
   * @param {string} resourceId - Resource ID
   * @returns {Object|null} - Resource statistics or null if not found
   */
  getResourceStats(resourceId) {
    return this.resourceManager.getResourceStats(resourceId);
  }

  /**
   * Get average utilization of a resource over a time period
   * @param {string} resourceId - Resource ID
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {number|null} - Average utilization rate or null if not available
   */
  getAverageUtilization(resourceId, startTime, endTime) {
    return this.resourceManager.getAverageUtilization(resourceId, startTime, endTime);
  }

  /**
   * Get simulation statistics
   * @returns {Object} - Simulation statistics
   */
  getStatistics() {
    return { ...this.stats };
  }

  /**
   * Get event log
   * @returns {Array} - Array of logged events
   */
  getEventLog() {
    return this.logger.getAllEvents();
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugMode(enabled) {
    this.debug = enabled;
    this.logger.setLogLevel(enabled ? 'debug' : 'info');
    this.logger.setLogToConsole(enabled);
  }

  /**
   * Enable or disable predictions
   * @param {boolean} enabled - Whether predictions are enabled
   */
  setPredictionsEnabled(enabled) {
    this.enablePredictions = enabled;

    this.logger.info('simulation', `Predictions ${enabled ? 'enabled' : 'disabled'}`, null, {}, this.currentTime);
  }

  /**
   * Register a machine learning model
   * @param {string} modelId - Model ID
   * @param {Object} model - Model instance
   * @param {boolean} setAsDefault - Whether to set this model as the default
   * @returns {boolean} - Whether the model was registered successfully
   */
  registerModel(modelId, model, setAsDefault = false) {
    const result = this.predictionService.registerModel(modelId, model, setAsDefault);

    if (result) {
      this.logger.info('ml', `Model ${modelId} registered`, null, {
        modelType: model.type,
        setAsDefault
      }, this.currentTime);
    }

    return result;
  }

  /**
   * Make a prediction using a model
   * @param {Object} input - Input data
   * @param {string} modelId - Model ID
   * @returns {Promise} - Promise that resolves with the prediction
   */
  async predict(input, modelId = null) {
    if (!this.enablePredictions) {
      this.logger.warn('ml', 'Predictions are disabled', null, {}, this.currentTime);
      return null;
    }

    try {
      const prediction = await this.predictionService.predict(input, modelId);

      this.logger.debug('ml', `Prediction made with model ${modelId || 'default'}`, null, {
        input,
        prediction
      }, this.currentTime);

      return prediction;
    } catch (error) {
      this.logger.error('ml', `Error making prediction: ${error.message}`, null, {
        input,
        modelId,
        error: error.stack
      }, this.currentTime);

      return null;
    }
  }

  /**
   * Make a time series forecast
   * @param {Array} history - Historical data
   * @param {Object} options - Forecast options
   * @returns {Promise} - Promise that resolves with the forecast
   */
  async forecast(history, options = {}) {
    if (!this.enablePredictions) {
      this.logger.warn('ml', 'Predictions are disabled', null, {}, this.currentTime);
      return null;
    }

    try {
      const forecast = await this.predictionService.forecast(history, options);

      this.logger.debug('ml', `Forecast made with model ${options.modelId || 'default'}`, null, {
        historyLength: history.length,
        forecastLength: forecast.length,
        options
      }, this.currentTime);

      return forecast;
    } catch (error) {
      this.logger.error('ml', `Error making forecast: ${error.message}`, null, {
        historyLength: history.length,
        options,
        error: error.stack
      }, this.currentTime);

      return null;
    }
  }

  /**
   * Create a prediction model from simulation data
   * @param {string} modelType - Type of model to create
   * @param {Object} options - Model creation options
   * @returns {Promise} - Promise that resolves with the model
   */
  async createPredictionModel(modelType, options = {}) {
    if (!this.enablePredictions) {
      this.logger.warn('ml', 'Predictions are disabled', null, {}, this.currentTime);
      return null;
    }

    try {
      let model;

      switch (modelType) {
        case 'arrival_rate':
          model = this.predictionService.createArrivalRateModel(options.historicalData || []);
          break;
        case 'length_of_stay':
          model = this.predictionService.createLengthOfStayModel(options.patientData || []);
          break;
        case 'resource_utilization':
          model = this.predictionService.createResourceUtilizationModel(
            options.utilizationData || [],
            options.resourceType || 'unknown'
          );
          break;
        case 'waiting_time':
          model = this.predictionService.createWaitingTimeModel(options.waitingTimeData || []);
          break;
        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }

      this.logger.info('ml', `Created ${modelType} prediction model`, null, {
        modelType,
        options
      }, this.currentTime);

      return model;
    } catch (error) {
      this.logger.error('ml', `Error creating prediction model: ${error.message}`, null, {
        modelType,
        options,
        error: error.stack
      }, this.currentTime);

      return null;
    }
  }
}

// Export the SimulationEngine class
export default SimulationEngine;
