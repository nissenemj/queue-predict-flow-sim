/**
 * Event Logger class for logging simulation events
 * Provides logging, filtering, and analysis of events
 */
class EventLogger {
  /**
   * Constructor for the EventLogger class
   * @param {Object} options - Logger options
   * @param {boolean} options.enabled - Whether logging is enabled
   * @param {string} options.logLevel - Log level (debug, info, warn, error)
   * @param {boolean} options.logToConsole - Whether to log to console
   * @param {number} options.maxEvents - Maximum number of events to store
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.logLevel = options.logLevel || 'info';
    this.logToConsole = options.logToConsole !== undefined ? options.logToConsole : true;
    this.maxEvents = options.maxEvents || 10000;
    
    this.events = [];
    this.eventTypes = new Set();
    this.entityEvents = new Map(); // Map of entity ID to array of event indices
    
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  /**
   * Log an event
   * @param {Object} event - Event to log
   * @param {number} event.time - Simulation time
   * @param {string} event.type - Event type
   * @param {Object} event.entity - Entity associated with the event
   * @param {string} event.level - Log level (debug, info, warn, error)
   * @param {string} event.message - Event message
   * @param {Object} event.data - Additional event data
   * @returns {number} - Index of the event in the events array
   */
  logEvent(event) {
    if (!this.enabled) {
      return -1;
    }
    
    // Set default log level if not provided
    const level = event.level || 'info';
    
    // Check if log level is sufficient
    if (this.logLevels[level] < this.logLevels[this.logLevel]) {
      return -1;
    }
    
    // Create event object
    const eventObj = {
      time: event.time || 0,
      type: event.type || 'unknown',
      entity: event.entity || null,
      entityId: event.entity ? event.entity.id : null,
      level,
      message: event.message || '',
      data: event.data || {},
      timestamp: Date.now()
    };
    
    // Add to events array
    const eventIndex = this.events.push(eventObj) - 1;
    
    // Add to event types set
    this.eventTypes.add(eventObj.type);
    
    // Add to entity events map
    if (eventObj.entityId) {
      if (!this.entityEvents.has(eventObj.entityId)) {
        this.entityEvents.set(eventObj.entityId, []);
      }
      this.entityEvents.get(eventObj.entityId).push(eventIndex);
    }
    
    // Log to console if enabled
    if (this.logToConsole) {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 
                           level === 'debug' ? 'debug' : 'log';
      
      console[consoleMethod](
        `[${new Date().toISOString()}] [${level.toUpperCase()}] [${eventObj.time.toFixed(2)}] ${eventObj.type}: ${eventObj.message}`,
        eventObj.entityId ? { entityId: eventObj.entityId } : '',
        eventObj.data
      );
    }
    
    // Trim events if necessary
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    return eventIndex;
  }

  /**
   * Log a debug event
   * @param {string} type - Event type
   * @param {string} message - Event message
   * @param {Object} entity - Entity associated with the event
   * @param {Object} data - Additional event data
   * @param {number} time - Simulation time
   * @returns {number} - Index of the event in the events array
   */
  debug(type, message, entity = null, data = {}, time = 0) {
    return this.logEvent({
      time,
      type,
      entity,
      level: 'debug',
      message,
      data
    });
  }

  /**
   * Log an info event
   * @param {string} type - Event type
   * @param {string} message - Event message
   * @param {Object} entity - Entity associated with the event
   * @param {Object} data - Additional event data
   * @param {number} time - Simulation time
   * @returns {number} - Index of the event in the events array
   */
  info(type, message, entity = null, data = {}, time = 0) {
    return this.logEvent({
      time,
      type,
      entity,
      level: 'info',
      message,
      data
    });
  }

  /**
   * Log a warning event
   * @param {string} type - Event type
   * @param {string} message - Event message
   * @param {Object} entity - Entity associated with the event
   * @param {Object} data - Additional event data
   * @param {number} time - Simulation time
   * @returns {number} - Index of the event in the events array
   */
  warn(type, message, entity = null, data = {}, time = 0) {
    return this.logEvent({
      time,
      type,
      entity,
      level: 'warn',
      message,
      data
    });
  }

  /**
   * Log an error event
   * @param {string} type - Event type
   * @param {string} message - Event message
   * @param {Object} entity - Entity associated with the event
   * @param {Object} data - Additional event data
   * @param {number} time - Simulation time
   * @returns {number} - Index of the event in the events array
   */
  error(type, message, entity = null, data = {}, time = 0) {
    return this.logEvent({
      time,
      type,
      entity,
      level: 'error',
      message,
      data
    });
  }

  /**
   * Get all events
   * @returns {Array} - Array of all events
   */
  getAllEvents() {
    return [...this.events];
  }

  /**
   * Get events by type
   * @param {string} type - Event type
   * @returns {Array} - Array of events of the specified type
   */
  getEventsByType(type) {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by entity
   * @param {string|Object} entityOrId - Entity or entity ID
   * @returns {Array} - Array of events for the specified entity
   */
  getEventsByEntity(entityOrId) {
    const entityId = typeof entityOrId === 'object' ? entityOrId.id : entityOrId;
    
    if (!this.entityEvents.has(entityId)) {
      return [];
    }
    
    return this.entityEvents.get(entityId).map(index => this.events[index]);
  }

  /**
   * Get events by time range
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {Array} - Array of events in the specified time range
   */
  getEventsByTimeRange(startTime, endTime) {
    return this.events.filter(event => event.time >= startTime && event.time <= endTime);
  }

  /**
   * Get events by log level
   * @param {string} level - Log level (debug, info, warn, error)
   * @returns {Array} - Array of events with the specified log level
   */
  getEventsByLevel(level) {
    return this.events.filter(event => event.level === level);
  }

  /**
   * Get event types
   * @returns {Array} - Array of event types
   */
  getEventTypes() {
    return Array.from(this.eventTypes);
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
    this.eventTypes.clear();
    this.entityEvents.clear();
  }

  /**
   * Enable or disable logging
   * @param {boolean} enabled - Whether logging is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Set log level
   * @param {string} level - Log level (debug, info, warn, error)
   */
  setLogLevel(level) {
    if (this.logLevels[level] !== undefined) {
      this.logLevel = level;
    }
  }

  /**
   * Enable or disable console logging
   * @param {boolean} enabled - Whether console logging is enabled
   */
  setLogToConsole(enabled) {
    this.logToConsole = enabled;
  }

  /**
   * Set maximum number of events to store
   * @param {number} maxEvents - Maximum number of events
   */
  setMaxEvents(maxEvents) {
    this.maxEvents = maxEvents;
    
    // Trim events if necessary
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
}

export default EventLogger;
