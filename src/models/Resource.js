/**
 * Base Resource class for hospital resources
 */
class Resource {
  /**
   * Constructor for the Resource class
   * @param {string} id - Unique identifier for the resource
   * @param {string} type - Type of resource
   * @param {number} capacity - Total capacity of the resource
   */
  constructor(id, type, capacity) {
    this.id = id;
    this.type = type;
    this.capacity = capacity;
    this.available = capacity;
    this.utilization = [];
    this.assignments = new Map();
  }

  /**
   * Check if the resource is available
   * @param {number} amount - Amount of resource needed
   * @returns {boolean} - True if the resource is available
   */
  isAvailable(amount = 1) {
    return this.available >= amount;
  }

  /**
   * Allocate the resource
   * @param {Object} entity - Entity to allocate the resource to
   * @param {number} amount - Amount of resource to allocate
   * @param {number} time - Current simulation time
   * @returns {boolean} - True if allocation was successful
   */
  allocate(entity, amount = 1, time) {
    if (!this.isAvailable(amount)) {
      return false;
    }

    this.available -= amount;
    this.assignments.set(entity.id, {
      entity,
      amount,
      startTime: time
    });

    // Record utilization
    this.recordUtilization(time);

    return true;
  }

  /**
   * Release the resource
   * @param {Object} entity - Entity to release the resource from
   * @param {number} time - Current simulation time
   * @returns {boolean} - True if release was successful
   */
  release(entity, time) {
    if (!this.assignments.has(entity.id)) {
      return false;
    }

    const assignment = this.assignments.get(entity.id);
    this.available += assignment.amount;
    this.assignments.delete(entity.id);

    // Record utilization
    this.recordUtilization(time);

    return true;
  }

  /**
   * Record the current utilization
   * @param {number} time - Current simulation time
   */
  recordUtilization(time) {
    const utilizationRate = (this.capacity - this.available) / this.capacity;
    this.utilization.push({
      time,
      rate: utilizationRate
    });
  }

  /**
   * Get the current utilization rate
   * @returns {number} - Utilization rate (0-1)
   */
  getUtilizationRate() {
    return (this.capacity - this.available) / this.capacity;
  }

  /**
   * Get the average utilization rate over a time period
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {number} - Average utilization rate (0-1)
   */
  getAverageUtilization(startTime, endTime) {
    const relevantUtilization = this.utilization.filter(
      u => u.time >= startTime && u.time <= endTime
    );

    if (relevantUtilization.length === 0) {
      return 0;
    }

    const sum = relevantUtilization.reduce((acc, u) => acc + u.rate, 0);
    return sum / relevantUtilization.length;
  }
}

/**
 * Staff resource class for healthcare staff
 */
class Staff extends Resource {
  /**
   * Constructor for the Staff class
   * @param {string} id - Unique identifier for the staff
   * @param {string} role - Role of the staff (doctor, nurse, etc.)
   * @param {number} count - Number of staff
   * @param {Object} attributes - Additional staff attributes
   */
  constructor(id, role, count, attributes = {}) {
    super(id, 'staff', count);
    this.role = role;
    this.shift = attributes.shift || 'day';
    this.efficiency = attributes.efficiency || 1.0;
    this.specialties = attributes.specialties || [];
    this.fatigue = 0;
  }

  /**
   * Update staff fatigue based on time and workload
   * @param {number} time - Current simulation time
   * @param {number} workload - Current workload (0-1)
   */
  updateFatigue(time, workload) {
    // Simple fatigue model: increases with time and workload, resets at shift change
    const hourOfDay = Math.floor(time / 60) % 24;
    
    // Check if shift has changed
    const currentShift = this.getCurrentShift(hourOfDay);
    if (currentShift !== this.shift) {
      // Shift change, reset fatigue
      this.fatigue = 0;
      this.shift = currentShift;
    } else {
      // Increase fatigue based on workload
      // Higher workload = faster fatigue accumulation
      const fatigueIncrease = 0.01 * workload;
      this.fatigue = Math.min(1, this.fatigue + fatigueIncrease);
    }
  }

