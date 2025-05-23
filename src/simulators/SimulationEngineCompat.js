/**
 * SimulationEngineCompat.js
 * Compatibility layer for the SimulationEngine class
 * Ensures backward compatibility with the original SimulationEngine
 * while supporting the new priority-based event handling
 */

import SimulationEngine from './SimulationEngine.js';

/**
 * SimulationEngineCompat class
 * Extends SimulationEngine with backward compatibility features
 */
class SimulationEngineCompat extends SimulationEngine {
  /**
   * Constructor for SimulationEngineCompat
   * @param {Object} options - Simulation options
   */
  constructor(options = {}) {
    super(options);
  }
  
  /**
   * Schedule an event to occur at a specific time
   * This method overrides the priority-based scheduling to maintain backward compatibility
   * @param {number} time - The time at which the event should occur
   * @param {Object} entity - The entity associated with the event
   * @param {string} eventType - The type of event
   * @param {Object} data - Additional data for the event
   * @returns {Object} - The scheduled event
   */
  scheduleEvent(time, entity, eventType, data = {}) {
    // Ensure time is not before current time
    if (time < this.currentTime) {
      this.logger.warn('simulation', `Attempted to schedule event in the past: ${eventType}`, entity, {
        scheduledTime: time,
        currentTime: this.currentTime
      }, this.currentTime);

      time = this.currentTime;
    }

    // Create event object
    const event = {
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time,
      entity,
      entityId: entity ? entity.id : null,
      eventType,
      data,
      processed: false,
      createdAt: this.currentTime
    };

    // Add to event queue with time as priority
    this.eventQueue.enqueue(event, time);

    // Log event scheduling
    if (this.debug) {
      this.logger.debug('simulation', `Scheduled event: ${eventType}`, entity, {
        scheduledTime: time,
        data
      }, this.currentTime);
    }

    return event;
  }
  
  /**
   * Schedule an event with priority
   * This is a new method that supports priority-based scheduling
   * @param {number} time - The time at which the event should occur
   * @param {Object} entity - The entity associated with the event
   * @param {string} eventType - The type of event
   * @param {Object} data - Additional data for the event
   * @param {number} priority - Priority value (higher value = higher priority)
   * @returns {Object} - The scheduled event
   */
  scheduleEventWithPriority(time, entity, eventType, data = {}, priority = 0) {
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
      this.logger.debug('simulation', `Scheduled event with priority: ${eventType}`, entity, {
        scheduledTime: time,
        priority: effectivePriority,
        compositePriority,
        data
      }, this.currentTime);
    }

    return event;
  }
}

// Export the SimulationEngineCompat class
export default SimulationEngineCompat;
