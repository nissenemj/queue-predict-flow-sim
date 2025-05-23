/**
 * HealthcareEvents.js
 * Defines specialized healthcare event types and handlers for the simulation
 */

/**
 * EmergencyArrival event class
 * Represents a high-priority emergency patient arrival
 */
class EmergencyArrival {
  /**
   * Constructor for EmergencyArrival
   * @param {Object} options - Options for the emergency arrival
   * @param {string} options.arrivalMode - Mode of arrival (ambulance, helicopter, etc.)
   * @param {string} options.condition - Primary condition (trauma, cardiac, etc.)
   * @param {number} options.estimatedAcuity - Estimated acuity level (1-5)
   * @param {boolean} options.preNotification - Whether there was pre-notification
   * @param {number} options.estimatedArrivalTime - Estimated time of arrival
   */
  constructor(options = {}) {
    this.arrivalMode = options.arrivalMode || 'ambulance';
    this.condition = options.condition || 'unknown';
    this.estimatedAcuity = options.estimatedAcuity || 1;
    this.preNotification = options.preNotification !== undefined ? options.preNotification : false;
    this.estimatedArrivalTime = options.estimatedArrivalTime || 0;
    this.priority = this.calculatePriority();
    this.resourceRequirements = this.determineResourceRequirements();
  }

  /**
   * Calculate the priority of this emergency arrival
   * @returns {number} - Priority value (higher means more urgent)
   */
  calculatePriority() {
    // Base priority by acuity
    let priority = 100 - (this.estimatedAcuity * 20);
    
    // Adjust by condition
    if (this.condition === 'cardiac') priority += 10;
    if (this.condition === 'trauma') priority += 8;
    if (this.condition === 'stroke') priority += 10;
    if (this.condition === 'respiratory') priority += 7;
    
    // Adjust by arrival mode
    if (this.arrivalMode === 'helicopter') priority += 15;
    if (this.arrivalMode === 'ambulance') priority += 10;
    
    return priority;
  }

  /**
   * Determine resource requirements for this emergency
   * @returns {Object} - Required resources
   */
  determineResourceRequirements() {
    const requirements = {
      doctors: 0,
      nurses: 0,
      beds: 0,
      equipment: []
    };
    
    // Set requirements based on acuity and condition
    if (this.estimatedAcuity === 1) {
      requirements.doctors = 2;
      requirements.nurses = 3;
      requirements.beds = 1;
      requirements.equipment = ['monitor', 'ventilator', 'defibrillator'];
    } else if (this.estimatedAcuity === 2) {
      requirements.doctors = 1;
      requirements.nurses = 2;
      requirements.beds = 1;
      requirements.equipment = ['monitor', 'defibrillator'];
    } else {
      requirements.doctors = 1;
      requirements.nurses = 1;
      requirements.beds = 1;
      requirements.equipment = ['monitor'];
    }
    
    // Add condition-specific equipment
    if (this.condition === 'cardiac') {
      requirements.equipment.push('ECG');
      requirements.equipment.push('cardiac_meds');
    } else if (this.condition === 'trauma') {
      requirements.equipment.push('trauma_kit');
      requirements.equipment.push('imaging');
    } else if (this.condition === 'stroke') {
      requirements.equipment.push('CT_scanner');
      requirements.equipment.push('stroke_kit');
    } else if (this.condition === 'respiratory') {
      requirements.equipment.push('ventilator');
      requirements.equipment.push('oxygen');
    }
    
    return requirements;
  }
}

/**
 * PatientTransfer event class
 * Represents a patient transfer between departments or facilities
 */
class PatientTransfer {
  /**
   * Constructor for PatientTransfer
   * @param {Object} options - Options for the patient transfer
   * @param {string} options.sourceLocation - Source location
   * @param {string} options.targetLocation - Target location
   * @param {string} options.transferReason - Reason for transfer
   * @param {boolean} options.isEmergent - Whether the transfer is emergent
   * @param {Object} options.resourceRequirements - Resources required for transfer
   */
  constructor(options = {}) {
    this.sourceLocation = options.sourceLocation || 'ED';
    this.targetLocation = options.targetLocation || 'ward';
    this.transferReason = options.transferReason || 'routine';
    this.isEmergent = options.isEmergent !== undefined ? options.isEmergent : false;
    this.resourceRequirements = options.resourceRequirements || this.defaultResourceRequirements();
    this.priority = this.calculatePriority();
    this.estimatedDuration = this.calculateDuration();
  }

