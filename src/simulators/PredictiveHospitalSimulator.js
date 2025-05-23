/**
 * PredictiveHospitalSimulator.js
 * Enhanced hospital simulator with predictive capabilities
 */

import HospitalSimulator from './HospitalSimulator.js';
import SimulationMLIntegration from '../ml/SimulationMLIntegration.js';
import Logger from '../utils/Logger.js';

/**
 * Predictive Hospital Simulator class
 * Extends the HospitalSimulator with predictive capabilities
 */
class PredictiveHospitalSimulator extends HospitalSimulator {
  /**
   * Constructor for the PredictiveHospitalSimulator class
   * @param {Object} config - Simulator configuration
   * @param {Object} options - Simulator options
   */
  constructor(config, options = {}) {
    super(config, options);
    
    this.logger = options.logger || new Logger({ level: 'info' });
    this.mlEnabled = options.mlEnabled !== false;
    
    // Initialize ML integration
    this.mlIntegration = new SimulationMLIntegration(this, {
      logger: this.logger,
      enabled: this.mlEnabled,
      collectTrainingData: options.collectTrainingData !== false
    });
    
    // Prediction storage
    this.predictions = {
      resourceUtilization: new Map(),
      patientFlow: [],
      waitTimes: new Map()
    };
    
    // Register additional event handlers
    this.registerPredictiveEventHandlers();
  }
  
  /**
   * Initialize the simulator
   * @param {Object} config - Simulator configuration
   * @returns {Promise} - Promise that resolves when the simulator is initialized
   */
  async initialize(config) {
    // Initialize base simulator
    await super.initialize(config);
    
    // Initialize ML integration
    if (this.mlEnabled) {
      await this.mlIntegration.initialize();
    }
    
    return true;
  }
  
  /**
   * Register predictive event handlers
   */
  registerPredictiveEventHandlers() {
    // Register additional event handlers for predictive features
    this.on('patientArrival', this.handlePredictivePatientArrival.bind(this));
    this.on('resourceRequest', this.handlePredictiveResourceRequest.bind(this));
    this.on('simulationStep', this.handlePredictiveSimulationStep.bind(this));
  }
  
  /**
   * Handle patient arrival with predictive features
   * @param {Object} event - Event data
   */
  handlePredictivePatientArrival(event) {
    const { patient, time } = event;
    
    // Predict wait time for the patient
    this.predictWaitTime(patient)
      .then(waitTime => {
        patient.predictedWaitTime = waitTime;
        this.logger.debug('prediction', `Predicted wait time for patient ${patient.id}: ${waitTime.toFixed(2)} minutes`, patient);
      })
      .catch(error => {
        this.logger.error('prediction', `Error predicting wait time: ${error.message}`, patient);
      });
  }
  
  /**
   * Handle resource request with predictive features
   * @param {Object} event - Event data
   */
  handlePredictiveResourceRequest(event) {
    const { patient, resourceType, time } = event;
    
    // Check if we have utilization predictions for this resource type
    if (this.predictions.resourceUtilization.has(resourceType)) {
      const predictions = this.predictions.resourceUtilization.get(resourceType);
      
      // Use predictions to optimize resource allocation
      // For example, if utilization is predicted to decrease soon, we might wait
      // If utilization is predicted to increase, we might allocate immediately
      
      const currentHour = Math.floor(time / 60) % 24;
      const nextHourPrediction = predictions[0] || 0.5;
      
      if (nextHourPrediction > 0.9) {
        // High utilization predicted, prioritize this patient if urgent
        if (patient.acuityLevel <= 2) {
          patient.priorityScore += 10;
          this.logger.debug('prediction', `Increased priority for urgent patient ${patient.id} due to predicted high utilization`, patient);
        }
      }
    }
  }
  
  /**
   * Handle simulation step with predictive features
   * @param {Object} event - Event data
   */
  handlePredictiveSimulationStep(event) {
    const { time, step } = event;
    
    // Every hour, update staffing based on predictions
    if (step % 60 === 0) {
      this.optimizeStaffingLevels(time);
    }
  }
  