  /**
   * Get the current shift based on hour of day
   * @param {number} hourOfDay - Hour of day (0-23)
   * @returns {string} - Shift (day, evening, night)
   */
  getCurrentShift(hourOfDay) {
    if (hourOfDay >= 7 && hourOfDay < 15) {
      return 'day';
    } else if (hourOfDay >= 15 && hourOfDay < 23) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * Get the effective capacity considering fatigue
   * @returns {number} - Effective capacity
   */
  getEffectiveCapacity() {
    // Fatigue reduces effective capacity
    const fatigueImpact = 1 - (this.fatigue * 0.3); // Max 30% reduction due to fatigue
    return this.capacity * this.efficiency * fatigueImpact;
  }
}

/**
 * Bed resource class for hospital beds
 */
class Bed extends Resource {
  /**
   * Constructor for the Bed class
   * @param {string} id - Unique identifier for the bed
   * @param {string} type - Type of bed (ED, ward, ICU, etc.)
   * @param {number} count - Number of beds
   * @param {Object} attributes - Additional bed attributes
   */
  constructor(id, type, count, attributes = {}) {
    super(id, 'bed', count);
    this.bedType = type;
    this.location = attributes.location || 'general';
    this.turnoverTime = attributes.turnoverTime || 30; // minutes to prepare bed for next patient
    this.bedsInTurnover = new Map();
  }

  /**
   * Allocate a bed to a patient
   * @param {Object} patient - Patient to allocate the bed to
   * @param {number} time - Current simulation time
   * @returns {boolean} - True if allocation was successful
   */
  allocate(patient, time) {
    // Check if any beds are in turnover and ready
    for (const [bedId, turnoverInfo] of this.bedsInTurnover.entries()) {
      if (time >= turnoverInfo.readyTime) {
        // Bed is ready, remove from turnover
        this.bedsInTurnover.delete(bedId);
        // Increase available count (will be decreased again by super.allocate)
        this.available += 1;
      }
    }
    
    return super.allocate(patient, 1, time);
  }

  /**
   * Release a bed from a patient and start turnover
   * @param {Object} patient - Patient to release the bed from
   * @param {number} time - Current simulation time
   * @returns {boolean} - True if release was successful
   */
  release(patient, time) {
    if (!this.assignments.has(patient.id)) {
      return false;
    }

    // Get a unique bed ID for tracking turnover
    const bedId = `bed_${patient.id}`;
    
    // Start turnover process
    this.bedsInTurnover.set(bedId, {
      readyTime: time + this.turnoverTime,
      startTime: time
    });
    
    // Release the bed in the parent class
    // Note: We don't increase available count yet, as the bed is in turnover
    const assignment = this.assignments.get(patient.id);
    this.assignments.delete(patient.id);
    
    // Record utilization
    this.recordUtilization(time);
    
    return true;
  }

  /**
   * Get the number of beds currently in turnover
   * @param {number} time - Current simulation time
   * @returns {number} - Number of beds in turnover
   */
  getBedsInTurnover(time) {
    // Clean up any completed turnovers
    for (const [bedId, turnoverInfo] of this.bedsInTurnover.entries()) {
      if (time >= turnoverInfo.readyTime) {
        this.bedsInTurnover.delete(bedId);
        this.available += 1;
      }
    }
    
    return this.bedsInTurnover.size;
  }

  /**
   * Get the current occupancy rate including beds in turnover
   * @param {number} time - Current simulation time
   * @returns {number} - Occupancy rate (0-1)
   */
  getOccupancyRate(time) {
    const bedsInUse = this.capacity - this.available;
    const bedsInTurnover = this.getBedsInTurnover(time);
    return (bedsInUse + bedsInTurnover) / this.capacity;
  }
}

// Export the classes
export { Resource, Staff, Bed };