  /**
   * Calculate the priority of this transfer
   * @returns {number} - Priority value (higher means more urgent)
   */
  calculatePriority() {
    // Base priority
    let priority = 50;
    
    // Adjust by transfer reason
    if (this.transferReason === 'critical_care') priority += 30;
    if (this.transferReason === 'specialized_care') priority += 20;
    if (this.transferReason === 'bed_management') priority -= 10;
    
    // Adjust by emergent status
    if (this.isEmergent) priority += 40;
    
    return priority;
  }

  /**
   * Calculate the estimated duration of the transfer
   * @returns {number} - Estimated duration in minutes
   */
  calculateDuration() {
    // Base duration
    let duration = 30; // 30 minutes for standard transfer
    
    // Adjust by locations
    if (this.sourceLocation === 'ED' && this.targetLocation === 'ICU') {
      duration = 20; // Faster for critical transfers
    } else if (this.sourceLocation === 'ED' && this.targetLocation === 'ward') {
      duration = 30;
    } else if (this.sourceLocation === 'ED' && this.targetLocation === 'OR') {
      duration = 15; // Very fast for surgery
    } else if (this.targetLocation === 'external') {
      duration = 60; // Longer for external transfers
    }
    
    // Adjust by emergent status
    if (this.isEmergent) duration *= 0.7; // 30% faster for emergent transfers
    
    return duration;
  }

  /**
   * Default resource requirements for transfer
   * @returns {Object} - Required resources
   */
  defaultResourceRequirements() {
    return {
      nurses: 1,
      transporters: 1,
      equipment: []
    };
  }
}

/**
 * PatientDischarge event class
 * Represents a patient discharge from the hospital
 */
class PatientDischarge {
  /**
   * Constructor for PatientDischarge
   * @param {Object} options - Options for the patient discharge
   * @param {string} options.dischargeType - Type of discharge
   * @param {string} options.dischargeDestination - Destination after discharge
   * @param {boolean} options.requiresFollowUp - Whether follow-up is required
   * @param {Array} options.medications - Discharge medications
   * @param {Array} options.instructions - Discharge instructions
   */
  constructor(options = {}) {
    this.dischargeType = options.dischargeType || 'routine';
    this.dischargeDestination = options.dischargeDestination || 'home';
    this.requiresFollowUp = options.requiresFollowUp !== undefined ? options.requiresFollowUp : true;
    this.medications = options.medications || [];
    this.instructions = options.instructions || [];
    this.priority = this.calculatePriority();
    this.estimatedDuration = this.calculateDuration();
    this.resourceRequirements = this.determineResourceRequirements();
  }

  /**
   * Calculate the priority of this discharge
   * @returns {number} - Priority value
   */
  calculatePriority() {
    // Base priority
    let priority = 40;
    
    // Adjust by discharge type
    if (this.dischargeType === 'early') priority += 10;
    if (this.dischargeType === 'against_medical_advice') priority += 20;
    if (this.dischargeType === 'delayed') priority -= 10;
    
    // Adjust by destination
    if (this.dischargeDestination === 'skilled_nursing') priority -= 5;
    if (this.dischargeDestination === 'rehabilitation') priority -= 5;
    if (this.dischargeDestination === 'home_health') priority -= 3;
    
    return priority;
  }

  /**
   * Calculate the estimated duration of the discharge process
   * @returns {number} - Estimated duration in minutes
   */
  calculateDuration() {
    // Base duration
    let duration = 60; // 60 minutes for standard discharge
    
    // Adjust by discharge type
    if (this.dischargeType === 'early') duration = 90; // More preparation needed
    if (this.dischargeType === 'against_medical_advice') duration = 30; // Faster but not ideal
    
    // Adjust by destination
    if (this.dischargeDestination === 'skilled_nursing') duration += 30;
    if (this.dischargeDestination === 'rehabilitation') duration += 30;
    if (this.dischargeDestination === 'home_health') duration += 15;
    
    // Adjust by medications and instructions
    duration += this.medications.length * 5;
    duration += this.instructions.length * 3;
    
    return duration;
  }

  /**
   * Determine resource requirements for discharge
   * @returns {Object} - Required resources
   */
  determineResourceRequirements() {
    const requirements = {
      doctors: 1,
      nurses: 1,
      pharmacists: 0,
      socialWorkers: 0
    };
    
    // Adjust by discharge type and destination
    if (this.dischargeDestination !== 'home') {
      requirements.socialWorkers = 1;
    }
    
    if (this.medications.length > 3) {
      requirements.pharmacists = 1;
    }
    
    return requirements;
  }
}

// Export the event classes
export { EmergencyArrival, PatientTransfer, PatientDischarge };