  /**
   * Predict wait time for a patient
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted wait time
   */
  async predictWaitTime(patient) {
    if (!this.mlEnabled) {
      return this.estimateWaitTime(patient);
    }
    
    try {
      // Create context for wait time prediction
      const context = {
        patientCount: this.getPatientCount(),
        staffingLevel: this.getStaffingLevel(),
        acuityLevel: patient.acuityLevel,
        hourOfDay: Math.floor(this.getCurrentTime() / 60) % 24,
        dayOfWeek: Math.floor(this.getCurrentTime() / (60 * 24)) % 7,
        bedUtilization: this.getBedUtilization()
      };
      
      return await this.mlIntegration.predictWaitTime(context);
    } catch (error) {
      this.logger.error('prediction', `Error predicting wait time: ${error.message}`, patient);
      return this.estimateWaitTime(patient);
    }
  }
  
  /**
   * Estimate wait time for a patient (fallback method)
   * @param {Object} patient - Patient object
   * @returns {number} - Estimated wait time in minutes
   */
  estimateWaitTime(patient) {
    // Simple wait time estimation based on current state
    const baseWait = {
      1: 5,   // Critical
      2: 15,  // Severe
      3: 30,  // Moderate
      4: 60,  // Mild
      5: 120  // Minor
    };
    
    const base = baseWait[patient.acuityLevel] || 30;
    const patientCountFactor = 1 + (this.getPatientCount() / 50);
    const staffFactor = Math.max(0.5, 1 - (this.getStaffingLevel() * 0.5));
    const bedFactor = 1 + (this.getBedUtilization() * 2);
    
    return base * patientCountFactor * staffFactor * bedFactor;
  }
  
  /**
   * Update resource utilization predictions
   * @param {string} resourceType - Resource type
   * @param {Array} predictions - Utilization predictions
   */
  updateResourcePredictions(resourceType, predictions) {
    this.predictions.resourceUtilization.set(resourceType, predictions);
    
    this.logger.debug('prediction', `Updated ${resourceType} utilization predictions`, null, {
      resourceType,
      predictions: predictions.slice(0, 5) // Log first 5 predictions
    });
    
    // Emit event for UI updates
    this.emit('predictionsUpdated', {
      type: 'resourceUtilization',
      resourceType,
      predictions
    });
  }
  
  /**
   * Update patient flow predictions
   * @param {Array} predictions - Patient flow predictions
   */
  updatePatientFlowPredictions(predictions) {
    this.predictions.patientFlow = predictions;
    
    this.logger.debug('prediction', 'Updated patient flow predictions', null, {
      predictions: predictions.slice(0, 5) // Log first 5 predictions
    });
    
    // Emit event for UI updates
    this.emit('predictionsUpdated', {
      type: 'patientFlow',
      predictions
    });
  }
  
  /**
   * Optimize staffing levels based on predictions
   * @param {number} time - Current simulation time
   */
  optimizeStaffingLevels(time) {
    if (!this.mlEnabled) return;
    
    const hour = Math.floor(time / 60) % 24;
    const nextShiftHour = hour < 7 ? 7 : hour < 15 ? 15 : hour < 23 ? 23 : 7;
    const hoursUntilNextShift = (nextShiftHour - hour + 24) % 24;
    
    // Only optimize if we're approaching a shift change (within 2 hours)
    if (hoursUntilNextShift > 2) return;
    
    // Get patient flow predictions
    const patientFlowPredictions = this.predictions.patientFlow;
    
    // Get resource utilization predictions
    const edBedsPredictions = this.predictions.resourceUtilization.get('ed_beds') || [];
    const wardBedsPredictions = this.predictions.resourceUtilization.get('ward_beds') || [];
    const doctorsPredictions = this.predictions.resourceUtilization.get('doctors') || [];
    const nursesPredictions = this.predictions.resourceUtilization.get('nurses') || [];
    
    // Calculate optimal staffing levels
    let optimalDoctors = this.config.resources.doctors;
    let optimalNurses = this.config.resources.nurses;
    
    // Simple optimization: adjust based on predicted utilization
    if (doctorsPredictions.length > 0) {
      const avgDoctorUtilization = doctorsPredictions.slice(0, 8).reduce((sum, val) => sum + val, 0) / Math.min(8, doctorsPredictions.length);
      if (avgDoctorUtilization > 0.9) {
        optimalDoctors = Math.ceil(optimalDoctors * 1.2); // Increase by 20%
      } else if (avgDoctorUtilization < 0.5) {
        optimalDoctors = Math.max(1, Math.floor(optimalDoctors * 0.9)); // Decrease by 10%
      }
    }
    
    if (nursesPredictions.length > 0) {
      const avgNurseUtilization = nursesPredictions.slice(0, 8).reduce((sum, val) => sum + val, 0) / Math.min(8, nursesPredictions.length);
      if (avgNurseUtilization > 0.9) {
        optimalNurses = Math.ceil(optimalNurses * 1.2); // Increase by 20%
      } else if (avgNurseUtilization < 0.5) {
        optimalNurses = Math.max(2, Math.floor(optimalNurses * 0.9)); // Decrease by 10%
      }
    }
    
    // Also consider patient flow predictions
    if (patientFlowPredictions.length > 0) {
      const avgPatientFlow = patientFlowPredictions.slice(0, 8).reduce((sum, val) => sum + val, 0) / Math.min(8, patientFlowPredictions.length);
      const currentPatientFlow = this.getPatientCount() / 24; // Average hourly arrivals
      
      if (avgPatientFlow > currentPatientFlow * 1.5) {
        // Significant increase in patient flow predicted
        optimalDoctors = Math.ceil(optimalDoctors * 1.3); // Increase by 30%
        optimalNurses = Math.ceil(optimalNurses * 1.3); // Increase by 30%
      }
    }
    
    // Update staffing levels for next shift
    const nextShift = nextShiftHour === 7 ? 'day' : nextShiftHour === 15 ? 'evening' : 'night';
    
    this.logger.info('prediction', `Optimizing staffing levels for ${nextShift} shift`, null, {
      currentDoctors: this.config.resources.doctors,
      currentNurses: this.config.resources.nurses,
      optimalDoctors,
      optimalNurses,
      nextShift
    });
    
    // Update resources for next shift
    this.updateStaffingLevels(nextShift, optimalDoctors, optimalNurses);
  }
  
