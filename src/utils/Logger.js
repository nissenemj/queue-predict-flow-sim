/**
 * Logger.js
 * A simple logging utility for the simulation
 */

/**
 * Logger class
 * Provides logging functionality for the simulation
 */
class Logger {
  /**
   * Constructor for Logger
   * @param {Object} options - Logger options
   */
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enabled = options.enabled !== false;
    this.logToConsole = options.logToConsole !== false;
    this.logs = [];
    this.maxLogs = options.maxLogs || 1000;
    
    // Define log levels and their priorities
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }
  
  /**
   * Check if a log level is enabled
   * @param {string} level - Log level to check
   * @returns {boolean} - True if the level is enabled
   */
  isLevelEnabled(level) {
    return this.enabled && this.levels[level] >= this.levels[this.level];
  }
  
  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {Object} entity - Entity associated with the log
   * @param {Object} data - Additional log data
   * @param {number} time - Simulation time
   */
  log(level, category, message, entity, data, time) {
    if (!this.isLevelEnabled(level)) {
      return;
    }
    
    const logEntry = {
      level,
      category,
      message,
      entityId: entity ? entity.id : null,
      entityType: entity ? entity.type : null,
      data,
      time,
      timestamp: new Date()
    };
    
    // Add to logs array
    this.logs.push(logEntry);
    
    // Trim logs if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Log to console if enabled
    if (this.logToConsole) {
      this.logToConsoleOutput(logEntry);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {Object} entity - Entity associated with the log
   * @param {Object} data - Additional log data
   * @param {number} time - Simulation time
   */
  debug(category, message, entity, data, time) {
    this.log('debug', category, message, entity, data, time);
  }
  
  /**
   * Log an info message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {Object} entity - Entity associated with the log
   * @param {Object} data - Additional log data
   * @param {number} time - Simulation time
   */
  info(category, message, entity, data, time) {
    this.log('info', category, message, entity, data, time);
  }
  
  /**
   * Log a warning message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {Object} entity - Entity associated with the log
   * @param {Object} data - Additional log data
   * @param {number} time - Simulation time
   */
  warn(category, message, entity, data, time) {
    this.log('warn', category, message, entity, data, time);
  }
  
  /**
   * Log an error message
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {Object} entity - Entity associated with the log
   * @param {Object} data - Additional log data
   * @param {number} time - Simulation time
   */
  error(category, message, entity, data, time) {
    this.log('error', category, message, entity, data, time);
  }
  
  /**
   * Log to console output
   * @param {Object} logEntry - Log entry to output
   * @private
   */
  logToConsoleOutput(logEntry) {
    const { level, category, message, entityId, time, data } = logEntry;
    
    // Format time as hours:minutes
    const hours = Math.floor(time / 60);
    const minutes = Math.floor(time % 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Format log message
    const logMessage = `[${timeStr}] [${level.toUpperCase()}] [${category}] ${message}${entityId ? ` (Entity: ${entityId})` : ''}`;
    
    // Log to console with appropriate level
    switch (level) {
      case 'debug':
        console.debug(logMessage, data || '');
        break;
      case 'info':
        console.info(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  }
  
  /**
   * Get logs filtered by criteria
   * @param {Object} filters - Filters to apply
   * @returns {Array} - Filtered logs
   */
  getLogs(filters = {}) {
    let filteredLogs = [...this.logs];
    
    // Apply level filter
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    
    // Apply category filter
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }
    
    // Apply entity filter
    if (filters.entityId) {
      filteredLogs = filteredLogs.filter(log => log.entityId === filters.entityId);
    }
    
    // Apply time range filter
    if (filters.startTime !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.time >= filters.startTime);
    }
    
    if (filters.endTime !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.time <= filters.endTime);
    }
    
    return filteredLogs;
  }
  
  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Export the Logger class
export default Logger;