  /**
   * Update staffing levels
   * @param {string} shift - Shift (day, evening, night)
   * @param {number} doctors - Number of doctors
   * @param {number} nurses - Number of nurses
   */
  updateStaffingLevels(shift, doctors, nurses) {
    // Store original staffing levels
    if (!this.originalStaffing) {
      this.originalStaffing = {
        doctors: { ...this.config.staff.doctors },
        nurses: { ...this.config.staff.nurses }
      };
    }
    
    // Update config
    this.config.staff.doctors[shift] = doctors;
    this.config.staff.nurses[shift] = nurses;
    
    // Emit event for UI updates
    this.emit('staffingUpdated', {
      shift,
      doctors,
      nurses
    });
  }
  
  /**
   * Get staffing level
   * @returns {number} - Staffing level (0-1)
   */
  getStaffingLevel() {
    const hour = Math.floor(this.getCurrentTime() / 60) % 24;
    const shift = hour >= 7 && hour < 15 ? 'day' : hour >= 15 && hour < 23 ? 'evening' : 'night';
    
    const maxDoctors = this.originalStaffing ? this.originalStaffing.doctors[shift] : this.config.staff.doctors[shift];
    const maxNurses = this.originalStaffing ? this.originalStaffing.nurses[shift] : this.config.staff.nurses[shift];
    
    const currentDoctors = this.config.staff.doctors[shift];
    const currentNurses = this.config.staff.nurses[shift];
    
    return ((currentDoctors / maxDoctors) + (currentNurses / maxNurses)) / 2;
  }
  
  /**
   * Get bed utilization
   * @returns {number} - Bed utilization (0-1)
   */
  getBedUtilization() {
    const edBeds = this.getResource('ed_beds');
    const wardBeds = this.getResource('ward_beds');
    
    if (!edBeds || !wardBeds) {
      return 0.5; // Default value
    }
    
    const edUtilization = (edBeds.capacity - edBeds.available) / edBeds.capacity;
    const wardUtilization = (wardBeds.capacity - wardBeds.available) / wardBeds.capacity;
    
    return (edUtilization + wardUtilization) / 2;
  }
  
  /**
   * Get patient count
   * @returns {number} - Number of patients in the system
   */
  getPatientCount() {
    return this.entities ? this.entities.getEntitiesByType('patient').length : 0;
  }
  
  /**
   * Get patients
   * @returns {Array} - Array of patients in the system
   */
  getPatients() {
    return this.entities ? this.entities.getEntitiesByType('patient') : [];
  }
  
  /**
   * Get resource
   * @param {string} resourceId - Resource ID
   * @returns {Object} - Resource object
   */
  getResource(resourceId) {
    return this.resources ? this.resources.getResource(resourceId) : null;
  }
  
  /**
   * Get current time
   * @returns {number} - Current simulation time
   */
  getCurrentTime() {
    return this.currentTime;
  }
}

// Export the class
export default PredictiveHospitalSimulator;
